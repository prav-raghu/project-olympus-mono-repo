# customer-web

Angular 19 customer portal. Port 5173.

## Stack

- Angular 19 (standalone components, Signals)
- Azure MSAL (`@azure/msal-angular`) for authentication
- Tailwind CSS v4
- Angular `Title` and `Meta` services for SEO
- Angular Router with lazy-loaded routes

## Structure

```text
src/
├── main.ts
├── styles.scss
├── index.html
├── environments/
│   ├── environment.ts       # Dev config — fill in clientId, authority, apiScopes
│   └── environment.prod.ts
└── app/
    ├── app.config.ts        # ApplicationConfig with MSAL providers
    ├── app.routes.ts        # Lazy routes
    ├── app.component.ts     # Root component — sets default meta tags, initialises MSAL
    ├── core/
    │   └── services/        # ApiClientService (HttpClient wrapper)
    ├── features/
    │   ├── home/            # Public home page with Title/Meta SEO
    │   ├── about/
    │   └── profile/         # MSAL-guarded
    └── shared/
        └── components/
            └── not-found/
```

## Running

```bash
pnpm --filter customer-web dev    # port 5173
pnpm --filter customer-web build
pnpm --filter customer-web test
```

## Configuration

Fill in `src/environments/environment.ts` before running:

```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4002/api/v1',
  msalConfig: {
    auth: {
      clientId: '<spa-app-registration-client-id>',
      authority: 'https://login.microsoftonline.com/<tenant-id>',
      redirectUri: 'http://localhost:5173',
    },
  },
  apiScopes: ['api://<api-client-id>/access_as_user'],
};
```

## SEO

Use Angular's `Title` and `Meta` services on every page — no SSR required:

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

@Component({ standalone: true, ... })
export class HomeComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  public ngOnInit(): void {
    this.title.setTitle('Home | Project Olympus');
    this.meta.updateTag({ name: 'description', content: 'Welcome to the customer portal.' });
  }
}
```

## Adding a feature

1. Create `src/app/features/<feature>/<feature>.component.ts` (standalone)
2. Use `signal()` for component state
3. Inject `ApiClientService` for HTTP calls
4. Set `Title` and `Meta` in `ngOnInit`
5. Add lazy route to `src/app/app.routes.ts`
