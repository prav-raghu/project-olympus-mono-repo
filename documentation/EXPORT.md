# Export Functionality Documentation

## Overview

The export system provides CSV and Excel export capabilities with streaming support for handling large datasets efficiently across all backend services.

## Package: @project-olympus/export

Located in `common/export`, this package provides:
- **CsvExporter**: RFC 4180 compliant CSV generation
- **ExcelExporter**: XLSX format with styling and formatting
- **ExportService**: Unified interface for both formats
- **Streaming Support**: Memory-efficient processing of large datasets

## Features

### CSV Export
- Customizable delimiters, quotes, escape characters
- UTF-8 BOM support
- Custom headers
- Streaming for large datasets

### Excel Export
- XLSX format (Excel 2007+)
- Styled headers (bold, colored background)
- Freeze panes
- Auto-filters
- Custom column widths
- Multiple worksheets support

## Usage Examples

### Basic Buffer Export (Small Datasets)

```typescript
import { ExportService } from '@project-olympus/export';

const exportService = new ExportService();

// Export to buffer (loads all data in memory)
const buffer = await exportService.exportToBuffer(data, {
  format: 'excel',
  excelOptions: {
    sheetName: 'Users',
    styleHeader: true,
    freezeHeader: true,
  }
});

reply.send(buffer);
```

### Streaming Export (Large Datasets)

```typescript
// Stream data in chunks (memory efficient)
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
  format: 'csv',
  csvOptions: { bom: true }
})) {
  reply.raw.write(chunk);
}
reply.raw.end();
```

### Controller Implementation

See `apps/backend/customer-api/src/controllers/export.controller.ts` for a complete example implementation with:
- NestJS controllers
- Query parameter handling
- Content-Type and Content-Disposition headers
- Streaming and buffer-based exports
- Error handling

## API Routes

### Example Routes

```typescript
// Stream export (recommended for large datasets)
GET /export/users?format=csv
GET /export/users?format=excel

// Buffer export (for smaller datasets)
GET /export/users/buffer?format=csv
GET /export/users/buffer?format=excel
```

## Configuration Options

### CSV Options
```typescript
{
  headers?: string[];        // Column headers
  delimiter?: string;        // Field delimiter (default: ',')
  quote?: string;           // Quote character (default: '"')
  escape?: string;          // Escape character (default: '"')
  recordDelimiter?: string; // Line ending (default: '\n')
  bom?: boolean;            // Add UTF-8 BOM (default: false)
}
```

### Excel Options
```typescript
{
  sheetName?: string;       // Worksheet name (default: 'Sheet1')
  headers?: string[];       // Column headers
  columnWidths?: number[];  // Column widths in characters
  freezeHeader?: boolean;   // Freeze first row (default: true)
  autoFilter?: boolean;     // Enable auto-filter (default: true)
  styleHeader?: boolean;    // Style header row (default: true)
}
```

## Performance Considerations

### When to Use Buffer Export
- Small datasets (< 10,000 records)
- Need to return Content-Length header
- Simple data that fits in memory

### When to Use Streaming Export
- Large datasets (> 10,000 records)
- Real-time data generation
- Memory constraints
- Background jobs

## Integration with Services

### Customer API
Export user data, orders, customer reports

### Admin API
Export system logs, analytics, audit trails

### Schedule API
Export appointment history, job results

## Example: Adding Export to Any Service

1. **Add dependency** to package.json:
```json
{
  "dependencies": {
    "@project-olympus/export": "workspace:*"
  }
}
```

2. **Create controller**:
```typescript
import { ExportService } from '@project-olympus/export';

export class MyExportController {
  private readonly exportService = new ExportService();
  
  public async exportData(req, reply) {
    const dataSource = this.fetchDataStream();
    
    for await (const chunk of this.exportService.streamExport(dataSource, {
      format: req.query.format || 'csv'
    })) {
      reply.raw.write(chunk);
    }
    reply.raw.end();
  }
  
  private async *fetchDataStream() {
    // Your data fetching logic here
    yield* yourDataSource;
  }
}
```

3. **Register routes**:
```typescript
// Register in your NestJS module (controller method handles GET /export)
```

## Best Practices

1. **Always use streaming for large datasets** (> 10,000 records)
2. **Set appropriate headers**:
   - Content-Type
   - Content-Disposition (with filename)
3. **Implement proper error handling**
4. **Use pagination in data sources** for streaming
5. **Test with production-sized datasets**
6. **Consider rate limiting** for export endpoints
7. **Add authentication** to protect sensitive data
8. **Log export operations** for audit trails

## Dependencies

- **csv-stringify**: CSV generation (RFC 4180 compliant)
- **exceljs**: Excel file generation
- **node:stream**: Streaming support

## Testing

```typescript
// Example test
const exportService = new ExportService();
const testData = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
];

const buffer = await exportService.exportToBuffer(testData, {
  format: 'csv'
});

expect(buffer).toBeInstanceOf(Buffer);
expect(buffer.toString()).toContain('John');
```
