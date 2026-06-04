import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { HttpMetricsCollector } from '../collectors';
import { Registry } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly ignorePaths: string[];

  constructor(
    private readonly httpCollector: HttpMetricsCollector,
    ignorePaths: string[] = ['/metrics', '/health', '/health/live', '/health/ready', '/favicon.ico'],
  ) {
    this.ignorePaths = ignorePaths;
  }

  public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startTime = process.hrtime.bigint();

    const route = (req.route?.path as string | undefined) ?? req.path;

    if (this.ignorePaths.some((p) => route.startsWith(p))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
        const requestBytes = req.headers['content-length']
          ? Number.parseInt(req.headers['content-length'], 10)
          : undefined;
        const responseBytes = res.getHeader('content-length')
          ? Number.parseInt(String(res.getHeader('content-length')), 10)
          : undefined;

        this.httpCollector.recordRequest(req.method, route, res.statusCode, duration, requestBytes, responseBytes);
      }),
    );
  }
}

export function createMetricsInterceptor(registry: Registry, prefix = '', customLabels: string[] = []): MetricsInterceptor {
  const httpCollector = new HttpMetricsCollector(registry, prefix, customLabels);
  return new MetricsInterceptor(httpCollector);
}
