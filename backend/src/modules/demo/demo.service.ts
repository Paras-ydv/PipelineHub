import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RepositoriesService } from '../repositories/repositories.service';
import { AppGateway } from '../gateway/app.gateway';
import { GitPushService } from './git-push.service';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class DemoService {
  private demoEnabled = false;
  private storyRunning = false;

  constructor(
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
    const repo = await this.prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo?.githubToken || !repo?.webhookId) {
      return { status: 'skipped', reason: 'No GitHub token or webhook registered' };
    }
    const result = await this.gitPush.pushToRepo({
      fullName: repo.fullName,
      githubToken: repo.githubToken,
      branch: branch || repo.branch,
      language: repo.language,
    });
    if (!result) return { status: 'failed', reason: 'GitHub push failed' };
    this.gateway.emit('demo:real_push', { repo: repo.fullName, sha: result.sha, message: result.message });
    return { status: 'pushed', sha: result.sha, message: result.message };
  }

  async triggerHighLoad(repositoryId?: string) {
    const repos = repositoryId
      ? [await this.prisma.repository.findUnique({ where: { id: repositoryId } })]
      : await this.prisma.repository.findMany({ where: { isActive: true, webhookId: { not: null } } });

    const eligible = repos.filter(r => r?.githubToken && r?.webhookId);
    if (!eligible.length) return { triggered: 0, reason: 'No repos with token+webhook' };

    const count = 10 + Math.floor(Math.random() * 10);
    let triggered = 0;
    for (let i = 0; i < count; i++) {
      const repo = eligible[Math.floor(Math.random() * eligible.length)];
      const result = await this.gitPush.pushToRepo({
        fullName: repo.fullName,
        githubToken: repo.githubToken,
        branch: repo.branch,
        language: repo.language,
      });
      if (result) {
        triggered++;
        this.gateway.emit('demo:real_push', { repo: repo.fullName, sha: result.sha, message: result.message });
      }
      await this.sleep(500);
    }
    return { triggered };
  }

  async runStoryMode() {
    if (this.storyRunning) return { status: 'already_running' };

    const repos = await this.prisma.repository.findMany({
      where: { isActive: true, webhookId: { not: null } },
    });
    const eligible = repos.filter(r => r.githubToken);
    if (!eligible.length) return { status: 'no_repos', reason: 'No repos with token+webhook' };

    this.storyRunning = true;
    this.gateway.emit('demo:story_started', { steps: eligible.length * 2 });

    let step = 0;
    for (const repo of eligible) {
      for (let i = 0; i < 2; i++) {
        if (step > 0) await this.sleep(8000);
        const result = await this.gitPush.pushToRepo({
          fullName: repo.fullName,
          githubToken: repo.githubToken,
          branch: repo.branch,
          language: repo.language,
        });
        step++;
        if (result) {
          this.gateway.emit('demo:real_push', { repo: repo.fullName, sha: result.sha, message: result.message });
          this.gateway.emit('demo:story_step', {
            step,
            total: eligible.length * 2,
            repo: repo.fullName,
            sha: result.sha,
            message: result.message,
          });
        }
      }
    }

    this.storyRunning = false;
    this.gateway.emit('demo:story_completed', {});
    return { status: 'completed', pushed: step };
  }

  @Cron('*/30 * * * * *')
  async runDemoEvents() {
    if (!this.demoEnabled) return;

    const repos = await this.prisma.repository.findMany({
      where: { autoDemo: true, isActive: true, webhookId: { not: null } },
    });
    const eligible = repos.filter(r => r.githubToken);
    if (!eligible.length) return;

    const repo = eligible[Math.floor(Math.random() * eligible.length)];
    const result = await this.gitPush.pushToRepo({
      fullName: repo.fullName,
      githubToken: repo.githubToken,
      branch: repo.branch,
      language: repo.language,
    });
    if (result) {
      this.gateway.emit('demo:real_push', { repo: repo.fullName, sha: result.sha, message: result.message });
    }
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
