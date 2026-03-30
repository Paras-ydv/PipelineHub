import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { AppGateway } from '../gateway/app.gateway';
import { createHmac } from 'crypto';
import { RepoLanguage } from '@prisma/client';

@Injectable()
export class WebhooksService {
  constructor(
    private prisma: PrismaService,
    private jobsService: JobsService,
    private gateway: AppGateway,
  ) {}

  async handleGithubWebhook(event: string, signature: string, payload: any, rawBody: Buffer) {
    const repoFullName = payload?.repository?.full_name;
    if (!repoFullName) throw new BadRequestException('Invalid payload');

    const repo = await this.prisma.repository.findUnique({ where: { fullName: repoFullName } });
    if (!repo || !repo.isActive) return { status: 'ignored' };

    // Validate signature only when we have both rawBody and a stored secret
    if (signature && repo.webhookSecret && rawBody) {
      const expected = `sha256=${createHmac('sha256', repo.webhookSecret).update(rawBody).digest('hex')}`;
      if (signature !== expected) throw new BadRequestException('Invalid signature');
    }

    // Store webhook event
    await this.prisma.webhookEvent.create({
      data: { repositoryId: repo.id, eventType: event, payload, signature, processed: true },
    });

    // Extract metadata
    const branch = payload.ref?.replace('refs/heads/', '') || payload.pull_request?.head?.ref || repo.branch;
    const commitHash = payload.after || payload.pull_request?.head?.sha || null;
    const commitMsg = payload.head_commit?.message || payload.pull_request?.title || 'No message';
    const author = payload.pusher?.name || payload.pull_request?.user?.login || 'unknown';

    const job = await this.jobsService.createJob({
      repositoryId: repo.id,
      branch,
      commitHash,
      commitMsg,
      author,
      eventType: event,
      language: repo.language,
    });

    this.gateway.webhookReceived({ event, repo: repo.fullName, jobId: job.id });
    return { status: 'queued', jobId: job.id };
  }

  async simulateEvent(repositoryId: string, eventType: string, branch?: string) {
    const repo = await this.prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) throw new BadRequestException('Repository not found');

    const commitHash = Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 9);
    const authors = ['alice', 'bob', 'charlie', 'diana', 'eve'];
    const messages = [
      'feat: add new feature',
      'fix: resolve critical bug',
      'chore: update dependencies',
      'refactor: improve performance',
      'docs: update README',
    ];

    const job = await this.jobsService.createJob({
      repositoryId: repo.id,
      branch: branch || repo.branch,
      commitHash,
      commitMsg: messages[Math.floor(Math.random() * messages.length)],
      author: authors[Math.floor(Math.random() * authors.length)],
      eventType,
      language: repo.language,
    });

    this.gateway.webhookReceived({ event: eventType, repo: repo.fullName, jobId: job.id, simulated: true });
    return { status: 'queued', jobId: job.id };
  }
}
