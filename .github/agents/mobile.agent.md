---
name: Mobile Agent
description: >
  Use when working on the mobile app at apps/mobile/customer-mobile/. Covers Ionic Angular
  standalone components + Capacitor — pages, services, API client, push notifications, native
  device features (camera, geolocation, storage), offline support, Angular Router with Ionic
  routing, and Capacitor plugin integration. Also use when adding new mobile screens,
  connecting mobile to backend APIs, or configuring native builds for iOS and Android.
tools:
  - read
  - edit
  - search
  - execute
user-invocable: true
argument-hint: "Describe the mobile feature, e.g. 'add a product listing page with offline support'"
---

# Mobile Agent

## App Location

```
apps/mobile/
└── customer-mobile/     ← Ionic Angular + Capacitor customer app
```

## Tech Stack

| Concern | Technology |
| --- | --- |
| Framework | Ionic Angular 8 (standalone components) |
| Native runtime | Capacitor 8 |
| Language | TypeScript strict |
| Styling | Ionic CSS + SCSS (no external CSS framework) |
| State | Angular Signals |
| HTTP | `ApiClientService` wrapping `HttpClient` |
| Routing | Angular Router + `IonicRouteStrategy` |
| Icons | Ionicons (tree-shakeable via `addIcons`) |

## Running

```bash
pnpm dev:mobile                        # browser dev server on port 8100
pnpm --filter @project-olympus/customer-mobile cap:sync   # build + cap sync
pnpm --filter @project-olympus/customer-mobile cap:ios    # open Xcode
pnpm --filter @project-olympus/customer-mobile cap:android # open Android Studio
```

## Directory Structure

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

## Page Pattern (Ionic Angular Standalone)

```typescript
import { Component } from '@angular/core';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Example</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true">
      <p class="ion-padding">Content here</p>
    </ion-content>
  `,
})
export class ExamplePage {}
```

Key rules:
- Import each Ionic component individually from `@ionic/angular/standalone`
- Use `addIcons({ ... })` in the constructor for icons — never import all icons
- Use Angular Signals for state — never RxJS BehaviorSubjects as stores
- Never use `NgModule` — standalone components only

## Adding a New Page

1. Create `src/app/pages/<name>/<name>.page.ts` (standalone component)
2. Add lazy route to `src/app/app.routes.ts`
3. Import required Ionic components from `@ionic/angular/standalone`

## Capacitor Plugins

```typescript
// Use Capacitor plugins via async/await — inject results into Signals
import { Camera, CameraResultType } from '@capacitor/camera';

const image = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Uri,
});
```

## HTTP Client

Always use `ApiClientService` — never inject `HttpClient` directly in pages:

```typescript
import { inject } from '@angular/core';
import { ApiClientService } from '../../core/services/api-client.service';

export class SomePage {
  private readonly api = inject(ApiClientService);
}
```
