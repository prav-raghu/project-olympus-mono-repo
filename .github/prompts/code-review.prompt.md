---
description: "Run a full code review on recent changes - checks type safety, naming, security, and project standards"
agent: "Code Review Agent"
argument-hint: "Scope of review, e.g. 'all backend services' or 'customer-api auth module'"
---

Review the following for quality, security, and standards compliance:

**Scope:** {{ input }}

## Review Checklist

- No `any` types anywhere
- No hardcoded secrets, API keys, or connection strings
- No comments in code
- All classes have `public`/`private`/`readonly` access modifiers
- Constructor dependencies use `private readonly`
- DTOs are classes with `class-validator` decorators — never plain interfaces
- Backend uses `class-validator` exclusively (never Zod or AJV)
- Angular components use Signals for state — never raw `BehaviorSubject` stores
- Angular components use `ApiClientService` — never inject `HttpClient` directly
- Angular components use reactive forms with `Validators` — never Zod or template-driven forms
- Naming conventions followed (camelCase variables, PascalCase classes, kebab-case files)
- Database tables/columns use snake_case via Prisma `@map` / `@@map`
- All async functions have error handling
- No empty catch blocks
- No unused imports or variables
- SonarQube compliant (zero issues)

Report findings as: Blockers (must fix), Warnings (should fix), and Suggestions (nice to have).
