---
name: webhook-events
description: Use when implementing outbound webhooks or an internal event bus — registering webhook subscriptions, publishing domain events, building the webhook delivery worker, adding HMAC signature verification, or adding new WebhookEventType values. Trigger on "webhook", "publish an event", or "notify external subscribers".
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

## Architecture

```
Domain service (e.g. order created)
  └─► EventBusService.publish('order.created', data)
        └─► QueueService.add('webhook-delivery', { event, data, subscriptionId })
              └─► WebhookDeliveryProcessor (schedule-api, BullMQ Worker)
                    ├─► fetch active subscriptions for event
                    ├─► sign payload with HMAC-SHA256
                    ├─► POST to subscriber URL
                    ├─► record delivery result in WebhookDelivery
                    └─► BullMQ retries on failure (exponential backoff)
```

## Step 0 — Prisma models (shared schema)

If these do not already exist, add them to `common/database/prisma/schema.shared.prisma`. MySQL does not support Prisma scalar list fields (`String[]`), so the subscribed event list is stored as `Json`, not an array column:

```prisma
model WebhookSubscription {
  id                String   @id @db.VarChar(36) @map("id")
  url               String   @db.VarChar(500) @map("url")
  secret            String   @db.VarChar(255) @map("secret")
  events            Json     @map("events")               // string[] of WebhookEventType values
  timeoutSeconds     Int      @default(10) @map("timeout_seconds")
  isActive          Boolean  @default(true) @map("is_active")
  lastTriggeredAt   DateTime? @db.DateTime(0) @map("last_triggered_at")
  createdAt         DateTime @default(now()) @db.DateTime(0) @map("created_at")
  updatedAt         DateTime @updatedAt @db.DateTime(0) @map("updated_at")
  createdBy         String   @default("SYSTEM") @db.VarChar(36) @map("created_by")
  modifiedBy        String   @default("SYSTEM") @db.VarChar(36) @map("modified_by")

  deliveries WebhookDelivery[]

  @@map("webhook_subscriptions")
}

model WebhookDelivery {
  id             String    @id @db.VarChar(36) @map("id")
  subscriptionId String    @db.VarChar(36) @map("subscription_id")
  eventType      String    @db.VarChar(100) @map("event_type")
  payload        Json      @map("payload")
  status         String    @db.VarChar(20) @map("status")     // 'delivered' | 'failed'
  httpStatus     Int?      @map("http_status")
  responseBody   String?   @db.VarChar(2000) @map("response_body")
  errorMessage   String?   @db.VarChar(1000) @map("error_message")
  attemptCount   Int       @default(1) @map("attempt_count")
  deliveredAt    DateTime? @db.DateTime(0) @map("delivered_at")
  createdAt      DateTime  @default(now()) @db.DateTime(0) @map("created_at")

  subscription WebhookSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
  @@index([createdAt])
  @@map("webhook_deliveries")
}
```

`WebhookEventType`, `WebhookPayload` types live in `common/types/src/webhook.types.ts`. Queue infrastructure comes from `common/queue`.

## Step 1 — Event Bus Service (`common/queue/src/services/event-bus.service.ts`)

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { SHARED_DB } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { WebhookEventType, type WebhookPayload } from '@project-olympus/types';
import type { PrismaClient } from '@prisma/client/shared';
import { QueueService } from './queue.service';

export interface WebhookDeliveryJob {
  subscriptionId: string;
  event: WebhookEventType;
  payload: WebhookPayload;
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly deliveryQueue: QueueService<WebhookDeliveryJob>;

  constructor(@Inject(SHARED_DB) private readonly prisma: PrismaClient) {
    this.deliveryQueue = new QueueService<WebhookDeliveryJob>('webhook-delivery');
  }

