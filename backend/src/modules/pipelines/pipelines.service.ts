import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.pipeline.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findOne(id: string) {
    return this.prisma.pipeline.findUnique({ where: { id }, include: { jobs: { take: 20, orderBy: { createdAt: 'desc' } } } });
  }

  create(dto: any) {
    return this.prisma.pipeline.create({ data: dto });
  }
}
