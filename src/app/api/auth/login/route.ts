import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { safeNextPath } from "@/lib/paths";

async function readCredentials(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { email?: string; password?: string; next?: string };
    return {
      email: body.email?.trim().toLowerCase() ?? "",
      password: body.password ?? "",
      next: safeNextPath(body.next),
      form: false,
    };
  }
  const form = await request.formData();
  return {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
    next: safeNextPath(String(form.get("next") ?? "")),
    form: true,
  };
}

function formRedirect(path: string, request: Request, cookie?: { token: string }) {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: path },
  });
  if (cookie) {
    response.cookies.set(SESSION_COOKIE, cookie.token, sessionCookieOptions(request));
  }
  return response;
}

export async function POST(request: Request) {
  const { email, password, next, form } = await readCredentials(request);
  if (!email || !password) {
    if (form) return formRedirect(`/login?error=missing&next=${encodeURIComponent(next)}`, request);
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.status === "ACTIVE" ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    if (form) return formRedirect(`/login?error=invalid&next=${encodeURIComponent(next)}`, request);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
  });

  if (form) {
    return formRedirect(next, request, { token });
  }

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(request));
  return response;
}
