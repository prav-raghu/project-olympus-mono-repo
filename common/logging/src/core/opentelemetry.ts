import { logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { EnvConfig } from "../config/env.config";

export interface OpenTelemetryOptions {
    serviceName: string;
    serviceVersion?: string;
    enabled?: boolean;
}

export class OpenTelemetry {
    private sdk: NodeSDK | null = null;
    private loggerProvider: LoggerProvider | null = null;
    private readonly options: OpenTelemetryOptions;

    constructor(options?: OpenTelemetryOptions) {
        this.options = {
            serviceName: options?.serviceName ?? "unknown-service",
            serviceVersion: options?.serviceVersion ?? "1.0.0",
            enabled: options?.enabled ?? true,
        };
    }

    public async start(): Promise<void> {
        if (!this.options.enabled) {
            return;
        }

        const tracesEndpoint = EnvConfig.get("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT");
        const logsEndpoint = EnvConfig.get("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT");

        if (!tracesEndpoint && !logsEndpoint) {
            console.log("[OpenTelemetry] Disabled - set OTEL_EXPORTER_OTLP_TRACES_ENDPOINT or OTEL_EXPORTER_OTLP_LOGS_ENDPOINT to enable");
            return;
        }

        const resource = resourceFromAttributes({
            [ATTR_SERVICE_NAME]: this.options.serviceName,
            [ATTR_SERVICE_VERSION]: this.options.serviceVersion,
        });

        if (logsEndpoint) {
            this.loggerProvider = new LoggerProvider({
                resource,
                processors: [new BatchLogRecordProcessor(new OTLPLogExporter({ url: logsEndpoint }))],
            });
            logs.setGlobalLoggerProvider(this.loggerProvider);
            console.log(`[OpenTelemetry] Log export enabled → ${logsEndpoint}`);
        }

        if (tracesEndpoint) {
            this.sdk = new NodeSDK({
                resource,
                traceExporter: new OTLPTraceExporter({ url: tracesEndpoint }),
                instrumentations: [
                    new HttpInstrumentation({
                        ignoreIncomingRequestHook: (req) => {
                            const url = req.url ?? "";
                            return url.includes("/health") || url.includes("/metrics") || url === "/favicon.ico";
                        },
                    }),
                    new UndiciInstrumentation(),
                ],
            });
            this.sdk.start();
            console.log(`[OpenTelemetry] Trace export enabled → ${tracesEndpoint}`);
        }
    }

    public async shutdown(): Promise<void> {
        if (this.sdk) {
            await this.sdk.shutdown();
        }
        if (this.loggerProvider) {
            await this.loggerProvider.shutdown();
        }
    }
}
