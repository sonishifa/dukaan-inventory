#!/bin/sh
# Container start-up: bring the database schema up to date, optionally add
# sample products (local Docker only), then start the Next.js server.
set -e

node scripts/migrate.js

if [ "${SEED_DATA:-false}" = "true" ]; then
  node scripts/seed.js
fi

exec node server.js
