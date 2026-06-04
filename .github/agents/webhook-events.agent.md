---
name: Webhook Events Agent
description: >
  Use when implementing outbound webhooks or an internal event bus — registering webhook
  subscriptions, publishing domain events, building the webhook delivery worker, adding HMAC
  signature verification, or adding new WebhookEventType values. The Prisma models
  (webhook_subscription, webhook_delivery) and the WebhookEventType enum already exist;
  this agent wires them into services and builds the delivery infrastructure.
tools:
  - read
  - edit
  - search
  - execute
user-invocable: true
argument-hint: "Describe what to build, e.g. 'publish order.created events to subscribers' or 'add webhook management endpoints to admin-api'"
---

# Webhook Events Agent

## What Already Exists

- **Prisma models**: `webhook_subscription`, `webhook_delivery` — in `common/database/prisma/schema.prisma`
- **Types**: `WebhookEventType`, `WebhookPayload`, `WebhookSubscription`, `WebhookDelivery` — in `common/types/src/webhook.types.ts`
- **Queue infrastructure**: `QueueService` — in `common/queue`

Do not re-create these. Build on them.

## Architecture

```
Domain service (e.g. order created)
  └─► EventBusService.publish('order.created', data)
        └─► QueueService.add('webhook-delivery', { event, data, subscriptionId })
              └─► WebhookWorker (schedule-api)
                    ├─► fetch active subscriptions for event
                    ├─► sign payload with HMAC-SHA256
                    ├─► POST to subscriber URL
                    ├─► record delivery result in webhook_delivery
                    └─► schedule retry on failure (exponential backoff)
```

## Step 1 — Event Bus Service (`common/queue/src/services/event-bus.service.ts`)

A thin wrapper that resolves active subscriptions and enqueues one delivery job per subscriber:

```typescript
import { PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { WebhookEventType, type WebhookPayload } from '@project-olympus/types';
import { QueueService } from './queue.service';

export interface WebhookDeliveryJob {
  subscriptionId: string;
  event: WebhookEventType;
  payload: WebhookPayload;
}

export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly deliveryQueue: QueueService<WebhookDeliveryJob>;

  constructor(private readonly prisma: PrismaClient) {
    this.deliveryQueue = new QueueService<WebhookDeliveryJob>('webhook-delivery');
  }

  public async publish(event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
    const subscriptions = await this.prisma.webhook_subscription.findMany({
      where: { is_active: true, events: { has: event } },
      select: { id: true },
    });

    if (subscriptions.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const jobs = subscriptions.map((sub) => ({
      name: 'deliver',
      payload: { subscriptionId: sub.id, event, payload },
    }));

    await this.deliveryQueue.addBulk(jobs);
    this.logger.info('Webhook event published', { event, subscribers: subscriptions.length });
  }
}
```

Export from `common/queue/src/index.ts`.

## Step 2 — Webhook Delivery Worker (`apps/backend/schedule-api/src/workers/webhook-delivery.worker.ts`)

```typescript
import { Worker, type Job } from 'bullmq';
import crypto from 'crypto';
import { PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { type WebhookDeliveryJob } from '@project-olympus/queue';

const logger = new Logger('WebhookDeliveryWorker');

export function startWebhookDeliveryWorker(prisma: PrismaClient): Worker {
  return new Worker<{ payload: WebhookDeliveryJob }>(
    'webhook-delivery',
    async (job: Job<{ payload: WebhookDeliveryJob }>) => {
      const { subscriptionId, payload } = job.data.payload;

      const subscription = await prisma.webhook_subscription.findUnique({
        where: { id: subscriptionId, is_active: true },
      });

      if (!subscription) {
        logger.warn('Subscription not found or inactive, skipping', { subscriptionId });
        return;
      }

      const body = JSON.stringify(payload);
      const signature = signPayload(body, subscription.secret);

      let httpStatus: number | undefined;
      let responseBody: string | undefined;
      let errorMessage: string | undefined;

      try {
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': payload.event,
            'X-Webhook-Timestamp': payload.timestamp,
          },
          body,
          signal: AbortSignal.timeout(subscription.timeout_seconds * 1000),
        });

        httpStatus = response.status;
        responseBody = await response.text().catch(() => undefined);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await recordDelivery(prisma, subscriptionId, payload, httpStatus, responseBody, 'delivered');
        await prisma.webhook_subscription.update({
          where: { id: subscriptionId },
          data: { last_triggered_at: new Date() },
        });
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('Webhook delivery failed', { subscriptionId, error: errorMessage });
        await recordDelivery(prisma, subscriptionId, payload, httpStatus, responseBody, 'failed', errorMessage);
        throw err;
      }
    },
    {
      connection: { host: process.env.REDIS_HOST ?? '127.0.0.1', port: Number(process.env.REDIS_PORT ?? 6379) },
      concurrency: Number(process.env.WEBHOOK_WORKER_CONCURRENCY ?? 10),
      limiter: { max: 100, duration: 1000 },
    }
  );
}

function signPayload(body: string, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

async function recordDelivery(
  prisma: PrismaClient,
  subscriptionId: string,
  payload: WebhookDeliveryJob['payload'],
  httpStatus: number | undefined,
  responseBody: string | undefined,
  status: 'delivered' | 'failed',
  errorMessage?: string
): Promise<void> {
  await prisma.webhook_delivery.create({
    data: {
      subscription_id: subscriptionId,
      event_type: payload.event,
      payload: payload as never,
      status,
      http_status: httpStatus,
      response_body: responseBody?.slice(0, 2000),
      error_message: errorMessage,
      attempt_count: 1,
      delivered_at: status === 'delivered' ? new Date() : undefined,
    },
  });
}
```

