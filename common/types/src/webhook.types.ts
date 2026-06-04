export enum WebhookEventType {
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_COMPLETED = 'order.completed',
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_FAILED = 'payment.failed',
}

export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookSubscription {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  retryCount: number;
  timeoutSeconds: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggeredAt?: Date;
}

export interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  httpStatus?: number;
  responseBody?: string;
  errorMessage?: string;
  attemptCount: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookSubscriptionDto {
  url: string;
  secret: string;
  events: WebhookEventType[];
  retryCount?: number;
  timeoutSeconds?: number;
}

export interface UpdateWebhookSubscriptionDto {
  url?: string;
  secret?: string;
  events?: WebhookEventType[];
  isActive?: boolean;
  retryCount?: number;
  timeoutSeconds?: number;
}
