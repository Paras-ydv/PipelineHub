import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { randomBytes } from 'crypto';
import axios from 'axios';

@Injectable()
export class RepositoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.repository.findMany({
      where: { userId },
      include: { _count: { select: { jobs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id },
      include: { jobs: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!repo) throw new NotFoundException('Repository not found');
    return repo;
  }

  async create(dto: any, userId: string) {
    const fullName = `${dto.owner}/${dto.name}`;
    const exists = await this.prisma.repository.findUnique({ where: { fullName } });
    if (exists) throw new ConflictException('Repository already registered');
    const webhookSecret = randomBytes(20).toString('hex');
    return this.prisma.repository.create({
      data: { ...dto, fullName, userId, webhookSecret },
    });
  }

  async update(id: string, dto: any) {
    await this.findOne(id);
    return this.prisma.repository.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.repository.delete({ where: { id } });
  }

  async toggle(id: string) {
    const repo = await this.findOne(id);
    return this.prisma.repository.update({ where: { id }, data: { isActive: !repo.isActive } });
  }

  async toggleDemo(id: string) {
    const repo = await this.findOne(id);
    return this.prisma.repository.update({ where: { id }, data: { autoDemo: !repo.autoDemo } });
  }

  async registerWebhook(id: string, webhookUrl?: string) {
    const repo = await this.findOne(id);
    const token = repo.githubToken || process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GitHub token required');

    const url = webhookUrl || `${process.env.BACKEND_URL}/api/webhooks/github`;
    const headers = { Authorization: `token ${token}`, 'User-Agent': 'PipelineHub' };
    const hookPayload = {
      name: 'web', active: true,
      events: repo.eventTypes?.length ? repo.eventTypes : ['push', 'pull_request', 'release'],
      config: { url, content_type: 'json', secret: repo.webhookSecret },
    };

    try {
      let hookId: string;

      if (repo.webhookId) {
        // Update existing webhook instead of creating duplicate
        try {
          const res = await axios.patch(
            `https://api.github.com/repos/${repo.fullName}/hooks/${repo.webhookId}`,
            hookPayload, { headers },
          );
          hookId = String(res.data.id);
        } catch {
          // Hook was deleted on GitHub side — create fresh
          const res = await axios.post(
            `https://api.github.com/repos/${repo.fullName}/hooks`,
            hookPayload, { headers },
          );
          hookId = String(res.data.id);
        }
      } else {
        // Check if a hook with this URL already exists
        try {
          const existing = await axios.get(
            `https://api.github.com/repos/${repo.fullName}/hooks`, { headers },
          );
          const found = existing.data.find((h: any) => h.config?.url?.includes('webhooks/github'));
          if (found) {
            await axios.patch(
              `https://api.github.com/repos/${repo.fullName}/hooks/${found.id}`,
              hookPayload, { headers },
            );
            hookId = String(found.id);
          } else {
            const res = await axios.post(
              `https://api.github.com/repos/${repo.fullName}/hooks`,
              hookPayload, { headers },
            );
            hookId = String(res.data.id);
          }
        } catch {
          const res = await axios.post(
            `https://api.github.com/repos/${repo.fullName}/hooks`,
            hookPayload, { headers },
          );
          hookId = String(res.data.id);
        }
      }

      return this.prisma.repository.update({
        where: { id },
        data: { webhookId: hookId, webhookUrl: url },
      });
    } catch (err) {
      throw new Error(`GitHub webhook registration failed: ${err.response?.data?.message || err.message}`);
    }
  }

  findAllActive() {
    return this.prisma.repository.findMany({ where: { isActive: true } });
  }

  findDemoRepos() {
    return this.prisma.repository.findMany({ where: { autoDemo: true, isActive: true } });
  }
}
