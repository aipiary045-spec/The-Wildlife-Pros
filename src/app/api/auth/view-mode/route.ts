import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import {
  canSwitchViewMode,
  homePathFor,
  readViewMode,
  VIEW_MODE_COOKIE,
  viewModeCookieOptions,
  type ViewMode,
} from "@/lib/view-mode";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canSwitchViewMode(session.role)) return jsonError("Only admins can switch views.", 403);

  const body = (await request.json()) as { mode?: string };
  const mode: ViewMode = body.mode === "field" ? "field" : "office";
  const response = NextResponse.json({
    ok: true,
    mode,
    redirect: homePathFor(session.role, mode),
  });
  response.cookies.set(VIEW_MODE_COOKIE, mode, viewModeCookieOptions(request));
  return response;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const mode = readViewMode(request.cookies.get(VIEW_MODE_COOKIE)?.value);
  return NextResponse.json({
    mode: canSwitchViewMode(session.role) ? mode : "office",
    canSwitch: canSwitchViewMode(session.role),
  });
}
