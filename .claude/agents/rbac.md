---
name: rbac
description: Use when implementing role-based access control — adding permissions to routes, defining role-to-permission mappings, creating permission guards, or restricting service methods to specific roles. Also use when a new role or permission needs to be added to the system, or when auditing which endpoints are accessible to which roles.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

## Overview

RBAC is built on three layers:
1. **Permissions** — fine-grained action strings (`entity:action`)
2. **Role-to-permission mapping** — which roles have which permissions (defined in `common/types`)
3. **Permission guard** — NestJS `CanActivate` guard that enforces permissions on each request

These three stay in sync. Adding a route permission without defining it in `permissions.ts` is a compile error. Adding a permission without granting it to any role means no one can call that route. See `rbac.instructions.md` for the full contract.

## Existing roles (`common/types/src/roles.ts`)

| Role | Tier | Description |
|------|------|-------------|
| `ADMINISTRATOR` | Admin | Full system access |
| `MODERATOR` | Admin | Moderate content, manage users below their level |
| `SUPPORT` | Admin | Read access + limited write for customer support |
| `CHAT_USER` | Customer | Customer-facing features only |

## Step 1 — Define permissions (`common/types/src/permissions.ts`)

```typescript
export const Permission = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',

  ROLE_READ: 'role:read',
  ROLE_ASSIGN: 'role:assign',

  PRODUCT_READ: 'product:read',
  PRODUCT_WRITE: 'product:write',
  PRODUCT_DELETE: 'product:delete',

  ORDER_READ: 'order:read',
  ORDER_WRITE: 'order:write',
  ORDER_MANAGE: 'order:manage',

  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',

  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
```

## Step 2 — Role-permission map (`common/types/src/rbac.ts`)

```typescript
import { RoleName } from './roles';
import { Permission } from './permissions';

export const RolePermissions: Record<RoleName, Permission[]> = {
  [RoleName.ADMINISTRATOR]: Object.values(Permission),
  [RoleName.MODERATOR]: [
    Permission.USER_READ, Permission.USER_WRITE,
    Permission.PRODUCT_READ, Permission.PRODUCT_WRITE, Permission.PRODUCT_DELETE,
    Permission.ORDER_READ, Permission.ORDER_MANAGE,
    Permission.REPORT_VIEW, Permission.SETTINGS_READ,
  ],
  [RoleName.SUPPORT]: [Permission.USER_READ, Permission.ORDER_READ, Permission.ORDER_WRITE, Permission.REPORT_VIEW],
  [RoleName.CHAT_USER]: [Permission.PRODUCT_READ, Permission.ORDER_READ, Permission.ORDER_WRITE],
};

export function getPermissionsForRole(role: RoleName): Permission[] {
  return RolePermissions[role] ?? [];
}

export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}
```

Export both from `common/types/src/index.ts`.

## Step 3 — Permissions decorator (`src/modules/auth/decorators/permissions.decorator.ts`)

```typescript
import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@project-olympus/types';

export const PERMISSIONS_KEY = 'permissions';

export function RequirePermissions(...permissions: Permission[]) {
  return SetMetadata(PERMISSIONS_KEY, permissions);
}
```

## Step 4 — Permission guard (`src/modules/auth/guards/permissions.guard.ts`)

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { Permission, AzureAuthenticatedUser } from '@project-olympus/types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user: AzureAuthenticatedUser }>();
    const userPermissions = new Set(req.user?.permissions ?? []);
    const hasAll = required.every((p) => userPermissions.has(p));

    if (!hasAll) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
