import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { jsonError, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canAssignRole, canManageTeam, parseCreateUserBody } from "@/lib/team";

function publicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  color: string;
  homeAddress: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    color: user.color,
    homeAddress: user.homeAddress,
    createdAt: user.createdAt,
  };
}

export const GET = withAuth(async (session) => {
  if (!canManageTeam(session.role)) return jsonError("Only office staff can view the team.", 403);
  const users = await prisma.user.findMany({
    where: { organizationId: session.organizationId },
    orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json({ users: users.map(publicUser) });
});

export const POST = withAuth(async (session, request) => {
  if (!canManageTeam(session.role)) return jsonError("Only office staff can add team members.", 403);
  let parsed;
  try {
    parsed = parseCreateUserBody((await request.json()) as Record<string, unknown>);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid team member");
  }
  if (!canAssignRole(session.role, parsed.role)) {
    return jsonError("You cannot assign that role.");
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) return jsonError("That email is already on the team.");

  const user = await prisma.user.create({
    data: {
      organizationId: session.organizationId,
      email: parsed.email,
      passwordHash: await hashPassword(parsed.password),
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      phone: parsed.phone || null,
      role: parsed.role as never,
      status: "ACTIVE",
      color: parsed.color,
      homeAddress: parsed.homeAddress || null,
    },
  });
  return NextResponse.json({ user: publicUser(user) }, { status: 201 });
});
