import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { GatewayHealthService } from '../../services/health.service';

@Module({
  controllers: [HealthController],
  providers: [GatewayHealthService],
})
export class HealthModule {}
