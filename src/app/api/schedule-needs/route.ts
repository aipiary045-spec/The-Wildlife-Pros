import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dueOnFromReturnDays, parseReturnInDays } from "@/lib/schedule-needs";

export const GET = withAuth(async () => {
  const needs = await prisma.scheduleNeed.findMany({
    where: { status: "OPEN" },
    include: {
      client: true,
      property: true,
      preferredTech: { select: { id: true, firstName: true, lastName: true, color: true } },
      sourceJob: { select: { id: true, number: true, title: true } },
    },
    orderBy: { dueOn: "asc" },
  });
  return NextResponse.json({ needs });
});

export const POST = withAuth(async (_session, request) => {
  const body = (await request.json()) as Record<string, unknown>;
  const sourceJobId = typeof body.jobId === "string" ? body.jobId : typeof body.sourceJobId === "string" ? body.sourceJobId : "";
  const source = sourceJobId
    ? await prisma.job.findUnique({ where: { id: sourceJobId } })
    : null;
  const clientId = typeof body.clientId === "string" ? body.clientId : source?.clientId;
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : source?.propertyId;
  if (!clientId || !propertyId) {
    return jsonError("Pick a customer and address, or start from a job.");
  }
  let returnInDays: number;
  try {
    returnInDays = parseReturnInDays(body.returnInDays);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Enter days until return.");
  }
  const dueOn =
    typeof body.dueOn === "string" && body.dueOn
      ? new Date(body.dueOn)
      : dueOnFromReturnDays(returnInDays);

  const need = await prisma.scheduleNeed.create({
    data: {
      clientId,
      propertyId,
      sourceJobId: source?.id,
      preferredTechId: typeof body.preferredTechId === "string" ? body.preferredTechId : source?.technicianId,
      title:
        (typeof body.title === "string" && body.title.trim()) ||
        source?.title ||
        "Return visit",
      notes: typeof body.notes === "string" ? body.notes.trim() : null,
      returnInDays,
      dueOn,
      status: "OPEN",
    },
    include: { client: true, property: true },
  });
  return NextResponse.json({ need }, { status: 201 });
});
