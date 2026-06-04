# @project-olympus/logging

Azure Monitor logging package for NestJS services. Implements the NestJS `LoggerService` interface backed by Azure Application Insights via OpenTelemetry.

## Usage

### Bootstrap

Call `initAzureMonitor` before `NestFactory.create` in `main.ts`:

```typescript
import { initAzureMonitor, AzureMonitorLogger } from '@project-olympus/logging';

initAzureMonitor('admin-api');

const app = await NestFactory.create(AppModule, {
  logger: new AzureMonitorLogger('admin-api'),
  bufferLogs: true,
});
```

### In services

```typescript
import { Logger } from '@project-olympus/logging';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  public async findAll() {
    this.logger.info('Fetching users');
    // ...
  }
}
```

## Behaviour

- In **production**: logs forwarded to Azure Monitor via `@azure/monitor-opentelemetry`
- In **development** (`NODE_ENV=development` or unset): logs written to console only — no Azure credentials required

## Environment

```env
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
```

Not required in development — logger falls back to console automatically.

## Sensitive field redaction

The following fields are automatically redacted from log output:
`password`, `token`, `accessToken`, `refreshToken`, `apiKey`, `clientSecret`, `privateKey`, `cvv`, `ssn`, `otp`, `pin`
