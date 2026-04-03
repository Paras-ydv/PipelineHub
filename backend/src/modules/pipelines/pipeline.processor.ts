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
    '$ git init workspace',
    '$ git remote add origin https://github.com/{repo}.git',
    'Cloning into workspace...',
    '$ git fetch --depth=1 origin {branch}',
    '$ git checkout {branch}',
    'HEAD is now at {commitHash} {commitMsg}',
    'Author: {author}',
    'Files changed: {filesChanged}',
    '✓ Checkout complete',
  ],
  install: [
    '$ cat package.json | grep dependencies',
    'Found {depCount} dependencies to install',
    '$ npm install --frozen-lockfile',
    'Resolving dependency tree...',
    'Downloading packages from registry...',
    'npm warn deprecated some-package@1.0.0',
    'added {depCount} packages in {installTime}s',
    '✓ Dependencies installed',
  ],
  build: [
    '$ npm run build',
    'Compiling TypeScript...',
    'Bundling modules...',
    'Tree-shaking unused exports...',
    'Minifying output...',
    'Build output: dist/ ({buildSize}kb)',
    '✓ Build successful',
  ],
  test: [
    '$ npm test -- --coverage',
    'Discovering test suites...',
    'PASS src/__tests__/unit.test.ts',
    'PASS src/__tests__/integration.test.ts',
    'Test Suites: 2 passed, 2 total',
    'Tests: {testCount} passed, {testCount} total',
    'Coverage: {coverage}% statements | {coverage}% branches',
    '✓ All tests passed',
  ],
  security_scan: [
    '$ npm audit',
    'Scanning {depCount} packages for vulnerabilities...',
    'Running SAST analysis on source files...',
    'Checking for exposed secrets...',
    'Scanning Dockerfile and configs...',
    'found 0 critical, 0 high vulnerabilities',
    '✓ Security scan passed',
  ],
  package: [
    '$ docker build -t {repo}:{commitHash} .',
    'Step 1/8 : FROM node:20-alpine',
    'Step 2/8 : WORKDIR /app',
    'Step 3/8 : COPY package*.json ./',
    'Step 4/8 : RUN npm install --production',
    'Step 5/8 : COPY . .',
    'Step 6/8 : RUN npm run build',
    'Successfully built {commitHash}',
    'Successfully tagged {repo}:{commitHash}',
    '✓ Artifact packaged ({buildSize}mb)',
  ],
  deploy: [
    '$ kubectl set image deployment/{repo} app={repo}:{commitHash}',
    'Connecting to cluster...',
    'Uploading image to registry...',
    'Rolling update started...',
    'Waiting for rollout to finish...',
    'deployment.apps/{repo} image updated',
    '$ kubectl rollout status deployment/{repo}',
    'Waiting for deployment to be ready...',
    '✓ Deployment successful → {environment}',
  ],
  notify: [
    'Sending Slack notification...',
    'Updating GitHub commit status → success',
    'POST https://api.github.com/repos/{repo}/statuses/{commitHash}',
    'Notifying team channel #deployments',
    'Build report generated',
    '✓ Pipeline complete — {commitHash} deployed to {environment}',
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
          const filesChanged = Math.floor(Math.random() * 8) + 1;
          const depCount = Math.floor(Math.random() * 200) + 50;
          const testCount = Math.floor(Math.random() * 40) + 10;
          const buildSize = Math.floor(Math.random() * 400) + 100;
          const installTime = (Math.random() * 8 + 2).toFixed(1);
          const coverage = Math.floor(Math.random() * 20) + 75;
          const repoName = job.repository?.name || 'app';

          const message = logTemplate
            .replace(/{repo}/g, repoName)
            .replace(/{branch}/g, job.branch)
            .replace(/{commitHash}/g, job.commitHash?.slice(0, 7) || 'unknown')
            .replace(/{commitMsg}/g, job.commitMsg || 'update')
            .replace(/{author}/g, job.author || 'unknown')
            .replace(/{filesChanged}/g, String(filesChanged))
            .replace(/{depCount}/g, String(depCount))
            .replace(/{testCount}/g, String(testCount))
            .replace(/{buildSize}/g, String(buildSize))
            .replace(/{installTime}/g, installTime)
            .replace(/{coverage}/g, String(coverage))
            .replace(/{environment}/g, job.repository?.environment || 'production');

          const level = message.includes('warn') ? 'WARN' :
            message.includes('Error') || message.includes('failed') ? 'ERROR' : 'INFO';

          await this.logsService.append(jobId, stage, level, message);
          await this.sleep(150 + Math.random() * 300);
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
