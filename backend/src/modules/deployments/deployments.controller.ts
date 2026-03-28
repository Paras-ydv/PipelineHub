import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('deployments')
export class DeploymentsController {
  constructor(private svc: DeploymentsService) {}

  @Get()
  findAll(@Query('repositoryId') repositoryId?: string) {
    return this.svc.findAll(repositoryId);
  }
}
