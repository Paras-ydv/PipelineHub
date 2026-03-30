import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WebhooksService } from '../webhooks/webhooks.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { AppGateway } from '../gateway/app.gateway';

const EVENT_TYPES = ['push', 'pull_request', 'release'];

const STORY_STEPS = [
  { eventType: 'push',         repoIndex: 0, branch: 'main',           delay: 0 },
  { eventType: 'push',         repoIndex: 1, branch: 'main',           delay: 6000 },
  { eventType: 'pull_request', repoIndex: 0, branch: 'feature/demo-1', delay: 12000 },
  { eventType: 'pull_request', repoIndex: 1, branch: 'feature/demo-2', delay: 18000 },
  { eventType: 'push',         repoIndex: 0, branch: 'feature/demo-1', delay: 24000 },
  { eventType: 'release',      repoIndex: 1, branch: 'main',           delay: 30000 },
  { eventType: 'push',         repoIndex: 0, branch: 'main',           delay: 36000 },
  { eventType: 'release',      repoIndex: 0, branch: 'main',           delay: 42000 },
];

@Injectable()
export class DemoService {
  private demoEnabled = true;
  private storyRunning = false;

  constructor(
    private webhooksService: WebhooksService,
    private reposService: RepositoriesService,
    private gateway: AppGateway,
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
    return this.webhooksService.simulateEvent(repositoryId, type, branch);
  }

  async triggerHighLoad(repositoryId?: string) {
    const repos = repositoryId
      ? [await this.reposService.findOne(repositoryId)]
      : await this.reposService.findAllActive();
    if (!repos.length) return { triggered: 0 };

    const count = 10 + Math.floor(Math.random() * 10); // 10-20 jobs
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

    for (const step of STORY_STEPS) {
      await this.sleep(step.delay === 0 ? 0 : 6000);
      const repo = repos[step.repoIndex % repos.length];
      await this.webhooksService.simulateEvent(repo.id, step.eventType, step.branch);
      this.gateway.emit('demo:story_step', { step: STORY_STEPS.indexOf(step) + 1, total: STORY_STEPS.length, eventType: step.eventType, repo: repo.fullName });
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
    const shuffled = repos.sort(() => Math.random() - 0.5).slice(0, count);
    for (const repo of shuffled) {
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      await this.webhooksService.simulateEvent(repo.id, eventType);
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
