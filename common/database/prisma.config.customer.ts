import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const url = process.env['DATABASE_URL_CUSTOMER'] ?? '';

export default defineConfig({
    schema: './prisma/schema.customer.prisma',
    migrations: {
        path: './prisma/migrations/customer',
    },
    datasource: {
        url,
        adapter: () => new PrismaMariaDb(url),
    },
});
