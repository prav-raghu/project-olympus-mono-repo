---
name: RBAC Agent
description: >
  Use when implementing role-based access control — adding permissions to routes, defining
  role-to-permission mappings, creating permission guards, or restricting service methods
  to specific roles. Also use when a new role or permission needs to be added to the system,
  or when auditing which endpoints are accessible to which roles.
tools:
  - read
  - edit
  - search
  - execute
user-invocable: true
argument-hint: "Describe what to protect, e.g. 'restrict product creation to ADMINISTRATOR and MODERATOR'"
---

# RBAC Agent

## Overview

RBAC is built on three layers:
1. **Permissions** — fine-grained action strings (`entity:action`)
2. **Role-to-permission mapping** — which roles have which permissions (defined in `common/types`)
3. **Permission guard** — NestJS `CanActivate` guard that enforces permissions on each request

## Existing Roles (from `common/types/src/roles.ts`)

| Role | Tier | Description |
|------|------|-------------|
| `ADMINISTRATOR` | Admin | Full system access |
| `MODERATOR` | Admin | Moderate content, manage users below their level |
| `SUPPORT` | Admin | Read access + limited write for customer support |
| `CHAT_USER` | Customer | Customer-facing features only |

## Step 1 — Define Permissions (`common/types/src/permissions.ts`)

Create this file if it does not exist. Add new permissions as new entities are added.

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

## Step 2 — Role-Permission Map (`common/types/src/rbac.ts`)

```typescript
import { RoleName } from './roles';
import { Permission } from './permissions';

export const RolePermissions: Record<RoleName, Permission[]> = {
  [RoleName.ADMINISTRATOR]: Object.values(Permission),

  [RoleName.MODERATOR]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_WRITE,
    Permission.PRODUCT_DELETE,
    Permission.ORDER_READ,
    Permission.ORDER_MANAGE,
    Permission.REPORT_VIEW,
    Permission.SETTINGS_READ,
  ],

  [RoleName.SUPPORT]: [
    Permission.USER_READ,
    Permission.ORDER_READ,
    Permission.ORDER_WRITE,
    Permission.REPORT_VIEW,
  ],

  [RoleName.CHAT_USER]: [
    Permission.PRODUCT_READ,
    Permission.ORDER_READ,
    Permission.ORDER_WRITE,
  ],
};

export function getPermissionsForRole(role: RoleName): Permission[] {
  return RolePermissions[role] ?? [];
}

export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}
```

Export both from `common/types/src/index.ts`.

## Step 3 — Permissions Decorator (`src/modules/auth/decorators/permissions.decorator.ts`)

```typescript
import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@project-olympus/types';

export const PERMISSIONS_KEY = 'permissions';

export function RequirePermissions(...permissions: Permission[]) {
  return SetMetadata(PERMISSIONS_KEY, permissions);
}
```

## Step 4 — Permission Guard (`src/modules/auth/guards/permissions.guard.ts`)

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { Permission } from '@project-olympus/types';
import type { AzureAuthenticatedUser } from '@project-olympus/types';

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

    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

Register in each service's `AppModule` providers:

```typescript
import { APP_GUARD } from '@nestjs/core';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';

@Module({
  providers: [
    { provide: APP_GUARD, useClass: AzureAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
```

## Step 5 — Protect Routes

Apply `@RequirePermissions()` on controller methods alongside `@UseGuards`:

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

## Permission Naming Convention

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
| `assign` | Assign to another entity (e.g., assign role to user) |

## Adding a New Permission

1. Add the constant to `common/types/src/permissions.ts`
2. Add it to the appropriate roles in `common/types/src/rbac.ts`
3. Add `@RequirePermissions(Permission.X)` to the relevant controller method
4. Export from `common/types/src/index.ts` if not already

## Adding a New Role

1. Add to `RoleName` in `common/types/src/roles.ts`
2. Add the role tier array (`ADMIN_TIER_ROLES` or `CUSTOMER_TIER_ROLES`) if applicable
3. Add an entry in `RolePermissions` in `common/types/src/rbac.ts`
4. Update seeding logic to seed the new role if roles are stored in DB

## Critical Rules

- NEVER check roles directly in service methods — only check permissions via the guard
- NEVER put role/permission logic inside controllers — use the `@RequirePermissions` decorator
- Endpoints without `@RequirePermissions` allow any authenticated user — add for all write operations
- ADMINISTRATOR always has all permissions — `Object.values(Permission)` — never list manually
- Permissions are resolved at login time — changing `RolePermissions` requires re-login to take effect
