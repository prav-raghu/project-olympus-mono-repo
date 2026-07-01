---
applyTo: "apps/backend/**/services/**,common/database/prisma/**"
description: "Audit log pattern - before/after values for every state-changing operation on audited entities"
---

## When to audit

Not every table needs auditing. Audit state changes on entities where knowing **who changed what and when** has regulatory, legal, or operational value:

- User accounts (role changes, deactivations)
- Payment and order records
- Permissions and role assignments
- Settings and configuration
- Any entity explicitly marked as auditable in requirements

Do NOT audit read operations or log-noise tables (webhook deliveries, queue jobs).

## Prisma model

Add to `common/database/prisma/schema.shared.prisma`:

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

No `updatedAt`, no `isActive` — audit logs are immutable append-only records. `id` is application-generated (`crypto.randomUUID()`), never `@default(uuid())`.

## AuditAction constants (`common/types/src/audit.types.ts`)

```typescript
export const AuditAction = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  RESTORE: 'restore',
  ROLE_ASSIGN: 'role_assign',
  PASSWORD_CHANGE: 'password_change',
  LOGIN: 'login',
  LOGOUT: 'logout',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditContext {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}
```

Export from `common/types/src/index.ts`.

## AuditLogService (`apps/backend/{service}/src/modules/audit-log/audit-log.service.ts`)

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

## Using AuditLogService in a domain service

Inject alongside other dependencies. Call `log()` AFTER the DB write succeeds.

```typescript
public async update(id: string, dto: UpdateUserDto, userId: string, context: AuditContext): Promise<ResponseDto<IUser>> {
  const existing = await this.prisma.user.findUnique({ where: { id, isActive: true } });
  if (!existing) return { isSuccessful: false, message: 'User not found' };

  const updated = await this.prisma.user.update({ where: { id }, data: { ...dto, modifiedBy: userId } });

  await this.cacheService.del(`user:${id}`);
  await this.auditLog.log({
    entity: 'user',
    entityId: id,
    action: AuditAction.UPDATE,
    before: { email: existing.email, roleId: existing.roleId },
    after: { email: updated.email, roleId: updated.roleId },
    context,
  });

  return { isSuccessful: true, data: updated as IUser };
}
```

## Passing AuditContext from the controller

```typescript
@Put(':id')
@Version('1')
public async update(
  @Param('id') id: string,
  @Body() dto: UpdateUserDto,
  @CurrentUser() user: AzureUser,
  @Req() req: Request,
) {
  const context: AuditContext = { userId: user.id, ipAddress: req.ip, userAgent: req.headers['user-agent'] as string };
  return this.usersService.update(id, dto, user.id, context);
}
```

## What to put in before/after

Record only the fields that could change, not the entire row. `before` is `null` for `create` actions, `after` is `null` for `delete` actions.

## Querying audit history (admin API)

```
GET /admin/audit-logs?entity=user&entityId={id}&page=1&pageSize=50
```

Protected with `Permission.USER_READ` or a dedicated `AUDIT_READ` permission — see `rbac.instructions.md`.

## Retention

`audit_logs` grows indefinitely. Add a scheduled cleanup job in `schedule-api` that deletes entries older than your retention policy (e.g. 2 years for regulated industries, 90 days standard). Never manually delete audit entries outside of the scheduled job.

## Rules

- NEVER log before the DB write — if the write fails, the audit entry should not exist
- NEVER audit read operations — only state-changing writes
- ALWAYS redact sensitive fields (`password`, `token`, `secret`) before writing `after`
- NEVER write audit entries inside a Prisma transaction with the entity write — a rollback would delete the audit too; keep them separate
- `before`/`after` store only the changed-field subset, not the full row
