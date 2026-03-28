import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private svc: LogsService) {}

  @Get(':jobId')
  findByJob(@Param('jobId') jobId: string) {
    return this.svc.findByJob(jobId);
  }
}
