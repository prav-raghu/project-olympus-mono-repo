---
applyTo: "apps/backend/**/guards/**,apps/backend/**/modules/**,common/types/src/**"
description: "RBAC conventions - permissions in common/types, guard registration, and @RequirePermissions enforcement"
---

When adding or modifying access control in any backend service:

## The three-layer model

1. `Permission` constants in `common/types/src/permissions.ts` — `entity:action` strings
2. `RolePermissions` map in `common/types/src/rbac.ts` — role → `Permission[]`
3. `@RequirePermissions(...)` decorator on the controller method, enforced by `PermissionsGuard`

These three must stay in sync. Adding a decorator reference to a permission that isn't defined in `permissions.ts` is a compile error. Adding a permission without granting it to any role means no one can call that route. See `rbac.md` for the full step-by-step build-out.

## Route decoration pattern

```typescript
@Post()
@RequirePermissions(Permission.PRODUCT_WRITE)
public async create(@Body() dto: CreateProductDto, @CurrentUser() user: AzureUser) { /* ... */ }

@Delete(':id')
@RequirePermissions(Permission.PRODUCT_DELETE, Permission.ORDER_MANAGE)
public async remove(@Param('id') id: string, @CurrentUser() user: AzureUser) { /* ... */ }

@Get()
public async findAll() { /* no decorator — any authenticated user may call this */ }
```

- No `@RequirePermissions(...)` on a route behind `AzureAuthGuard` — authenticated only, any role allowed
- `@RequirePermissions(Permission.X)` — authenticated AND must hold that permission
- `@RequirePermissions(Permission.X, Permission.Y)` — authenticated AND must hold **all** listed permissions
- A genuinely public, unauthenticated endpoint skips `@UseGuards(AzureAuthGuard)` on the controller/method entirely — it is not expressed via a permissions flag

## Permission granularity

Use multiple permissions on a route only when the operation genuinely requires multiple capabilities:

```typescript
@Get(':id/report')
@RequirePermissions(Permission.USER_READ, Permission.REPORT_VIEW)
public async getUserReport(@Param('id') id: string) { /* ... */ }
```

This is correct for an endpoint that fetches a user and attaches their report summary. Don't add permissions speculatively.

## Where NOT to check permissions

- NEVER in service methods — services are permission-agnostic
- NEVER with manual `if (user.role !== 'ADMINISTRATOR')` checks in a controller — always via `@RequirePermissions` + `PermissionsGuard`
- ONLY in `PermissionsGuard` (driven by the decorator's reflected metadata)

## JWT/session claims contract

`PermissionsGuard` reads `req.user.permissions` (a `Permission[]`), populated by `AzureAuthGuard` after validating the MSAL Bearer token and resolving the user's role to its permission set via `getPermissionsForRole()`. The guard does not query the database on every request — permissions are resolved once per request from the already-validated user context.

## Updating role permissions

When a role's permissions change in `RolePermissions`, the change takes effect for new logins / new token validations going forward. It does not retroactively revoke an already-established session mid-request — that's expected, not a bug, given MSAL manages token lifetime independently of this application.
