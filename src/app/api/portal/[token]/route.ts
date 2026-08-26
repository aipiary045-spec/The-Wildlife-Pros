import { NextResponse } from "next/server";
import { loadTripVisitMapForJobs } from "@/lib/job-trips.server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const client = await prisma.client.findUnique({
    where: { portalToken: token },
    include: {
      properties: true,
      jobs: {
        where: { status: { in: ["SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"] } },
        include: { technician: true, property: true },
        orderBy: { scheduledStart: "asc" },
      },
    },
  });
  if (!client) return NextResponse.json({ error: "Portal not found" }, { status: 404 });

  const tripVisitByJobId = await loadTripVisitMapForJobs(client.jobs);

  return NextResponse.json({
    client: {
      firstName: client.firstName,
      lastName: client.lastName,
      companyName: client.companyName,
      properties: client.properties,
      jobs: client.jobs.map((job) => ({
        ...job,
        tripVisit: tripVisitByJobId.get(job.id) ?? null,
      })),
    },
  });
}
