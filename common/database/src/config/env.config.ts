import 'dotenv/config';

const required = [
    'DATABASE_URL_ADMIN',
    'DATABASE_URL_CUSTOMER',
    'DATABASE_URL_SCHEDULE',
    'DATABASE_URL_SHARED',
] as const;

type RequiredKey = typeof required[number];
type OptionalKey = 'DATABASE_CONNECTION_LIMIT' | 'DATABASE_POOL_TIMEOUT';
type EnvKey = RequiredKey | OptionalKey;

export class EnvConfig {
    public static load(): void {
        const missing = required.filter((k) => !process.env[k]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    public static get(key: EnvKey): string {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Environment variable ${key} is not set`);
        }
        return value;
    }

    public static getOptional(key: EnvKey): string | undefined {
        return process.env[key];
    }
}
