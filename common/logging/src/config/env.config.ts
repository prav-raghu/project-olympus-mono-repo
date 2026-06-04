type EnvKey =
    | 'NODE_ENV'
    | 'LOG_LEVEL'
    | 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    | 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'
    | 'OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'
    | 'OTEL_EXPORTER_OTLP_HEADERS';

export class EnvConfig {
    public static get(key: EnvKey): string | undefined {
        return process.env[key];
    }

    public static isProduction(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    public static isDevelopment(): boolean {
        return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    }
}
