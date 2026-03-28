import { Controller, Post, Body, Headers, RawBodyRequest, Req, HttpCode } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private svc: WebhooksService) {}

  @Post('github')
  @HttpCode(200)
  async githubWebhook(
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-github-event') event: string,
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: any,
  ) {
    return this.svc.handleGithubWebhook(event, signature, payload, req.rawBody);
  }

  @Post('simulate')
  @HttpCode(200)
  async simulate(@Body() body: { repositoryId: string; eventType: string; branch?: string }) {
    return this.svc.simulateEvent(body.repositoryId, body.eventType, body.branch);
  }
}
