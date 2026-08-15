import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@/generated/prisma/client";

export const SESSION_COOKIE = "critterops_session";

export function sessionCookieOptions(source?: Request | Headers) {
  const headerList = source instanceof Request ? source.headers : source;
  const forwarded = headerList?.get("x-forwarded-proto") ?? "";
  const host = headerList?.get("host") ?? "";
  const cfVisitor = headerList?.get("cf-visitor") ?? "";
  const viaCloudflare = Boolean(headerList?.get("cf-ray") || headerList?.get("cf-connecting-ip"));
  const urlSecure = source instanceof Request ? new URL(source.url).protocol === "https:" : false;
  const localHost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const httpsHint =
    urlSecure ||
    viaCloudflare ||
    forwarded.split(",")[0]?.trim() === "https" ||
    cfVisitor.includes("https") ||
    (!localHost && host.length > 0);
  const secure = process.env.NODE_ENV === "production" || httpsHint;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  };
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
};

function secret() {
  const value = process.env.AUTH_SECRET ?? "dev-only-change-me";
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}
