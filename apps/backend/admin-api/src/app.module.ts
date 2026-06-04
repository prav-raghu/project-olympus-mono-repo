import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@project-olympus/database';
import { RateLimitConfig } from './config/rate-limit.config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { BatchModule } from './modules/batch/batch.module';
import { ReportingModule } from './modules/reporting/reporting.module';

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([RateLimitConfig.global]),
    AuthModule,
    HealthModule,
    UsersModule,
    BatchModule,
    ReportingModule,
  ],
})
export class AppModule {}
