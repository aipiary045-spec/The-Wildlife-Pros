import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async () => {
  const clients = await prisma.client.findMany({
    include: { properties: true, _count: { select: { jobs: true, invoices: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json({ clients });
});

export const POST = withAuth(async (_session, request) => {
  const body = await request.json();
  const client = await prisma.client.create({
    data: {
      organizationId: _session.organizationId,
      firstName: body.firstName,
      lastName: body.lastName,
      companyName: body.companyName,
      email: body.email,
      phone: body.phone,
      notes: body.notes,
      properties: body.property
        ? {
            create: {
              label: body.property.label ?? "Primary",
              type: body.property.type ?? "RESIDENTIAL",
              address1: body.property.address1,
              city: body.property.city,
              state: body.property.state,
              postalCode: body.property.postalCode,
              lat: body.property.lat,
              lng: body.property.lng,
            },
          }
        : undefined,
    },
    include: { properties: true },
  });
  return NextResponse.json({ client }, { status: 201 });
});
