# CMS — Directus

Directus replaces Strapi. It runs as a Docker container backed by the shared MySQL server.

## Local development

```bash
docker compose -f ../../dev-ops/docker-compose.dev.yml up directus
```

Directus UI: <http://localhost:8055>

Default admin credentials (override via `.env`):

- Email: `admin@example.com`
- Password: `Admin_password1!`

## Environment variables

See root `.env.example` for Directus-related variables:

```env
DIRECTUS_SECRET=changeme
DIRECTUS_ADMIN_EMAIL=admin@example.com
DIRECTUS_ADMIN_PASSWORD=
```

## Consuming Directus from NestJS services

Use the official Directus SDK:

```typescript
import { createDirectus, rest, authentication } from '@directus/sdk';

const client = createDirectus('http://localhost:8055').with(authentication()).with(rest());
```

If multiple backend services need Directus access, create `common/cms/` as a shared NestJS module following the `common/external-apis` forRootAsync pattern.

## Type generation

Directus types are generated via the TypeScript SDK codegen — not from static schema files.
Run `npx @directus/sdk typegen` against a live Directus instance to generate types.
