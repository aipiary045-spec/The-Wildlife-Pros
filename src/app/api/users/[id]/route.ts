import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { canAssignRole, canChangeUser, canManageTeam } from "@/lib/team";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!canManageTeam(session.role)) return jsonError("Only office staff can update the team.", 403);

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: "ACTIVE" | "DISABLED";
    role?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    color?: string;
    homeAddress?: string;
    password?: string;
  };

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.organizationId !== session.organizationId) {
    return jsonError("Team member not found", 404);
  }

  const action = body.status === "DISABLED" ? "disable" : body.status === "ACTIVE" ? "enable" : "edit";
  const activeOwners = await prisma.user.count({
    where: { organizationId: session.organizationId, role: "OWNER", status: "ACTIVE" },
  });
  if (
    !canChangeUser(
      { id: session.id, role: session.role },
      { id: target.id, role: target.role, status: target.status },
      action,
      activeOwners,
    )
  ) {
    return jsonError("You cannot change that team member.");
  }

  if (body.role && !canAssignRole(session.role, body.role)) {
    return jsonError("You cannot assign that role.");
  }
  if (body.password && body.password.length < 6) {
    return jsonError("Password must be at least 6 characters.");
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      status: body.status,
      role: body.role as never,
      firstName: body.firstName?.trim() || undefined,
      lastName: body.lastName?.trim() || undefined,
      phone: body.phone === undefined ? undefined : body.phone.trim() || null,
      color: body.color,
      homeAddress: body.homeAddress === undefined ? undefined : body.homeAddress.trim() || null,
      passwordHash: body.password ? await hashPassword(body.password) : undefined,
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      color: user.color,
      homeAddress: user.homeAddress,
    },
  });
}
