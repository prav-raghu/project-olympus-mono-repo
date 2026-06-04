import { type Registry, Counter, Gauge, Histogram } from "prom-client";

export class CustomMetricsFactory {
    private readonly registry: Registry;
    private readonly prefix: string;

    constructor(registry: Registry, prefix = "") {
        this.registry = registry;
        this.prefix = prefix;
    }

    public createCounter(name: string, help: string, labelNames: string[] = []): Counter {
        return new Counter({
            name: `${this.prefix}${name}`,
            help,
            labelNames,
            registers: [this.registry],
        });
    }

    public createGauge(name: string, help: string, labelNames: string[] = []): Gauge {
        return new Gauge({
            name: `${this.prefix}${name}`,
            help,
            labelNames,
            registers: [this.registry],
        });
    }

    public createHistogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]): Histogram {
        return new Histogram({
            name: `${this.prefix}${name}`,
            help,
            labelNames,
            buckets: buckets ?? [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry],
        });
    }

    public createDatabaseMetrics(): DatabaseMetrics {
        return new DatabaseMetrics(this.registry, this.prefix);
    }

    public createCacheMetrics(): CacheMetrics {
        return new CacheMetrics(this.registry, this.prefix);
    }
}

export class DatabaseMetrics {
    public readonly queryDuration: Histogram;
    public readonly queryTotal: Counter;
    public readonly connectionPoolSize: Gauge;
    public readonly connectionPoolActive: Gauge;
    public readonly connectionPoolIdle: Gauge;

    constructor(registry: Registry, prefix = "") {
        this.queryDuration = new Histogram({
            name: `${prefix}database_query_duration_seconds`,
            help: "Database query duration in seconds",
            labelNames: ["operation", "table"],
            buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
            registers: [registry],
        });

        this.queryTotal = new Counter({
            name: `${prefix}database_queries_total`,
            help: "Total number of database queries",
            labelNames: ["operation", "table", "status"],
            registers: [registry],
        });

        this.connectionPoolSize = new Gauge({
            name: `${prefix}database_connection_pool_size`,
            help: "Total size of database connection pool",
            registers: [registry],
        });

        this.connectionPoolActive = new Gauge({
            name: `${prefix}database_connection_pool_active`,
            help: "Number of active database connections",
            registers: [registry],
        });

        this.connectionPoolIdle = new Gauge({
            name: `${prefix}database_connection_pool_idle`,
            help: "Number of idle database connections",
            registers: [registry],
        });
    }

    public recordQuery(operation: string, table: string, durationSeconds: number, success: boolean): void {
        this.queryDuration.observe({ operation, table }, durationSeconds);
        this.queryTotal.inc({ operation, table, status: success ? "success" : "error" });
    }
}

export class CacheMetrics {
    public readonly operationDuration: Histogram;
    public readonly operationsTotal: Counter;
    public readonly hitRate: Gauge;
    public readonly missRate: Gauge;
    public readonly keysTotal: Gauge;
    public readonly memoryUsage: Gauge;

    private hits = 0;
    private misses = 0;

    constructor(registry: Registry, prefix = "") {
        this.operationDuration = new Histogram({
            name: `${prefix}cache_operation_duration_seconds`,
            help: "Cache operation duration in seconds",
            labelNames: ["operation"],
            buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
            registers: [registry],
        });

        this.operationsTotal = new Counter({
            name: `${prefix}cache_operations_total`,
            help: "Total number of cache operations",
            labelNames: ["operation", "status"],
            registers: [registry],
        });

        this.hitRate = new Gauge({
            name: `${prefix}cache_hit_rate`,
            help: "Cache hit rate (0-1)",
            registers: [registry],
        });

        this.missRate = new Gauge({
            name: `${prefix}cache_miss_rate`,
            help: "Cache miss rate (0-1)",
            registers: [registry],
        });

        this.keysTotal = new Gauge({
            name: `${prefix}cache_keys_total`,
            help: "Total number of keys in cache",
            registers: [registry],
        });

        this.memoryUsage = new Gauge({
            name: `${prefix}cache_memory_bytes`,
            help: "Cache memory usage in bytes",
            registers: [registry],
        });
    }

    public recordHit(operation: string, durationSeconds: number): void {
        this.hits++;
        this.operationDuration.observe({ operation }, durationSeconds);
        this.operationsTotal.inc({ operation, status: "hit" });
        this.updateRates();
    }

    public recordMiss(operation: string, durationSeconds: number): void {
        this.misses++;
        this.operationDuration.observe({ operation }, durationSeconds);
        this.operationsTotal.inc({ operation, status: "miss" });
        this.updateRates();
    }

    public recordOperation(operation: string, durationSeconds: number, success: boolean): void {
        this.operationDuration.observe({ operation }, durationSeconds);
        this.operationsTotal.inc({ operation, status: success ? "success" : "error" });
    }

    private updateRates(): void {
        const total = this.hits + this.misses;
        if (total > 0) {
            this.hitRate.set(this.hits / total);
            this.missRate.set(this.misses / total);
        }
    }
}
