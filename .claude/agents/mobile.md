---
name: mobile
description: Use when working on the mobile app at apps/mobile/customer-mobile/. Covers Ionic Angular standalone components + Capacitor — pages, services, API client, push notifications, native device features (camera, geolocation, storage), offline support, Angular Router with Ionic routing, and Capacitor plugin integration. Also use when adding new mobile screens, connecting mobile to backend APIs, or configuring native builds for iOS and Android.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

## App location

```
apps/mobile/
└── customer-mobile/     ← Ionic Angular + Capacitor customer app
```

## Tech stack

| Concern | Technology |
| --- | --- |
| Framework | Ionic Angular (standalone components) |
| Native runtime | Capacitor |
| Language | TypeScript strict |
| Styling | Ionic CSS + SCSS (no external CSS framework) |
| State | Angular Signals |
| HTTP | `ApiClientService` wrapping `HttpClient` |
| Routing | Angular Router + `IonicRouteStrategy` |
| Icons | Ionicons (tree-shakeable via `addIcons`) |

This is the one place in the monorepo where "React" ever appears in surrounding documentation is a red herring — the mobile app is **Ionic Angular**, not Ionic React. There is no React anywhere in this project.

## Running

```bash
pnpm dev:mobile                                             # browser dev server on port 8100
pnpm --filter @project-olympus/customer-mobile cap:sync     # build + cap sync
pnpm --filter @project-olympus/customer-mobile cap:ios      # open Xcode
pnpm --filter @project-olympus/customer-mobile cap:android  # open Android Studio
```

## Directory structure

```
src/
├── main.ts                    # bootstrapApplication entry
├── global.scss                # Ionic CSS imports + theme variables
├── index.html                 # <app-root> shell
├── theme/
│   └── variables.css          # Ionic CSS variable overrides
├── assets/
└── app/
    ├── app.config.ts          # ApplicationConfig — IonicAngular, Router, HttpClient
    ├── app.routes.ts          # Lazy page routes
    ├── app.component.ts       # <ion-app> + <ion-router-outlet>
    ├── core/
    │   └── services/
    │       └── api-client.service.ts
    └── pages/
        └── home/
            └── home.page.ts
```

## Non-negotiables

- ALL persistent storage: `@capacitor/preferences` — NEVER `localStorage` or `sessionStorage`
- ALL API calls: through `HttpClient` injected via `ApiClientService` — never raw `fetch` in components
- ALL component state: Angular Signals — never `BehaviorSubject` stores
- ALL page roots: `IonPage` with `IonHeader` + `IonContent` — never bare `div`
- ALL list pages: `IonInfiniteScroll` with cursor-based pagination — never pagination buttons
- ALL data pages: pull-to-refresh with `IonRefresher` + skeleton loading + error + empty states
- ALL tokens: stored in `@capacitor/preferences`, sent via an Angular `HttpInterceptor`
- ALL components: `standalone: true` — never NgModules

## Platform detection

Before calling any native Capacitor plugin:

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  // native plugin call
}
```

Push notifications, camera, geolocation — ALL require this guard. They throw in the browser without it.

## Page pattern (Ionic Angular standalone)

```typescript
import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar><ion-title>Example</ion-title></ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <p class="ion-padding">Content here</p>
    </ion-content>
  `,
})
export class ExamplePage {}
```

Import each Ionic component individually from `@ionic/angular/standalone`. Use `addIcons({ ... })` in the constructor for icons — never import all icons.

## Data loading pattern (three required states)

```typescript
export class ProductListPage implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly items = signal<Product[]>([]);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  public ngOnInit(): void { this.load(); }

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

| State | Ionic component |
|-------|----------------|
| Loading | `IonSkeletonText` inside `IonItem`/`IonCard` |
| Error | Custom card with `IonButton` retry calling `load()` |
| Empty | `ion-padding ion-text-center` div with message and CTA |

## Authentication — token storage

Never `localStorage`. Store MSAL/API tokens via `@capacitor/preferences` and attach them in an `HttpInterceptor`, mirroring the web apps' `ApiClientService` pattern but Capacitor-safe.

## Capacitor plugins

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const image = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.Uri });
```

Upload through the API/`common/storage` service — never send raw image data straight into Prisma.

## Adding a new page

1. Create `src/app/pages/<name>/<name>.page.ts` (standalone component)
2. Add a lazy route to `src/app/app.routes.ts`
3. Import required Ionic components from `@ionic/angular/standalone`

## Naming

Pages: `kebab-case.page.ts` in `src/app/pages/`. Components: `kebab-case.component.ts` in `src/app/components/{feature}/`. Services: `kebab-case.service.ts` in `src/app/services/`.

## Before native build checklist

- [ ] `appId` in `capacitor.config.ts` updated to production value
- [ ] `appName` updated
- [ ] `apiBaseUrl` in `src/environments/environment.ts` pointing to an accessible server IP, not `localhost`
- [ ] `pnpm build` passes
- [ ] `npx cap sync` run after build
- [ ] Push notification permissions set in native project settings
- [ ] Signing certificates configured in Xcode / Android Studio

## Critical rules

Never use `localStorage`. Never call backend APIs directly from a Capacitor native plugin — go through `ApiClientService`. Never use browser-only APIs without `Capacitor.isNativePlatform()`. Always `IonPage`/`IonHeader`/`IonContent`, never a raw `div` as the page root. Always implement pull-to-refresh and infinite scroll on data-driven pages. All pages handle loading skeleton, error state with retry, and empty state. `appId` must be updated for every new project before a native build.
