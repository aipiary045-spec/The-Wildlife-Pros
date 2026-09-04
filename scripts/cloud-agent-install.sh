#!/usr/bin/env bash
# Cloud Agent install: durable, idempotent setup run after the repo is checked out.
# Installs PostgreSQL, refreshes Node dependencies, and prepares the CritterOps
# database (schema + demo seed). Safe to run repeatedly.
set -euo pipefail

PG_VERSION=16
PG_CLUSTER=main

echo "==> Ensuring PostgreSQL ${PG_VERSION} is installed"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql postgresql-client
fi

echo "==> Starting PostgreSQL cluster ${PG_VERSION}/${PG_CLUSTER}"
sudo pg_ctlcluster "${PG_VERSION}" "${PG_CLUSTER}" start 2>/dev/null || true

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if pg_isready -h localhost -q 2>/dev/null; then break; fi
  sleep 1
done

echo "==> Ensuring 'critterops' role and database exist"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='critterops') THEN CREATE ROLE critterops LOGIN PASSWORD 'critterops' CREATEDB; END IF; END \$\$;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='critterops'" | grep -q 1 \
  || sudo -u postgres createdb -O critterops critterops

echo "==> Ensuring .env exists"
if [ ! -f .env ]; then
  cp .env.example .env
  # Give local dev a unique, non-default session secret.
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"local-dev-$(openssl rand -hex 16)\"|" .env
fi

# prisma.config.ts (loaded by the postinstall `prisma generate`) requires DATABASE_URL,
# and prisma/seed.ts reads it from the process environment, so load .env before npm.
set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "==> Installing Node dependencies (runs prisma generate via postinstall)"
npm install

echo "==> Applying Prisma schema to the database"
npm run db:push

echo "==> Seeding CritterOps demo data"
npm run db:seed

echo "==> Cloud Agent install complete"
