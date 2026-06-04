import 'dotenv/config';
import { EnvConfig } from './config/env.config';

EnvConfig.load();

export { DatabaseModule } from './database.module';
export { ADMIN_DB, CUSTOMER_DB, SCHEDULE_DB, SHARED_DB } from './tokens';
export { createAdminClient, disconnectAdminClient } from './clients/admin.client';
export { createCustomerClient, disconnectCustomerClient } from './clients/customer.client';
export { createScheduleClient, disconnectScheduleClient } from './clients/schedule.client';
export { createSharedClient, disconnectSharedClient } from './clients/shared.client';
export type { AdminPrismaClient } from './clients/admin.client';
export type { CustomerPrismaClient } from './clients/customer.client';
export type { SchedulePrismaClient } from './clients/schedule.client';
export type { SharedPrismaClient } from './clients/shared.client';

// Generated Prisma types for use in service files
export type { PrismaClient, User, Prisma } from '@project-olympus/db-admin';
export type { PrismaClient as CustomerPrismaClientType, CustomerProfile } from '@project-olympus/db-customer';
export type { PrismaClient as SchedulePrismaClientType, ScheduledJob } from '@project-olympus/db-schedule';
export type { PrismaClient as SharedPrismaClientType, Role, UserStatus, WebhookSubscription, WebhookDelivery } from '@project-olympus/db-shared';
