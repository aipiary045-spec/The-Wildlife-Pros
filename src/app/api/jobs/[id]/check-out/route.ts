import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { JobVisitError, checkOutOfJob } from "@/lib/job-check";
import { parseCheckoutBody } from "@/lib/job-visit";
import { parseOccurredAt } from "@/lib/offline";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseCheckoutBody(body);
    const result = await checkOutOfJob(id, session, input, parseOccurredAt(body.occurredAt));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof JobVisitError) return jsonError(error.message, error.status);
    throw error;
  }
}
