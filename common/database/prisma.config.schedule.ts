import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = process.env['DATABASE_URL_SCHEDULE'] ?? '';

export default defineConfig({
    schema: './prisma/schema.schedule.prisma',
    migrations: {
        path: './prisma/migrations/schedule',
    },
    datasource: {
        url,
        adapter: () => new PrismaMariaDb(url),
    },
});
