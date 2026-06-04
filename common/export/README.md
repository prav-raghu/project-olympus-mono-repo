# @project-olympus/export

CSV and Excel export utilities with streaming support for handling large datasets efficiently.

## Features

- **CSV Export**: RFC 4180 compliant CSV generation with customizable delimiters
- **Excel Export**: XLSX format with styling, freeze panes, and auto-filters
- **Streaming Support**: Memory-efficient streaming for large datasets
- **TypeScript**: Full type safety with generic support
- **Buffer & Stream APIs**: Flexible output options

## Installation

```bash
pnpm add @project-olympus/export
```

## Usage

### Basic CSV Export

```typescript
import { CsvExporter } from '@project-olympus/export';

const exporter = new CsvExporter({
  headers: ['id', 'name', 'email'],
  delimiter: ',',
  bom: true
});

const data = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

const buffer = await exporter.exportToBuffer(data);
```

### Basic Excel Export

```typescript
import { ExcelExporter } from '@project-olympus/export';

const exporter = new ExcelExporter({
  sheetName: 'Users',
  headers: ['id', 'name', 'email'],
  freezeHeader: true,
  autoFilter: true,
  styleHeader: true
});

const buffer = await exporter.exportToBuffer(data);
```

### Streaming Large Datasets

```typescript
import { ExportService } from '@project-olympus/export';

const exportService = new ExportService();

async function* fetchUsers() {
  for (let page = 0; page < 1000; page++) {
    const users = await prisma.user.findMany({
      skip: page * 100,
      take: 100
    });
    for (const user of users) {
      yield user;
    }
  }
}

for await (const chunk of exportService.streamExport(fetchUsers(), {
  format: 'excel',
  excelOptions: { sheetName: 'Users' }
})) {
  response.write(chunk);
}
```

### NestJS Integration

```typescript
@Get('export/users')
public async exportUsers(@Query('format') format: string, @Res() res: ServerResponse) {
  const exportService = new ExportService();

  res.setHeader('Content-Type', exportService.getContentType(format));
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="users${exportService.getFileExtension(format)}"`
  );

  for await (const chunk of exportService.streamExport(fetchUsers(), {
    format,
    csvOptions: { bom: true },
    excelOptions: { styleHeader: true }
  })) {
    reply.raw.write(chunk);
  }

  reply.raw.end();
});
```

## API Reference

### CsvExporter

**Options:**
- `headers`: Column headers (auto-detected if not provided)
- `delimiter`: Field delimiter (default: ',')
- `quote`: Quote character (default: '"')
- `escape`: Escape character (default: '"')
- `recordDelimiter`: Line ending (default: '\n')
- `bom`: Add UTF-8 BOM (default: false)

**Methods:**
- `exportToBuffer(data)`: Export to Buffer
- `createStream(data)`: Create readable stream
- `streamData(dataSource)`: Async generator for streaming

### ExcelExporter

**Options:**
- `sheetName`: Worksheet name (default: 'Sheet1')
- `headers`: Column headers
- `columnWidths`: Array of column widths
- `freezeHeader`: Freeze first row (default: true)
- `autoFilter`: Enable auto-filter (default: true)
- `styleHeader`: Style header row (default: true)

**Methods:**
- `exportToBuffer(data)`: Export to Buffer
- `streamData(dataSource)`: Async generator for streaming

### ExportService

Unified service for both formats.

**Methods:**
- `exportToBuffer(data, options)`: Export to Buffer
- `streamExport(dataSource, options)`: Async generator for streaming
- `getContentType(format)`: Get MIME type
- `getFileExtension(format)`: Get file extension
