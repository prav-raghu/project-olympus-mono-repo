---
paths:
  - "apps/mobile/**/*.ts"
  - "apps/mobile/**/*.html"
---

# Mobile Rules

You are working on the Ionic Angular + Capacitor mobile app under `apps/mobile/`. This is Ionic **Angular**, not Ionic React — there is no React anywhere in this project.

## Non-negotiable

- ALL persistent storage: `@capacitor/preferences` — never `localStorage` or `sessionStorage`
- ALL API calls: through `ApiClientService` — never raw `fetch`/`HttpClient` directly in a page or component
- ALL data fetching: Angular Signals + `HttpClient` observables — never manual polling
- ALL page roots: `IonPage` with `IonHeader` + `IonContent` — never bare `div`
- ALL list pages: `IonInfiniteScroll` + cursor pagination — never pagination buttons
- ALL data pages: pull-to-refresh with `IonRefresher` + skeleton loading + error + empty states
- No `any` type, no comments in code
- `standalone: true` on every component — never NgModules

## Platform guard (required before every native plugin call)

```typescript
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  // native plugin call
}
```

## Before marking complete

Run `pnpm --filter customer-mobile typecheck` — zero errors required.
