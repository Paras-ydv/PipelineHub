import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { WorkerStatus, RepoLanguage } from '@prisma/client';
import { AppGateway } from '../gateway/app.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class WorkersService implements OnModuleInit {
  constructor(private prisma: PrismaService, private gateway: AppGateway) {}

  async onModuleInit() {
    // Seed workers
    for (const w of [
      { name: 'worker-python',  language: RepoLanguage.PYTHON },
      { name: 'worker-node',    language: RepoLanguage.NODE },
      { name: 'worker-java',    language: RepoLanguage.JAVA },
      { name: 'worker-general', language: RepoLanguage.GENERAL },
    ]) {
      await this.prisma.worker.upsert({
        where: { name: w.name },
        update: {},
        create: { ...w, status: WorkerStatus.IDLE },
      });
    }

    // Seed admin user
    const passwordHash = await bcrypt.hash('admin123', 10);
    const admin = await this.prisma.user.upsert({
      where: { email: 'admin@pipelinehub.dev' },
      update: {},
      create: { email: 'admin@pipelinehub.dev', username: 'admin', passwordHash, role: 'ADMIN' },
    });

    const githubToken = process.env.GITHUB_TOKEN || '';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const webhookUrl = `${backendUrl}/api/webhooks/github`;

    for (const r of [
      { name: 'demo-java-service', owner: 'Paras-ydv', language: RepoLanguage.JAVA,   branch: 'main' },
      { name: 'demo-python-api',   owner: 'Paras-ydv', language: RepoLanguage.PYTHON, branch: 'main' },
      { name: 'demo-node-app',     owner: 'Paras-ydv', language: RepoLanguage.NODE,   branch: 'main' },
    ]) {
      const fullName = `${r.owner}/${r.name}`;
      await this.prisma.repository.upsert({
        where: { fullName },
        update: { githubToken, webhookUrl },
        create: {
          ...r, fullName, userId: admin.id,
          githubToken,
          webhookSecret: `secret-${Math.random().toString(36).slice(2)}`,
          webhookUrl,
          autoDemo: true,
          isActive: true,
          eventTypes: ['push', 'pull_request', 'release'],
          environment: 'production',
          pipelineConfig: { stages: ['checkout', 'install', 'build', 'test', 'security_scan', 'package', 'deploy', 'notify'] },
        },
      });
    }

    // Remove fake repos (delete dependent jobs first to avoid FK violation)
    try {
      const fakeRepos = await this.prisma.repository.findMany({
        where: { owner: 'demo-org' },
        select: { id: true },
      });
      if (fakeRepos.length) {
        const ids = fakeRepos.map(r => r.id);
        await this.prisma.buildLog.deleteMany({ where: { job: { repositoryId: { in: ids } } } });
        await this.prisma.deployment.deleteMany({ where: { repositoryId: { in: ids } } });
        await this.prisma.job.deleteMany({ where: { repositoryId: { in: ids } } });
        await this.prisma.webhookEvent.deleteMany({ where: { repositoryId: { in: ids } } });
        await this.prisma.repository.deleteMany({ where: { id: { in: ids } } });
        console.log(`🧹 Removed ${fakeRepos.length} fake demo-org repos`);
      }
    } catch (e) {
      console.warn('⚠️  Could not clean fake repos (non-fatal):', e.message);
    }

    // Seed default pipeline
    await this.prisma.pipeline.upsert({
      where: { id: 'default-pipeline' },
      update: {},
      create: {
        id: 'default-pipeline',
        name: 'Default Pipeline',
        isDefault: true,
        stages: ['checkout', 'install', 'build', 'test', 'security_scan', 'package', 'deploy', 'notify'],
      },
    });

    console.log(`✅ Seed complete — workers, repos, pipeline ready`);
    console.log(`   BACKEND_URL: ${backendUrl}`);
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log(`   GitHub token: ${githubToken ? 'set' : 'NOT SET — real pushes disabled'}`);
  }

  findAll() {
    return this.prisma.worker.findMany({
      include: { _count: { select: { jobs: true } } },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.worker.findUnique({ where: { id } });
  }

  async assignWorker(language: RepoLanguage) {
    // Try language-specific worker first, then general
    const preferred = await this.prisma.worker.findFirst({
      where: { language, status: WorkerStatus.IDLE },
    });
    if (preferred) return preferred;

    return this.prisma.worker.findFirst({
      where: { language: RepoLanguage.GENERAL, status: WorkerStatus.IDLE },
    });
  }

  async setWorkerBusy(id: string, jobId: string) {
    const worker = await this.prisma.worker.update({
      where: { id },
      data: {
        status: WorkerStatus.BUSY,
        currentJobId: jobId,
        cpuUsage: 40 + Math.random() * 50,
        memUsage: 30 + Math.random() * 40,
        lastHeartbeat: new Date(),
      },
    });
    this.gateway.workerUpdate(worker);
    return worker;
  }

  async setWorkerIdle(id: string) {
    const worker = await this.prisma.worker.update({
      where: { id },
      data: {
        status: WorkerStatus.IDLE,
        currentJobId: null,
        cpuUsage: Math.random() * 10,
        memUsage: Math.random() * 15,
        jobsCompleted: { increment: 1 },
        lastHeartbeat: new Date(),
      },
    });
    this.gateway.workerUpdate(worker);
    return worker;
  }

  async markFailed(id: string) {
    const worker = await this.prisma.worker.update({
      where: { id },
      data: { status: WorkerStatus.ERROR, jobsFailed: { increment: 1 } },
    });
    this.gateway.workerUpdate(worker);
    return worker;
  }

  // Heartbeat simulation
  @Cron(CronExpression.EVERY_10_SECONDS)
  async simulateHeartbeats() {
    const workers = await this.prisma.worker.findMany();
    for (const w of workers) {
      // Randomly simulate worker going offline/online (2% chance)
      const goOffline = w.status === WorkerStatus.IDLE && Math.random() < 0.02;
      const comeOnline = w.status === WorkerStatus.OFFLINE && Math.random() < 0.5;

      if (goOffline || comeOnline) {
        const updated = await this.prisma.worker.update({
          where: { id: w.id },
          data: {
            status: goOffline ? WorkerStatus.OFFLINE : WorkerStatus.IDLE,
            lastHeartbeat: new Date(),
            cpuUsage: goOffline ? 0 : Math.random() * 10,
            memUsage: goOffline ? 0 : Math.random() * 15,
          },
        });
        this.gateway.workerUpdate(updated);
      } else if (w.status !== WorkerStatus.OFFLINE) {
        const updated = await this.prisma.worker.update({
          where: { id: w.id },
          data: {
            lastHeartbeat: new Date(),
            cpuUsage: w.status === WorkerStatus.BUSY ? 40 + Math.random() * 50 : Math.random() * 15,
            memUsage: w.status === WorkerStatus.BUSY ? 30 + Math.random() * 40 : Math.random() * 20,
          },
        });
        this.gateway.workerUpdate(updated);
      }
    }
  }
}
