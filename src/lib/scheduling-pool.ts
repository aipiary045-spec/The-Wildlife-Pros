import { endOfDay, startOfDay } from "date-fns";
import { isLateForCheckIn } from "@/lib/late-checkin";
import { needPriority } from "@/lib/schedule-needs";
import { visitPlanStats } from "@/lib/visit-plans";
import { prisma } from "@/lib/prisma";
import { clientName, propertyAddress } from "@/lib/utils";

export type PoolJobItem = {
  kind: "job";
  id: string;
  section: "late" | "unscheduled";
  number: string;
  title: string;
  type: string;
  status: string;
  instructions: string | null;
  durationMin: number;
  scheduledStart: string | null;
  technicianId: string | null;
  technicianName: string | null;
  clientName: string;
  address: string;
  city: string;
  visitPlanId: string | null;
  visitLabel: string | null;
  minutesLate?: number;
};

export type PoolNeedItem = {
  kind: "need";
  id: string;
  section: "return";
  title: string;
  notes: string | null;
  dueOn: string;
  returnInDays: number;
  priority: "overdue" | "due" | "upcoming";
  clientName: string;
  address: string;
  city: string;
  propertyId: string;
  preferredTechId: string | null;
  preferredTechName: string | null;
};

export type PoolPlanItem = {
  kind: "plan";
  id: string;
  section: "plan";
  title: string;
  clientName: string;
  address: string;
  city: string;
  propertyId: string;
  totalVisits: number;
  completed: number;
  scheduled: number;
  unscheduled: number;
  remaining: number;
  nextVisitNumber: number | null;
  canAddTrip: boolean;
  preferredTechName: string | null;
};

export type SchedulingPool = {
  counts: {
    late: number;
    unscheduled: number;
    returns: number;
    plans: number;
    total: number;
  };
  late: PoolJobItem[];
  unscheduled: PoolJobItem[];
  returns: PoolNeedItem[];
  plans: PoolPlanItem[];
};

const OPEN_JOB = ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS", "ON_HOLD"] as const;

export async function loadSchedulingPool(now = new Date()): Promise<SchedulingPool> {
  const todayStart = startOfDay(now);
  const lateCutoff = new Date(now.getTime() - 60 * 60 * 1000);

  const [openJobs, openNeeds, activePlans] = await Promise.all([
    prisma.job.findMany({
      where: { status: { in: [...OPEN_JOB] } },
      include: {
        client: true,
        property: true,
        technician: true,
        visitPlan: { select: { id: true, title: true, totalVisits: true, status: true } },
      },
      orderBy: [{ scheduledStart: "asc" }, { createdAt: "desc" }],
    }),
    prisma.scheduleNeed.findMany({
      where: { status: "OPEN" },
      include: {
        client: true,
        property: true,
        preferredTech: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueOn: "asc" },
    }),
    prisma.visitPlan.findMany({
      where: { status: "ACTIVE" },
      include: {
        client: true,
        property: true,
        preferredTech: { select: { firstName: true, lastName: true } },
        jobs: {
          select: { id: true, visitNumber: true, status: true, scheduledStart: true },
          orderBy: { visitNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const late: PoolJobItem[] = [];
  const unscheduled: PoolJobItem[] = [];

  for (const job of openJobs) {
    const base = toPoolJob(job);
    const needsDay = job.status === "UNSCHEDULED" || !job.scheduledStart;
    if (needsDay) {
      unscheduled.push({ ...base, section: "unscheduled" });
      continue;
    }
    if (job.scheduledStart && job.scheduledStart <= lateCutoff && isLateForCheckIn(job, now)) {
      const minutesLate = Math.max(0, Math.round((now.getTime() - job.scheduledStart.getTime()) / 60_000));
      late.push({ ...base, section: "late", minutesLate });
    }
  }

  const returns: PoolNeedItem[] = openNeeds.map((need) => ({
    kind: "need",
    id: need.id,
    section: "return",
    title: need.title,
    notes: need.notes,
    dueOn: need.dueOn.toISOString(),
    returnInDays: need.returnInDays,
    priority: needPriority(need.dueOn, now),
    clientName: clientName(need.client),
    address: need.property.address1,
    city: need.property.city,
    propertyId: need.propertyId,
    preferredTechId: need.preferredTechId,
    preferredTechName: need.preferredTech
      ? `${need.preferredTech.firstName} ${need.preferredTech.lastName}`
      : null,
  }));

  const plans: PoolPlanItem[] = activePlans.map((plan) => {
    const stats = visitPlanStats(plan, plan.jobs);
    return {
      kind: "plan",
      id: plan.id,
      section: "plan",
      title: plan.title,
      clientName: clientName(plan.client),
      address: plan.property.address1,
      city: plan.property.city,
      propertyId: plan.propertyId,
      totalVisits: stats.totalVisits,
      completed: stats.completed,
      scheduled: stats.scheduled,
      unscheduled: stats.unscheduled,
      remaining: stats.remaining,
      nextVisitNumber: stats.nextVisitNumber,
      canAddTrip: stats.canAddTrip,
      preferredTechName: plan.preferredTech
        ? `${plan.preferredTech.firstName} ${plan.preferredTech.lastName}`
        : null,
    };
  });

  return {
    counts: {
      late: late.length,
      unscheduled: unscheduled.length,
      returns: returns.length,
      plans: plans.length,
      total: late.length + unscheduled.length + returns.length,
    },
    late,
    unscheduled,
    returns,
    plans,
  };
}

function toPoolJob(
  job: Awaited<ReturnType<typeof prisma.job.findMany>>[number] & {
    client: { firstName: string; lastName: string; companyName: string | null };
    property: { address1: string; city: string; state: string; postalCode: string };
    technician: { firstName: string; lastName: string } | null;
    visitPlan: { id: string; title: string; totalVisits: number; status: string } | null;
  },
): PoolJobItem {
  const visitLabel =
    job.visitPlan && job.visitNumber
      ? `Trip ${job.visitNumber}/${job.visitPlan.totalVisits}`
      : null;

  return {
    kind: "job",
    id: job.id,
    section: "unscheduled",
    number: job.number,
    title: job.title,
    type: job.type,
    status: job.status,
    instructions: job.instructions,
    durationMin: job.durationMin,
    scheduledStart: job.scheduledStart?.toISOString() ?? null,
    technicianId: job.technicianId,
    technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : null,
    clientName: clientName(job.client),
    address: job.property.address1,
    city: job.property.city,
    visitPlanId: job.visitPlanId,
    visitLabel,
  };
}

export async function loadDayRoutableJobs(day: Date) {
  const from = startOfDay(day);
  const to = endOfDay(day);
  const jobs = await prisma.job.findMany({
    where: {
      scheduledStart: { gte: from, lte: to },
      status: { in: ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE"] },
    },
    include: { client: true, property: true, technician: true, visitPlan: true },
    orderBy: { scheduledStart: "asc" },
  });

  return jobs.map((job) => ({
    id: job.id,
    number: job.number,
    title: job.title,
    clientName: clientName(job.client),
    address: propertyAddress(job.property),
    technicianId: job.technicianId,
    technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : null,
    scheduledStart: job.scheduledStart?.toISOString() ?? null,
    visitLabel:
      job.visitPlan && job.visitNumber ? `Trip ${job.visitNumber}/${job.visitPlan.totalVisits}` : null,
  }));
}