  public async publish(event: WebhookEventType, data: Record<string, unknown>): Promise<void> {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: { isActive: true },
      select: { id: true, events: true },
    });

    const targets = subscriptions.filter((sub) => (sub.events as string[]).includes(event));
    if (targets.length === 0) return;

    const payload: WebhookPayload = { event, timestamp: new Date().toISOString(), data };
    const jobs = targets.map((sub) => ({ name: 'deliver', payload: { subscriptionId: sub.id, event, payload } }));

    await this.deliveryQueue.addBulk(jobs);
    this.logger.log(`Webhook event published: ${event} to ${targets.length} subscriber(s)`);
  }
}
```

## Step 2 — Webhook Delivery Processor (`apps/backend/schedule-api/src/modules/webhooks/webhook-delivery.processor.ts`)

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { type Job } from 'bullmq';
import crypto from 'crypto';
import { SHARED_DB } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import type { PrismaClient } from '@prisma/client/shared';
import type { WebhookDeliveryJob } from '@project-olympus/queue';

@Processor('webhook-delivery')
export class WebhookDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(@Inject(SHARED_DB) private readonly prisma: PrismaClient) {
    super();
  }

  public async process(job: Job<{ payload: WebhookDeliveryJob }>): Promise<void> {
    const { subscriptionId, payload } = job.data.payload;

    const subscription = await this.prisma.webhookSubscription.findUnique({
      where: { id: subscriptionId, isActive: true },
    });
    if (!subscription) {
      this.logger.warn(`Subscription ${subscriptionId} not found or inactive, skipping`);
      return;
    }

    this.assertNotPrivateAddress(subscription.url);

    const body = JSON.stringify(payload);
    const signature = this.signPayload(body, subscription.secret);
    let httpStatus: number | undefined;
    let responseBody: string | undefined;

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
        signal: AbortSignal.timeout(subscription.timeoutSeconds * 1000),
      });
      httpStatus = response.status;
      responseBody = await response.text().catch(() => undefined);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await this.recordDelivery(subscriptionId, payload, httpStatus, responseBody, 'delivered');
      await this.prisma.webhookSubscription.update({ where: { id: subscriptionId }, data: { lastTriggeredAt: new Date() } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook delivery failed for ${subscriptionId}: ${errorMessage}`);
      await this.recordDelivery(subscriptionId, payload, httpStatus, responseBody, 'failed', errorMessage);
      throw error; // triggers BullMQ retry
    }
  }

  private signPayload(body: string, secret: string): string {
    return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  }

  private assertNotPrivateAddress(rawUrl: string): void {
    const url = new URL(rawUrl);
    const blocked = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
    if (blocked.includes(url.hostname) || /^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(url.hostname)) {
      throw new Error('Webhook delivery to private/local addresses is not allowed');
    }
  }

  private async recordDelivery(
    subscriptionId: string,
    payload: WebhookDeliveryJob['payload'],
    httpStatus: number | undefined,
    responseBody: string | undefined,
    status: 'delivered' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: {
        id: crypto.randomUUID(),
        subscriptionId,
        eventType: payload.event,
        payload: payload as never,
        status,
        httpStatus,
        responseBody: responseBody?.slice(0, 2000),
        errorMessage,
        attemptCount: 1,
        deliveredAt: status === 'delivered' ? new Date() : undefined,
      },
    });
  }
}
```

Register the `BullModule.registerQueue({ name: 'webhook-delivery' })` and `WebhookDeliveryProcessor` in `schedule-api`'s module tree. BullMQ's default `attempts`/`backoff` config handles retry — the processor throws on failure to trigger it.

## Step 3 — Publishing events from domain services

```typescript
@Injectable()
export class OrdersService {
  constructor(
    @Inject(CUSTOMER_DB) private readonly prisma: PrismaClient,
    private readonly cacheService: CacheService,
    private readonly eventBus: EventBusService,
  ) {}

  public async create(dto: CreateOrderDto, userId: string): Promise<ResponseDto<IOrder>> {
    const order = await this.prisma.order.create({ data: { id: crypto.randomUUID(), ...dto, createdBy: userId, modifiedBy: userId } });
    await this.cacheService.del(`order:list:${userId}`);

    await this.eventBus.publish(WebhookEventType.ORDER_CREATED, {
      id: order.id,
      userId: order.userId,
      totalAmount: Number(order.totalAmount),
    });

    return { isSuccessful: true, data: order as IOrder };
  }
}
```

Rule: publish AFTER the DB write succeeds, never before or inside the transaction. A failed publish (Redis down) should not roll back the DB write — BullMQ retries delivery.

## Step 4 — Webhook management endpoints (admin-api)

| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/webhooks` | `WEBHOOK_READ` | List subscriptions |
| GET | `/webhooks/:id` | `WEBHOOK_READ` | Get subscription details |
| POST | `/webhooks` | `WEBHOOK_WRITE` | Register new subscription |
| PUT | `/webhooks/:id` | `WEBHOOK_WRITE` | Update subscription |
| DELETE | `/webhooks/:id` | `WEBHOOK_WRITE` | Deactivate (soft delete via `isActive: false`) |
| GET | `/webhooks/:id/deliveries` | `WEBHOOK_READ` | View delivery history |
| POST | `/webhooks/:id/test` | `WEBHOOK_WRITE` | Send a test event |

Add `WEBHOOK_READ`/`WEBHOOK_WRITE` to `common/types/src/permissions.ts`, assign to `ADMINISTRATOR` and `MODERATOR` — see `rbac.md`.

## Step 5 — Subscriber signature verification (integrator docs)

```typescript
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

Use `timingSafeEqual` — never `===` — to prevent timing attacks.

## Adding new event types

1. Add to `WebhookEventType` enum in `common/types/src/webhook.types.ts`
2. Publish from the relevant service method after the DB write
3. Document the event payload shape in `documentation/webhooks.md`

## Critical rules

Never call subscriber URLs synchronously in request handlers — always via the queue. Never log or store raw webhook secrets, only HMAC signatures. Never deliver to `localhost`, `127.0.0.1`, or RFC-1918 private ranges. Always use `timingSafeEqual` for signature comparison. Always publish events after a successful DB write. Always cap stored `responseBody` length. `events` on `WebhookSubscription` is a `Json` array, not a Prisma scalar list — MySQL doesn't support `String[]`.
