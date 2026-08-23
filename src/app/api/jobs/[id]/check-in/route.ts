import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { JobVisitError, checkInToJob } from "@/lib/job-check";
import { parseOccurredAt } from "@/lib/offline";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  let occurredAt = new Date();
  const text = await request.text();
  if (text.trim()) {
    try {
      const body = JSON.parse(text) as { occurredAt?: unknown };
      occurredAt = parseOccurredAt(body.occurredAt);
    } catch {
      occurredAt = new Date();
    }
  }
  try {
    const result = await checkInToJob(id, session, occurredAt);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof JobVisitError) {
      return NextResponse.json(
        { error: error.message, openJob: error.openJob ?? null },
        { status: error.status },
      );
    }
    throw error;
  }
}
