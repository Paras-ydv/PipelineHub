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

  async registerWebhook(id: string, webhookUrl: string) {
    const repo = await this.findOne(id);
    if (!repo.githubToken) throw new Error('GitHub token required');

    try {
      const response = await axios.post(
        `https://api.github.com/repos/${repo.fullName}/hooks`,
        {
          name: 'web',
          active: true,
          events: repo.eventTypes,
          config: {
            url: webhookUrl || `${process.env.BACKEND_URL}/api/webhooks/github`,
            content_type: 'json',
            secret: repo.webhookSecret,
          },
        },
        { headers: { Authorization: `token ${repo.githubToken}`, 'User-Agent': 'PipelineHub' } },
      );

      return this.prisma.repository.update({
        where: { id },
        data: { webhookId: String(response.data.id), webhookUrl },
      });
    } catch (err) {
      throw new Error(`GitHub webhook registration failed: ${err.message}`);
    }
  }

  findAllActive() {
    return this.prisma.repository.findMany({ where: { isActive: true } });
  }

  findDemoRepos() {
    return this.prisma.repository.findMany({ where: { autoDemo: true, isActive: true } });
  }
}
