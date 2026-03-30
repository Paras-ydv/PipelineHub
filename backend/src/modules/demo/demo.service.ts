import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebhooksService } from '../webhooks/webhooks.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { AppGateway } from '../gateway/app.gateway';
import { GitPushService } from './git-push.service';
import { PrismaService } from '../../config/prisma.service';

const EVENT_TYPES = ['push', 'pull_request', 'release'];

const STORY_STEPS = [
  { eventType: 'push',         repoIndex: 0, branch: 'main',           realPush: true  },
  { eventType: 'push',         repoIndex: 1, branch: 'main',           realPush: true  },
  { eventType: 'pull_request', repoIndex: 0, branch: 'feature/demo-1', realPush: false },
  { eventType: 'pull_request', repoIndex: 1, branch: 'feature/demo-2', realPush: false },
  { eventType: 'push',         repoIndex: 2, branch: 'main',           realPush: true  },
  { eventType: 'release',      repoIndex: 1, branch: 'main',           realPush: false },
  { eventType: 'push',         repoIndex: 0, branch: 'main',           realPush: true  },
  { eventType: 'release',      repoIndex: 2, branch: 'main',           realPush: false },
];

@Injectable()
export class DemoService {
  private demoEnabled = true;
  private storyRunning = false;

  constructor(
    private webhooksService: WebhooksService,
    private reposService: RepositoriesService,
    private gateway: AppGateway,
    private gitPush: GitPushService,
    private prisma: PrismaService,
  ) {}

  setEnabled(enabled: boolean) {
    this.demoEnabled = enabled;
    return { demoEnabled: this.demoEnabled };
  }

  getStatus() {
    return { demoEnabled: this.demoEnabled, storyRunning: this.storyRunning };
  }

  async triggerForRepo(repositoryId: string, eventType?: string, branch?: string) {
    const type = eventType || EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const repo = await this.prisma.repository.findUnique({ where: { id: repositoryId } });

    // For push events, make a real commit if token available
    if (type === 'push' && repo?.githubToken && repo?.webhookId) {
      const result = await this.gitPush.pushToRepo({
        fullName: repo.fullName,
        githubToken: repo.githubToken,
        branch: branch || repo.branch,
        language: repo.language,
      });
      if (result) {
        // Real push made — GitHub webhook will fire automatically
        this.gateway.emit('demo:real_push', { repo: repo.fullName, sha: result.sha, message: result.message });
        return { status: 'real_push', sha: result.sha, message: result.message };
      }
    }

    // Fallback to simulation
    return this.webhooksService.simulateEvent(repositoryId, type, branch);
  }

  async triggerHighLoad(repositoryId?: string) {
    const repos = repositoryId
      ? [await this.reposService.findOne(repositoryId)]
      : await this.reposService.findAllActive();
    if (!repos.length) return { triggered: 0 };

    const count = 10 + Math.floor(Math.random() * 10);
    const results = [];
    for (let i = 0; i < count; i++) {
      const repo = repos[Math.floor(Math.random() * repos.length)];
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      results.push(await this.webhooksService.simulateEvent(repo.id, eventType));
      await this.sleep(200);
    }
    return { triggered: results.length };
  }

  async runStoryMode() {
    if (this.storyRunning) return { status: 'already_running' };
    const repos = await this.reposService.findAllActive();
    if (!repos.length) return { status: 'no_repos' };

    this.storyRunning = true;
    this.gateway.emit('demo:story_started', { steps: STORY_STEPS.length });

    for (const [i, step] of STORY_STEPS.entries()) {
      if (i > 0) await this.sleep(6000);
      const repo = repos[step.repoIndex % repos.length];
      const fullRepo = await this.prisma.repository.findUnique({ where: { id: repo.id } });

      if (step.realPush && fullRepo?.githubToken && fullRepo?.webhookId) {
        const result = await this.gitPush.pushToRepo({
          fullName: fullRepo.fullName,
          githubToken: fullRepo.githubToken,
          branch: step.branch,
          language: fullRepo.language,
        });
        if (result) {
          this.gateway.emit('demo:real_push', { repo: fullRepo.fullName, sha: result.sha, message: result.message });
        } else {
          await this.webhooksService.simulateEvent(repo.id, step.eventType, step.branch);
        }
      } else {
        await this.webhooksService.simulateEvent(repo.id, step.eventType, step.branch);
      }

      this.gateway.emit('demo:story_step', {
        step: i + 1,
        total: STORY_STEPS.length,
        eventType: step.eventType,
        repo: repo.fullName,
        realPush: step.realPush,
      });
    }

    this.storyRunning = false;
    this.gateway.emit('demo:story_completed', {});
    return { status: 'completed' };
  }

  @Cron('*/20 * * * * *')
  async runDemoEvents() {
    if (!this.demoEnabled) return;
    const repos = await this.reposService.findDemoRepos();
    if (!repos.length) return;

    const count = Math.random() < 0.4 ? 2 : 1;
    const shuffled = [...repos].sort(() => Math.random() - 0.5).slice(0, count);

    for (const repo of shuffled) {
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      const fullRepo = await this.prisma.repository.findUnique({ where: { id: repo.id } });

      // Real push for push events when webhook is registered
      if (eventType === 'push' && fullRepo?.githubToken && fullRepo?.webhookId) {
        const result = await this.gitPush.pushToRepo({
          fullName: fullRepo.fullName,
          githubToken: fullRepo.githubToken,
          branch: fullRepo.branch,
          language: fullRepo.language,
        });
        if (result) {
          this.gateway.emit('demo:real_push', { repo: fullRepo.fullName, sha: result.sha, message: result.message });
          continue; // GitHub webhook will trigger the job automatically
        }
      }

      // Simulate for PR/release or if push failed
      await this.webhooksService.simulateEvent(repo.id, eventType);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
