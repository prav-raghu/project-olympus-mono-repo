---
name: frontend-angular
description: Use when working on Angular single-page applications — admin-web (admin dashboard) and customer-web (customer portal). Covers standalone components, Signals-based state, MSAL authentication, reactive forms, HttpClient/ApiClientService, Angular Router, and Tailwind CSS v4. Do NOT use React, Next.js, Vue, or any other framework for these apps — both admin-web and customer-web are Angular.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

# Frontend Angular Agent

## Apps

| App | Path | Port | Purpose |
|---|---|---|---|
| `admin-web` | `apps/frontend/admin-web/` | 4200 | Admin dashboard — management tables, CRUD forms, data grids, internal tools |
| `customer-web` | `apps/frontend/customer-web/` | 5173 | Customer portal — public/SEO-relevant pages |

Both apps share identical architecture rules. `customer-web` adds SEO requirements on top (see below).

## Architecture rules

- **Standalone components only** — `standalone: true` on every `@Component`, no NgModules
- **Signals** — `signal()`, `computed()`, `effect()` as the primary state primitive
- **No RxJS `BehaviorSubject` as a store** — use Signals or NgRx Signals Store for cross-feature state
- **HttpClient** — always wrapped in `ApiClientService` — never inject `HttpClient` directly in a component
- **MSAL** — `MsalGuard` on protected routes, `MsalInterceptor` auto-attaches Bearer tokens
- **Reactive forms** — `ReactiveFormsModule` with `Validators` for every form — never template-driven forms, never Zod
- **Tailwind CSS v4** — all styling via utility classes in templates, no inline styles
- **Lazy-loaded routes** — every feature component loaded via `loadComponent`
- **No `any`** — TypeScript strict throughout

## Directory structure

```
src/
  app/
    core/
      auth/
        auth.guard.ts           ← CanActivateFn delegating to MsalGuard
        auth.interceptor.ts     ← re-exports MsalInterceptor
        msal.config.ts          ← re-exports msalInstance
      services/
        api-client.service.ts   ← HttpClient wrapper
      constants/
        config.ts
        routes.ts
        http-status.ts
        query-keys.ts
    features/
      [feature]/
        [feature].component.ts
        [feature].service.ts    ← if feature-specific API calls needed
    shared/
      components/
      pipes/
      directives/
  environments/
    environment.ts
    environment.prod.ts
  main.ts
  styles.scss
  index.html
```

## Component pattern

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-background p-8">
      <h1 class="text-3xl font-bold text-foreground">Users</h1>
      @if (loading()) {
        <p class="text-muted-foreground">Loading...</p>
      } @else {
        <ul>
          @for (user of users(); track user.id) {
            <li class="py-2">{{ user.email }}</li>
          }
        </ul>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly title = inject(Title);

  public readonly users = signal<{ id: string; email: string }[]>([]);
  public readonly loading = signal(true);

  public ngOnInit(): void {
    this.title.setTitle('Users | Admin');
    this.api.get<{ data: { id: string; email: string }[] }>('/users').subscribe({
      next: (res) => { this.users.set(res.data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }
}
```

## MSAL setup

Both apps configure MSAL in `src/app/app.config.ts`. Fill environment files before running:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4001/api/v1',
  msalConfig: {
    auth: {
      clientId: '<spa-app-registration-client-id>',
      authority: 'https://login.microsoftonline.com/<tenant-id>',
      redirectUri: 'http://localhost:4200',
    },
  },
  apiScopes: ['api://<api-client-id>/access_as_user'],
};
```

## HTTP client pattern

Never inject `HttpClient` directly into components. Always go through `ApiClientService`:

```typescript
@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  public get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }
  public post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }
  public put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }
  public delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }
}
```

## Reactive forms (every form, both apps)

```typescript
public readonly form = this.fb.group({
  name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
  email: ['', [Validators.required, Validators.email]],
  price: [0, [Validators.required, Validators.min(0)]],
});
```

- Client-side `Validators` failures → inline error below the field (`form.controls.x.invalid && form.controls.x.touched`)
- Server error (400/409/500) → a `serverError` signal rendered near the submit button, or a toast if a toast service is wired up — never silently swallowed
- Submit button always reflects a `submitting` signal and is disabled while pending or while the form is invalid

See `validation-chain.instructions.md` for how Prisma field constraints flow through the backend DTO decorators into these `Validators` calls, and `frontend-pages.instructions.md` / `frontend-hooks.instructions.md` for the full component conventions (loading/error/empty states, debounced search, `takeUntilDestroyed`).

## customer-web SEO requirements

Every page component injects `Title` and `Meta` in `ngOnInit`:

```typescript
private readonly title = inject(Title);
private readonly meta = inject(Meta);

public ngOnInit(): void {
  this.title.setTitle('Products | Brand Name');
  this.meta.updateTag({ name: 'description', content: 'Browse our product catalog' });
  this.meta.updateTag({ property: 'og:title', content: 'Products' });
}
```

## Admin dashboard layout (admin-web)

Persistent left sidenav, top navigation bar with user info, main content area with breadcrumbs. Data tables include pagination, search, filter controls, and a create button.

## Dev commands

```bash
pnpm --filter admin-web dev
pnpm --filter customer-web dev
pnpm --filter admin-web build
pnpm --filter customer-web build
pnpm --filter admin-web typecheck
pnpm --filter customer-web typecheck
```

## Critical rules

Never use React, JSX, Zod, React Query, or RxJS `BehaviorSubject` stores. Never `alert()`, `confirm()`, or native HTML form validation. Never inject `HttpClient` directly in a component. Never `localStorage` for tokens — MSAL handles token caching; let the MSAL library manage the cache, don't roll your own. Always Signals for component state. Always loading/error/empty states on data-driven components. Always Tailwind utility classes, never inline styles or CSS modules.
