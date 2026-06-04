import { type Registry, collectDefaultMetrics, Gauge } from "prom-client";

export class NodeMetricsCollector {
    private readonly registry: Registry;
    private readonly prefix: string;
    private eventLoopLag!: Gauge;
    private activeHandles!: Gauge;
    private activeRequests!: Gauge;
    private heapUsed!: Gauge;
    private heapTotal!: Gauge;
    private externalMemory!: Gauge;
    private cpuUsage!: Gauge;

    constructor(registry: Registry, prefix = "") {
        this.registry = registry;
        this.prefix = prefix;
        this.initializeMetrics();
    }

    private initializeMetrics(): void {
        this.eventLoopLag = new Gauge({
            name: `${this.prefix}nodejs_eventloop_lag_seconds`,
            help: "Lag of event loop in seconds",
            registers: [this.registry],
        });

        this.activeHandles = new Gauge({
            name: `${this.prefix}nodejs_active_handles_total`,
            help: "Number of active handles",
            registers: [this.registry],
        });

        this.activeRequests = new Gauge({
            name: `${this.prefix}nodejs_active_requests_total`,
            help: "Number of active requests",
            registers: [this.registry],
        });

        this.heapUsed = new Gauge({
            name: `${this.prefix}nodejs_heap_used_bytes`,
            help: "Process heap used in bytes",
            registers: [this.registry],
        });

        this.heapTotal = new Gauge({
            name: `${this.prefix}nodejs_heap_total_bytes`,
            help: "Process heap total in bytes",
            registers: [this.registry],
        });

        this.externalMemory = new Gauge({
            name: `${this.prefix}nodejs_external_memory_bytes`,
            help: "Process external memory in bytes",
            registers: [this.registry],
        });

        this.cpuUsage = new Gauge({
            name: `${this.prefix}nodejs_cpu_usage_percentage`,
            help: "CPU usage percentage",
            labelNames: ["type"],
            registers: [this.registry],
        });
    }

    public collect(): void {
        const memUsage = process.memoryUsage();
        this.heapUsed.set(memUsage.heapUsed);
        this.heapTotal.set(memUsage.heapTotal);
        this.externalMemory.set(memUsage.external);

        const handles = (process as NodeJS.Process & { _getActiveHandles?: () => unknown[] })._getActiveHandles?.();
        const requests = (process as NodeJS.Process & { _getActiveRequests?: () => unknown[] })._getActiveRequests?.();

        if (handles) {
            this.activeHandles.set(handles.length);
        }
        if (requests) {
            this.activeRequests.set(requests.length);
        }

        const cpuUsage = process.cpuUsage();
        this.cpuUsage.labels("user").set(cpuUsage.user / 1000000);
        this.cpuUsage.labels("system").set(cpuUsage.system / 1000000);
    }

    public measureEventLoopLag(): void {
        const start = process.hrtime.bigint();
        setImmediate(() => {
            const lag = Number(process.hrtime.bigint() - start) / 1e9;
            this.eventLoopLag.set(lag);
        });
    }

    public startCollection(intervalMs = 10000): NodeJS.Timeout {
        return setInterval(() => {
            this.collect();
            this.measureEventLoopLag();
        }, intervalMs);
    }
}

export class DefaultMetricsCollector {
    public static register(registry: Registry, prefix = "", _interval = 10000): void {
        collectDefaultMetrics({
            register: registry,
            prefix,
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        });
    }
}
