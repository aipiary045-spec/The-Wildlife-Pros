import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (_session, request) => {
  const body = await request.json();
  const propertyId = typeof body.propertyId === "string" ? body.propertyId : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!propertyId) return jsonError("Pick a property.");
  if (!label) return jsonError("Name the entry point.");

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return jsonError("Property not found", 404);

  const entryPoint = await prisma.entryPoint.create({
    data: {
      propertyId,
      jobId: typeof body.jobId === "string" ? body.jobId : undefined,
      label,
      area: typeof body.area === "string" ? body.area.trim() || null : null,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      sealed: Boolean(body.sealed),
    },
  });

  return NextResponse.json({ entryPoint }, { status: 201 });
});

export const PATCH = withAuth(async (_session, request) => {
  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return jsonError("Missing entry point.");

  const entryPoint = await prisma.entryPoint.update({
    where: { id },
    data: {
      sealed: typeof body.sealed === "boolean" ? body.sealed : undefined,
      label: typeof body.label === "string" ? body.label.trim() : undefined,
      area: typeof body.area === "string" ? body.area.trim() || null : undefined,
      description: typeof body.description === "string" ? body.description.trim() || null : undefined,
    },
  });

  return NextResponse.json({ entryPoint });
});
