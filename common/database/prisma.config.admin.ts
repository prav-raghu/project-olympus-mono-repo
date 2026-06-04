import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaClient } from '@prisma/client/admin';

export default defineConfig({
    schema: './prisma/schema.admin.prisma',
    migrations: {
        path: './prisma/migrations/admin',
    },
    datasource: {
        adapter: async () => {
            const url = process.env['DATABASE_URL_ADMIN'] ?? '';
            const client = new PrismaClient({ datasources: { db: { url } } });
            return client;
        },
    },
});
