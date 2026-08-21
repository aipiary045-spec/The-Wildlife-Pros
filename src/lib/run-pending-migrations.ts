import { prisma } from "@/lib/prisma";

const MIGRATION_NAME = "20260821150000_simplify_user_roles";

async function migrationRecorded() {
  const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = ${MIGRATION_NAME}
    LIMIT 1
  `;
  return rows.length > 0;
}

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

export async function runPendingMigrations() {
  if (await migrationRecorded()) {
    return { ok: true as const, status: "already_applied" as const, roles: await userRoleLabels() };
  }

  const roles = await userRoleLabels();
  if (roles.length === 2 && roles.includes("ADMIN") && roles.includes("TECHNICIAN")) {
    await recordMigration();
    return { ok: true as const, status: "roles_already_simplified" as const, roles };
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
    if (labels.length === 2 && labels.includes("ADMIN") && labels.includes("TECHNICIAN")) {
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
