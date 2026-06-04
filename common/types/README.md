# @project-olympus/types

Shared TypeScript types, interfaces, and DTOs used across all backend services and Angular frontends.

## Key exports

### Response envelopes

```typescript
import type { ResponseDto, ListResponseDto, CursorResponseDto } from '@project-olympus/types';

// Single item
const res: ResponseDto<UserData> = { isSuccessful: true, data: user };

// Paginated list (admin)
const list: ListResponseDto<UserData> = { isSuccessful: true, data: items, total, page, pageSize };

// Cursor list (customer-facing)
const cursor: CursorResponseDto<UserData> = { isSuccessful: true, data: items, nextCursor, hasMore };
```

### Auth types

```typescript
import type { AzureAuthenticatedUser } from '@project-olympus/types';

// Shape of req.user after AzureAuthGuard
const user: AzureAuthenticatedUser = {
  id: 'oid-from-msal',
  email: 'user@example.com',
  role: 'Administrator',
  permissions: ['Administrator'],
  scope: 'access_as_user',
  azureOid: 'oid-from-msal',
};
```

### RBAC types

```typescript
import { Permission, RolePermissions } from '@project-olympus/types';
```

### Webhook types

```typescript
import type { WebhookSubscription, WebhookDelivery } from '@project-olympus/types';
```

## Rules

- All types in their own files — one type per file
- No `any` — use `unknown` or explicit generics
- DTOs used in NestJS controllers are classes with `class-validator` decorators — not types from this package
- This package exports interface/type-level contracts only
