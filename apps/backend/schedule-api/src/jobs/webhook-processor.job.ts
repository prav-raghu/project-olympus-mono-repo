import { type PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import { WebhookSignatureService } from '@project-olympus/utilities';
import { request, type Dispatcher } from 'undici';

const WebhookDeliveryStatus = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;

export class WebhookProcessorJob {
  private readonly logger = new Logger(WebhookProcessorJob.name);
  private intervalId?: NodeJS.Timeout;
  private readonly signatureService: WebhookSignatureService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly intervalMs = 60000,
  ) {
    this.signatureService = new WebhookSignatureService();
  }

  public start(): void {
    this.logger.info('Starting webhook processor job');
    this.processWebhooks();
    this.intervalId = setInterval(() => {
      this.processWebhooks();
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.logger.info('Stopped webhook processor job');
    }
  }

  private async processWebhooks(): Promise<void> {
    try {
      const now = new Date();
      const deliveries = await this.prisma.webhookDelivery.findMany({
        where: {
          status: WebhookDeliveryStatus.PENDING,
          nextRetryAt: { lte: now },
        },
        include: { subscription: true },
        take: 100,
      });

      for (const delivery of deliveries) {
        const payload = delivery.payload as Record<string, unknown> | null;
        await this.deliverWebhook({
          id: delivery.id,
          payload: payload ?? {},
          attemptCount: delivery.attemptCount,
          subscription: {
            url: delivery.subscription.url,
            secret: delivery.subscription.secret,
          },
        });
      }
    } catch (error) {
      this.logger.error('Error processing webhooks', error as Record<string, unknown>);
    }
  }

  private async deliverWebhook(delivery: {
    id: string;
    payload: Record<string, unknown>;
    attemptCount: number;
    subscription: { url: string; secret: string };
  }): Promise<void> {
    try {
      const signature = this.signatureService.generateSignature(
        JSON.stringify(delivery.payload),
        delivery.subscription.secret,
      );

      const response = await request(delivery.subscription.url, {
        method: 'POST' as Dispatcher.HttpMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body: JSON.stringify(delivery.payload),
      });

      if (response.statusCode >= 200 && response.statusCode < 300) {
        await this.prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: WebhookDeliveryStatus.DELIVERED,
            deliveredAt: new Date(),
          },
        });
        this.logger.info(`Webhook delivered successfully: ${delivery.id}`);
      } else {
        await this.handleFailedDelivery(delivery.id, delivery.attemptCount);
      }
    } catch (error) {
      this.logger.error(`Webhook delivery failed: ${delivery.id}`, error as Record<string, unknown>);
      await this.handleFailedDelivery(delivery.id, delivery.attemptCount);
    }
  }

  private async handleFailedDelivery(deliveryId: string, attemptCount: number): Promise<void> {
    const newAttemptCount = attemptCount + 1;
    const maxAttempts = 5;

    if (newAttemptCount >= maxAttempts) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.FAILED,
          attemptCount: newAttemptCount,
        },
      });
    } else {
      const nextRetryAt = this.calculateNextRetry(newAttemptCount);
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: WebhookDeliveryStatus.PENDING,
          attemptCount: newAttemptCount,
          nextRetryAt,
        },
      });
    }
  }

  private calculateNextRetry(attemptCount: number): Date {
    const baseDelay = 60;
    const maxDelay = 3600;
    const delaySeconds = Math.min(baseDelay * Math.pow(2, attemptCount - 1), maxDelay);
    return new Date(Date.now() + delaySeconds * 1000);
  }
}
