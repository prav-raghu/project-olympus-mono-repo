import type { PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import type { EmailService } from '@project-olympus/email';
import { WebhookProcessorJob } from '../jobs/webhook-processor.job';

interface SchedulableJob {
  start(): void;
  stop(): void;
}

export class CronSchedulerService {
  private readonly logger = new Logger(CronSchedulerService.name);
  private readonly jobs = new Map<string, SchedulableJob>();

  constructor(
    prisma: PrismaClient,
    private readonly emailService: EmailService,
  ) {
    this.jobs.set('webhookProcessor', new WebhookProcessorJob(prisma));
  }

  public startAll(): void {
    for (const [name, job] of this.jobs) {
      this.logger.info(`Starting job: ${name}`);
      job.start();
    }
  }

  public stopAll(): void {
    for (const [name, job] of this.jobs) {
      this.logger.info(`Stopping job: ${name}`);
      job.stop();
    }
  }

  public startJob(name: string): void {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job not found: ${name}`);
    }
    job.start();
  }

  public stopJob(name: string): void {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`Job not found: ${name}`);
    }
    job.stop();
  }
}
