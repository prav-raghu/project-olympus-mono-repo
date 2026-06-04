import { Injectable, Inject } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@project-olympus/database';
import { ExportService, type ExportFormat } from '@project-olympus/export';
import {
  ReportFormat,
  ReportStatus,
  ReportType,
  type ReportFilter,
  type ReportRequest,
  type ReportResult,
} from '@project-olympus/types';

@Injectable()
export class ReportingService {
  private readonly exportService: ExportService;

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {
    this.exportService = new ExportService();
  }

  // #region Public report methods

  public async generateReport(request: ReportRequest): Promise<ReportResult> {
    const reportId = this.generateReportId();
    try {
      const data = await this.fetchReportData(request.type, request.filters);
      if (data.length === 0) {
        return {
          id: reportId,
          type: request.type,
          format: request.format,
          status: ReportStatus.COMPLETED,
          recordCount: 0,
          generatedAt: new Date(),
        };
      }
      const buffer = await this.exportService.exportToBuffer(data, {
        format: this.mapReportFormat(request.format),
        csvOptions: {
          bom: true,
          headers:
            request.includeHeaders && data[0] && typeof data[0] === 'object'
              ? Object.keys(data[0])
              : undefined,
        },
        excelOptions: {
          sheetName: this.getSheetName(request.type),
          freezeHeader: true,
          styleHeader: true,
          autoFilter: true,
        },
      });
      return {
        id: reportId,
        type: request.type,
        format: request.format,
        status: ReportStatus.COMPLETED,
        recordCount: data.length,
        generatedAt: new Date(),
        url: `data:${this.exportService.getContentType(this.mapReportFormat(request.format))};base64,${buffer.toString('base64')}`,
      };
    } catch (error) {
      return {
        id: reportId,
        type: request.type,
        format: request.format,
        status: ReportStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error',
        generatedAt: new Date(),
      };
    }
  }

  public async *streamReportData(
    request: ReportRequest,
  ): AsyncGenerator<Record<string, unknown>, void, undefined> {
    const data = await this.fetchReportData(request.type, request.filters);
    for (const record of data) {
      yield record;
    }
  }

  public async getUserActivityReport(
    filters?: ReportFilter,
  ): Promise<Record<string, unknown>[]> {
    const startDate = filters?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters?.endDate || new Date();
    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(filters?.userId && { id: filters.userId }),
        ...(filters?.status && { userStatusId: filters.status }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        userStatusId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => ({
      userId: user.id,
      email: user.email,
      username: user.username,
      status: user.userStatusId,
      createdAt: user.createdAt.toISOString(),
      lastUpdated: user.updatedAt.toISOString(),
    }));
  }

  public async getWebhookDeliveryReport(
    filters?: ReportFilter,
  ): Promise<Record<string, unknown>[]> {
    const startDate = filters?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = filters?.endDate || new Date();
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        ...(filters?.status && { status: filters.status }),
      },
      select: {
        id: true,
        subscriptionId: true,
        eventType: true,
        status: true,
        httpStatus: true,
        attemptCount: true,
        createdAt: true,
        deliveredAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });
    return deliveries.map((delivery) => ({
      deliveryId: delivery.id,
      subscriptionId: delivery.subscriptionId,
      eventType: delivery.eventType,
      status: delivery.status,
      httpStatus: delivery.httpStatus ?? 'N/A',
      attempts: delivery.attemptCount,
      createdAt: delivery.createdAt.toISOString(),
      deliveredAt: delivery.deliveredAt?.toISOString() ?? 'N/A',
    }));
  }

  public async getSystemMetricsReport(
    filters?: ReportFilter,
  ): Promise<Record<string, unknown>[]> {
    const startDate = filters?.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = filters?.endDate || new Date();
    const [totalUsers, activeUsers, webhookSubscriptions, pendingDeliveries] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true, updatedAt: { gte: startDate } } }),
      this.prisma.webhookSubscription.count({ where: { isActive: true } }),
      this.prisma.webhookDelivery.count({
        where: { status: 'PENDING', createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);
    return [
      { metric: 'Total Users', value: totalUsers, timestamp: new Date().toISOString() },
      { metric: 'Active Users', value: activeUsers, timestamp: new Date().toISOString() },
      {
        metric: 'Webhook Subscriptions',
        value: webhookSubscriptions,
        timestamp: new Date().toISOString(),
      },
      {
        metric: 'Pending Webhook Deliveries',
        value: pendingDeliveries,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  // #endregion

  // #region Private helpers

  private async fetchReportData(
    type: ReportType,
    filters?: ReportFilter,
  ): Promise<Record<string, unknown>[]> {
    switch (type) {
      case ReportType.USER_ACTIVITY:
        return this.getUserActivityReport(filters);
      case ReportType.WEBHOOK_DELIVERY:
        return this.getWebhookDeliveryReport(filters);
      case ReportType.SYSTEM_METRICS:
        return this.getSystemMetricsReport(filters);
      case ReportType.AUDIT_LOG:
        return [];
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }
  }

  private mapReportFormat(format: ReportFormat): ExportFormat {
    switch (format) {
      case ReportFormat.CSV:
        return 'csv';
      case ReportFormat.EXCEL:
        return 'excel';
      default:
        return 'csv';
    }
  }

  private getSheetName(type: ReportType): string {
    switch (type) {
      case ReportType.USER_ACTIVITY:
        return 'User Activity';
      case ReportType.WEBHOOK_DELIVERY:
        return 'Webhook Deliveries';
      case ReportType.SYSTEM_METRICS:
        return 'System Metrics';
      case ReportType.AUDIT_LOG:
        return 'Audit Log';
      default:
        return 'Report';
    }
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // #endregion
}
