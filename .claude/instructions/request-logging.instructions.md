---
applyTo: "apps/backend/**/interceptors/**,apps/backend/**/main.ts"
description: "Request/response logging via NestJS LoggingInterceptor backed by AzureMonitorLogger"
---

Every NestJS backend service logs all inbound requests and outbound responses through the `LoggingInterceptor`, which uses `AzureMonitorLogger` from `@project-olympus/logging`.

## Interceptor location

```
apps/backend/<service>/src/common/interceptors/logging.interceptor.ts
```

Identical across services.

## What it logs

| Event | Logged fields |
| --- | --- |
| Request completed | `method`, `url`, `statusCode`, `duration` (ms), `correlationId` |

Sensitive fields are redacted by `AzureMonitorLogger` before forwarding to Azure Monitor. Health and readiness endpoints (`/health`, `/health/ready`) are excluded from logs to avoid noise.

## Implementation

```typescript
import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { type Request, type Response } from 'express';
import { Logger } from '@project-olympus/logging';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const start = Date.now();
    const correlationId = req.headers['x-correlation-id'] as string | undefined;

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        this.logger.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`, {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: Date.now() - start,
          correlationId,
        });
      }),
    );
  }
}
```

## Registration

Applied globally in `main.ts`:

```typescript
app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());
```

## Correlation IDs

Pass `X-Correlation-ID` as a request header to trace distributed request chains in Azure Monitor. Downstream calls (api-gateway → other services) should forward the same header.

## Azure Monitor queries

```kusto
traces
| where customDimensions.correlationId == "your-uuid-here"
| order by timestamp asc

// All 4xx/5xx errors
traces
| where toint(customDimensions.statusCode) >= 400
| order by timestamp desc

// Slow responses > 500ms
traces
| where toint(customDimensions.duration) > 500
| order by todouble(customDimensions.duration) desc
```

## Do not log

- Raw IP addresses — hash if needed at the application layer
- Auth headers — stripped by `AzureMonitorLogger`'s redact list
- Health/readiness endpoints — skip via a path check in `intercept()`
