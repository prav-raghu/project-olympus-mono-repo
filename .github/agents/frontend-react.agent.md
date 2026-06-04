---
name: Frontend Admin Web Agent
description: >
  Use when working on the admin-web Angular application — admin dashboards, management tables,
  CRUD forms, data grids, and internal tools. Covers standalone components, Signals-based state,
  MSAL authentication, Angular reactive forms, HttpClient/ApiClientService, Angular Router with
  lazy loading, and Tailwind CSS v4 styling. Both admin-web and customer-web are Angular apps.
tools:
  - read_file
  - write_file
  - run_terminal_command
---

# Frontend Admin Web Agent

The admin-web app (`apps/frontend/admin-web/`) is an Angular standalone SPA for the admin dashboard.

## Architecture Rules

- **Standalone components only** — `standalone: true` on every `@Component`, no NgModules
- **Signals** — `signal()`, `computed()`, `effect()` for all component state
- **No RxJS BehaviorSubjects as stores** — use Signals or NgRx Signals Store for cross-feature state
- **HttpClient** — always wrapped in `ApiClientService` — never inject `HttpClient` directly in components
- **MSAL** — `MsalGuard` on all protected routes; `MsalInterceptor` auto-attaches Bearer tokens
- **Reactive forms** — Angular `ReactiveFormsModule` with `Validators` — never template-driven or Zod
- **Tailwind CSS v4** — all styling via utility classes in templates
- **Lazy-loaded routes** — all feature components loaded via `loadComponent`
- **No `any`** — TypeScript strict throughout

## Directory Structure

```
apps/frontend/admin-web/src/
  app/
    core/
      auth/
        auth.guard.ts
        auth.interceptor.ts
        msal.config.ts
      services/
        api-client.service.ts
      constants/
        config.ts
        routes.ts
        http-status.ts
        query-keys.ts
    features/
      [feature]/
        [feature].component.ts
        [feature].service.ts     ← optional, for complex API logic
    shared/
      components/
        loading/loading.component.ts
        error/error.component.ts
        not-found/not-found.component.ts
  environments/
    environment.ts
    environment.prod.ts
  main.ts
  styles.scss
  index.html
```

## Admin List Component Pattern

Every list page must include loading, error, and empty states:

```typescript
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import type { ResponseDto, ListResponseDto } from '@project-olympus/types';

interface Product {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-foreground">Products</h1>
        <a routerLink="/products/new" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Add Product
        </a>
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (_ of skeletonRows; track $index) {
            <div class="h-14 bg-muted animate-pulse rounded-lg"></div>
          }
        </div>
      } @else if (error()) {
        <div class="flex flex-col items-center py-12">
          <p class="text-destructive mb-4">{{ error() }}</p>
          <button (click)="load()" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Try Again
          </button>
        </div>
      } @else if (products().length === 0) {
        <div class="flex flex-col items-center py-12">
          <p class="text-muted-foreground mb-4">No products found</p>
          <a routerLink="/products/new" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Add First Product
          </a>
        </div>
      } @else {
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-3 px-4 text-muted-foreground">Name</th>
              <th class="text-left py-3 px-4 text-muted-foreground">Price</th>
              <th class="text-left py-3 px-4 text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (product of products(); track product.id) {
              <tr class="border-b border-border hover:bg-muted/50">
                <td class="py-3 px-4">{{ product.name }}</td>
                <td class="py-3 px-4">{{ product.price | currency }}</td>
                <td class="py-3 px-4">
                  <a [routerLink]="['/products', product.id, 'edit']"
                     class="text-primary hover:underline mr-4">Edit</a>
                  <button (click)="delete(product.id)"
                          class="text-destructive hover:underline">Delete</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class ProductsComponent implements OnInit {
  private readonly api = inject(ApiClientService);

  public readonly products = signal<Product[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);
  public readonly skeletonRows = Array.from({ length: 5 });

  public ngOnInit(): void {
    this.load();
  }

  public load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<ListResponseDto<Product>>('/products').subscribe({
      next: (res) => { this.products.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load products'); this.loading.set(false); },
    });
  }

  public delete(id: string): void {
    this.api.delete<ResponseDto<never>>(`/products/${id}`).subscribe({
      next: () => this.products.update((list) => list.filter((p) => p.id !== id)),
    });
  }
}
```

## Admin Form Component Pattern

```typescript
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="p-8 max-w-lg">
      <h1 class="text-2xl font-bold text-foreground mb-6">Create Product</h1>
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1">Name</label>
          <input formControlName="name" class="w-full border border-border rounded-lg px-3 py-2" />
          @if (form.controls.name.invalid && form.controls.name.touched) {
            <p class="text-destructive text-sm mt-1">Name is required (min 2 characters)</p>
          }
        </div>
        <button type="submit" [disabled]="submitting() || form.invalid"
                class="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">
          {{ submitting() ? 'Saving...' : 'Save' }}
        </button>
        @if (serverError()) {
          <p class="text-destructive text-sm">{{ serverError() }}</p>
        }
      </form>
    </div>
  `,
})
export class ProductFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClientService);
  private readonly router = inject(Router);

  public readonly submitting = signal(false);
  public readonly serverError = signal<string | null>(null);

  public readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  public submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.serverError.set(null);
    this.api.post('/products', this.form.value).subscribe({
      next: () => this.router.navigate(['/products']),
      error: (err: unknown) => {
        this.serverError.set('Failed to save product');
        this.submitting.set(false);
      },
    });
  }
}
```

## Routing

All routes use `loadComponent` with `MsalGuard`:

```typescript
import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
  {
    path: 'products',
    canActivate: [MsalGuard],
    loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
  },
  {
    path: 'products/new',
    canActivate: [MsalGuard],
    loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent),
  },
  {
    path: 'products/:id/edit',
    canActivate: [MsalGuard],
    loadComponent: () => import('./features/products/product-form.component').then(m => m.ProductFormComponent),
  },
];
```

## Admin Dashboard Layout

Every admin app must include:
- Left sidenav (persistent)
- Top navigation bar with user info and logout
- Main content area

## Dev Commands

```bash
pnpm --filter admin-web dev
pnpm --filter admin-web build
pnpm --filter admin-web test
```

## Critical Rules

- NEVER use `any` — explicit types everywhere
- NEVER use `alert()`, `confirm()`, or native HTML form validation
- NEVER inject `HttpClient` directly in components — always via `ApiClientService`
- NEVER use React, JSX, Zod, or React Query
- ALWAYS include loading, error, and empty states
- ALWAYS use Tailwind utility classes — no inline styles or CSS modules
- ALWAYS use Angular reactive forms with `Validators` — never template-driven forms
- ALWAYS use Signals for component state — never `BehaviorSubject` as a component store
