---
applyTo: "apps/backend/**/interceptors/**,apps/backend/**/main.ts"
description: "Request/response logging via NestJS LoggingInterceptor backed by AzureMonitorLogger"
---

Every NestJS backend service logs all inbound requests and outbound responses through the `LoggingInterceptor`, which uses `AzureMonitorLogger` from `@project-olympus/logging`.

## Interceptor Location

```
apps/backend/<service>/src/common/interceptors/logging.interceptor.ts
```

The interceptor is identical across services — already scaffolded in all 4 services.

## What It Logs

| Event | Logged fields |
| --- | --- |
| Request completed | `method`, `url`, `statusCode`, `duration` (ms) |

Sensitive fields are redacted by `AzureMonitorLogger` before forwarding to Azure Monitor.

Health and readiness endpoints (`/health`, `/health/ready`) are excluded from logs to avoid noise.

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

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        this.logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: Date.now() - start,
        });
      }),
    );
  }
}
```

## Registration

Applied globally in `main.ts` — already in place for all services:

```typescript
app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());
```

## Correlation IDs

Pass `X-Correlation-ID` as a request header to trace distributed request chains in Azure Monitor. Extend the `LoggingInterceptor` to read and forward this header:

```typescript
const correlationId = req.headers['x-correlation-id'] as string | undefined;
this.logger.info('Request completed', {
  method: req.method,
  url: req.url,
  statusCode: res.statusCode,
  duration: Date.now() - start,
  correlationId,
});
```

## Azure Monitor Queries

Query correlated logs in Application Insights:

```kusto
traces
| where customDimensions.correlationId == "your-uuid-here"
| order by timestamp asc

// All 4xx/5xx errors
traces
| where customDimensions.statusCode >= 400
| order by timestamp desc

// Slow responses > 500ms
traces
| where customDimensions.duration > 500
| order by customDimensions.duration desc
```

## Do Not Log

- Raw IP addresses — hash if needed at the application layer
- Auth headers — stripped by `AzureMonitorLogger` redact list
- Health/readiness endpoints — add a path check in `intercept()` to skip
