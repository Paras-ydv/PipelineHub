import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebhooksService } from '../webhooks/webhooks.service';
import { RepositoriesService } from '../repositories/repositories.service';
import { AppGateway } from '../gateway/app.gateway';

const EVENT_TYPES = ['push', 'pull_request', 'release'];

@Injectable()
export class DemoService {
  private demoEnabled = true;

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
    return { demoEnabled: this.demoEnabled };
  }

  async triggerForRepo(repositoryId: string) {
    const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    return this.webhooksService.simulateEvent(repositoryId, eventType);
  }

  @Cron('*/20 * * * * *') // Every 20 seconds
  async runDemoEvents() {
    if (!this.demoEnabled) return;

    const repos = await this.reposService.findDemoRepos();
    if (!repos.length) return;

    // Trigger 1-2 random repos
    const count = Math.random() < 0.4 ? 2 : 1;
    const shuffled = repos.sort(() => Math.random() - 0.5).slice(0, count);

    for (const repo of shuffled) {
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      await this.webhooksService.simulateEvent(repo.id, eventType);
    }
  }
}
