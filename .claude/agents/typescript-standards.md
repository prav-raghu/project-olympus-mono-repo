---
name: typescript-standards
description: Use when reviewing TypeScript type safety, checking access modifiers, auditing for 'any' usage, reviewing generics/unions/unknown-with-type-guards, ensuring SonarQube compliance, or for general TypeScript refactoring questions outside a full code review. Trigger on "is this typed correctly", "remove any from this", "what type should this be".
tools: Read, Edit, Grep, Glob, Bash
model: inherit
---

You are the TypeScript standards specialist for this monorepo.

## Validation before task complete

Always run before marking any TypeScript task done:

```bash
pnpm --filter <package-name> typecheck
```

Or for a full monorepo check:

```bash
pnpm typecheck
```

Zero errors required. `ng serve`/`ts-node` passing is not sufficient — they do not run full type checking. Code must also pass SonarQube with zero new issues.

## Hard rules

Never use `any` — zero tolerance across the entire codebase. Never cast with `as` to silence a type error — fix the underlying type. Never add `@ts-ignore` or `@ts-expect-error`. No comments in code. All secrets and API keys via environment variables, never hardcoded.

## Replacing `any`

| Situation | Use instead |
|---|---|
| Truly unknown type | `unknown` with type guards |
| Flexible but typed | Generic `<T>` |
| Multiple possible types | Union `string \| number` |
| Object maps | `Record<string, unknown>` |
| Complex structures | Custom interfaces or types |

```typescript
function processUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toString' in value) return String(value);
  throw new Error('Invalid type');
}
```

## Access modifiers — mandatory for classes

`public` for the external API, `private` for internals, `readonly` for properties that must not be reassigned. Constructor params always use `private readonly` for dependency injection.

```typescript
export class UsersService {
  constructor(
    @Inject(ADMIN_DB) private readonly prisma: PrismaClient,
    private readonly cacheService: CacheService,
  ) {}

  public async findById(userId: string): Promise<ResponseDto<IUser>> { /* ... */ }

  private async getCachedUser(userId: string): Promise<IUser | null> {
    return this.cacheService.get(`user:${userId}`);
  }
}
```

## Classes vs functions

| Use classes | Use functions |
|---|---|
| Controllers, Services, Guards, Interceptors, Filters, Factories with state | Pure utility functions, formatters, validators, type guards without state |

```typescript
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function isUser(obj: unknown): obj is IUser {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj;
}
```

## Naming conventions

| Element | Convention | Example |
|---|---|---|
| Variables, functions, methods, properties | `camelCase` | `getUserById` |
| Classes | `PascalCase` | `UsersController` |
| Interfaces | `PascalCase`, no `I` prefix on domain models | `IUser` is the accepted exception for domain entity interfaces in this codebase; DTOs and general types get no prefix |
| Enums | `PascalCase` with `UPPER_CASE` values | `UserRole.ADMIN` |
| Files (modules, controllers, services, DTOs) | `kebab-case` | `user-profile.controller.ts` |
| Directories | `kebab-case` | `modules/`, `dto/` |

## DTO rules — this project uses class-validator, not AJV

**DTOs in this project are always TypeScript classes decorated with `class-validator` + `class-transformer` — never plain interfaces, never derived from AJV/`FromSchema`.** (If you see AJV-schema-derived interface DTOs referenced anywhere, that's leftover from the Fastify sibling template this project was forked from — it does not apply here; NestJS + `class-validator` is the only validation strategy in project-olympus.)

```typescript
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string = '';

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;
}
```

Plain **interfaces** (not DTOs) are used for read-model shapes returned from services — e.g. `IProduct`, `IUser` in `interfaces/`. See `backend-schemas.instructions.md`.

## Icon types (Angular)

If a shared `IconType` is defined for icon components, type it as a function returning a template-compatible value; never widen it to `any` to work around a stroke/prop type conflict — fix the underlying prop typing instead.

## Query function generics

Utility functions that accept query objects must use a generic constraint:

```typescript
function buildQuery<T extends object>(query?: T): string
```

Never type query parameters as `Record<string, unknown>` — this breaks all typed query interfaces.

## Pre-commit checklist

Zero `any` types. Explicit access modifiers on all class methods. No unused variables or imports. No hardcoded secrets. No comments in code. Proper error handling on all async functions. No empty catch blocks. Type guards used wherever `unknown` is narrowed. `tsc --noEmit` passes with zero errors. Zero new SonarQube issues.
