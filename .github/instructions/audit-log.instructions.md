---
applyTo: "apps/backend/**/services/**,common/database/prisma/**"
description: "Audit log pattern - before/after values for every state-changing operation on audited entities"
---

## When to Audit

Not every table needs auditing. Audit state changes on entities where knowing **who changed what and when** has regulatory, legal, or operational value:

- User accounts (role changes, deactivations)
- Payment and order records
- Permissions and role assignments
- Settings and configuration
- Any entity explicitly marked as auditable in requirements

Do NOT audit read operations or log-noise tables (`webhook_deliveries`, queue jobs).

## Prisma Model

Add to `common/database/prisma/schema.prisma`:

```prisma
model audit_log {
  id          String   @id @default(uuid()) @map("id")
  entity      String   @map("entity") @db.VarChar(100)
  entity_id   String   @map("entity_id") @db.VarChar(255)
  action      String   @map("action") @db.VarChar(50)
  before      Json?    @map("before")
  after       Json?    @map("after")
  changed_by  String   @map("changed_by") @db.VarChar(255)
  ip_address  String?  @map("ip_address") @db.VarChar(45)
  user_agent  String?  @map("user_agent") @db.VarChar(500)
  created_at  DateTime @default(now()) @map("created_at")

  @@index([entity, entity_id])
  @@index([changed_by])
  @@index([created_at])
  @@map("audit_logs")
}
```

No `updated_at`, no `is_active` — audit logs are immutable append-only records.

## AuditAction Constants (`common/types/src/audit.types.ts`)

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

## AuditLogService (`apps/backend/{service}/src/services/audit-log.service.ts`)

```typescript
import { PrismaClient } from '@project-olympus/database';
import { type AuditAction, type AuditContext } from '@project-olympus/types';

export class AuditLogService {
  constructor(private readonly prisma: PrismaClient) {}

  public async log(params: {
    entity: string;
    entityId: string;
    action: AuditAction;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    context: AuditContext;
  }): Promise<void> {
    await this.prisma.audit_log.create({
      data: {
        entity: params.entity,
        entity_id: params.entityId,
        action: params.action,
        before: params.before ?? undefined,
        after: params.after ? this.redact(params.after) : undefined,
        changed_by: params.context.userId,
        ip_address: params.context.ipAddress,
        user_agent: params.context.userAgent?.slice(0, 500),
      },
    });
  }

  private redact(data: Record<string, unknown>): Record<string, unknown> {
    const REDACTED = '[REDACTED]';
    const sensitiveKeys = ['password', 'token', 'secret', 'hash', 'two_factor_secret'];
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, sensitiveKeys.includes(k) ? REDACTED : v])
    );
  }
}
```

## Using AuditLogService in a Domain Service

Inject alongside other dependencies. Call `log()` AFTER the DB write succeeds.

```typescript
export class UserService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheService: CacheService,
    private readonly auditLog: AuditLogService
  ) {}

  public async update(id: string, dto: UpdateUserDto, userId: string, context: AuditContext): Promise<ResponseDto<UserData>> {
    const existing = await this.prisma.user.findUnique({ where: { id, isActive: true } });
    if (!existing) return { isSuccessful: false, message: 'User not found' };

    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...dto, modifiedBy: userId },
    });

    await this.cacheService.del(`user:${id}`);
    await this.auditLog.log({
      entity: 'user',
      entityId: id,
      action: AuditAction.UPDATE,
      before: { email: existing.email, roleId: existing.roleId },
      after: { email: updated.email, roleId: updated.roleId },
      context,
    });

    return { isSuccessful: true, data: updated };
  }

  public async softDelete(id: string, userId: string, context: AuditContext): Promise<ResponseDto> {
    await this.prisma.user.update({ where: { id }, data: { isActive: false, modifiedBy: userId } });
    await this.cacheService.del(`user:${id}`);
    await this.auditLog.log({
      entity: 'user',
      entityId: id,
      action: AuditAction.DELETE,
      context,
    });
    return { isSuccessful: true, message: 'User deleted' };
  }
}
```

## Passing AuditContext from Controller

Controllers extract IP and user agent from the request and pass them down:

```typescript
@Put(':id')
@Version('1')
public async update(
  @Param('id') id: string,
  @Body() dto: UpdateUserDto,
  @CurrentUser() user: AzureUser,
  @Req() req: Request,
): Promise<ResponseDto<unknown>> {
  const context: AuditContext = {
    userId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
  };
  return this.userService.update(id, dto, user.id, context);
}
```

## What to Put in before/after

Record only the **fields that could change** for the entity, not the entire row. This keeps payloads small and the diff readable:

```typescript
before: { email: existing.email, role_id: existing.role_id, is_active: existing.is_active }
after:  { email: updated.email,  role_id: updated.role_id,  is_active: updated.is_active }
```

`before` is `null` for `create` actions. `after` is `null` for `delete` actions.

## Querying Audit History (Admin API)

Add a read-only endpoint in `admin-api`:

```typescript
GET /admin/audit-logs?entity=user&entityId={id}&page=1&pageSize=50
```

This endpoint is `isPublic: false` with `Permission.USER_READ` (or a dedicated `AUDIT_READ` permission).

## Retention

`audit_logs` grows indefinitely. Add a scheduled cleanup job in `schedule-api` that deletes entries older than your retention policy (e.g., 2 years for regulated industries, 90 days for standard). Never manually delete audit entries outside of the scheduled job.

## Rules

- NEVER log before the DB write — if the write fails, the audit entry should not exist
- NEVER audit read operations — only state-changing writes
- ALWAYS redact sensitive fields (`password`, `token`, `secret`) before writing `after`
- NEVER write audit entries inside a Prisma transaction with the entity write — a transaction rollback would delete the audit too; keep them separate
- `before` and `after` store only the changed-field subset, not the full row
