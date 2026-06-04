# @project-olympus/metrics

Prometheus metrics utilities for NestJS services. Exposes metrics via HTTP endpoint and provides health check helpers.

## Usage

Register the interceptor globally in each service's `main.ts` or `app.module.ts`:

```typescript
import { createMetricsInterceptor } from '@project-olympus/metrics';
import { Registry } from 'prom-client';

const registry = new Registry();
app.useGlobalInterceptors(createMetricsInterceptor(registry, 'my_service_'));
```

Or use the `HealthService` class for health check logic:

```typescript
import { HealthService } from '@project-olympus/metrics';

const healthService = new HealthService({ serviceName: 'my-service', version: '1.0.0' });
```

## Endpoints (per service)

Health endpoints are provided by the NestJS `HealthModule` in each service:

- `GET /health` — liveness: always returns `{ status: 'ok' }`
- `GET /health/ready` — readiness: returns `{ status: 'ready', timestamp }`
