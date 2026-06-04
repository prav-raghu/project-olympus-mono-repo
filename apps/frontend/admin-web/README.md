# admin-web

Angular 19 admin dashboard. Port 4200.

## Stack

- Angular 19 (standalone components, Signals)
- Azure MSAL (`@azure/msal-angular`) for authentication
- Tailwind CSS v4
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
    ├── app.routes.ts        # Lazy routes — all guarded by MsalGuard
    ├── app.component.ts     # Root component — initialises MSAL
    ├── core/
    │   ├── auth/            # auth.guard.ts, auth.interceptor.ts, msal.config.ts
    │   ├── services/        # ApiClientService (HttpClient wrapper)
    │   └── constants/       # config, routes, http-status, query-keys
    ├── features/
    │   ├── dashboard/
    │   ├── users/
    │   ├── reporting/
    │   └── batch/
    └── shared/
        └── components/
            └── not-found/
```

## Running

```bash
pnpm --filter admin-web dev    # port 4200
pnpm --filter admin-web build
pnpm --filter admin-web test
```

## Configuration

Fill in `src/environments/environment.ts` before running:

```typescript
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

## Adding a feature

1. Create `src/app/features/<feature>/<feature>.component.ts` (standalone)
2. Use `signal()` and `computed()` for component state — never `BehaviorSubject` as store
3. Inject `ApiClientService` for HTTP — never inject `HttpClient` directly
4. Add lazy route to `src/app/app.routes.ts` with `MsalGuard`