BullMQ handles retry automatically based on `attempts` and `backoff` from `QueueService` defaults (3 attempts, exponential 1s base). The worker throws on failure to trigger the retry.

## Step 3 — Publishing Events From Domain Services

In any service that creates/updates a domain entity, inject `EventBusService` and publish after the DB write:

```typescript
export class OrderService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService
  ) {}

  public async create(dto: CreateOrderDto, userId: string): Promise<ResponseDto<OrderData>> {
    const order = await this.prisma.order.create({ data: { ...dto, created_by: userId, modified_by: userId } });
    await this.cacheService.del(`order:list:${userId}`);

    await this.eventBus.publish(WebhookEventType.ORDER_CREATED, {
      id: order.id,
      userId: order.user_id,
      totalAmount: order.total_amount,
    });

    return { isSuccessful: true, data: order };
  }
}
```

Rule: publish events AFTER the DB write succeeds — never before. A failed publish (queue down) should not roll back the DB write; use BullMQ's retry to re-deliver.

## Step 4 — Webhook Management Endpoints (admin-api)

Expose CRUD for `webhook_subscription` in `admin-api` so integrators can register their URLs:

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/webhooks` | `WEBHOOK_READ` | List subscriptions |
| GET | `/webhooks/:id` | `WEBHOOK_READ` | Get subscription details |
| POST | `/webhooks` | `WEBHOOK_WRITE` | Register new subscription |
| PUT | `/webhooks/:id` | `WEBHOOK_WRITE` | Update subscription |
| DELETE | `/webhooks/:id` | `WEBHOOK_WRITE` | Deactivate (soft delete `is_active: false`) |
| GET | `/webhooks/:id/deliveries` | `WEBHOOK_READ` | View delivery history |
| POST | `/webhooks/:id/test` | `WEBHOOK_WRITE` | Send a test event |

Add `WEBHOOK_READ` and `WEBHOOK_WRITE` to `common/types/src/permissions.ts` and assign to `ADMINISTRATOR` and `MODERATOR`.

## Step 5 — Subscriber Signature Verification (for inbound verification docs)

Document this pattern so integrators can verify incoming webhooks:

```typescript
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

Subscribers compare `X-Webhook-Signature` header against this value. Use `timingSafeEqual` to prevent timing attacks.

## Adding New Event Types

1. Add to `WebhookEventType` enum in `common/types/src/webhook.types.ts`
2. Publish from the relevant service method after the DB write
3. Document the event payload shape in `documentation/webhooks.md`

## Critical Rules

- NEVER call subscriber URLs synchronously in request handlers — always via the queue
- NEVER log or store raw webhook secrets — only HMAC signatures
- NEVER deliver to `localhost`, `127.0.0.1`, or private IP ranges in production (SSRF prevention)
- ALWAYS use `timingSafeEqual` for signature comparison — never `===`
- ALWAYS publish events AFTER a successful DB write — never before or inside the transaction
- ALWAYS cap stored `response_body` length (2000 chars) to prevent bloated webhook_deliveries table
