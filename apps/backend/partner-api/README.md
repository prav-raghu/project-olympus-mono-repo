# partner-api

NestJS backend service for partner-facing operations. Port 4004.

## Responsibilities

- Partner account management (CRUD)
- Partner profile and status lifecycle (pending → active → suspended → terminated)
- MSAL-authenticated endpoints

## Structure

```text
src/
├── app.module.ts
├── main.ts
├── config/
│   ├── env.config.ts
│   └── rate-limit.config.ts
├── modules/
│   ├── auth/                  # MSAL guard, roles guard, decorators
│   ├── health/                # Liveness + readiness
│   └── partners/              # Partner CRUD module
│       ├── dto/
│       │   ├── create-partner.dto.ts
│       │   └── update-partner.dto.ts
│       ├── interfaces/
│       │   └── partner.interface.ts
│       ├── partners.controller.ts
│       ├── partners.service.ts
│       └── partners.module.ts
└── common/
    ├── filters/
    ├── interceptors/
    └── pipes/
tests/
├── unit/
│   ├── controllers/
│   └── services/
└── setup.ts
```

## Running

```bash
pnpm dev:partner-api           # port 4004
pnpm debug:partner-api         # build + start
pnpm --filter @project-olympus/partner-api test
```

## Environment

Copy `.env.example` to `.env` and fill in:

```env
NODE_ENV=development
PORT=4004
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_API_AUDIENCE=
DATABASE_URL_ADMIN=mysql://appuser:apppassword@localhost:3306/app_admin
```

## Swagger

Available at <http://localhost:4004/api-docs> in non-production environments.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/partners` | List partners (paged, searchable) |
| `GET` | `/v1/partners/:id` | Get partner by ID |
| `POST` | `/v1/partners` | Create partner |
| `PATCH` | `/v1/partners/:id` | Update partner |
| `DELETE` | `/v1/partners/:id` | Deactivate partner |
