import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canAccessInvoice } from "@/lib/billing-access";
import { isTechnician } from "@/lib/paths";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      property: true,
      job: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { receivedOn: "desc" } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!canAccessInvoice(session, invoice)) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (isTechnician(session.role)) {
    return NextResponse.json({ error: "Office only." }, { status: 403 });
  }
  const { id } = await context.params;
  const existing = await prisma.invoice.findUnique({
    where: { id },
    include: { job: { select: { technicianId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!canAccessInvoice(session, existing)) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const body = await request.json();
  const now = new Date();
  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: body.status,
      sentAt: body.status === "SENT" ? now : undefined,
      notes: body.notes,
      dueOn: body.dueOn ? new Date(body.dueOn) : undefined,
    },
    include: { client: true, lineItems: true, payments: true },
  });
  return NextResponse.json({ invoice });
}
