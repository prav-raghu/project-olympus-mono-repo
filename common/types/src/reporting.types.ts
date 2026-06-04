export enum ReportType {
  USER_ACTIVITY = 'USER_ACTIVITY',
  SYSTEM_METRICS = 'SYSTEM_METRICS',
  AUDIT_LOG = 'AUDIT_LOG',
  WEBHOOK_DELIVERY = 'WEBHOOK_DELIVERY',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  JSON = 'JSON',
  PDF = 'PDF',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  filters?: ReportFilter;
  includeHeaders?: boolean;
  groupBy?: string[];
}

export interface ReportResult {
  id: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  url?: string;
  error?: string;
  recordCount?: number;
  generatedAt?: Date;
}

export interface ScheduledReport {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  schedule: string;
  filters?: ReportFilter;
  enabled: boolean;
  recipients?: string[];
}
