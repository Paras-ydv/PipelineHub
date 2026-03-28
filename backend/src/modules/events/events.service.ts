import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  create(type: string, payload: any, userId?: string) {
    return this.prisma.event.create({ data: { type, payload, userId } });
  }
}
