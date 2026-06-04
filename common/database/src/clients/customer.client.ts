import { PrismaClient } from '@project-olympus/db-customer';
import { EnvConfig } from '../config/env.config';

export type CustomerPrismaClient = PrismaClient;

let instance: PrismaClient | null = null;

export async function createCustomerClient(): Promise<PrismaClient> {
    if (instance) {
        return instance;
    }
    const { PrismaMariaDb } = await import('@prisma/adapter-mariadb');
    const adapter = new PrismaMariaDb(EnvConfig.get('DATABASE_URL_CUSTOMER'));
    instance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    return instance;
}

export async function disconnectCustomerClient(): Promise<void> {
    if (instance) {
        await instance.$disconnect();
        instance = null;
    }
}

export type { CustomerProfile } from '@project-olympus/db-customer';
