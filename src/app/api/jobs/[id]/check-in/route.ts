import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { JobVisitError, checkInToJob } from "@/lib/job-check";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  try {
    const result = await checkInToJob(id, session);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof JobVisitError) return jsonError(error.message, error.status);
    throw error;
  }
}
