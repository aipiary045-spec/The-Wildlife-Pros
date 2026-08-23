import { endOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canReviewDayOff } from "@/lib/day-off";
import { emergencyIsOverdue, formatDispatchAddress } from "@/lib/emergency";
import { isLateForCheckIn, minutesLate, type LateCheckInJob } from "@/lib/late-checkin";
import { buildNotifications } from "@/lib/notifications";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { clientName, propertyAddress } from "@/lib/utils";

export const GET = async () => {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);

  const now = new Date();
  const techView = isTechnician(session.role);

  const emergencyRows = await prisma.emergencyDispatch.findMany({
    where: {
      job: { status: { notIn: ["COMPLETED", "CANCELLED", "INVOICED"] } },
    },
    include: {
      job: { include: { property: true, technician: true } },
    },
    orderBy: { createdAt: "desc" },
    take: techView ? 6 : 8,
  });

  const emergencyDispatches = emergencyRows.map((dispatch) => ({
    jobId: dispatch.jobId,
    title: dispatch.job.title,
    address: formatDispatchAddress(dispatch.job.property),
    techName: dispatch.job.technician
      ? `${dispatch.job.technician.firstName} ${dispatch.job.technician.lastName}`
      : "Unassigned",
    acknowledged: Boolean(dispatch.acknowledgedAt),
    overdue: emergencyIsOverdue(dispatch, now),
    assignedToMe: dispatch.assignedTechnicianId === session.id,
    unassigned: !dispatch.assignedTechnicianId && !dispatch.job.technicianId,
  }));

  const cutoff = new Date(now.getTime() - 60 * 60 * 1000);

  const lateRows = await prisma.job.findMany({
    where: {
      scheduledStart: { lte: cutoff },
      status: { in: ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE"] },
      ...(techView ? { technicianId: session.id } : {}),
    },
    include: { client: true, property: true, technician: true },
    orderBy: { scheduledStart: "asc" },
  });

  const lateJobs: LateCheckInJob[] = lateRows.filter((job) => isLateForCheckIn(job, now)).map((job) => ({
    id: job.id,
    number: job.number,
    title: job.title,
    status: job.status,
    scheduledStart: (job.scheduledStart ?? now).toISOString(),
    minutesLate: minutesLate(job.scheduledStart ?? now, now),
    clientName: clientName(job.client),
    address: propertyAddress(job.property),
    technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : null,
  }));

  if (techView) {
    return NextResponse.json({
      notifications: buildNotifications({ techView: true, lateJobs, emergencyDispatches }),
    });
  }

  const todayEnd = endOfDay(now);
  const [followUps, timeOff, needsADay] = await Promise.all([
    prisma.scheduleNeed.findMany({
      where: { status: "OPEN", dueOn: { lte: todayEnd } },
      include: { client: true, property: true },
      orderBy: { dueOn: "asc" },
    }),
    canReviewDayOff(session.role)
      ? prisma.availabilityBlock.findMany({
          where: { status: "REQUESTED" },
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { date: "asc" },
        })
      : Promise.resolve([]),
    prisma.job.count({ where: { status: "UNSCHEDULED" } }),
  ]);

  return NextResponse.json({
    notifications: buildNotifications({
      techView: false,
      lateJobs,
      emergencyDispatches,
      followUps: followUps.map((need) => ({
        id: need.id,
        title: need.title,
        dueOn: need.dueOn,
        clientName: clientName(need.client),
        address: propertyAddress(need.property),
      })),
      timeOff: timeOff.map((block) => ({
        id: block.id,
        date: block.date,
        name: `${block.user.firstName} ${block.user.lastName}`,
        reason: block.reason,
      })),
      needsADay,
    }),
  });
};
