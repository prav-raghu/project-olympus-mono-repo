---
applyTo: "apps/backend/**/services/**,common/queue/src/**"
description: "Outbound webhook and event bus conventions - always queue-backed, always HMAC-signed, always post-write"
---

When publishing domain events or delivering webhooks:

## Publish After Write, Never Before

```typescript
const entity = await this.prisma.entity.create({ data: { ... } });
await this.eventBus.publish(WebhookEventType.ENTITY_CREATED, { id: entity.id });
```

If publish fails (Redis down), the DB write stands. BullMQ retries delivery — the entity is not lost. Never wrap publish in the same transaction as the DB write.

## Which Services Get EventBusService

Inject `EventBusService` only in services that own state changes that external systems might care about:

- `OrderService` → `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_COMPLETED`
- `UserService` → `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`
- `PaymentService` → `PAYMENT_SUCCESS`, `PAYMENT_FAILED`

Read-only services (search, reporting) never publish events.

## Event Payload Shape

Keep payloads minimal — IDs and status fields only. Subscribers fetch full data from your API if they need it:

```typescript
await this.eventBus.publish(WebhookEventType.ORDER_CREATED, {
  id: order.id,
  userId: order.user_id,
  status: order.status,
  totalAmount: Number(order.total_amount),
});
```

NEVER include passwords, tokens, PII fields, or internal system IDs in webhook payloads.

## Delivery Worker Location

The webhook delivery `Worker` lives in `apps/backend/schedule-api` — not in customer-api or admin-api. Register it in `schedule-api`'s `application.ts` alongside other workers.

## SSRF Prevention

Before delivering to a subscriber URL, validate it is not a private address. Add this check in the worker before the `fetch()` call:

```typescript
const url = new URL(subscription.url);
if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(url.hostname)) {
  throw new Error('Webhook delivery to private addresses is not allowed');
}
```

In production, also block RFC-1918 address ranges (10.x.x.x, 172.16.x.x, 192.168.x.x).

## Delivery History Retention

`webhook_delivery` rows accumulate fast. Add a scheduled cleanup job in `schedule-api` that deletes delivered entries older than 30 days and failed entries older than 7 days. Never let this table grow unbounded.
