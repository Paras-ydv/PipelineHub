import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { JobsModule } from '../jobs/jobs.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [JobsModule, GatewayModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
