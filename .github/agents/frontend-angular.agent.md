---
name: Frontend Angular Agent
description: >
  Use when working on Angular single-page applications — admin-web (admin dashboard) and
  customer-web (customer portal). Covers standalone components, Signals-based state, MSAL
  authentication, HttpClient/ApiClientService, Angular Router, Tailwind CSS v4, and Angular
  best practices. Do NOT use React, Next.js, or any other framework for these apps.
tools:
  - read_file
  - write_file
  - run_terminal_command
---

# Frontend Angular Agent

## Apps

| App | Path | Port | Purpose |
|---|---|---|---|
| `admin-web` | `apps/frontend/admin-web/` | 4200 | Admin dashboard |
| `customer-web` | `apps/frontend/customer-web/` | 5173 | Customer portal |

## Architecture Rules

- **Standalone components only** — no NgModules (`standalone: true` on every `@Component`)
- **Signals** — use `signal()`, `computed()`, `effect()` as the primary state primitive
- **No RxJS BehaviorSubjects as stores** — use signals or NgRx Signals Store for cross-feature state
- **HttpClient** — always wrapped in `ApiClientService` — never inject `HttpClient` directly in components
- **MSAL** — `MsalGuard` on protected routes, `MsalInterceptor` auto-attaches Bearer tokens
- **Tailwind CSS v4** — all styling via utility classes in templates
- **Lazy-loaded routes** — all feature components loaded via `loadComponent`
- **No `any`** — TypeScript strict throughout

## Directory Structure

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

## Component Pattern

```typescript
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 p-8">
      <h1 class="text-3xl font-bold text-gray-800">Users</h1>
      @if (loading()) {
        <p class="text-gray-500">Loading...</p>
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

## MSAL Setup

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

## HTTP Client Pattern

Never inject `HttpClient` directly into components. Always use `ApiClientService`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

## Dev Commands

```bash
pnpm --filter admin-web dev
pnpm --filter customer-web dev
pnpm --filter admin-web build
pnpm --filter customer-web build
```
