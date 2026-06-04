---
applyTo: "apps/mobile/**"
description: "Mobile app conventions for Ionic Angular + Capacitor — routing, storage, native plugins, and page patterns"
---

When working on any app under `apps/mobile/`:

## Non-negotiables

- ALL persistent storage: `@capacitor/preferences` — NEVER `localStorage` or `sessionStorage`
- ALL API calls: through `HttpClient` injected via `ApiClientService` — never raw fetch in components
- ALL component state: Angular Signals (`signal()`, `computed()`) — never `BehaviorSubject` stores
- ALL page roots: `IonPage` with `IonHeader` + `IonContent` — never bare `div`
- ALL list pages: `IonInfiniteScroll` with cursor-based pagination — never pagination buttons
- ALL data pages: pull-to-refresh with `IonRefresher` + skeleton loading + error + empty states
- ALL tokens: stored in `@capacitor/preferences`, sent via Angular `HttpInterceptor`
- ALL components: `standalone: true` — never NgModules

## Platform Detection

Before calling any native Capacitor plugin:

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // native plugin call
}
```

Push notifications, camera, geolocation — ALL require this guard. They will throw in the browser without it.

## Data Loading Pattern

```typescript
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [IonPage, IonHeader, IonContent, IonList, IonItem, IonSkeletonText, IonRefresher, IonRefresherContent],
  template: `...`,
})
export class ProductListPage implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly items = signal<Product[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  public ngOnInit(): void {
    this.load();
  }

  public load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<ListResponseDto<Product>>('/products').pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => { this.items.set(res.data); this.loading.set(false); },
      error: () => { this.error.set('Failed to load'); this.loading.set(false); },
    });
  }

  public handleRefresh(event: IonRefresherCustomEvent<RefresherEventDetail>): void {
    this.api.get<ListResponseDto<Product>>('/products').pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (res) => { this.items.set(res.data); event.target.complete(); },
      error: () => event.target.complete(),
    });
  }
}
```

## Page Three States (Required)

Every page displaying API data MUST handle all three states before marking as complete:

| State | Ionic Component |
|-------|----------------|
| Loading | `IonSkeletonText` inside `IonItem`/`IonCard` |
| Error | Custom card with `IonButton` retry calling `load()` |
| Empty | `ion-padding ion-text-center` div with message and CTA |

## Naming

- Pages: `kebab-case.page.ts` in `src/app/pages/`
- Components: `kebab-case.component.ts` in `src/app/components/{feature}/`
- Services: `kebab-case.service.ts` in `src/app/services/`

## Before Native Build Checklist

- [ ] `appId` in `capacitor.config.ts` updated to production value
- [ ] `appName` updated
- [ ] `apiBaseUrl` in `src/environments/environment.ts` pointing to accessible server IP, not `localhost`
- [ ] `pnpm build` passes
- [ ] `npx cap sync` run after build
- [ ] Push notification permissions set in native project settings
- [ ] Signing certificates configured in Xcode / Android Studio
