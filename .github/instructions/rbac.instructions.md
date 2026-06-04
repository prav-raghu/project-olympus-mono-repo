---
applyTo: "apps/backend/**/guards/**,apps/backend/**/routes/**,common/types/src/**"
description: "RBAC conventions - permissions in common/types, permission guard in each service, route config enforcement"
---

When adding or modifying access control in any backend service:

## The Three-Layer Model

1. `Permission` constants in `common/types/src/permissions.ts` — `entity:action` strings
2. `RolePermissions` map in `common/types/src/rbac.ts` — role → Permission[]
3. `config.permissions` on route definitions — what a route requires

These three must stay in sync. Adding a route permission without defining it in `permissions.ts` is a compile error. Adding a permission without granting it to any role means no one can call that route.

## Route Config Pattern

```typescript
config: { isPublic: false, permissions: [Permission.PRODUCT_WRITE] }
config: { isPublic: false, permissions: [Permission.ORDER_MANAGE] }
config: { isPublic: true }
```

- `isPublic: true` — no auth, no permission check
- `isPublic: false` + no `permissions` — authenticated only, any role allowed
- `isPublic: false` + `permissions` — authenticated AND must hold all listed permissions

## Permission Granularity

Use multiple permissions on a route only when the operation genuinely requires multiple capabilities:

```typescript
config: { isPublic: false, permissions: [Permission.USER_READ, Permission.REPORT_VIEW] }
```

This is correct for an endpoint that fetches a user and attaches their report summary. Don't add permissions speculatively.

## Where NOT to Check Permissions

- NEVER in service methods — services are permission-agnostic
- NEVER in controllers — controllers delegate to services
- ONLY in the permission guard hook and route `config`

## JWT Claims Contract

The guard reads `req.user.permissions` (a `Permission[]` from the JWT payload). This is set by the JWT verification hook upstream. The guard does NOT query the database — permissions must be embedded in the token at mint time.

## Updating Role Permissions

When a role's permissions change, the change takes effect for new logins only (existing JWTs expire on their own TTL). For immediate enforcement, rotate the `JWT_SECRET` to invalidate all existing tokens — do this only during planned maintenance.
