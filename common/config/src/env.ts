import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Min, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class AppEnv {
    @IsEnum(['development', 'production', 'test'])
    NODE_ENV: 'development' | 'production' | 'test' = 'development';

    @IsInt()
    @Min(1)
    PORT: number = 4000;

    @IsString()
    CORS_ORIGIN: string = 'http://localhost:4200';

    // Azure MSAL
    @IsString()
    AZURE_TENANT_ID: string = '';

    @IsString()
    AZURE_CLIENT_ID: string = '';

    @IsString()
    @IsOptional()
    AZURE_CLIENT_SECRET?: string;

    @IsString()
    @IsOptional()
    AZURE_API_AUDIENCE?: string;

    @IsUrl()
    @IsOptional()
    AZURE_AUTHORITY?: string;

    // Azure Monitor
    @IsString()
    @IsOptional()
    APPLICATIONINSIGHTS_CONNECTION_STRING?: string;

    // MySQL multi-db
    @IsString()
    DATABASE_URL_ADMIN: string = '';

    @IsString()
    DATABASE_URL_CUSTOMER: string = '';

    @IsString()
    DATABASE_URL_SCHEDULE: string = '';

    @IsString()
    DATABASE_URL_SHARED: string = '';

    @IsInt()
    @Min(1)
    DATABASE_CONNECTION_LIMIT: number = 10;

    // Redis
    @IsString()
    REDIS_URL: string = 'redis://localhost:6379';

    // Mailgun
    @IsString()
    @IsOptional()
    MAILGUN_API_KEY?: string;

    @IsString()
    @IsOptional()
    MAILGUN_DOMAIN?: string;

    @IsString()
    @IsOptional()
    MAILGUN_HOST?: string;

    @IsString()
    @IsOptional()
    MAILGUN_FROM?: string;

    // Directus
    @IsString()
    @IsOptional()
    DIRECTUS_SECRET?: string;

    // Two-factor / TOTP
    @IsString()
    @IsOptional()
    TWO_FACTOR_ENCRYPTION_KEY?: string;

    // Frontend / service URLs
    @IsString()
    @IsOptional()
    ADMIN_WEB_URL?: string;

    @IsString()
    @IsOptional()
    CUSTOMER_WEB_URL?: string;

    @IsString()
    @IsOptional()
    CUSTOMER_API_URL?: string;

    @IsString()
    @IsOptional()
    ADMIN_API_URL?: string;

    // Rate limiting
    @IsInt()
    @Min(1)
    RATE_LIMIT_PUBLIC: number = 30;

    @IsInt()
    @Min(1)
    RATE_LIMIT_AUTHENTICATED: number = 120;

    @IsInt()
    @Min(1)
    CACHE_DEFAULT_TTL: number = 900;

    @IsInt()
    @Min(1)
    QUEUE_CONCURRENCY: number = 5;
}
