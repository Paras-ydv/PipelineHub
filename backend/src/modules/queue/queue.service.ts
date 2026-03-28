import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../config/prisma.service';
import { AppGateway } from '../gateway/app.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('pipeline') private queue: Queue,
    private prisma: PrismaService,
    private gateway: AppGateway,
  ) {}

  async getMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  getHistory() {
    return this.prisma.queueMetric.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async snapshotMetrics() {
    const metrics = await this.getMetrics();
    await this.prisma.queueMetric.create({
      data: { queueName: 'pipeline', ...metrics },
    });
    this.gateway.queueUpdate(metrics);
  }
}
