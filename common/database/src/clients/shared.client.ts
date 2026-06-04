import { PrismaClient } from '@project-olympus/db-shared';
import { EnvConfig } from '../config/env.config';

export type SharedPrismaClient = PrismaClient;

let instance: PrismaClient | null = null;

export async function createSharedClient(): Promise<PrismaClient> {
    if (instance) {
        return instance;
    }
    const { PrismaMariaDb } = await import('@prisma/adapter-mariadb');
    const adapter = new PrismaMariaDb(EnvConfig.get('DATABASE_URL_SHARED'));
    instance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    return instance;
}

export async function disconnectSharedClient(): Promise<void> {
    if (instance) {
        await instance.$disconnect();
        instance = null;
    }
}

export type { Role, UserStatus, WebhookSubscription, WebhookDelivery } from '@project-olympus/db-shared';
