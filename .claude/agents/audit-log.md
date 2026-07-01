---
name: audit-log
description: Use when implementing audit trails for state-changing operations — adding audit logging to a service, deciding what to audit, querying audit history, or setting up retention policy. Trigger on "audit log", "track who changed this", or "log before/after values".
tools: Read, Edit, Write, Grep, Glob
model: inherit
---

The full pattern reference lives in `audit-log.instructions.md` — read it before adding audit logging to a service. This agent is a quick orientation.

## When to audit

Not every table needs auditing. Audit state changes where knowing who changed what and when has regulatory, legal, or operational value: user accounts (role changes, deactivations), payment and order records, permissions and role assignments, settings/configuration. Never audit read operations or log-noise tables.

## Prisma model (shared schema)

```prisma
model AuditLog {
  id        String   @id @db.VarChar(36) @map("id")
  entity    String   @db.VarChar(100) @map("entity")
  entityId  String   @db.VarChar(36) @map("entity_id")
  action    String   @db.VarChar(50) @map("action")
  before    Json?    @map("before")
  after     Json?    @map("after")
  changedBy String   @db.VarChar(36) @map("changed_by")
  ipAddress String?  @db.VarChar(45) @map("ip_address")
  userAgent String?  @db.VarChar(500) @map("user_agent")
  createdAt DateTime @default(now()) @db.DateTime(0) @map("created_at")

  @@index([entity, entityId])
  @@index([changedBy])
  @@index([createdAt])
  @@map("audit_logs")
}
```

No `updatedAt`, no `isActive` — audit logs are immutable, append-only. ID is application-generated (`crypto.randomUUID()`), per `relational-database.md`.

## AuditLogService

```typescript
@Injectable()
export class AuditLogService {
  constructor(@Inject(SHARED_DB) private readonly prisma: PrismaClient) {}

  public async log(params: {
    entity: string;
    entityId: string;
    action: AuditAction;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    context: AuditContext;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        before: params.before ?? undefined,
        after: params.after ? this.redact(params.after) : undefined,
        changedBy: params.context.userId,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent?.slice(0, 500),
      },
    });
  }

  private redact(data: Record<string, unknown>): Record<string, unknown> {
    const REDACTED = '[REDACTED]';
    const sensitiveKeys = ['password', 'token', 'secret', 'hash', 'twoFactorSecret'];
    return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, sensitiveKeys.includes(k) ? REDACTED : v]));
  }
}
```

Inject `AuditLogService` alongside other dependencies; call `log()` **after** the DB write succeeds, never inside the same transaction as the entity write.

## Rules

Never log before the DB write. Never audit read operations. Always redact sensitive fields before writing `after`. `before`/`after` store only the changed-field subset, never the full row. Add a scheduled cleanup job in `schedule-api` for retention (e.g. 2 years regulated, 90 days standard) — never delete audit entries manually outside that job.
