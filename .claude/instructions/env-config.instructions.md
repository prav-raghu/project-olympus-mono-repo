---
applyTo: "apps/backend/**/config/**,common/config/**"
description: "Environment variable validation — class-validator EnvConfig in every service and common package"
---

Every backend service reads environment variables through a `class-validator`-validated config class in `src/config/env.config.ts`. Never read `process.env` directly in service or controller code.

## Pattern

```typescript
import { plainToInstance } from 'class-transformer';
import { IsString, IsInt, IsIn, IsOptional, Min, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @IsInt()
  @Min(1)
  PORT: number = 4000;

  @IsString()
  DATABASE_URL_ADMIN: string = '';

  @IsString()
  REDIS_URL: string = '';

  @IsString()
  AZURE_TENANT_ID: string = '';

  @IsString()
  AZURE_CLIENT_ID: string = '';

  @IsOptional()
  @IsInt()
  DATABASE_CONNECTION_LIMIT?: number;

  @IsOptional()
  @IsIn(['debug', 'info', 'warn', 'error'])
  LOG_LEVEL?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment variables: ${errors.toString()}`);
  }
  return validated;
}
```

## Wiring into NestJS `ConfigModule`

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
})
export class AppModule {}
```

`ConfigModule` throws at bootstrap if a required variable is missing or malformed — the process exits immediately rather than failing at request time.

## Usage in a service

```typescript
@Injectable()
export class SomeService {
  private readonly connectionLimit: number;

  constructor(private readonly configService: ConfigService<EnvironmentVariables>) {
    this.connectionLimit = this.configService.get('DATABASE_CONNECTION_LIMIT', { infer: true }) ?? 10;
  }
}
```

## Rules

- Validation runs once at startup via `ConfigModule.forRoot({ validate })` — if required vars are missing, the process exits immediately
- Extend `EnvironmentVariables` per service to include service-specific vars
- Never use `process.env.SOME_VAR ?? 'fallback'` in service or controller code — only through `ConfigService`
- Every required var must be in both `.env` (real values, gitignored) and `.env.example` (placeholders, committed)
- MSAL variables (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_API_AUDIENCE`, `AZURE_AUTHORITY`) are required on every service behind `AzureAuthGuard`
- Database URL variable names are per-schema (`DATABASE_URL_ADMIN`, `DATABASE_URL_CUSTOMER`, `DATABASE_URL_SCHEDULE`, `DATABASE_URL_SHARED`) — a service only needs the ones for the schema(s) it actually reads, per `relational-database.md`
