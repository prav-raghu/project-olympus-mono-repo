import { type HealthCheckDefinition, type HealthCheckResult } from "../plugins/health.plugin";

export class HealthCheckBuilder {
    private readonly checks: HealthCheckDefinition[] = [];

    public addDatabaseCheck(checkFn: () => Promise<boolean>, name = "database"): this {
        this.checks.push({
            name,
            critical: true,
            check: async (): Promise<HealthCheckResult> => {
                try {
                    const isHealthy = await checkFn();
                    return {
                        status: isHealthy ? "healthy" : "unhealthy",
                        message: isHealthy ? "Database connection is healthy" : "Database connection failed",
                    };
                } catch (error) {
                    return {
                        status: "unhealthy",
                        message: error instanceof Error ? error.message : "Database check failed",
                    };
                }
            },
        });
        return this;
    }

    public addRedisCheck(checkFn: () => Promise<boolean>, name = "redis"): this {
        this.checks.push({
            name,
            critical: false,
            check: async (): Promise<HealthCheckResult> => {
                try {
                    const isHealthy = await checkFn();
                    return {
                        status: isHealthy ? "healthy" : "degraded",
                        message: isHealthy ? "Redis connection is healthy" : "Redis connection unavailable",
                    };
                } catch (error) {
                    return {
                        status: "degraded",
                        message: error instanceof Error ? error.message : "Redis check failed",
                    };
                }
            },
        });
        return this;
    }

    public addExternalServiceCheck(name: string, checkFn: () => Promise<boolean>, critical = false): this {
        const getUnhealthyStatus = (): "unhealthy" | "degraded" => (critical ? "unhealthy" : "degraded");
        this.checks.push({
            name,
            critical,
            check: async (): Promise<HealthCheckResult> => {
                try {
                    const isHealthy = await checkFn();
                    const status = isHealthy ? "healthy" : getUnhealthyStatus();
                    return {
                        status,
                        message: isHealthy ? `${name} is reachable` : `${name} is unreachable`,
                    };
                } catch (error) {
                    return {
                        status: getUnhealthyStatus(),
                        message: error instanceof Error ? error.message : `${name} check failed`,
                    };
                }
            },
        });
        return this;
    }

    public addCustomCheck(check: HealthCheckDefinition): this {
        this.checks.push(check);
        return this;
    }

    public build(): HealthCheckDefinition[] {
        return [...this.checks];
    }
}

export function createDatabaseHealthCheck(prisma: { $queryRaw: (query: unknown) => Promise<unknown> }): () => Promise<boolean> {
    return async (): Promise<boolean> => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    };
}

export function createRedisHealthCheck(redis: { ping: () => Promise<string> }): () => Promise<boolean> {
    return async (): Promise<boolean> => {
        try {
            const result = await redis.ping();
            return result === "PONG";
        } catch {
            return false;
        }
    };
}

export function createHttpHealthCheck(url: string, timeoutMs = 5000): () => Promise<boolean> {
    return async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
                method: "GET",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    };
}
