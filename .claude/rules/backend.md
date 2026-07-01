---
paths:
  - "apps/backend/**/*.ts"
---

# Backend Service Rules

You are working on a NestJS backend service. These rules apply to all files under `apps/backend/`.

## Non-negotiable

- NestJS only — no Fastify, no Express standalone, no Hono
- `class-validator` + `class-transformer` for ALL backend validation — never Zod, never AJV
- No `any` type — zero tolerance
- No comments in code
- No hardcoded secrets
- DTOs are classes with `class-validator` decorators — never plain interfaces
- Class-based controllers and services with explicit access modifiers, `private readonly` constructor deps
- Azure MSAL only for auth — never custom JWT issuance, never bcrypt user-password auth
- MySQL only — never PostgreSQL

## Response envelope (always)

```typescript
{ isSuccessful: boolean; message?: string; data?: T; dateTimeStamp?: Date }
```

## Error status contract

| Scenario | Status |
|---|---|
| Successful create | 201 |
| Successful read/update/delete | 200 |
| `class-validator` validation failure | 400 |
| Business rule violation | 400 |
| Auth missing | 401 |
| Insufficient permissions | 403 |
| Not found | 404 |
| Unique constraint / duplicate | 409 |
| Unexpected error | 500 |

## DTO requirements

Every required field gets a matching `class-validator` decorator (no `@IsOptional()`). Every DTO property gets `@ApiProperty()`/`@ApiPropertyOptional()`. `maxLength`/`@MaxLength` must match `@db.VarChar(N)` from the Prisma schema. See `validation-chain.instructions.md` for the full Prisma → DTO mapping table.

## Before marking complete

Run `pnpm --filter <service-name> typecheck` — zero errors required.
