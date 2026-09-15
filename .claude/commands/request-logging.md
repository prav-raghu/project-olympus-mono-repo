---
description: "Wire up or review request/response logging for a NestJS backend service"
agent: "backend-service"
argument-hint: "Target service, e.g. 'admin-api' or 'the new schedule-api routes'"
---

Set up or review request/response logging for: **{{ input }}**

Every NestJS backend service logs inbound requests and outbound responses through the `LoggingInterceptor`, backed by `AzureMonitorLogger` from `@project-olympus/logging` — never `console.log`, never a per-controller ad-hoc log call. See `.claude/instructions/request-logging.instructions.md` for the interceptor location, what gets logged and redacted, correlation-ID propagation, and sample Azure Monitor Kusto queries.
