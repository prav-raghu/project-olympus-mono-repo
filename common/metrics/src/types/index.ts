export interface MetricsPluginOptions {
    prefix?: string;
    defaultLabels?: Record<string, string>;
    collectDefaultMetrics?: boolean;
    defaultMetricsInterval?: number;
    endpoint?: string;
    enableHttpMetrics?: boolean;
    httpMetricsIgnorePaths?: string[];
    customLabels?: string[];
}

export interface HealthCheckOptions {
    serviceName: string;
    version: string;
    checks?: HealthCheckDefinition[];
    exposeLiveness?: boolean;
    exposeReadiness?: boolean;
}

export interface HealthCheckDefinition {
    name: string;
    check: () => Promise<HealthCheckResult>;
    critical?: boolean;
}

export interface HealthCheckResult {
    status: "healthy" | "unhealthy" | "degraded";
    latency?: number;
    message?: string;
    details?: Record<string, unknown>;
}

export interface HealthResponse {
    status: "healthy" | "unhealthy" | "degraded";
    timestamp: string;
    service: string;
    version: string;
    uptime: number;
    checks: Record<string, HealthCheckResult>;
}

export interface MetricsRegistry {
    contentType: string;
    metrics(): Promise<string>;
    resetMetrics(): void;
}
