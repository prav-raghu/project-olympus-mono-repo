import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@project-olympus/database';
import { RateLimitConfig } from './config/rate-limit.config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    DatabaseModule,
    ThrottlerModule.forRoot([RateLimitConfig.global]),
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
