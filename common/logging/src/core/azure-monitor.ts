import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { EnvConfig } from '../config/env.config';

export function initAzureMonitor(serviceName: string): void {
    const connectionString = EnvConfig.get('APPLICATIONINSIGHTS_CONNECTION_STRING');

    if (!connectionString) {
        if (EnvConfig.isProduction()) {
            console.warn('[AzureMonitor] APPLICATIONINSIGHTS_CONNECTION_STRING is not set — telemetry disabled');
        }
        return;
    }

    useAzureMonitor({
        azureMonitorExporterOptions: {
            connectionString,
        },
        instrumentationOptions: {
            http: { enabled: true },
        },
        resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
    });
}
