import {
  type HealthCheckDefinition,
  type HealthCheckOptions,
  type HealthCheckResult,
  type HealthResponse,
} from '../types';

export type { HealthCheckDefinition, HealthCheckResult, HealthResponse } from '../types';

const startTime = Date.now();
const HEALTH_CHECK_TIMEOUT_MS = 5000;

export class HealthService {
  private readonly options: HealthCheckOptions;
  private readonly checks = new Map<string, HealthCheckDefinition>();

  constructor(options: HealthCheckOptions) {
    this.options = options;
    for (const check of options.checks ?? []) {
      this.checks.set(check.name, check);
    }
  }

  public addCheck(check: HealthCheckDefinition): void {
    this.checks.set(check.name, check);
  }

  public removeCheck(name: string): void {
    this.checks.delete(name);
  }

  public async runChecks(): Promise<HealthResponse> {
    const results: Record<string, HealthCheckResult> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    await Promise.all(
      Array.from(this.checks.entries()).map(async ([name, checkDef]) => {
        const startMs = Date.now();
        try {
          const timeout = new Promise<HealthCheckResult>((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT_MS),
          );
          const result = await Promise.race([checkDef.check(), timeout]);
          results[name] = { ...result, latency: Date.now() - startMs };

          if (result.status === 'unhealthy' && checkDef.critical !== false) {
            overallStatus = 'unhealthy';
          } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
            overallStatus = 'degraded';
          }
        } catch (error) {
          results[name] = {
            status: 'unhealthy',
            latency: Date.now() - startMs,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
          if (checkDef.critical !== false) overallStatus = 'unhealthy';
        }
      }),
    );

    const memHealth = getMemoryHealth();
    results['memory'] = memHealth;
    if (memHealth.status === 'degraded' && overallStatus === 'healthy') overallStatus = 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: this.options.serviceName,
      version: this.options.version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks: results,
    };
  }
}

function getNodeProcess(): NodeJS.Process | null {
  return typeof process === 'undefined' ? null : process;
}

function getMemoryHealth(): HealthCheckResult {
  const nodeProcess = getNodeProcess();
  const mem = nodeProcess ? nodeProcess.memoryUsage() : null;

  if (!mem) return { status: 'healthy' };

  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const usagePercent = (mem.heapUsed / mem.heapTotal) * 100;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (usagePercent > 90) status = 'unhealthy';
  else if (usagePercent > 75) status = 'degraded';

  return {
    status,
    details: {
      heapUsedMB,
      heapTotalMB,
      usagePercent: Math.round(usagePercent),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    },
  };
}

// [backwards-compat alias]
export const healthPlugin = HealthService;
