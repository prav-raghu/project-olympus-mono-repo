#!/bin/bash

# Applies all pending Prisma migrations to the production database.
# Run from the repo root: ./dev-ops/scripts/migrate.sh
# Requires DATABASE_URL to be set in the environment.

set -e

cd "$(dirname "$0")/../.." # repo root

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

pnpm --filter @project-olympus-template/database prisma:migrate:deploy

echo "Database migrations completed successfully."
