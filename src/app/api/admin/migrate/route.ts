import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { runPendingMigrations } from "@/lib/run-pending-migrations";

export const POST = withAuth(async (session) => {
  if (session.role !== "ADMIN") {
    return jsonError("Only admins can run database migrations.", 403);
  }
  const result = await runPendingMigrations();
  return NextResponse.json(result);
});
