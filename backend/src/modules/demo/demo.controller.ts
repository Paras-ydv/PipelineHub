import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DemoService } from './demo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('demo')
export class DemoController {
  constructor(private svc: DemoService) {}

  @Get('status')
  status() { return this.svc.getStatus(); }

  @Post('toggle')
  toggle(@Body('enabled') enabled: boolean) { return this.svc.setEnabled(enabled); }

  @Post('trigger/:repositoryId')
  trigger(
    @Param('repositoryId') repositoryId: string,
    @Body('eventType') eventType?: string,
    @Body('branch') branch?: string,
  ) { return this.svc.triggerForRepo(repositoryId, eventType, branch); }

  @Post('high-load')
  highLoad(@Body('repositoryId') repositoryId?: string) {
    return this.svc.triggerHighLoad(repositoryId);
  }

  @Post('story')
  story() { return this.svc.runStoryMode(); }
}
