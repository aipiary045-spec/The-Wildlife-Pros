import { startOfDay, endOfDay, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function getDashboardData() {
  const today = new Date();
  const [jobsToday, openQuotes, overdueInvoices, activeTraps, recentCaptures, technicians] =
    await Promise.all([
      prisma.job.findMany({
        where: {
          scheduledStart: { gte: startOfDay(today), lte: endOfDay(today) },
          status: { notIn: ["CANCELLED"] },
        },
        include: { client: true, property: true, technician: true },
        orderBy: { scheduledStart: "asc" },
      }),
      prisma.quote.count({ where: { status: { in: ["SENT", "VIEWED"] } } }),
      prisma.invoice.count({ where: { status: { in: ["SENT", "OVERDUE", "PARTIAL"] } } }),
      prisma.equipmentDeployment.count({
        where: { status: { in: ["DEPLOYED", "ACTIVE_CAPTURE", "NEEDS_CHECK"] } },
      }),
      prisma.captureEvent.findMany({
        take: 5,
        orderBy: { capturedAt: "desc" },
        include: { species: true, job: { include: { property: true } } },
      }),
      prisma.user.findMany({
        where: { role: { in: ["TECHNICIAN", "OWNER", "DISPATCHER"] }, status: "ACTIVE" },
      }),
    ]);

  const weekJobs = await prisma.job.count({
    where: {
      scheduledStart: { gte: startOfDay(today), lte: endOfDay(addDays(today, 7)) },
    },
  });

  return { jobsToday, openQuotes, overdueInvoices, activeTraps, recentCaptures, technicians, weekJobs };
}

export async function getSchedule(from: Date, to: Date) {
  const [jobs, technicians] = await Promise.all([
    prisma.job.findMany({
      where: {
        scheduledStart: { gte: from, lte: to },
      },
      include: { client: true, property: true, technician: true },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "OWNER", "DISPATCHER"] } },
      orderBy: { firstName: "asc" },
    }),
  ]);
  return { jobs, technicians };
}
