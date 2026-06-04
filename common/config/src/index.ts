import 'dotenv/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppEnv } from './env';

export { AppEnv } from './env';

export function validateEnv(config: Record<string, unknown>): AppEnv {
    const validated = plainToInstance(AppEnv, config, {
        enableImplicitConversion: true,
    });
    const errors = validateSync(validated, { skipMissingProperties: false });
    if (errors.length > 0) {
        const messages = errors
            .map((e) => Object.values(e.constraints ?? {}).join(', '))
            .join('; ');
        throw new Error(`Environment validation failed: ${messages}`);
    }
    return validated;
}

export class EnvConfig {
    private static _instance: AppEnv | null = null;

    public static load(overrides?: Record<string, unknown>): AppEnv {
        if (!this._instance) {
            this._instance = validateEnv({ ...process.env, ...overrides });
        }
        return this._instance;
    }

    public static get<K extends keyof AppEnv>(key: K): AppEnv[K] {
        if (!this._instance) {
            this.load();
        }
        return this._instance![key];
    }
}
