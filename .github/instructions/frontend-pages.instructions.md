---
applyTo: "apps/frontend/**/features/**"
description: "Angular component conventions — required loading, error, and empty states for all data-driven components"
---

When creating Angular components that display API data:

Every component MUST include these three states:

1. **Loading state**: Animated skeleton placeholders — not spinners — using `@if (loading())` with `animate-pulse` Tailwind classes
2. **Error state**: Error message with a retry button that calls `load()` — including network/503 degraded states
3. **Empty state**: Helpful message with a call-to-action link

NEVER use:
- `alert()` or `confirm()` — use Angular dialog components or conditional template sections
- Native HTML form validation — use Angular reactive forms with `Validators`
- `BehaviorSubject` as component state store — use Signals (`signal()`, `computed()`)
- Inline styles or CSS modules — only Tailwind utility classes
- React, JSX, Hooks, or any React-specific patterns

Admin list components need:
- Data table with column headers
- Pagination controls (page, pageSize) as Signals
- Search input with 300ms debounce via `FormControl` + `debounceTime`
- Filter dropdowns where applicable
- Create button linking to form page via `routerLink`
- Edit and delete action links per row

Customer-facing list components need:
- Cursor-based pagination — load more button or infinite scroll pattern
- Debounced search (300ms minimum)
- Loading skeleton that matches the final layout shape
- `Title` and `Meta` service calls in `ngOnInit` for SEO (customer-web only)

Enterprise component requirements:
- **Lazy loading**: All feature components loaded via `loadComponent` in `app.routes.ts` — never eagerly imported
- **Image lazy loading**: All `<img>` tags use `loading="lazy"` attribute
- **`takeUntilDestroyed`**: All subscriptions use `takeUntilDestroyed(this.destroyRef)` — no manual unsubscribe
- **Typed inputs**: Use Angular `input()` signal for component inputs — not `@Input()` decorator

Use Tailwind CSS variable tokens for all colors:
`bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `bg-muted`, `text-muted-foreground`, `border-border`, `bg-destructive`, `text-destructive-foreground`

Skeleton loading pattern:
```typescript
@if (loading()) {
  <div class="space-y-3">
    @for (_ of skeletonRows; track $index) {
      <div class="h-14 bg-muted animate-pulse rounded-lg"></div>
    }
  </div>
}
```

Error state pattern:
```typescript
@if (error()) {
  <div class="flex flex-col items-center py-12">
    <p class="text-destructive mb-4">{{ error() }}</p>
    <button (click)="load()" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
      Try Again
    </button>
  </div>
}
```

Empty state pattern:
```typescript
@if (items().length === 0) {
  <div class="flex flex-col items-center py-12">
    <p class="text-muted-foreground mb-4">No items found</p>
    <a routerLink="/items/new" class="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
      Add First Item
    </a>
  </div>
}
```
