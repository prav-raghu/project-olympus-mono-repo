import { Writable } from 'node:stream';
import { type AnyValue, type AnyValueMap, logs, SeverityNumber } from '@opentelemetry/api-logs';

export class OtelLogBridge extends Writable {
    private remainder = '';

    constructor() {
        super();
    }

    public _write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        const combined = this.remainder + text;
        const lines = combined.split('\n');
        this.remainder = lines.pop() ?? '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                try {
                    const record = JSON.parse(trimmed) as Record<string, unknown>;
                    this.emitLogRecord(record);
                } catch {
                    // skip malformed lines
                }
            }
        }
        callback();
    }

    public _final(callback: (error?: Error | null) => void): void {
        const trimmed = this.remainder.trim();
        if (trimmed) {
            try {
                const record = JSON.parse(trimmed) as Record<string, unknown>;
                this.emitLogRecord(record);
            } catch {
                // ignore
            }
        }
        callback();
    }

    private emitLogRecord(record: Record<string, unknown>): void {
        const otelLogger = logs.getLogger('pino');
        const level = typeof record['level'] === 'number' ? record['level'] : 30;
        const msg = typeof record['msg'] === 'string' ? record['msg'] : '';
        const time = typeof record['time'] === 'number' ? record['time'] : Date.now();

        const skip = new Set(['level', 'msg', 'time', 'pid', 'hostname']);
        const attributes: AnyValueMap = {};
        for (const [k, v] of Object.entries(record)) {
            if (!skip.has(k)) attributes[k] = v as AnyValue;
        }

        otelLogger.emit({
            body: msg,
            severityNumber: this.toSeverityNumber(level),
            severityText: this.toSeverityText(level),
            timestamp: new Date(time),
            observedTimestamp: new Date(),
            attributes,
        });
    }

    private toSeverityNumber(level: number): SeverityNumber {
        if (level >= 60) return SeverityNumber.FATAL;
        if (level >= 50) return SeverityNumber.ERROR;
        if (level >= 40) return SeverityNumber.WARN;
        if (level >= 30) return SeverityNumber.INFO;
        if (level >= 20) return SeverityNumber.DEBUG;
        return SeverityNumber.TRACE;
    }

    private toSeverityText(level: number): string {
        if (level >= 60) return 'FATAL';
        if (level >= 50) return 'ERROR';
        if (level >= 40) return 'WARN';
        if (level >= 30) return 'INFO';
        if (level >= 20) return 'DEBUG';
        return 'TRACE';
    }
}
