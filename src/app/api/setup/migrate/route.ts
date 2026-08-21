import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { runPendingMigrations } from "@/lib/run-pending-migrations";

export async function POST() {
  try {
    const result = await runPendingMigrations();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Migration failed";
    return jsonError(message, 500);
  }
}
