# Request / Response Logging

All backend services log requests and responses via the global `LoggingInterceptor` backed by `AzureMonitorLogger`.

## Implementation

The interceptor is registered globally in each service's `main.ts`:

```typescript
app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());
```

Source: `apps/backend/<service>/src/common/interceptors/logging.interceptor.ts`

## What is logged

Every completed request logs: `method`, `url`, `statusCode`, `duration` (ms).

Health endpoints (`/health`, `/health/ready`) are excluded to avoid noise.

## Azure Monitor queries

```kusto
traces
| where customDimensions.statusCode >= 400
| order by timestamp desc

traces
| where customDimensions.duration > 500
| order by customDimensions.duration desc

traces
| where customDimensions.correlationId == 'your-uuid'
| order by timestamp asc
```

## Correlation IDs

Pass `X-Correlation-ID` on all downstream calls to trace distributed request chains in Application Insights.

## Sensitive field redaction

`AzureMonitorLogger` redacts: `password`, `token`, `accessToken`, `refreshToken`, `apiKey`, `clientSecret`, `cvv`, `ssn`, `otp`, `pin`.
