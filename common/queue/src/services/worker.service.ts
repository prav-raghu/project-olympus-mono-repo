import { Worker, type Job, type WorkerOptions as BullWorkerOptions } from 'bullmq';
import { Redis, type RedisOptions } from 'ioredis';
import { Logger } from '@project-olympus/logging';
import { type QueueConfig, type JobData, type JobResult, type WorkerOptions } from '../types/queue.types';

export type JobProcessor<T, R = unknown> = (
  payload: T,
  job: Job<JobData<T>>,
) => Promise<JobResult<R>>;

export interface JobHandler<T = unknown, R = unknown> {
  name: string;
  processor: JobProcessor<T, R>;
}

export class WorkerService<T = unknown> {
  private readonly worker: Worker<JobData<T>>;
  private readonly logger: Logger;
  private readonly connection: Redis;
  private readonly handlers = new Map<string, JobProcessor<T, unknown>>();

  constructor(
    private readonly queueName: string,
    config?: Partial<QueueConfig>,
    options?: WorkerOptions,
  ) {
    this.logger = new Logger(`WorkerService:${queueName}`);

    const host = config?.host ?? process.env.REDIS_HOST ?? '127.0.0.1';
    const port = config?.port ?? (process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379);
    const password = config?.password ?? process.env.REDIS_PASSWORD;
    const prefix = config?.prefix ?? 'queue';

    const redisOptions: RedisOptions = {
      host,
      port,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

    if (password) {
      redisOptions.password = password;
    }

    this.connection = new Redis(redisOptions);

    const workerOptions: BullWorkerOptions = {
      connection: this.connection,
      prefix,
      concurrency: options?.concurrency ?? 5,
      lockDuration: options?.lockDuration ?? 30000,
      stalledInterval: options?.stalledInterval ?? 30000,
    };

    if (options?.limiter) {
      workerOptions.limiter = options.limiter;
    }

    this.worker = new Worker<JobData<T>>(
      queueName,
      async (job) => this.processJob(job),
      workerOptions,
    );

    this.setupEventListeners();
    this.logger.info('Worker initialized', { queueName, concurrency: options?.concurrency ?? 5 });
  }

  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      this.logger.debug('Job completed', {
        jobId: job.id,
        jobName: job.name,
        queue: this.queueName,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error('Job failed', {
        jobId: job?.id,
        jobName: job?.name,
        queue: this.queueName,
        error: error.message,
        attempts: job?.attemptsMade,
      });
    });

    this.worker.on('error', (error) => {
      this.logger.error('Worker error', { queue: this.queueName, error: error.message });
    });

    this.worker.on('stalled', (jobId) => {
      this.logger.warn('Job stalled', { jobId, queue: this.queueName });
    });
  }

  private async processJob(job: Job<JobData<T>>): Promise<JobResult<unknown>> {
    const handler = this.handlers.get(job.name);

    if (!handler) {
      this.logger.error('No handler registered for job', { jobName: job.name });
      return {
        success: false,
        error: `No handler registered for job: ${job.name}`,
      };
    }

    const startTime = Date.now();
    this.logger.debug('Processing job', {
      jobId: job.id,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
    });

    try {
      const result = await handler(job.data.payload, job);
      const duration = Date.now() - startTime;

      this.logger.debug('Job processed', {
        jobId: job.id,
        jobName: job.name,
        duration,
        success: result.success,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Job processing error', {
        jobId: job.id,
        jobName: job.name,
        error: err.message,
      });

      throw error;
    }
  }

  public registerHandler<R = unknown>(
    jobName: string,
    processor: JobProcessor<T, R>,
  ): void {
    this.handlers.set(jobName, processor as JobProcessor<T, unknown>);
    this.logger.info('Handler registered', { jobName, queue: this.queueName });
  }

  public registerHandlers(handlers: JobHandler<T>[]): void {
    for (const handler of handlers) {
      this.registerHandler(handler.name, handler.processor);
    }
  }

  public async pause(): Promise<void> {
    await this.worker.pause();
    this.logger.info('Worker paused', { queue: this.queueName });
  }

  public async resume(): Promise<void> {
    this.worker.resume();
    this.logger.info('Worker resumed', { queue: this.queueName });
  }

  public async close(): Promise<void> {
    await this.worker.close();
    await this.connection.quit();
    this.logger.info('Worker closed', { queue: this.queueName });
  }

  public isRunning(): boolean {
    return this.worker.isRunning();
  }

  public getWorker(): Worker<JobData<T>> {
    return this.worker;
  }
}
