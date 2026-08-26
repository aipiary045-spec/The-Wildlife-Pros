import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "@/lib/auth";

export async function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function withAuth(
  handler: (session: SessionUser, request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    const session = await getSession();
    if (!session) {
      return jsonError("Sign in required", 401);
    }
    try {
      return await handler(session, request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      return jsonError(message, 500);
    }
  };
}
