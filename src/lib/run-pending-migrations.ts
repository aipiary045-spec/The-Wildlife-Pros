import { prisma } from "@/lib/prisma";

const MIGRATION_NAME = "20260821150000_simplify_user_roles";

async function userRoleLabels() {
  const rows = await prisma.$queryRaw<Array<{ label: string }>>`
    SELECT e.enumlabel AS label
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole'
    ORDER BY e.enumsortorder
  `;
  return rows.map((row) => row.label);
}

function rolesAreSimplified(labels: string[]) {
  return labels.length === 2 && labels.includes("ADMIN") && labels.includes("TECHNICIAN");
}

async function migrationRecorded() {
  try {
    const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE migration_name = ${MIGRATION_NAME}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function ensureMigrationTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

export async function runPendingMigrations() {
  const roles = await userRoleLabels();
  if (rolesAreSimplified(roles) || (await migrationRecorded())) {
    return { ok: true as const, status: "already_applied" as const, roles };
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      UPDATE "User" SET role = 'ADMIN'
      WHERE role::text IN ('OWNER', 'DISPATCHER', 'ACCOUNTING')
    `);

    const current = await tx.$queryRaw<Array<{ label: string }>>`
      SELECT e.enumlabel AS label
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'UserRole'
      ORDER BY e.enumsortorder
    `;
    const labels = current.map((row) => row.label);
    if (rolesAreSimplified(labels)) {
      return;
    }

    await tx.$executeRawUnsafe(`ALTER TYPE "UserRole" RENAME TO "UserRole_old"`);
    await tx.$executeRawUnsafe(`CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TECHNICIAN')`);
    await tx.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN role DROP DEFAULT`);
    await tx.$executeRawUnsafe(`
      ALTER TABLE "User" ALTER COLUMN role TYPE "UserRole"
      USING role::text::"UserRole"
    `);
    await tx.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN role SET DEFAULT 'TECHNICIAN'`);
    await tx.$executeRawUnsafe(`DROP TYPE "UserRole_old"`);
  });

  await recordMigration();
  return { ok: true as const, status: "applied" as const, roles: await userRoleLabels() };
}

async function recordMigration() {
  if (await migrationRecorded()) return;
  await ensureMigrationTable();
  const startedAt = new Date();
  await prisma.$executeRaw`
    INSERT INTO "_prisma_migrations" (
      id,
      checksum,
      finished_at,
      migration_name,
      logs,
      rolled_back_at,
      started_at,
      applied_steps_count
    ) VALUES (
      ${crypto.randomUUID()},
      ${"manual-simplify-user-roles"},
      ${startedAt},
      ${MIGRATION_NAME},
      NULL,
      NULL,
      ${startedAt},
      1
    )
  `;
}
