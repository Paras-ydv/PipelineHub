import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import { AppGateway } from '../gateway/app.gateway';
import { DeploymentStatus } from '@prisma/client';

@Injectable()
export class DeploymentsService {
  constructor(private prisma: PrismaService, private gateway: AppGateway) {}

  findAll(repositoryId?: string) {
    return this.prisma.deployment.findMany({
      where: repositoryId ? { repositoryId } : {},
      include: { repository: { select: { name: true, owner: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(data: {
    repositoryId: string;
    jobId?: string;
    environment: string;
    version: string;
    commitHash?: string;
    status?: string;
  }) {
    const deployment = await this.prisma.deployment.create({
      data: {
        ...data,
        status: (data.status as DeploymentStatus) || DeploymentStatus.SUCCESS,
        startedAt: new Date(),
        completedAt: new Date(),
        url: `https://${data.environment}.pipelinehub.dev/${data.version}`,
      },
      include: { repository: { select: { name: true, owner: true } } },
    });
    this.gateway.deploymentUpdate(deployment);
    return deployment;
  }
}
