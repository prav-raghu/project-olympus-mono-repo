# @project-olympus/config

Environment validation and configuration utilities using `class-validator` and `class-transformer`.

## Usage

Services re-export `EnvConfig` from this package:

```typescript
// src/config/env.config.ts in each service
export { EnvConfig, AppEnv } from '@project-olympus/config';
```

Access env vars anywhere:

```typescript
import { EnvConfig } from './config/env.config';

const port = EnvConfig.get('PORT');
const nodeEnv = EnvConfig.get('NODE_ENV');
```

## Validation

`AppEnv` is a class decorated with `class-validator` decorators. `validateEnv()` runs on startup and throws if any required variable is missing or invalid.

```typescript
import { validateEnv } from '@project-olympus/config';

// Called automatically by EnvConfig.load() at service bootstrap
validateEnv(process.env);
```

## Environment variables covered

See `.env.example` at the repo root for the full list. Key variables:

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:4200
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_API_AUDIENCE=
AZURE_AUTHORITY=
APPLICATIONINSIGHTS_CONNECTION_STRING=
DATABASE_URL_ADMIN=
DATABASE_URL_CUSTOMER=
DATABASE_URL_SCHEDULE=
DATABASE_URL_SHARED=
REDIS_URL=redis://localhost:6379
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
```
