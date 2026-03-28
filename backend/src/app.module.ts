import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './config/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PipelinesModule } from './modules/pipelines/pipelines.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { WorkersModule } from './modules/workers/workers.module';
import { LogsModule } from './modules/logs/logs.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { QueueModule } from './modules/queue/queue.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { DemoModule } from './modules/demo/demo.module';
import { EventsModule } from './modules/events/events.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    RepositoriesModule,
    WebhooksModule,
    PipelinesModule,
    JobsModule,
    WorkersModule,
    LogsModule,
    DeploymentsModule,
    QueueModule,
    SchedulerModule,
    DemoModule,
    EventsModule,
    GatewayModule,
  ],
})
export class AppModule {}
