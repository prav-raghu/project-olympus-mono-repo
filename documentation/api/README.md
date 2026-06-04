# API Documentation

This directory contains auto-generated API documentation for all backend services.

## Structure

```text
api/
├── customer-api/
│   ├── openapi.json              # OpenAPI 3.0 specification
│   ├── customer-api.postman_collection.json   # Postman collection
│   └── bruno/                    # Bruno request files
│       └── *.bru
├── admin-api/
│   └── ...
├── schedule-api/
│   └── ...
└── api-gateway/
    └── ...
```

## Generating Documentation

Make sure the backend services are running, then run:

```bash
pnpm docs:export
```

This will:

1. Fetch OpenAPI specs from each running service
2. Generate Postman collections
3. Generate Bruno collections

## Viewing Documentation

### Swagger UI (Live)

Each service has Swagger UI available at `/docs`:

- Customer API: <http://localhost:3001/docs>
- Admin API: <http://localhost:3002/docs>
- Schedule API: <http://localhost:3003/docs>
- API Gateway: <http://localhost:4000/docs>

### Importing to Postman

1. Open Postman
2. Click "Import"
3. Select the `.postman_collection.json` file

### Using Bruno

1. Open Bruno
2. Click "Open Collection"
3. Navigate to the `bruno/` directory for your service

## Environment Variables

Both Postman and Bruno collections use variables:

- `{{baseUrl}}` - The service base URL
- `{{accessToken}}` - JWT access token for authenticated requests
