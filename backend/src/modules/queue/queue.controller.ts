import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private svc: QueueService) {}

  @Get('metrics')
  getMetrics() { return this.svc.getMetrics(); }

  @Get('history')
  getHistory() { return this.svc.getHistory(); }
}
