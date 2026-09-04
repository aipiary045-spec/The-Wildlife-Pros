import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createVisitPlanTrip } from "@/lib/visit-plans.server";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const result = await createVisitPlanTrip(id, session.id);
  if ("error" in result) return jsonError(result.error ?? "Could not add trip.", 400);
  return NextResponse.json(result, { status: 201 });
}