```

Register as a global guard, **after** `AzureAuthGuard`, in each service's `AppModule`:

```typescript
@Module({
  providers: [
    { provide: APP_GUARD, useClass: AzureAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
```

## Step 5 — Protect routes

```typescript
@Post()
@Version('1')
@RequirePermissions(Permission.PRODUCT_WRITE)
@ApiOperation({ summary: 'Create product' })
public async create(@Body() dto: CreateProductDto, @CurrentUser() user: AzureUser) {
  return this.productsService.create(dto, user.id);
}

@Delete(':id')
@Version('1')
@RequirePermissions(Permission.PRODUCT_DELETE)
@ApiOperation({ summary: 'Delete product' })
public async remove(@Param('id') id: string, @CurrentUser() user: AzureUser) {
  return this.productsService.softDelete(id, user.id);
}

@Get()
@Version('1')
@ApiOperation({ summary: 'List products' })
public async findAll() {
  return this.productsService.findAll();
}
```

An endpoint with no `@RequirePermissions` allows any authenticated user — add the decorator for every write or destructive operation.

## Permission naming convention

```
{entity}:{action}
```

| Action | Meaning |
|--------|---------|
| `read` | List and get single — safe, read-only |
| `write` | Create and update |
| `delete` | Soft delete |
| `manage` | Elevated write — approve, reject, escalate |
| `export` | Download / bulk export |
| `assign` | Assign to another entity (e.g. assign role to user) |

## Adding a new permission

1. Add the constant to `common/types/src/permissions.ts`
2. Add it to the appropriate roles in `common/types/src/rbac.ts`
3. Add `@RequirePermissions(Permission.X)` to the relevant controller method
4. Export from `common/types/src/index.ts` if not already

## Adding a new role

1. Add to `RoleName` in `common/types/src/roles.ts`
2. Add to the appropriate tier array (`ADMIN_TIER_ROLES` or `CUSTOMER_TIER_ROLES`) if applicable
3. Add an entry in `RolePermissions`
4. Update seeding logic if roles are stored in DB

## Critical rules

Never check roles directly in service methods — only check permissions, and only via the guard. Never put role/permission logic inside controllers — use `@RequirePermissions`. Public/unauthenticated routes skip both guards entirely — only for genuinely public endpoints. `ADMINISTRATOR` always gets `Object.values(Permission)` — never list its permissions manually. Permissions are embedded in the MSAL-derived JWT claims/session at request time, resolved server-side from the role — changing `RolePermissions` takes effect on the user's next token validation, not retroactively for an in-flight session.

## Admin bootstrap (first-run only)

`admin-api` needs exactly one way to grant the very first `ADMINISTRATOR` role assignment on a fresh database — and that way must be permanently and provably unusable the moment it succeeds once. Never let "make me an admin" be reachable through the normal `/users` CRUD surface as a workaround; it goes through this dedicated, self-closing flow instead.

Unlike a password/JWT stack, this project doesn't issue credentials — Azure AD already proved who the caller is by the time a request reaches `AzureAuthGuard`. What's missing on a fresh database is the *authorization* side: the first row in this project's own `Role`/`User` tables. So the bootstrap endpoint is guarded by `AzureAuthGuard` like any other route (no anonymous access), not by a password.

### 1. Prisma model — the lock, not the check

```prisma
model SystemBootstrap {
  id                          String    @id @db.VarChar(36) @map("id")
  adminBootstrapped           Boolean   @default(false) @map("admin_bootstrapped")
  bootstrappedAt              DateTime? @db.DateTime(0) @map("bootstrapped_at")
  bootstrappedByAzureObjectId String?   @db.VarChar(36) @map("bootstrapped_by_azure_object_id")

  @@map("system_bootstrap")
}
```

A single row, fixed `id`. This flag is the actual gate — not "does an Administrator user currently exist," because that check can be defeated by deleting or demoting the bootstrapped admin later. Once written, `adminBootstrapped` is never unset by any application code path — no route, no service method, no migration script. Already added to `schema.admin.prisma`.

### 2. Env kill-switch (defense in depth, layered under the DB flag)

```typescript
// common/config/src/env.ts — AppEnv
ADMIN_BOOTSTRAP_ENABLED: boolean = false;
```

Off by default everywhere. A deployment turns it on only for the window needed to bootstrap the first admin, then turns it back off — the DB lock is the permanent guarantee, the env var is an operational safety net on top of it.

### 3. Endpoint — `POST /auth/bootstrap-admin` (admin-api only, `AzureAuthGuard`-protected)

Already implemented in `apps/backend/admin-api/src/modules/auth/auth.service.ts`/`auth.controller.ts`: checks the env flag, atomically claims the `SystemBootstrap` lock inside a `$transaction` (`updateMany` on `{ id: 'singleton', adminBootstrapped: false }` — a `count: 0` result means someone already claimed it, not "the row didn't exist yet"), then upserts a `User` row for the caller's `azureOid` with the `Administrator` role. Everything happens inside one transaction so a failed role/status lookup never leaves the lock claimed with no admin actually created.

Never add a general-purpose "create admin" path outside this flow.

## Session invalidation — "log out everywhere"

Azure-issued access tokens are opaque to this project's backend once minted — Azure AD has no concept of this app's "sign out of all devices" action, and a short token TTL alone doesn't cover "I think my laptop was compromised, invalidate it now." This project layers its own per-user invalidation marker on top of MSAL validation (the same `minIat` pattern the JWT-based sibling template uses for its own token denylist, adapted here to sit *after* Azure's signature/issuer/audience checks rather than replacing them):

- `RedisService.invalidateAllSessions(userId)` (`common/cache`) writes `session:minIat:{userId}` = current epoch seconds.
- `RedisService.isSessionInvalidated(userId, issuedAt)` returns `true` when a token's `iat` claim predates that marker.
- `AzureAuthGuard` (both the shared `common/auth` base class and each service's local copy) calls `isSessionInvalidated` right after `MsalTokenValidator.validate()` succeeds, before populating `request.user` — a token that validates cryptographically but predates the marker is still rejected with 401.
- `POST /auth/logout-all` (admin-api, self-service, any authenticated user, no special permission required) calls `invalidateAllSessions` for the caller's own id.

When adding this endpoint to another service, reuse the same `RedisService` methods — never invent a second invalidation mechanism.
