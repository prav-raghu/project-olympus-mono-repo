import { Injectable, Inject, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { SHARED_DB } from '@project-olympus/database';
import type { SharedPrismaClient as PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { WebhookProcessorJob } from '../../jobs/webhook-processor.job';

@Injectable()
export class JobsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(JobsService.name);
  private readonly jobs = new Map<string, { start: () => void; stop: () => void }>();

  constructor(@Inject(SHARED_DB) private readonly prisma: PrismaClient) {}

  public onApplicationBootstrap(): void {
    const webhookProcessorJob = new WebhookProcessorJob(this.prisma as never, 60000);
    this.jobs.set('webhookProcessor', webhookProcessorJob);
    this.startAll();
  }

  public onApplicationShutdown(): void {
    this.stopAll();
  }

  private startAll(): void {
    for (const [name, job] of this.jobs.entries()) {
      try {
        job.start();
        this.logger.info(`Started job: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to start job: ${name}`, error as Error);
      }
    }
  }

  private stopAll(): void {
    for (const [name, job] of this.jobs.entries()) {
      try {
        job.stop();
        this.logger.info(`Stopped job: ${name}`);
      } catch (error) {
        this.logger.error(`Failed to stop job: ${name}`, error as Error);
      }
    }
  }
}
