import { type Registry, Counter, Histogram, Summary } from "prom-client";

export class HttpMetricsCollector {
    private readonly registry: Registry;
    private readonly prefix: string;

    public readonly requestsTotal: Counter;
    public readonly requestDuration: Histogram;
    public readonly requestSize: Summary;
    public readonly responseSize: Summary;
    public readonly activeConnections: Counter;

    constructor(registry: Registry, prefix = "", customLabels: string[] = []) {
        this.registry = registry;
        this.prefix = prefix;

        const baseLabels = ["method", "route", "status_code"];
        const allLabels = [...baseLabels, ...customLabels];

        this.requestsTotal = new Counter({
            name: `${this.prefix}http_requests_total`,
            help: "Total number of HTTP requests",
            labelNames: allLabels,
            registers: [this.registry],
        });

        this.requestDuration = new Histogram({
            name: `${this.prefix}http_request_duration_seconds`,
            help: "HTTP request duration in seconds",
            labelNames: allLabels,
            buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
            registers: [this.registry],
        });

        this.requestSize = new Summary({
            name: `${this.prefix}http_request_size_bytes`,
            help: "HTTP request size in bytes",
            labelNames: ["method", "route"],
            percentiles: [0.5, 0.9, 0.95, 0.99],
            registers: [this.registry],
        });

        this.responseSize = new Summary({
            name: `${this.prefix}http_response_size_bytes`,
            help: "HTTP response size in bytes",
            labelNames: ["method", "route"],
            percentiles: [0.5, 0.9, 0.95, 0.99],
            registers: [this.registry],
        });

        this.activeConnections = new Counter({
            name: `${this.prefix}http_active_connections_total`,
            help: "Total number of active HTTP connections",
            registers: [this.registry],
        });
    }

    public recordRequest(
        method: string,
        route: string,
        statusCode: number,
        durationSeconds: number,
        requestBytes?: number,
        responseBytes?: number,
        customLabels?: Record<string, string>,
    ): void {
        const labels: Record<string, string> = {
            method: method.toUpperCase(),
            route: this.normalizeRoute(route),
            status_code: String(statusCode),
            ...customLabels,
        };

        this.requestsTotal.inc(labels);
        this.requestDuration.observe(labels, durationSeconds);

        if (requestBytes !== undefined) {
            this.requestSize.observe({ method: labels.method, route: labels.route }, requestBytes);
        }

        if (responseBytes !== undefined) {
            this.responseSize.observe({ method: labels.method, route: labels.route }, responseBytes);
        }
    }

    private normalizeRoute(route: string): string {
        return (
            route
                .replaceAll(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:uuid")
                .replaceAll(/\/\d+/g, "/:id")
                .replace(/\/$/, "") || "/"
        );
    }
}
