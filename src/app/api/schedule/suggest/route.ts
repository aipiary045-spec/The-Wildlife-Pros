import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { jsonError, withAuth } from "@/lib/api";
import { resolvePropertyCoordinates } from "@/lib/geocode";
import { canManageIntake } from "@/lib/intake";
import { prisma } from "@/lib/prisma";
import { offKey, suggestNearbySlots } from "@/lib/schedule-suggest";
import { propertyAddress } from "@/lib/utils";

export const GET = withAuth(async (session, request) => {
  if (!canManageIntake(session.role)) return jsonError("Office only.", 403);
  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId")?.trim();
  const excludeJobId = url.searchParams.get("excludeJobId")?.trim() || undefined;
  if (!propertyId) return jsonError("Pick a service address first.");

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) return jsonError("That address is gone.", 404);

  let lat = property.lat;
  let lng = property.lng;
  if (lat == null || lng == null) {
    const coords = await resolvePropertyCoordinates({
      address1: property.address1,
      city: property.city,
      state: property.state,
      postalCode: property.postalCode,
    });
    lat = coords.lat;
    lng = coords.lng;
    if (lat != null && lng != null) {
      await prisma.property.update({ where: { id: property.id }, data: { lat, lng } });
    }
  }
  if (lat == null || lng == null) {
    return NextResponse.json({ suggestions: [], missingPin: true });
  }

  const now = new Date();
  const from = startOfDay(now);
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

  const suggestions = suggestNearbySlots(
    { lat, lng },
    jobs.flatMap((job) => {
      if (!job.technicianId || job.property.lat == null || job.property.lng == null || !job.scheduledStart) {
        return [];
      }
      return [
        {
          jobId: job.id,
          technicianId: job.technicianId,
          technicianName: `${job.technician?.firstName ?? ""} ${job.technician?.lastName ?? ""}`.trim() || "Tech",
          scheduledStart: job.scheduledStart,
          durationMin: job.durationMin,
          lat: job.property.lat,
          lng: job.property.lng,
          title: job.title,
          address: job.property.address1,
        },
      ];
    }),
    {
      now,
      excludeJobId,
      offKeys: blocks.map((block) => offKey(block.userId, block.date)),
    },
  );

  return NextResponse.json({
    suggestions,
    missingPin: false,
    address: propertyAddress(property),
  });
});
