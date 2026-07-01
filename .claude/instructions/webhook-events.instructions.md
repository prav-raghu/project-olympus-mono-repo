---
applyTo: "apps/backend/**/modules/**,common/queue/src/**"
description: "Outbound webhook and event bus conventions - always queue-backed, always HMAC-signed, always post-write"
---

When publishing domain events or delivering webhooks:

## Publish after write, never before

```typescript
const entity = await this.prisma.entity.create({ data: { id: crypto.randomUUID(), ...dto } });
await this.eventBus.publish(WebhookEventType.ENTITY_CREATED, { id: entity.id });
```

If publish fails (Redis down), the DB write stands. BullMQ retries delivery — the entity is not lost. Never wrap publish in the same transaction as the DB write.

## Which services get EventBusService

Inject `EventBusService` only in services that own state changes that external systems might care about:

- `OrdersService` → `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_COMPLETED`
- `UsersService` → `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`
- `PaymentsService` → `PAYMENT_SUCCESS`, `PAYMENT_FAILED`

Read-only services (search, reporting) never publish events.

## Event payload shape

Keep payloads minimal — IDs and status fields only. Subscribers fetch full data from your API if they need it:

```typescript
await this.eventBus.publish(WebhookEventType.ORDER_CREATED, {
  id: order.id,
  userId: order.userId,
  status: order.status,
  totalAmount: Number(order.totalAmount),
});
```

NEVER include passwords, tokens, PII fields, or internal system IDs in webhook payloads.

## Delivery worker location

The webhook delivery `Processor` lives in `apps/backend/schedule-api` — not in `customer-api` or `admin-api`. Register the BullMQ queue and processor in `schedule-api`'s module tree alongside other background workers.

## SSRF prevention

Before delivering to a subscriber URL, validate it is not a private address. Add this check in the processor before the `fetch()` call:

```typescript
const url = new URL(subscription.url);
if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(url.hostname)) {
  throw new Error('Webhook delivery to private addresses is not allowed');
}
```

In production, also block RFC-1918 address ranges (10.x.x.x, 172.16–31.x.x, 192.168.x.x).

## Delivery history retention

`webhook_deliveries` rows accumulate fast. Add a scheduled cleanup job in `schedule-api` that deletes delivered entries older than 30 days and failed entries older than 7 days. Never let this table grow unbounded.
