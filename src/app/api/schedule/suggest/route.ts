import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { dateKey } from "@/lib/dates";
import { resolvePropertyCoordinates } from "@/lib/geocode";
import { canManageIntake } from "@/lib/intake";
import { prisma } from "@/lib/prisma";
import { offKey, suggestNearbySlots } from "@/lib/schedule-suggest";
import { startOfZonedDay } from "@/lib/timezone";
import { propertyAddress } from "@/lib/utils";

function coord(value: number | null | undefined) {
  return value == null ? null : Number(value);
}

export const GET = withAuth(async (session, request) => {
  if (!canManageIntake(session.role)) return jsonError("Office only.", 403);
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId")?.trim();
  const excludeJobId = url.searchParams.get("excludeJobId")?.trim() || undefined;
  if (!propertyId) return jsonError("Pick a service address first.");

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return jsonError("That address is gone.", 404);

  let lat = coord(property.lat);
  let lng = coord(property.lng);
  if (lat == null || lng == null) {
    const coords = await resolvePropertyCoordinates({
      address1: property.address1,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
    });
    lat = coord(coords.lat);
    lng = coord(coords.lng);
    if (lat != null && lng != null) {
      await prisma.property.update({ where: { id: property.id }, data: { lat, lng } });
    }
  }
  if (lat == null || lng == null) {
    return NextResponse.json({ suggestions: [], missingPin: true, upcomingStops: 0 });
  }

  const now = new Date();
  const from = startOfZonedDay(now);
  const [jobs, blocks] = await Promise.all([
    prisma.job.findMany({
      where: {
        scheduledStart: { gte: from },
        status: { notIn: ["CANCELLED", "COMPLETED", "INVOICED"] },
        technicianId: { not: null },
      },
      include: {
        property: true,
        technician: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.availabilityBlock.findMany({
      where: { date: { gte: from }, status: "APPROVED" },
      select: { userId: true, date: true },
    }),
  ]);

  const missing = new Map<string, (typeof jobs)[number]["property"]>();
  for (const job of jobs) {
    if (coord(job.property.lat) == null || coord(job.property.lng) == null) {
      missing.set(job.property.id, job.property);
    }
  }
  let geocoded = 0;
  for (const pin of missing.values()) {
    if (geocoded >= 8) break;
    const coords = await resolvePropertyCoordinates({
      address1: pin.address1,
      city: pin.city,
      state: pin.state,
      postalCode: pin.postalCode,
    });
    const nextLat = coord(coords.lat);
    const nextLng = coord(coords.lng);
    if (nextLat == null || nextLng == null) continue;
    await prisma.property.update({ where: { id: pin.id }, data: { lat: nextLat, lng: nextLng } });
    pin.lat = nextLat;
    pin.lng = nextLng;
    geocoded += 1;
  }

  const suggestions = suggestNearbySlots(
    { lat, lng },
    jobs.flatMap((job) => {
      const stopLat = coord(job.property.lat);
      const stopLng = coord(job.property.lng);
      if (!job.technicianId || stopLat == null || stopLng == null || !job.scheduledStart) {
        return [];
      }
      return [
        {
          jobId: job.id,
          technicianId: job.technicianId,
          technicianName: `${job.technician?.firstName ?? ""} ${job.technician?.lastName ?? ""}`.trim() || "Tech",
          scheduledStart: job.scheduledStart,
          durationMin: job.durationMin,
          lat: stopLat,
          lng: stopLng,
          title: job.title,
          address: job.property.address1,
        },
      ];
    }),
    {
      now,
      excludeJobId,
      offKeys: blocks.map((block) => offKey(block.userId, dateKey(block.date))),
    },
  );

  return NextResponse.json({
    suggestions,
    missingPin: false,
    upcomingStops: jobs.length,
    address: propertyAddress(property),
  });
});
