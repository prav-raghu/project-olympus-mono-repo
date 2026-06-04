import { Logger } from "@project-olympus/logging";
import { Queue, QueueEvents, type Job, type QueueEventsOptions, type QueueOptions } from "bullmq";
import { Redis, type RedisOptions } from "ioredis";
import {
    mapToJobsOptions,
    type JobData,
    type QueueConfig,
    type QueueJobOptions,
    type QueueMetrics,
    type ScheduledJobOptions,
} from "../types/queue.types";

export class QueueService<T = unknown> {
    private readonly queue: Queue<JobData<T>>;
    private readonly queueEvents: QueueEvents;
    private readonly logger: Logger;
    private readonly connection: Redis;

    constructor(private readonly queueName: string, config?: Partial<QueueConfig>) {
        this.logger = new Logger(`QueueService:${queueName}`);

        const host = config?.host ?? process.env.REDIS_HOST ?? "127.0.0.1";
        const port = config?.port ?? (process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379);
        const password = config?.password ?? process.env.REDIS_PASSWORD;
        const prefix = config?.prefix ?? "queue";

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

        const queueOptions: QueueOptions = {
            connection: this.connection,
            prefix,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 1000,
                },
                removeOnComplete: 100,
                removeOnFail: 500,
            },
        };

        this.queue = new Queue<JobData<T>>(queueName, queueOptions);

        const queueEventsOptions: QueueEventsOptions = {
            connection: this.connection.duplicate(),
            prefix,
        };

        this.queueEvents = new QueueEvents(queueName, queueEventsOptions);

        this.setupEventListeners();
        this.logger.info("Queue initialized", { queueName });
    }

    private setupEventListeners(): void {
        this.queueEvents.on("completed", ({ jobId }) => {
            this.logger.debug("Job completed", { jobId, queue: this.queueName });
        });

        this.queueEvents.on("failed", ({ jobId, failedReason }) => {
            this.logger.error("Job failed", { jobId, queue: this.queueName, reason: failedReason });
        });

        this.queueEvents.on("stalled", ({ jobId }) => {
            this.logger.warn("Job stalled", { jobId, queue: this.queueName });
        });
    }

    public async add(jobName: string, payload: T, options?: QueueJobOptions): Promise<string> {
        const jobData: JobData<T> = {
            payload,
            metadata: {
                timestamp: Date.now(),
            },
        };

        const job = await this.queue.add(jobName, jobData, mapToJobsOptions(options));
        this.logger.debug("Job added", { jobId: job.id, jobName, queue: this.queueName });
        return job.id ?? "";
    }

    public async addBulk(jobs: { name: string; payload: T; options?: QueueJobOptions }[]): Promise<string[]> {
        const bulkJobs = jobs.map((job) => {
            const baseJob = {
                name: job.name,
                data: {
                    payload: job.payload,
                    metadata: { timestamp: Date.now() },
                } as JobData<T>,
            };

            const opts = mapToJobsOptions(job.options);
            if (opts) {
                return { ...baseJob, opts };
            }
            return baseJob;
        });

        const addedJobs = await this.queue.addBulk(bulkJobs);
        const jobIds = addedJobs.map((j) => j.id ?? "");
        this.logger.debug("Bulk jobs added", { count: jobIds.length, queue: this.queueName });
        return jobIds;
    }

    public async schedule(jobName: string, payload: T, options: ScheduledJobOptions): Promise<string> {
        const jobData: JobData<T> = {
            payload,
            metadata: { timestamp: Date.now() },
        };

        const baseOptions = mapToJobsOptions(options) ?? {};

        if (options.repeat) {
            const repeatOptions: { pattern?: string; every?: number; limit?: number } = {};
            if (options.repeat.pattern) {
                repeatOptions.pattern = options.repeat.pattern;
            }
            if (options.repeat.every !== undefined) {
                repeatOptions.every = options.repeat.every;
            }
            if (options.repeat.limit !== undefined) {
                repeatOptions.limit = options.repeat.limit;
            }

            (baseOptions as Record<string, unknown>).repeat = repeatOptions;
        }

        const job = await this.queue.add(jobName, jobData, baseOptions);
        this.logger.debug("Scheduled job added", { jobId: job.id, jobName, queue: this.queueName });
        return job.id ?? "";
    }

    public async getJob(jobId: string): Promise<Job<JobData<T>> | undefined> {
        return this.queue.getJob(jobId);
    }

    public async removeJob(jobId: string): Promise<void> {
        const job = await this.queue.getJob(jobId);
        if (job) {
            await job.remove();
            this.logger.debug("Job removed", { jobId, queue: this.queueName });
        }
    }

    public async getMetrics(): Promise<QueueMetrics> {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
            this.queue.getDelayedCount(),
            this.queue.isPaused(),
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
            paused: paused ? 1 : 0,
        };
    }

    public async pause(): Promise<void> {
        await this.queue.pause();
        this.logger.info("Queue paused", { queue: this.queueName });
    }

    public async resume(): Promise<void> {
        await this.queue.resume();
        this.logger.info("Queue resumed", { queue: this.queueName });
    }

    public async drain(): Promise<void> {
        await this.queue.drain();
        this.logger.info("Queue drained", { queue: this.queueName });
    }

    public async obliterate(): Promise<void> {
        await this.queue.obliterate({ force: true });
        this.logger.warn("Queue obliterated", { queue: this.queueName });
    }

    public async clean(
        grace: number,
        limit: number,
        type: "completed" | "wait" | "active" | "paused" | "delayed" | "failed",
    ): Promise<string[]> {
        const cleaned = await this.queue.clean(grace, limit, type);
        this.logger.info("Queue cleaned", { queue: this.queueName, type, count: cleaned.length });
        return cleaned;
    }

    public async close(): Promise<void> {
        await this.queueEvents.close();
        await this.queue.close();
        await this.connection.quit();
        this.logger.info("Queue closed", { queue: this.queueName });
    }

    public getQueue(): Queue<JobData<T>> {
        return this.queue;
    }
}
