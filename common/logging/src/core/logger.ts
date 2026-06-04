import { type LoggerService } from '@nestjs/common';
import { EnvConfig } from '../config/env.config';

const redactedKeys = new Set([
    'password', 'currentPassword', 'newPassword', 'confirmPassword',
    'token', 'accessToken', 'refreshToken', 'secret', 'apiKey',
    'api_key', 'clientSecret', 'privateKey', 'creditCard', 'cardNumber',
    'cvv', 'cvc', 'ssn', 'nationalId', 'pin', 'otp',
]);

function redact(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
        result[k] = redactedKeys.has(k) ? '[REDACTED]' : v;
    }
    return result;
}

function safeExtra(extra: unknown): string {
    if (extra === undefined || extra === null) return '';
    if (typeof extra === 'string') return extra ? ` ${extra}` : '';
    if (extra instanceof Error) return ` ${JSON.stringify({ message: extra.message, stack: extra.stack })}`;
    if (typeof extra === 'object') return ` ${JSON.stringify(redact(extra as Record<string, unknown>))}`;
    return ` ${String(extra)}`;
}

function formatMessage(level: string, context: string, message: unknown, contextOrExtra?: unknown): string {
    const ts = new Date().toISOString();
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    // NestJS passes context string as second arg; our service Logger passes data objects
    const extra = contextOrExtra !== undefined && typeof contextOrExtra !== 'string'
        ? safeExtra(contextOrExtra)
        : '';
    return `[${ts}] [${level.toUpperCase()}] [${context}] ${msg}${extra}`;
}

export class AzureMonitorLogger implements LoggerService {
    private readonly context: string;

    constructor(context?: string) {
        this.context = context ?? 'Application';
    }

    // NestJS LoggerService signature: log(message, context?)
    public log(message: unknown, context?: unknown): void {
        if (!this.isSilent('info')) {
            console.log(formatMessage('info', this.resolveContext(context), message, undefined));
        }
    }

    public error(message: unknown, stackOrContext?: unknown, context?: unknown): void {
        const ctx = typeof context === 'string' ? context : (typeof stackOrContext === 'string' && !stackOrContext.includes('\n') ? stackOrContext : this.context);
        const trace = typeof stackOrContext === 'string' && stackOrContext.includes('\n') ? { trace: stackOrContext } : undefined;
        console.error(formatMessage('error', ctx, message, trace));
    }

    public warn(message: unknown, context?: unknown): void {
        if (!this.isSilent('warn')) {
            console.warn(formatMessage('warn', this.resolveContext(context), message, undefined));
        }
    }

    public debug(message: unknown, context?: unknown): void {
        if (!this.isSilent('debug')) {
            console.debug(formatMessage('debug', this.resolveContext(context), message, undefined));
        }
    }

    public verbose(message: unknown, context?: unknown): void {
        if (!this.isSilent('verbose')) {
            console.debug(formatMessage('verbose', this.resolveContext(context), message, undefined));
        }
    }

    private resolveContext(context: unknown): string {
        return typeof context === 'string' ? context : this.context;
    }

    private isSilent(level: string): boolean {
        const configured = EnvConfig.get('LOG_LEVEL') ?? (EnvConfig.isProduction() ? 'info' : 'debug');
        const hierarchy = ['verbose', 'debug', 'info', 'warn', 'error'];
        const minIdx = hierarchy.indexOf(configured);
        const curIdx = hierarchy.indexOf(level);
        return minIdx > curIdx;
    }
}

export class Logger {
    private readonly delegate: AzureMonitorLogger;

    constructor(context?: string) {
        this.delegate = new AzureMonitorLogger(context);
    }

    public info(message: string, data?: Record<string, unknown>): void {
        if (data) {
            console.log(formatMessage('info', this.delegate['context'], message, data));
        } else {
            this.delegate.log(message);
        }
    }

    public warn(message: string, data?: Record<string, unknown>): void {
        if (data) {
            console.warn(formatMessage('warn', this.delegate['context'], message, data));
        } else {
            this.delegate.warn(message);
        }
    }

    public error(message: string, error?: Error | Record<string, unknown>): void {
        this.delegate.error(message, error instanceof Error ? error.stack : error);
    }

    public debug(message: string, data?: Record<string, unknown>): void {
        if (data) {
            console.debug(formatMessage('debug', this.delegate['context'], message, data));
        } else {
            this.delegate.debug(message);
        }
    }
}
