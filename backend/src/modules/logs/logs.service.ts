import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AppGateway } from '../gateway/app.gateway';
import { LogLevel } from '@prisma/client';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService, private gateway: AppGateway) {}

  async append(jobId: string, stage: string, level: string, message: string) {
    const log = await this.prisma.buildLog.create({
      data: { jobId, stage, level: level as LogLevel, message },
    });
    this.gateway.logAppend(jobId, log);
    return log;
  }

  findByJob(jobId: string) {
    return this.prisma.buildLog.findMany({
      where: { jobId },
      orderBy: { timestamp: 'asc' },
    });
  }

  deleteByJob(jobId: string) {
    return this.prisma.buildLog.deleteMany({ where: { jobId } });
  }
}
