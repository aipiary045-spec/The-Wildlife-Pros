#!/usr/bin/env bash
# Cloud Agent start: per-boot reconciliation. The install snapshot already contains
# PostgreSQL, the seeded database, and node_modules; this just brings the database
# daemon back online and waits for readiness. Must be idempotent and must return.
set -euo pipefail

PG_VERSION=16
PG_CLUSTER=main

echo "==> Starting PostgreSQL cluster ${PG_VERSION}/${PG_CLUSTER}"
sudo pg_ctlcluster "${PG_VERSION}" "${PG_CLUSTER}" start 2>/dev/null || true

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if pg_isready -h localhost -q 2>/dev/null; then
    echo "==> PostgreSQL is ready"
    exit 0
  fi
  sleep 1
done

echo "!! PostgreSQL did not become ready in time" >&2
exit 1
