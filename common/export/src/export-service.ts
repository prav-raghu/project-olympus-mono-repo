import { CsvExporter, type CsvExportOptions } from './csv-exporter';
import { ExcelExporter, type ExcelExportOptions } from './excel-exporter';

export type ExportFormat = 'csv' | 'excel';

export interface ExportServiceOptions {
  format: ExportFormat;
  csvOptions?: CsvExportOptions;
  excelOptions?: ExcelExportOptions;
}

export class ExportService {
  public async exportToBuffer<T extends Record<string, unknown>>(
    data: T[],
    options: ExportServiceOptions
  ): Promise<Buffer> {
    if (options.format === 'csv') {
      const exporter = new CsvExporter(options.csvOptions);
      return exporter.exportToBuffer(data);
    } else {
      const exporter = new ExcelExporter(options.excelOptions);
      return exporter.exportToBuffer(data);
    }
  }

  public async *streamExport<T extends Record<string, unknown>>(
    dataSource: AsyncIterable<T> | Iterable<T>,
    options: ExportServiceOptions
  ): AsyncGenerator<Buffer> {
    if (options.format === 'csv') {
      const exporter = new CsvExporter(options.csvOptions);
      yield* exporter.streamData(dataSource);
    } else {
      const exporter = new ExcelExporter(options.excelOptions);
      yield* exporter.streamData(dataSource);
    }
  }

  public getContentType(format: ExportFormat): string {
    return format === 'csv'
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  public getFileExtension(format: ExportFormat): string {
    return format === 'csv' ? '.csv' : '.xlsx';
  }
}
