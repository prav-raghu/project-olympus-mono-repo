import { PrismaClient } from '@project-olympus/db-admin';
import { EnvConfig } from '../config/env.config';

export type AdminPrismaClient = PrismaClient;

let instance: PrismaClient | null = null;

export async function createAdminClient(): Promise<PrismaClient> {
    if (instance) {
        return instance;
    }
    const { PrismaMariaDb } = await import('@prisma/adapter-mariadb');
    const adapter = new PrismaMariaDb(EnvConfig.get('DATABASE_URL_ADMIN'));
    instance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    return instance;
}

export async function disconnectAdminClient(): Promise<void> {
    if (instance) {
        await instance.$disconnect();
        instance = null;
    }
}

export type { User, Prisma } from '@project-olympus/db-admin';
