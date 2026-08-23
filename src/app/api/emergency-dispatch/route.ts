import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { resolvePropertyCoordinates } from "@/lib/geocode";
import {
  buildEmergencyBackupSms,
  buildEmergencyInstructions,
  emergencyIsOverdue,
  emergencyJobWindow,
  formatDispatchAddress,
  notifyEmergencyCustomer,
  notifyOpenEmergencyTeam,
  parseHazardTags,
} from "@/lib/emergency";
import { sendSms } from "@/lib/messaging";
import { queueJobGoogleCalendarSync } from "@/lib/google-calendar";
import { nextNumber } from "@/lib/utils";

const dispatchInclude = {
  job: {
    include: {
      client: true,
      property: true,
      technician: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
  },
  assignedTechnician: { select: { id: true, firstName: true, lastName: true, phone: true } },
  backupTechnician: { select: { id: true, firstName: true, lastName: true, phone: true } },
  dispatchedBy: { select: { id: true, firstName: true, lastName: true } },
  acknowledgedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

async function loadActiveDispatches() {
  return prisma.emergencyDispatch.findMany({
    where: {
      job: { status: { notIn: ["COMPLETED", "CANCELLED", "INVOICED"] } },
    },
    include: dispatchInclude,
    orderBy: { createdAt: "desc" },
    take: 12,
  });
}

async function maybeEscalate(dispatch: Awaited<ReturnType<typeof loadActiveDispatches>>[number], now = new Date()) {
  if (
    !dispatch.assignedTechnician ||
    !emergencyIsOverdue(dispatch, now) ||
    dispatch.escalatedAt ||
    !dispatch.backupTechnician?.phone
  ) {
    return dispatch;
  }
  const address = formatDispatchAddress(dispatch.job.property);
  const body = buildEmergencyBackupSms({
    techName: `${dispatch.assignedTechnician.firstName} ${dispatch.assignedTechnician.lastName}`,
    situation: dispatch.job.title,
    address,
  });
  const sms = await sendSms({ to: dispatch.backupTechnician.phone, body });
  return prisma.emergencyDispatch.update({
    where: { id: dispatch.id },
    data: {
      escalatedAt: now,
      backupSmsSentAt: sms.ok ? now : undefined,
    },
    include: dispatchInclude,
  });
}

export const GET = withAuth(async (session) => {
  if (isTechnician(session.role)) {
    const mine = await prisma.emergencyDispatch.findFirst({
      where: {
        assignedTechnicianId: session.id,
        acknowledgedAt: null,
        job: { status: { notIn: ["COMPLETED", "CANCELLED", "INVOICED"] } },
      },
      include: dispatchInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ active: mine });
  }

  const active = await loadActiveDispatches();
  const escalated = await Promise.all(active.map((dispatch) => maybeEscalate(dispatch)));
  return NextResponse.json({ dispatches: escalated });
});

export const POST = withAuth(async (session, request) => {
  if (isTechnician(session.role)) return jsonError("Office only.", 403);

  const body = (await request.json()) as {
    clientId?: string;
    propertyId?: string;
    situation?: string;
    message?: string;
    hazardTags?: string[];
    notifyCustomer?: boolean;
    quickClient?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      companyName?: string;
      address1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
  };

  const situation = body.situation?.trim() || body.message?.trim();
  if (!situation) return jsonError("Describe the emergency.");

  let clientId = body.clientId;
  let propertyId = body.propertyId;

  const quickAddress = body.quickClient?.address1?.trim();
  if (quickAddress) {
    const quick = body.quickClient!;
    const address1 = quickAddress;
    const coords = await resolvePropertyCoordinates({
      address1,
      city: quick.city ?? "",
      state: quick.state ?? "NC",
      postalCode: quick.postalCode ?? "",
    });
    const client = await prisma.client.create({
      data: {
        organizationId: session.organizationId,
        firstName: quick.firstName?.trim() || "Emergency",
        lastName: quick.lastName?.trim() || "Caller",
        companyName: quick.companyName?.trim() || null,
        phone: quick.phone?.trim() || null,
        properties: {
          create: {
            label: "Emergency site",
            address1,
            city: quick.city?.trim() || "",
            state: quick.state?.trim() || "NC",
            postalCode: quick.postalCode?.trim() || "",
            lat: coords?.lat,
            lng: coords?.lng,
          },
        },
      },
      include: { properties: true },
    });
    clientId = client.id;
    propertyId = client.properties[0]?.id;
  }

  if (!clientId || !propertyId) return jsonError("Pick a client and service address, or enter a quick address.");

  const [property, teamMembers] = await Promise.all([
    prisma.property.findFirst({ where: { id: propertyId, clientId } }),
    prisma.user.findMany({
      where: {
        organizationId: session.organizationId,
        status: "ACTIVE",
        role: { in: ["TECHNICIAN", "ADMIN"] },
      },
      select: { id: true, phone: true },
    }),
  ]);
  if (!property) return jsonError("Property not found.");

  const hazardTags = parseHazardTags(body.hazardTags);
  const internalMessage = body.message?.trim() || situation;
  const instructions = buildEmergencyInstructions({ message: internalMessage, hazardTags });
  const window = emergencyJobWindow();
  const count = await prisma.job.count();

  const job = await prisma.job.create({
    data: {
      number: nextNumber("JOB", count),
      clientId,
      propertyId,
      technicianId: null,
      createdById: session.id,
      type: "EMERGENCY",
      status: "EN_ROUTE",
      title: situation,
      instructions,
      scheduledStart: window.scheduledStart,
      scheduledEnd: window.scheduledEnd,
      durationMin: window.durationMin,
    },
    include: { client: true, property: true, technician: true },
  });

  const address = formatDispatchAddress(property);
  const teamSms = await notifyOpenEmergencyTeam({
    members: teamMembers,
    situation,
    address,
    jobId: job.id,
    lat: property.lat,
    lng: property.lng,
  });

  let customerSmsSentAt: Date | undefined;
  if (body.notifyCustomer) {
    const customerSms = await notifyEmergencyCustomer({
      phone: job.client.phone,
      clientFirstName: job.client.firstName,
      jobTitle: job.title,
    });
    if (customerSms.ok) customerSmsSentAt = new Date();
  }

  const dispatch = await prisma.emergencyDispatch.create({
    data: {
      jobId: job.id,
      dispatchedById: session.id,
      assignedTechnicianId: null,
      backupTechnicianId: null,
      message: internalMessage,
      hazardTags: hazardTags.length ? hazardTags : undefined,
      techSmsSentAt: teamSms.sent > 0 ? new Date() : null,
      customerSmsSentAt: customerSmsSentAt ?? null,
    },
    include: dispatchInclude,
  });

  queueJobGoogleCalendarSync(job.id);
  return NextResponse.json({ job, dispatch }, { status: 201 });
});
