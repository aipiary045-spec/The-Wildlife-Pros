import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { QuoteError, convertQuoteToJob } from "@/lib/quote-convert";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      technicianId?: string;
      scheduledStart?: string;
      durationMin?: number;
    };
    const job = await convertQuoteToJob({
      quoteId: id,
      createdById: session.id,
      technicianId: body.technicianId,
      scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : undefined,
      durationMin: body.durationMin ? Number(body.durationMin) : undefined,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof QuoteError) return jsonError(error.message, error.status);
    throw error;
  }
}
