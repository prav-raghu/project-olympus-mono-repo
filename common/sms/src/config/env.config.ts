import Ajv from "ajv";
import addFormats from "ajv-formats";
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const envSchema = {
    type: "object",
    required: [],
    properties: {
        WINSMS_API_KEY: { type: "string" },
        WINSMS_ENABLED: { type: "string" },
    },
    additionalProperties: true,
} as const;

const validate = ajv.compile(envSchema);

export interface Env {
    WINSMS_API_KEY?: string;
    WINSMS_ENABLED?: string;
}

export class EnvConfig {
    private static _env: Env | null = null;
    public static load(): Env {
        if (!this._env) {
            const env: Record<string, unknown> = process.env;
            if (!validate(env)) {
                throw new Error(`Invalid environment variables: ${JSON.stringify(validate.errors, null, 2)}`);
            }
            this._env = env as Env;
        }
        return this._env;
    }

    public static get<K extends keyof Env>(key: K): Env[K] {
        if (!this._env) {
            this.load();
        }
        return this._env![key];
    }
}
