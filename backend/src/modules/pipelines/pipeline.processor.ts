import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job as BullJob } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { WorkersService } from '../workers/workers.service';
import { LogsService } from '../logs/logs.service';
import { AppGateway } from '../gateway/app.gateway';
import { JobStatus, WorkerStatus, RepoLanguage } from '@prisma/client';
import { DeploymentsService } from '../deployments/deployments.service';

const PIPELINE_STAGES = [
  'checkout',
  'install',
  'build',
  'test',
  'security_scan',
  'package',
  'deploy',
  'notify',
];

const STAGE_LOGS: Record<string, string[]> = {
  checkout: [
    'Initializing workspace...',
    'Cloning repository...',
    'Checking out branch {branch}...',
    'Commit: {commitHash}',
    'Checkout complete ✓',
  ],
  install: [
    'Reading dependency manifest...',
    'Resolving packages...',
    'Downloading dependencies...',
    'Installing packages...',
    'Dependencies installed ✓',
  ],
  build: [
    'Starting build process...',
    'Compiling source files...',
    'Bundling assets...',
    'Optimizing output...',
    'Build successful ✓',
  ],
  test: [
    'Discovering test suites...',
    'Running unit tests...',
    'Running integration tests...',
    'Generating coverage report...',
    'All tests passed ✓ (Coverage: {coverage}%)',
  ],
  security_scan: [
    'Initializing security scanner...',
    'Scanning dependencies for CVEs...',
    'Running SAST analysis...',
    'Checking secrets exposure...',
    'Security scan complete — 0 critical issues ✓',
  ],
  package: [
    'Creating artifact...',
    'Compressing build output...',
    'Generating checksums...',
    'Artifact packaged ✓',
  ],
  deploy: [
    'Connecting to deployment target...',
    'Uploading artifact...',
    'Running health checks...',
    'Switching traffic...',
    'Deployment successful ✓',
  ],
  notify: [
    'Sending build notification...',
    'Updating commit status...',
    'Notifying team channels...',
    'Pipeline complete ✓',
  ],
};

@Injectable()
@Processor('pipeline')
export class PipelineProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
    private workersService: WorkersService,
    private logsService: LogsService,
    private gateway: AppGateway,
    private deploymentsService: DeploymentsService,
  ) {
    super();
  }

  async process(bullJob: BullJob) {
    const { jobId } = bullJob.data;
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { repository: true },
    });
    if (!job) return;

    // Assign worker
    const worker = await this.workersService.assignWorker(job.language);
    if (!worker) {
      await this.jobsService.updateStatus(jobId, JobStatus.QUEUED);
      throw new Error('No available worker');
    }

    await this.workersService.setWorkerBusy(worker.id, jobId);
    await this.jobsService.updateStatus(jobId, JobStatus.RUNNING, { workerId: worker.id });

    const stages: string[] = (job.repository.pipelineConfig as any)?.stages || PIPELINE_STAGES;
    const stageResults: Record<string, any> = {};

    try {
      for (const stage of stages) {
        await this.jobsService.updateStatus(jobId, JobStatus.RUNNING, { currentStage: stage });
        const stageLogs = STAGE_LOGS[stage] || [`Executing ${stage}...`, `${stage} complete ✓`];

        for (const logTemplate of stageLogs) {
          const message = logTemplate
            .replace('{branch}', job.branch)
            .replace('{commitHash}', job.commitHash?.slice(0, 7) || 'unknown')
            .replace('{coverage}', String(Math.floor(Math.random() * 20) + 75));

          await this.logsService.append(jobId, stage, 'INFO', message);
          await this.sleep(200 + Math.random() * 400);
        }

        // Simulate random failure (10% chance per stage, except checkout)
        if (stage !== 'checkout' && Math.random() < 0.08) {
          throw new Error(`Stage '${stage}' failed: unexpected error`);
        }

        stageResults[stage] = 'success';
      }

      const duration = Math.floor((Date.now() - job.createdAt.getTime()) / 1000);
      await this.jobsService.updateStatus(jobId, JobStatus.SUCCESS, { stages: stageResults, duration });

      // Create deployment record
      if (stages.includes('deploy')) {
        await this.deploymentsService.create({
          repositoryId: job.repositoryId,
          jobId: job.id,
          environment: job.repository.environment,
          version: job.commitHash?.slice(0, 7) || `v${Date.now()}`,
          commitHash: job.commitHash,
          status: 'SUCCESS',
        });
      }
    } catch (err) {
      await this.logsService.append(jobId, job.currentStage || 'unknown', 'ERROR', `❌ ${err.message}`);
      const duration = Math.floor((Date.now() - job.createdAt.getTime()) / 1000);
      await this.jobsService.updateStatus(jobId, JobStatus.FAILED, { stages: stageResults, duration });
    } finally {
      await this.workersService.setWorkerIdle(worker.id);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
