import ExcelJS from "exceljs";

export interface ExcelExportOptions {
    sheetName?: string;
    headers?: string[];
    columnWidths?: number[];
    freezeHeader?: boolean;
    autoFilter?: boolean;
    styleHeader?: boolean;
}

export interface ExcelColumn {
    header: string;
    key: string;
    width?: number;
}

export class ExcelExporter {
    private readonly options: ExcelExportOptions;

    constructor(options: ExcelExportOptions = {}) {
        const sheetName = options.sheetName ?? "Sheet1";
        const headers = options.headers;
        const columnWidths = options.columnWidths;
        const freezeHeader = options.freezeHeader ?? true;
        const autoFilter = options.autoFilter ?? true;
        const styleHeader = options.styleHeader ?? true;

        this.options = {
            sheetName,
            freezeHeader,
            autoFilter,
            styleHeader,
            ...(headers && { headers }),
            ...(columnWidths && { columnWidths }),
        };
    }

    public async exportToBuffer<T extends Record<string, unknown>>(data: T[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = this.createWorksheet(workbook);

        if (data.length > 0 && data[0]) {
            this.addColumns(worksheet, data[0]);
            this.addRows(worksheet, data);
        }

        this.applyFormatting(worksheet);

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    public createStream(): {
        workbook: ExcelJS.stream.xlsx.WorkbookWriter;
        worksheet: ExcelJS.Worksheet;
    } {
        const stream = new ExcelJS.stream.xlsx.WorkbookWriter({});

        const worksheet = stream.addWorksheet(this.options.sheetName || "Sheet1");

        return {
            workbook: stream,
            worksheet,
        };
    }

    public async *streamData<T extends Record<string, unknown>>(dataSource: AsyncIterable<T> | Iterable<T>): AsyncGenerator<Buffer> {
        const { PassThrough } = await import("node:stream");
        const stream = new PassThrough();
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream });
        const worksheet = workbook.addWorksheet(this.options.sheetName || "Sheet1");

        let isFirstRow = true;
        const chunks: Buffer[] = [];

        stream.on("data", (chunk: Buffer) => chunks.push(chunk));

        for await (const record of dataSource) {
            if (isFirstRow) {
                this.addColumns(worksheet, record);
                this.applyFormatting(worksheet);
                isFirstRow = false;
            }

            worksheet.addRow(record).commit();

            while (chunks.length > 0) {
                const chunk = chunks.shift();
                if (chunk) {
                    yield chunk;
                }
            }
        }

        worksheet.commit();
        await workbook.commit();

        while (chunks.length > 0) {
            const chunk = chunks.shift();
            if (chunk) {
                yield chunk;
            }
        }
    }

    private createWorksheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet {
        return workbook.addWorksheet(this.options.sheetName || "Sheet1");
    }

    private addColumns<T extends Record<string, unknown>>(worksheet: ExcelJS.Worksheet, sampleData: T): void {
        const keys = this.options.headers || Object.keys(sampleData);
        const columns: ExcelColumn[] = keys.map((key, index) => ({
            header: key,
            key,
            width: this.options.columnWidths?.[index] || 15,
        }));

        worksheet.columns = columns;
    }

    private addRows<T extends Record<string, unknown>>(worksheet: ExcelJS.Worksheet, data: T[]): void {
        for (const record of data) {
            worksheet.addRow(record);
        }
    }

    private applyFormatting(worksheet: ExcelJS.Worksheet): void {
        if (this.options.styleHeader && worksheet.getRow(1)) {
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFD3D3D3" },
            };
            headerRow.alignment = { vertical: "middle", horizontal: "center" };
        }

        if (this.options.freezeHeader) {
            worksheet.views = [{ state: "frozen", ySplit: 1 }];
        }

        if (this.options.autoFilter) {
            worksheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: worksheet.columns.length },
            };
        }
    }
}
