import { plainToInstance } from "class-transformer";
import { IsOptional, IsString, validateSync } from "class-validator";

export class SmsEnv {
    @IsString()
    @IsOptional()
    WINSMS_API_KEY?: string;

    @IsString()
    @IsOptional()
    WINSMS_ENABLED?: string;
}

export class EnvConfig {
    private static _instance: SmsEnv | null = null;

    public static load(): SmsEnv {
        if (!this._instance) {
            const validated = plainToInstance(SmsEnv, process.env, {
                enableImplicitConversion: true,
            });
            const errors = validateSync(validated, { skipMissingProperties: false });
            if (errors.length > 0) {
                const messages = errors.map((error) => Object.values(error.constraints ?? {}).join(", ")).join("; ");
                throw new Error(`Environment validation failed: ${messages}`);
            }
            this._instance = validated;
        }
        return this._instance;
    }

    public static get<K extends keyof SmsEnv>(key: K): SmsEnv[K] {
        if (!this._instance) {
            this.load();
        }
        return this._instance![key];
    }
}
