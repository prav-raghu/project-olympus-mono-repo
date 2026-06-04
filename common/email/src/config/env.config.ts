type EnvKey =
    | 'MAILGUN_API_KEY'
    | 'MAILGUN_DOMAIN'
    | 'MAILGUN_HOST'
    | 'MAILGUN_FROM'
    | 'NODE_ENV'
    | 'MAILHOG_HOST'
    | 'MAILHOG_PORT';

export class EnvConfig {
    public static get(key: EnvKey): string | undefined {
        return process.env[key];
    }

    public static getOrThrow(key: EnvKey): string {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Environment variable ${key} is not set`);
        }
        return value;
    }

    public static isDevelopment(): boolean {
        return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    }
}
