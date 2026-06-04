import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = process.env['DATABASE_URL_SHARED'] ?? '';

export default defineConfig({
    schema: './prisma/schema.shared.prisma',
    migrations: {
        path: './prisma/migrations/shared',
    },
    datasource: {
        url,
        adapter: () => new PrismaMariaDb(url),
    },
});
