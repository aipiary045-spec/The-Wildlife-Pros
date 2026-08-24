import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { loadSchedulingPool } from "@/lib/scheduling-pool";

export const GET = withAuth(async () => {
  const pool = await loadSchedulingPool();
  return NextResponse.json(pool);
});
