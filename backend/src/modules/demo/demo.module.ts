import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [WebhooksModule, RepositoriesModule, GatewayModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
