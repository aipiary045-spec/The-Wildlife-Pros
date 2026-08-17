import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";
import { homePath, isOfficeOnlyPath, isTechnician, safeNextPath } from "@/lib/paths";

const PUBLIC_PREFIXES = [
  "/login",
  "/portal",
  "/api/auth",
  "/api/portal",
  "/api/health",
  "/.well-known",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await readSessionToken(token) : null;

  if (!isPublic && !session) {
    const login = new URL("/login", request.url);
    const next = safeNextPath(`${pathname}${request.nextUrl.search}`, "");
    if (next) login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }

  if ((pathname === "/login" || pathname === "/") && session) {
    return NextResponse.redirect(new URL(homePath(session.role), request.url));
  }

  if (session && isTechnician(session.role) && isOfficeOnlyPath(pathname)) {
    return NextResponse.redirect(new URL(homePath(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.svg|sw\\.js|offline\\.html|manifest\\.webmanifest|icons/|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
