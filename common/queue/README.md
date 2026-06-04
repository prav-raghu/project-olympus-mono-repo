# @project-olympus/queue

A Redis-backed message queue package using BullMQ for high-traffic job processing.

## Features

- **Job Queuing**: Add single or bulk jobs to queues
- **Scheduled Jobs**: Delay job execution or schedule recurring jobs
- **Worker Processing**: Process jobs with configurable concurrency
- **Priority Queues**: Support for job priorities
- **Retry Logic**: Automatic retry with configurable backoff
- **Metrics**: Built-in queue metrics and monitoring
- **Graceful Shutdown**: Proper worker lifecycle management

## Installation

```bash
pnpm install
```

## Configuration

Set environment variables or pass config directly:

```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

## Usage

### Producer (Adding Jobs)

```typescript
import { QueueService } from '@project-olympus/queue';

interface EmailJobPayload {
  to: string;
  subject: string;
  body: string;
}

const emailQueue = new QueueService<EmailJobPayload>('email-queue');

// Add a single job
await emailQueue.add('send-welcome-email', {
  to: 'user@example.com',
  subject: 'Welcome!',
  body: 'Welcome to our platform.',
});

// Add with options
await emailQueue.add(
  'send-notification',
  { to: 'user@example.com', subject: 'Update', body: 'You have a new message.' },
  {
    priority: 'high',
    delay: 5000, // 5 second delay
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  }
);

// Add bulk jobs
await emailQueue.addBulk([
  { name: 'send-email', payload: { to: 'a@example.com', subject: 'Hi', body: 'Hello A' } },
  { name: 'send-email', payload: { to: 'b@example.com', subject: 'Hi', body: 'Hello B' } },
]);

// Schedule a job
await emailQueue.schedule('weekly-digest', { to: 'user@example.com', subject: 'Digest', body: '...' }, {
  repeat: { pattern: '0 9 * * 1' }, // Every Monday at 9 AM
});
```

### Consumer (Processing Jobs)

```typescript
import { WorkerService, JobResult } from '@project-olympus/queue';

interface EmailJobPayload {
  to: string;
  subject: string;
  body: string;
}

const emailWorker = new WorkerService<EmailJobPayload>('email-queue', undefined, {
  concurrency: 10,
});

// Register handlers
emailWorker.registerHandler('send-welcome-email', async (payload, job) => {
  console.log(`Sending welcome email to ${payload.to}`);
  
  // Update progress
  await job.updateProgress(50);
  
  // Process the job
  const result = await sendEmail(payload.to, payload.subject, payload.body);
  
  await job.updateProgress(100);
  
  return { success: true, data: { messageId: result.id } };
});

emailWorker.registerHandler('send-notification', async (payload, job) => {
  console.log(`Sending notification to ${payload.to}`);
  return { success: true };
});

// Or register multiple handlers at once
emailWorker.registerHandlers([
  {
    name: 'send-email',
    processor: async (payload) => {
      await sendEmail(payload.to, payload.subject, payload.body);
      return { success: true };
    },
  },
]);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await emailWorker.close();
  process.exit(0);
});
```

### Queue Metrics

```typescript
const metrics = await emailQueue.getMetrics();
console.log(metrics);
// {
//   waiting: 10,
//   active: 5,
//   completed: 1000,
//   failed: 2,
//   delayed: 3,
//   paused: false
// }
```

### Queue Management

```typescript
// Pause processing
await emailQueue.pause();
await emailWorker.pause();

// Resume processing
await emailQueue.resume();
await emailWorker.resume();

// Remove a specific job
await emailQueue.removeJob('job-id-123');

// Clean old jobs
await emailQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24h

// Drain queue (remove all jobs)
await emailQueue.drain();

// Obliterate queue (remove queue and all data)
await emailQueue.obliterate();
```

## Job Options

| Option | Type | Description |
|--------|------|-------------|
| `priority` | `'low' \| 'normal' \| 'high' \| 'critical'` | Job priority |
| `delay` | `number` | Delay in milliseconds before processing |
| `attempts` | `number` | Number of retry attempts |
| `backoff` | `BackoffOptions` | Retry backoff strategy |
| `removeOnComplete` | `boolean \| number` | Remove job after completion |
| `removeOnFail` | `boolean \| number` | Remove job after failure |
| `repeat` | `RepeatOptions` | Cron/repeat configuration |
| `timeout` | `number` | Job processing timeout |

## Worker Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `concurrency` | `number` | `5` | Number of concurrent jobs |
| `lockDuration` | `number` | `30000` | Lock duration in ms |
| `stalledInterval` | `number` | `30000` | Check interval for stalled jobs |
| `limiter` | `RateLimiterOptions` | - | Rate limiting configuration |

## Best Practices

1. **Use meaningful job names**: Makes debugging and monitoring easier
2. **Set appropriate retry limits**: Balance between reliability and queue congestion
3. **Use priority wisely**: Critical jobs should truly be critical
4. **Clean completed jobs**: Prevent Redis memory bloat
5. **Handle graceful shutdown**: Ensure in-progress jobs complete
6. **Monitor queue metrics**: Set up alerts for queue depth and failure rates

## Integration with Backend Services

```typescript
// In a NestJS service
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { QueueService } from '@project-olympus/queue';

@Injectable()
export class EmailQueueService implements OnApplicationShutdown {
  private readonly queue = new QueueService('email-queue');

  public async enqueue(payload: unknown): Promise<void> {
    await this.queue.add('send-email', payload);
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}
```

## License

MIT
