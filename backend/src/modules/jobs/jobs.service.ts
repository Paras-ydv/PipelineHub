import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JobStatus, RepoLanguage } from '@prisma/client';
import { AppGateway } from '../gateway/app.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private gateway: AppGateway,
    @InjectQueue('pipeline') private pipelineQueue: Queue,
  ) {}

  findAll(filters: { status?: string; repositoryId?: string; limit?: number }) {
    return this.prisma.job.findMany({
      where: {
        ...(filters.status && { status: filters.status as JobStatus }),
        ...(filters.repositoryId && { repositoryId: filters.repositoryId }),
      },
      include: { repository: { select: { name: true, owner: true, language: true } }, worker: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        repository: true,
        worker: true,
        logs: { orderBy: { timestamp: 'asc' } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async createJob(data: {
    repositoryId: string;
    branch: string;
    commitHash?: string;
    commitMsg?: string;
    author?: string;
    eventType: string;
    language: RepoLanguage;
    priority?: number;
    pipelineId?: string;
  }) {
    const repo = await this.prisma.repository.findUnique({ where: { id: data.repositoryId } });
    const job = await this.prisma.job.create({
      data: {
        ...data,
        name: `${repo.name}#${Date.now()}`,
        status: JobStatus.QUEUED,
        priority: data.priority || 5,
      },
      include: { repository: { select: { name: true, owner: true } } },
    });

    await this.pipelineQueue.add('execute', { jobId: job.id }, {
      priority: 10 - (data.priority || 5),
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.gateway.jobCreated(job);
    return job;
  }

  async updateStatus(id: string, status: JobStatus, extra?: any) {
    const job = await this.prisma.job.update({
      where: { id },
      data: {
        status,
        ...(status === JobStatus.RUNNING && { startedAt: new Date() }),
        ...(([JobStatus.SUCCESS, JobStatus.FAILED, JobStatus.CANCELLED, JobStatus.TIMEOUT] as JobStatus[]).includes(status) && {
          completedAt: new Date(),
        }),
        ...extra,
      },
      include: { repository: { select: { name: true, owner: true } }, worker: { select: { name: true } } },
    });
    this.gateway.jobUpdate(job);
    return job;
  }

  async cancel(id: string) {
    return this.updateStatus(id, JobStatus.CANCELLED);
  }

  async retry(id: string) {
    const job = await this.findOne(id);
    return this.createJob({
      repositoryId: job.repositoryId,
      branch: job.branch,
      commitHash: job.commitHash,
      commitMsg: job.commitMsg,
      author: job.author,
      eventType: job.eventType,
      language: job.language,
      priority: job.priority,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.job.delete({ where: { id } });
  }

  async getStats() {
    const [total, queued, running, success, failed] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: JobStatus.QUEUED } }),
      this.prisma.job.count({ where: { status: JobStatus.RUNNING } }),
      this.prisma.job.count({ where: { status: JobStatus.SUCCESS } }),
      this.prisma.job.count({ where: { status: JobStatus.FAILED } }),
    ]);
    return { total, queued, running, success, failed };
  }
}
