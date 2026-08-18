import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { parseDateParam } from "@/lib/dates";
import { resolvePropertyCoordinates } from "@/lib/geocode";
import {
  canManageIntake,
  findMatchingClient,
  findMatchingProperty,
  parseIntakeBody,
} from "@/lib/intake";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (session) => {
  if (!canManageIntake(session.role)) return jsonError("Office only.", 403);
  const requests = await prisma.serviceRequest.findMany({
    include: { client: { include: { properties: true } }, property: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
});

export const POST = withAuth(async (session, request) => {
  if (!canManageIntake(session.role)) return jsonError("Office only.", 403);
  let input;
  try {
    input = parseIntakeBody((await request.json()) as Record<string, unknown>);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not save that call.");
  }

  const clients = await prisma.client.findMany({
    include: { properties: { select: { id: true, address1: true, city: true } } },
  });
  const match = findMatchingClient(clients, {
    clientId: input.clientId,
    phone: input.phone,
    email: input.email,
  });

  const preferredAt = input.preferredOn
    ? (() => {
        const date = parseDateParam(input.preferredOn);
        date.setHours(9, 0, 0, 0);
        return date;
      })()
    : null;

  let clientId = match?.id;
  let propertyId = match ? findMatchingProperty(match, input.address1)?.id : undefined;

  if (!clientId) {
    const coords = input.address1
      ? await resolvePropertyCoordinates({
          address1: input.address1,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
        })
      : null;
    const client = await prisma.client.create({
      data: {
        organizationId: session.organizationId,
        status: "LEAD",
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email,
        notes: "From the call log",
        properties: input.address1
          ? {
              create: {
                label: "Primary",
                address1: input.address1,
                city: input.city,
                state: input.state,
                postalCode: input.postalCode,
                lat: coords?.lat,
                lng: coords?.lng,
              },
            }
          : undefined,
      },
      include: { properties: true },
    });
    clientId = client.id;
    propertyId = client.properties[0]?.id;
  } else {
    if (input.firstName && input.lastName) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email ?? undefined,
          phone: input.phone ?? undefined,
        },
      });
    }
    if (!propertyId && input.address1) {
    const coords = await resolvePropertyCoordinates({
      address1: input.address1,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
    });
    const property = await prisma.property.create({
      data: {
        clientId,
        label: "Service",
        address1: input.address1,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        lat: coords.lat,
        lng: coords.lng,
      },
    });
    propertyId = property.id;
    }
  }

  if (!propertyId) {
    return jsonError("Need a street so we can quote or send a tech.");
  }

  const open = match
    ? await prisma.serviceRequest.findFirst({
        where: {
          clientId,
          status: { in: ["NEW", "ASSESSED"] },
          createdAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) },
        },
      })
    : null;
  const saved = open
    ? await prisma.serviceRequest.update({
        where: { id: open.id },
        data: {
          propertyId,
          title: input.title,
          details: input.details,
          source: input.source,
          preferredAt,
        },
        include: { client: true, property: true },
      })
    : await prisma.serviceRequest.create({
        data: {
          clientId,
          propertyId,
          title: input.title,
          details: input.details,
          source: input.source,
          preferredAt,
        },
        include: { client: true, property: true },
      });

  return NextResponse.json({ request: saved, matched: Boolean(match) }, { status: open ? 200 : 201 });
});
