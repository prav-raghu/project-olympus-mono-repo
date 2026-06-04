import { Injectable } from '@nestjs/common';
import { Logger } from '@project-olympus/logging';
import { EnvConfig } from '../config/env.config';

type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface ServiceHealth {
  name: string;
  url: string;
  status: HealthStatus;
  responseTimeMs?: number;
  error?: string;
}

@Injectable()
export class GatewayHealthService {
  private readonly logger = new Logger(GatewayHealthService.name);
  private readonly healthCheckTimeout = 5000;

  private get serviceEndpoints(): { name: string; url: string }[] {
    return [
      { name: 'customer-api', url: String(EnvConfig.get('CUSTOMER_API_URL') ?? '') },
      { name: 'admin-api', url: String(EnvConfig.get('ADMIN_API_URL') ?? '') },
    ];
  }

  public async checkAllServices(): Promise<{
    status: HealthStatus;
    timestamp: string;
    services: ServiceHealth[];
  }> {
    const serviceChecks = await Promise.all(
      this.serviceEndpoints.filter((s) => s.url).map((service) => this.checkService(service)),
    );

    const unhealthyCount = serviceChecks.filter((s) => s.status === 'unhealthy').length;
    const degradedCount = serviceChecks.filter((s) => s.status === 'degraded').length;

    let status: HealthStatus = 'healthy';
    if (serviceChecks.length > 0 && unhealthyCount === serviceChecks.length) {
      status = 'unhealthy';
    } else if (unhealthyCount > 0 || degradedCount > 0) {
      status = 'degraded';
    }

    return { status, timestamp: new Date().toISOString(), services: serviceChecks };
  }

  private async checkService(service: { name: string; url: string }): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeout);
      const response = await fetch(`${service.url}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - startTime;

      return {
        name: service.name,
        url: service.url,
        status: response.ok ? (responseTimeMs > 3000 ? 'degraded' : 'healthy') : 'unhealthy',
        responseTimeMs,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      this.logger.error(`Health check failed for ${service.name}`, error as Error);
      return {
        name: service.name,
        url: service.url,
        status: 'unhealthy',
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
