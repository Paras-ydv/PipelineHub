import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private svc: JobsService) {}

  @Get()
  findAll(@Query('status') status?: string, @Query('repositoryId') repositoryId?: string, @Query('limit') limit?: string) {
    return this.svc.findAll({ status, repositoryId, limit: limit ? parseInt(limit) : 50 });
  }

  @Get('stats')
  stats() {
    return this.svc.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    return this.svc.retry(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
