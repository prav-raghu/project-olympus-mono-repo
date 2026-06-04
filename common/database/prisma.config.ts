import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = process.env['DATABASE_URL_ADMIN'] ?? '';

export default defineConfig({
    schema: './prisma/schema.admin.prisma',
    migrations: {
        path: './prisma/migrations/admin',
        seed: 'tsx prisma/seed.ts',
    },
    datasource: {
        url,
        adapter: () => new PrismaMariaDb(url),
    },
});
