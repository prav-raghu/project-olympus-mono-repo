import { Injectable, Inject } from '@nestjs/common';
import { SHARED_DB } from '@project-olympus/database';
import type { SharedPrismaClient as PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { WebhookSignatureService } from '@project-olympus/utilities';
import {
  type CreateWebhookSubscriptionDto,
  type UpdateWebhookSubscriptionDto,
  type WebhookEventType,
  type WebhookPayload,
  WebhookDeliveryStatus,
} from '@project-olympus/types';
import { request } from 'undici';
import crypto from 'node:crypto';

// [internal result shape used before mapping to ResponseDto]
export interface WebhookOperationResult<T = unknown> {
  isSuccessful: boolean;
  data?: T;
  message?: string;
}

interface WebhookDeliveryResult {
  success: boolean;
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
}

const SUBSCRIPTION_NOT_FOUND = 'Subscription not found';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly signatureService: WebhookSignatureService;

  constructor(@Inject(SHARED_DB) private readonly prisma: PrismaClient) {
    this.signatureService = new WebhookSignatureService();
  }

  // #region Subscription methods

  public async createSubscription(
    dto: CreateWebhookSubscriptionDto,
    createdBy?: string,
  ): Promise<WebhookOperationResult> {
    const secret = dto.secret ?? this.signatureService.generateSecret();
    const subscription = await this.prisma.webhookSubscription.create({
      data: {
        id: crypto.randomUUID(),
        url: dto.url,
        secret,
        events: Array.isArray(dto.events) ? JSON.stringify(dto.events) : (dto.events ?? '[]'),
        retryCount: dto.retryCount ?? 3,
        timeoutSeconds: dto.timeoutSeconds ?? 30,
        createdBy,
      },
    });
    return { isSuccessful: true, data: subscription };
  }

  public async getSubscription(id: string, userId: string): Promise<WebhookOperationResult> {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, createdBy: userId },
    });
    if (!subscription) {
      return { isSuccessful: false, message: SUBSCRIPTION_NOT_FOUND };
    }
    return { isSuccessful: true, data: subscription };
  }

  public async listSubscriptions(
    userId: string,
    isActive?: boolean,
  ): Promise<WebhookOperationResult<unknown[]>> {
    const where = isActive === undefined
      ? { createdBy: userId }
      : { createdBy: userId, isActive };
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return { isSuccessful: true, data: subscriptions };
  }

  public async updateSubscription(
    id: string,
    userId: string,
    dto: UpdateWebhookSubscriptionDto,
  ): Promise<WebhookOperationResult> {
    const existing = await this.prisma.webhookSubscription.findFirst({
      where: { id, createdBy: userId },
    });
    if (!existing) {
      return { isSuccessful: false, message: SUBSCRIPTION_NOT_FOUND };
    }
    const subscription = await this.prisma.webhookSubscription.update({
      where: { id },
      data: {
        url: dto.url,
        secret: dto.secret,
        events: Array.isArray(dto.events) ? JSON.stringify(dto.events) : dto.events,
        isActive: dto.isActive,
        retryCount: dto.retryCount,
        timeoutSeconds: dto.timeoutSeconds,
      },
    });
    return { isSuccessful: true, data: subscription };
  }

  public async deleteSubscription(
    id: string,
    userId: string,
  ): Promise<WebhookOperationResult<{ id: string }>> {
    const existing = await this.prisma.webhookSubscription.findFirst({
      where: { id, createdBy: userId },
    });
    if (!existing) {
      return { isSuccessful: false, message: SUBSCRIPTION_NOT_FOUND };
    }
    await this.prisma.webhookSubscription.delete({ where: { id } });
    return { isSuccessful: true, data: { id } };
  }

  public async getDeliveries(
    subscriptionId: string,
    userId: string,
    limit = 50,
  ): Promise<WebhookOperationResult<unknown[]>> {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id: subscriptionId, createdBy: userId },
    });
    if (!subscription) {
      return { isSuccessful: false, message: SUBSCRIPTION_NOT_FOUND, data: [] };
    }
    const deliveries = await this.prisma.webhookDelivery.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { isSuccessful: true, data: deliveries };
  }

  public async regenerateSecret(id: string, userId: string): Promise<WebhookOperationResult> {
    const existing = await this.prisma.webhookSubscription.findFirst({
      where: { id, createdBy: userId },
    });
    if (!existing) {
      return { isSuccessful: false, message: SUBSCRIPTION_NOT_FOUND };
    }
    const newSecret = this.signatureService.generateSecret();
    const subscription = await this.prisma.webhookSubscription.update({
      where: { id },
      data: { secret: newSecret },
    });
    return { isSuccessful: true, data: subscription };
  }

  // #endregion

  // #region Delivery methods

  public async publishEvent(
    eventType: WebhookEventType,
    data: Record<string, unknown>,
  ): Promise<void> {
    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };
    const subscriptions = await this.findActiveSubscriptions(eventType);
    for (const subscription of subscriptions) {
      await this.createDelivery(subscription.id, eventType, payload);
    }
    await this.processDeliveries();
  }

  public async processDeliveries(): Promise<void> {
    const pendingDeliveries = await this.prisma.webhookDelivery.findMany({
      where: {
        status: { in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.RETRYING] },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      include: { subscription: true },
      take: 50,
    });
    const results = await Promise.allSettled(
      pendingDeliveries.map((delivery) => this.deliverWebhook(delivery)),
    );
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      this.logger.warn(`Webhook delivery: ${failed.length}/${results.length} deliveries failed`);
    }
  }

  public async retryFailedDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { subscription: true },
    });
    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }
    if (delivery.status === WebhookDeliveryStatus.DELIVERED) {
      throw new Error('Cannot retry a successful delivery');
    }
    await this.deliverWebhook(delivery);
  }

  private async findActiveSubscriptions(eventType: WebhookEventType): Promise<{ id: string; url: string; secret: string; retryCount: number; timeoutSeconds: number }[]> {
    const all = await this.prisma.webhookSubscription.findMany({
      where: { isActive: true },
      select: { id: true, url: true, secret: true, retryCount: true, timeoutSeconds: true, events: true },
    });
    // events stored as JSON string — filter in app layer (MySQL has no array contains)
    return all.filter((s) => {
      try {
        const evts = JSON.parse(s.events) as string[];
        return evts.includes(eventType);
      } catch {
        return false;
      }
    });
  }

  private async createDelivery(
    subscriptionId: string,
    eventType: string,
    payload: WebhookPayload,
  ): Promise<void> {
    await this.prisma.webhookDelivery.create({
      data: {
        id: crypto.randomUUID(),
        subscriptionId,
        eventType,
        payload: payload as never,
        status: WebhookDeliveryStatus.PENDING,
        attemptCount: 0,
      },
    });
    await this.prisma.webhookSubscription.update({
      where: { id: subscriptionId },
      data: { lastTriggeredAt: new Date() },
    });
  }

  private async deliverWebhook(delivery: {
    id: string;
    subscriptionId: string;
    eventType: string;
    payload: unknown;
    attemptCount: number;
    subscription: { url: string; secret: string; retryCount: number; timeoutSeconds: number };
  }): Promise<void> {
    const { subscription } = delivery;
    const payloadString = JSON.stringify(delivery.payload);
    const signature = this.signatureService.generateSignature(payloadString, subscription.secret);
    this.logger.info(`Delivering webhook ${delivery.id} to ${subscription.url}`);
    const result = await this.attemptDelivery(
      subscription.url,
      payloadString,
      signature,
      subscription.timeoutSeconds,
    );
    const attemptCount = delivery.attemptCount + 1;
    const shouldRetry = !result.success && attemptCount < subscription.retryCount;
    if (result.success) {
      await this.markDelivered(delivery.id, result);
    } else if (shouldRetry) {
      await this.scheduleRetry(delivery.id, attemptCount, result);
    } else {
      await this.markFailed(delivery.id, result);
    }
  }

  private async attemptDelivery(
    url: string,
    payload: string,
    signature: string,
    timeoutSeconds: number,
  ): Promise<WebhookDeliveryResult> {
    try {
      const response = await request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'User-Agent': 'WebhookService/1.0',
        },
        body: payload,
        bodyTimeout: timeoutSeconds * 1000,
        headersTimeout: timeoutSeconds * 1000,
      });
      const responseBody = await response.body.text();
      const success = response.statusCode >= 200 && response.statusCode < 300;
      return { success, httpStatus: response.statusCode, responseBody: responseBody.substring(0, 1000) };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Webhook delivery failed: ${errorMessage}`, error as Error);
      return { success: false, errorMessage };
    }
  }

  private async markDelivered(deliveryId: string, result: WebhookDeliveryResult): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.DELIVERED,
        httpStatus: result.httpStatus,
        responseBody: result.responseBody,
        deliveredAt: new Date(),
        nextRetryAt: null,
      },
    });
  }

  private async scheduleRetry(
    deliveryId: string,
    attemptCount: number,
    result: WebhookDeliveryResult,
  ): Promise<void> {
    const nextRetryAt = this.calculateNextRetry(attemptCount);
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.RETRYING,
        attemptCount,
        httpStatus: result.httpStatus,
        errorMessage: result.errorMessage,
        nextRetryAt,
      },
    });
  }

  private async markFailed(deliveryId: string, result: WebhookDeliveryResult): Promise<void> {
    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.FAILED,
        httpStatus: result.httpStatus,
        errorMessage: result.errorMessage,
        nextRetryAt: null,
      },
    });
  }

  private calculateNextRetry(attemptCount: number): Date {
    const baseDelay = 60;
    const maxDelay = 3600;
    const delaySeconds = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
    return new Date(Date.now() + delaySeconds * 1000);
  }

  // #endregion
}
