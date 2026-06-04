import { type JobsOptions } from 'bullmq';

export interface QueueConfig {
  host: string;
  port: number;
  password?: string;
  prefix?: string;
}

export interface JobData<T = unknown> {
  payload: T;
  metadata?: JobMetadata;
}

export interface JobMetadata {
  correlationId?: string;
  userId?: string;
  source?: string;
  timestamp?: number;
}

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type JobPriority = 'critical' | 'high' | 'normal' | 'low';

export const JobPriorityValues: Record<JobPriority, number> = {
  critical: 1,
  high: 2,
  normal: 3,
  low: 4,
};

export interface QueueJobOptions {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  jobId?: string;
}

export interface ScheduledJobOptions extends QueueJobOptions {
  repeat?: {
    pattern?: string;
    every?: number;
    limit?: number;
  };
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface WorkerOptions {
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
  lockDuration?: number;
  stalledInterval?: number;
}

export function mapToJobsOptions(options?: QueueJobOptions): JobsOptions | undefined {
  if (!options) {return undefined;}

  const jobsOptions: JobsOptions = {
    attempts: options.attempts ?? 3,
    removeOnComplete: options.removeOnComplete ?? 100,
    removeOnFail: options.removeOnFail ?? 500,
  };

  if (options.priority) {
    jobsOptions.priority = JobPriorityValues[options.priority];
  }

  if (options.delay !== undefined) {
    jobsOptions.delay = options.delay;
  }

  if (options.backoff) {
    jobsOptions.backoff = options.backoff;
  }

  if (options.jobId) {
    jobsOptions.jobId = options.jobId;
  }

  return jobsOptions;
}
