import { stringify } from 'csv-stringify';
import { Readable, type Transform } from 'node:stream';

export interface CsvExportOptions {
  headers?: string[];
  delimiter?: string;
  quote?: string;
  escape?: string;
  recordDelimiter?: string;
  bom?: boolean;
}

export class CsvExporter {
  private readonly options: CsvExportOptions;

  constructor(options: CsvExportOptions = {}) {
    const delimiter = options.delimiter ?? ',';
    const quote = options.quote ?? '"';
    const escape = options.escape ?? '"';
    const recordDelimiter = options.recordDelimiter ?? '\n';
    const bom = options.bom ?? false;
    const headers = options.headers;

    this.options = {
      delimiter,
      quote,
      escape,
      recordDelimiter,
      bom,
      ...(headers && { headers }),
    };
  }

  public async exportToBuffer<T extends Record<string, unknown>>(
    data: T[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = this.createStream(data);

      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  public createStream<T extends Record<string, unknown>>(
    data: T[]
  ): Readable {
    const stringifier = stringify({
      columns: this.options.headers,
      delimiter: this.options.delimiter,
      quote: this.options.quote,
      escape: this.options.escape,
      record_delimiter: this.options.recordDelimiter,
      bom: this.options.bom,
    } as never);

    const readable = Readable.from(data);
    return readable.pipe(stringifier);
  }

  public createTransformStream(): Transform {
    return stringify({
      columns: this.options.headers,
      delimiter: this.options.delimiter,
      quote: this.options.quote,
      escape: this.options.escape,
      record_delimiter: this.options.recordDelimiter,
      bom: this.options.bom,
    } as never);
  }

  public async *streamData<T extends Record<string, unknown>>(
    dataSource: AsyncIterable<T> | Iterable<T>
  ): AsyncGenerator<Buffer> {
    const stringifier = this.createTransformStream();
    
    const chunks: Buffer[] = [];
    stringifier.on('data', (chunk: Buffer) => chunks.push(chunk));

    for await (const record of dataSource) {
      stringifier.write(record);
      
      while (chunks.length > 0) {
        const chunk = chunks.shift();
        if (chunk) {
          yield chunk;
        }
      }
    }

    stringifier.end();

    await new Promise((resolve) => {
      stringifier.on('finish', resolve);
    });

    while (chunks.length > 0) {
      const chunk = chunks.shift();
      if (chunk) {
        yield chunk;
      }
    }
  }
}
