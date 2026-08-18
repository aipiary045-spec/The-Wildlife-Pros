import { endOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canReviewDayOff } from "@/lib/day-off";
import { invoiceAge } from "@/lib/invoice-aging";
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
    return NextResponse.json({ notifications: buildNotifications({ techView: true, lateJobs }), newCalls: 0 });
  }

  const todayEnd = endOfDay(now);
  const [followUps, timeOff, invoices, needsInvoice, quotesWaiting, needsADay, newCalls] = await Promise.all([
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
    prisma.invoice.findMany({
      where: { status: { notIn: ["PAID", "VOID"] } },
      select: { status: true, dueOn: true, balance: true },
    }),
    prisma.job.count({ where: { status: "COMPLETED", invoices: { none: {} } } }),
    prisma.quote.count({ where: { status: { in: ["SENT", "VIEWED"] } } }),
    prisma.job.count({ where: { status: "UNSCHEDULED" } }),
    prisma.serviceRequest.count({ where: { status: "NEW" } }),
  ]);

  const pastDueInvoices = invoices.filter((invoice) =>
    invoiceAge({ status: invoice.status, dueOn: invoice.dueOn, balance: Number(invoice.balance) }, now) === "past_due",
  ).length;

  return NextResponse.json({
    notifications: buildNotifications({
      techView: false,
      lateJobs,
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
      pastDueInvoices,
      needsInvoice,
      quotesWaiting,
      needsADay,
      newCalls,
    }),
    newCalls,
  });
};
