---
name: Code Review Agent
description: >
  Use when reviewing code for quality, security, type safety, SonarQube compliance, naming
  conventions, access modifiers, hardcoded secrets, auth bypass risks, or adherence to project
  standards. Also activates when asked to audit, check, or improve existing code quality across
  any part of the monorepo — backend services, frontend apps, or common packages.
tools:
  - read_file
  - grep_search
---

# Code Review Agent

## Review Checklist

### 🔴 Blockers (Must Fix Before Merge)

- [ ] No `any` types — use `unknown`, generics, or explicit types
- [ ] No hardcoded secrets, API keys, tokens, or connection strings
- [ ] No auth bypass via query params, headers, or terminal flags
- [ ] No comments in code
- [ ] No empty `catch` blocks
- [ ] No unused variables or imports
- [ ] No `HttpClient` injected directly into components — must use `ApiClientService`
- [ ] No `localStorage` for refresh tokens — must use httpOnly cookies
- [ ] No `alert()` or `confirm()` in frontend code
- [ ] No native HTML form validation — must use Angular reactive forms with `Validators`
- [ ] No Zod or AJV on the backend — `class-validator` exclusively
- [ ] No modifications to `copilot-instructions.md`

### 🟡 Warnings (Should Fix)

- [ ] All class methods have explicit access modifiers (`public`, `private`, `readonly`)
- [ ] Constructor params use `private readonly` for injected dependencies
- [ ] All DTOs are classes with `class-validator` decorators — never plain interfaces
- [ ] All async functions have proper error handling
- [ ] `unknown` types are narrowed with type guards before use
- [ ] API URLs not hardcoded — loaded from environment variables
- [ ] No placeholder/sample components in production code

### 🟢 Standards (Best Practice)

- [ ] Naming follows conventions (see below)
- [ ] File structure matches monorepo pattern
- [ ] Angular Signals used for component state — not `BehaviorSubject` stores
- [ ] `ApiClientService` used for all HTTP calls in Angular components
- [ ] Loading, error, and empty states present in data-driven components
- [ ] Tailwind v4 PostCSS setup — not `@tailwindcss/vite` alone
- [ ] CSS variables use `hsl()` format
- [ ] `@theme` directive present in CSS
- [ ] `prisma generate` run after any schema change

## Naming Convention Audit

| Element | Expected | Common Mistake |
|---|---|---|
| Variables / functions / methods | `camelCase` | `PascalCase` or `snake_case` |
| Classes | `PascalCase` | `camelCase` |
| Interfaces | `PascalCase`, no `I` prefix | `IUserDto`, `userDto` |
| Route / schema / DTO files | `kebab-case` | `camelCase` filenames |
| Directories | `kebab-case` | `camelCase` dirs |
| DB tables / columns | `snake_case` | `camelCase` in Prisma schema |
| Frontend components | `PascalCase` | `camelCase` components |
| Frontend hooks | `camelCase` with `use` prefix | missing `use` prefix |
| Frontend constants | `UPPER_SNAKE_CASE` | `camelCase` |

## TypeScript Anti-Patterns to Flag

```typescript
// ❌ any
function process(data: any): any {}

// ❌ Class for DTO
class CreateUserDto { email: string; }

// ❌ No access modifiers
class UserService {
  userRepo: UserRepository;
  create(dto: CreateUserDto) {}
}

// ❌ HttpClient injected directly in component
constructor(private http: HttpClient) {}

// ❌ Hardcoded URL
this.http.get('http://localhost:3001/users');

// ❌ localStorage for tokens
localStorage.setItem('refreshToken', token);
```

```typescript
// ✅ unknown with type guard
function process(data: unknown): string {
  if (typeof data === 'string') return data;
  throw new Error('Invalid type');
}

// ✅ Interface for DTO
interface CreateUserDto { email: string; }

// ✅ Proper access modifiers
class UserService {
  constructor(private readonly userRepo: UserRepository) {}
  public async create(dto: CreateUserDto): Promise<User> {}
  private async validate(dto: CreateUserDto): Promise<void> {}
}

// ✅ Angular Signals
public readonly users = signal<User[]>([]);

// ✅ ApiClientService
this.api.get<ListResponseDto<User>>('/users').subscribe(...);

// ✅ httpOnly cookie (handled server-side)
```

## Security Audit Points

- JWT validation must happen in `api-gateway` — not bypassed per service
- Rate limiting configured on sensitive routes
- CORS origins explicitly configured — no wildcard `*` in production
- Helmet applied at bootstrap in every NestJS service `main.ts`
- All inputs validated via `class-validator` + `ValidationPipe` before reaching controller logic
- No sensitive data logged (passwords, tokens, PII)

## SonarQube Compliance

Before approving any PR, confirm the diff introduces:
- Zero new `any` types
- Zero hardcoded credentials
- Zero empty catch blocks
- Zero unused code
- Proper error handling on all async paths
