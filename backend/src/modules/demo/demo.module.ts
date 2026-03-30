import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { GitPushService } from './git-push.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { GatewayModule } from '../gateway/gateway.module';
import { PrismaModule } from '../../config/prisma.module';

@Module({
  imports: [WebhooksModule, RepositoriesModule, GatewayModule, PrismaModule],
  controllers: [DemoController],
  providers: [DemoService, GitPushService],
})
export class DemoModule {}
