#!/bin/sh
set -e
echo "Running prisma migrate deploy against DATABASE_URL_ADMIN, DATABASE_URL_CUSTOMER, DATABASE_URL_SCHEDULE, DATABASE_URL_SHARED..."
node_modules/.bin/prisma migrate deploy --schema=common/database/prisma/schema.prisma
