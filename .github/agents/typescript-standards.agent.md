---
name: TypeScript Standards Agent
description: >
  Use when reviewing TypeScript code quality, enforcing type safety, checking access modifiers,
  auditing for 'any' usage, reviewing generics, union types, unknown with type guards, or ensuring
  SonarQube compliance across any part of the codebase. Also activates for general TypeScript
  questions, type refactoring, or when code review flags type issues.
tools:
  - read_file
  - write_file
  - grep_search
---

# TypeScript Standards

## Hard Rules

- **NEVER use `any`** — this is a zero-tolerance rule across the entire codebase
- **NEVER add comments in code**
- All code must pass SonarQube with zero errors and zero warnings
- All secrets and API keys must be in environment variables — never hardcoded

## Replacing `any`

| Situation | Use Instead |
|---|---|
| Truly unknown type | `unknown` with type guards |
| Flexible but typed | Generic `<T>` |
| Multiple possible types | Union `string \| number` |
| Object maps | `Record<string, unknown>` |
| Complex structures | Custom interfaces or types |

### Unknown with Type Guards

```typescript
function parseJson(jsonString: string): unknown {
  return JSON.parse(jsonString);
}

function processUnknown(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toString' in value) return String(value);
  throw new Error('Invalid type');
}
```

### Generic Types

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

async function fetchUsers(): Promise<ApiResponse<UserResponse[]>> {}
```

## Access Modifiers — Mandatory for Classes

- `public` — part of the class's external API
- `private` — internal methods/properties not accessible outside the class
- `readonly` — properties that must not be reassigned after initialization
- Constructor parameters must use access modifiers: `private readonly`

```typescript
export class UserService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cacheService: CacheService,
    private readonly logger: Logger
  ) {}

  public async findById(userId: string): Promise<User | null> {}

  private async getCachedUser(userId: string): Promise<User | null> {
    return this.cacheService.get(`user:${userId}`);
  }
}
```

## Classes vs Functions

| Use Classes | Use Functions |
|---|---|
| Controllers, Services, Gateways, Repositories, Managers, Factories with state | Pure utility functions, formatters, validators, type guards without state |

```typescript
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj;
}
```

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Variables, functions, methods, properties | `camelCase` | `getUserById` |
| Classes | `PascalCase` | `UserController` |
| Interfaces | `PascalCase` (no `I` prefix) | `CreateUserDto` |
| Types | `PascalCase` | `UserId`, `ApiResponse` |
| Enums | `PascalCase` with `UPPER_CASE` values | `UserRole.ADMIN` |
| Files (routes, schemas, DTOs, plugins) | `kebab-case` | `user-profile.route.ts` |
| Directories | `kebab-case` | `controllers/`, `dto/` |

## DTO Rules

- All DTOs must be TypeScript **interfaces** — never classes
- Derive from AJV schemas using `FromSchema` where possible
- Never use `any` in DTOs

```typescript
import { FromSchema } from 'json-schema-to-ts';
import { createUserSchema } from '../schemas/user.schema';

export interface CreateUserDto extends FromSchema<typeof createUserSchema> {}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}
```

## SonarQube Compliance Checklist

Before committing, verify:
- [ ] Zero `any` types
- [ ] All class methods have explicit access modifiers
- [ ] No unused variables or imports
- [ ] No hardcoded secrets or API keys
- [ ] No comments in code
- [ ] All async functions have proper error handling
- [ ] No empty catch blocks
- [ ] Type guards used wherever `unknown` is narrowed
