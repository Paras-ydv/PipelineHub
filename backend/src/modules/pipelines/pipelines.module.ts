import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { PipelineProcessor } from './pipeline.processor';
import { JobsModule } from '../jobs/jobs.module';
import { WorkersModule } from '../workers/workers.module';
import { LogsModule } from '../logs/logs.module';
import { GatewayModule } from '../gateway/gateway.module';
import { DeploymentsModule } from '../deployments/deployments.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'pipeline' }),
    JobsModule,
    WorkersModule,
    LogsModule,
    GatewayModule,
    DeploymentsModule,
  ],
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelineProcessor],
  exports: [PipelinesService],
})
export class PipelinesModule {}
