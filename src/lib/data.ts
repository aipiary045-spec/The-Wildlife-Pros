import { addDays, startOfDay, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";

function bucketCounts(rows: Array<{ createdAt: Date }>, days: Date[]) {
  return days.map((day) => {
    const key = startOfDay(day).getTime();
    return rows.filter((row) => startOfDay(row.createdAt).getTime() === key).length;
  });
}

export async function getReportsOverview() {
  const today = new Date();
  const from = startOfDay(today);
  const sparkStart = startOfDay(addDays(today, -6));
  const sparkDays = Array.from({ length: 7 }, (_, index) => addDays(sparkStart, index));

  const [
    requestGroups,
    jobGroups,
    recentRequests,
    recentJobs,
    recentCaptures,
    activeTraps,
    clockedIn,
    captureWeek,
  ] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: ["status"], _count: true }),
    prisma.job.groupBy({ by: ["status"], _count: true }),
    prisma.serviceRequest.findMany({
      where: { createdAt: { gte: sparkStart } },
      select: { createdAt: true },
    }),
    prisma.job.findMany({
      where: { createdAt: { gte: sparkStart } },
      select: { createdAt: true, status: true, completedAt: true },
    }),
    prisma.captureEvent.findMany({
      take: 5,
      orderBy: { capturedAt: "desc" },
      include: { species: true, job: { include: { property: true } } },
    }),
    prisma.equipmentDeployment.count({
      where: { status: { in: ["DEPLOYED", "ACTIVE_CAPTURE", "NEEDS_CHECK"] } },
    }),
    prisma.timesheet.count({
      where: { date: from, status: "CLOCKED_IN" },
    }),
    prisma.captureEvent.count({
      where: { capturedAt: { gte: startOfWeek(today, { weekStartsOn: 1 }) } },
    }),
  ]);

  const requestCount = Object.fromEntries(requestGroups.map((row) => [row.status, row._count]));
  const jobByStatus = Object.fromEntries(jobGroups.map((row) => [row.status, row._count]));

  const jobsActive = ["SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"].reduce(
    (acc, status) => acc + (jobByStatus[status] ?? 0),
    0,
  );
  const jobsCompleted = ["COMPLETED", "INVOICED"].reduce(
    (acc, status) => acc + (jobByStatus[status] ?? 0),
    0,
  );

  return {
    recentCaptures,
    activeTraps,
    clockedIn,
    captureWeek,
    requests: {
      new: requestCount.NEW ?? 0,
      assessed: requestCount.ASSESSED ?? 0,
      converted: (requestCount.CONVERTED_QUOTE ?? 0) + (requestCount.CONVERTED_JOB ?? 0),
      spark: bucketCounts(recentRequests, sparkDays),
    },
    jobs: {
      unscheduled: jobByStatus.UNSCHEDULED ?? 0,
      active: jobsActive,
      completed: jobsCompleted,
      spark: bucketCounts(recentJobs, sparkDays),
      finished: bucketCounts(
        recentJobs.filter((row) => row.completedAt || row.status === "COMPLETED" || row.status === "INVOICED"),
        sparkDays,
      ),
    },
  };
}

export async function getSchedule(from: Date, to: Date) {
  const [jobs, unscheduled, technicians, clients] = await Promise.all([
    prisma.job.findMany({
      where: {
        scheduledStart: { gte: from, lte: to },
        status: { not: "CANCELLED" },
      },
      include: { client: true, property: true, technician: true },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.job.findMany({
      where: { status: "UNSCHEDULED" },
      include: { client: true, property: true, technician: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "ADMIN"] } },
      orderBy: { firstName: "asc" },
    }),
    prisma.client.findMany({
      include: { properties: { select: { id: true, address1: true, city: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);
  return { jobs, unscheduled, technicians, clients };
}
