import { endOfDay, startOfDay } from "date-fns";
import { invoiceAge } from "@/lib/invoice-aging";
import { OPEN_REQUEST_STATUSES } from "@/lib/intake";
import { isLateForCheckIn, minutesLate } from "@/lib/late-checkin";
import { prisma } from "@/lib/prisma";
import { clientName, propertyAddress } from "@/lib/utils";

export async function getTodayOverview(now = new Date()) {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const lateCutoff = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    todayJobs,
    lateRows,
    unscheduledCount,
    quotesWaiting,
    quotesApproved,
    openInvoices,
    newCalls,
    needsInvoice,
  ] = await Promise.all([
    prisma.job.findMany({
      where: {
        scheduledStart: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED"] },
      },
      include: { client: true, property: true, technician: true },
      orderBy: { scheduledStart: "asc" },
      take: 8,
    }),
    prisma.job.findMany({
      where: {
        scheduledStart: { lte: lateCutoff },
        status: { in: ["UNSCHEDULED", "SCHEDULED", "EN_ROUTE"] },
      },
      include: { client: true, property: true, technician: true },
      orderBy: { scheduledStart: "asc" },
      take: 6,
    }),
    prisma.job.count({ where: { status: "UNSCHEDULED" } }),
    prisma.quote.findMany({
      where: { status: { in: ["SENT", "VIEWED"] } },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.quote.count({
      where: { status: "APPROVED", jobs: { none: {} } },
    }),
    prisma.invoice.findMany({
      where: { status: { notIn: ["PAID", "VOID"] } },
      include: { client: true },
      orderBy: { dueOn: "asc" },
      take: 6,
    }),
    prisma.serviceRequest.count({ where: { status: { in: [...OPEN_REQUEST_STATUSES] } } }),
    prisma.job.count({ where: { status: "COMPLETED", invoices: { none: {} } } }),
  ]);

  const lateJobs = lateRows
    .filter((job) => isLateForCheckIn(job, now))
    .map((job) => ({
      id: job.id,
      number: job.number,
      title: job.title,
      clientName: clientName(job.client),
      address: propertyAddress(job.property),
      technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "Unassigned",
      minutesLate: minutesLate(job.scheduledStart ?? now, now),
    }));

  const pastDueInvoices = openInvoices.filter(
    (invoice) =>
      invoiceAge(
        { status: invoice.status, dueOn: invoice.dueOn, balance: Number(invoice.balance) },
        now,
      ) === "past_due",
  );

  return {
    todayJobs: todayJobs.map((job) => ({
      id: job.id,
      number: job.number,
      title: job.title,
      status: job.status,
      scheduledStart: job.scheduledStart,
      clientName: clientName(job.client),
      address: propertyAddress(job.property),
      technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "Unassigned",
    })),
    lateJobs,
    counts: {
      todayJobs: todayJobs.length,
      lateJobs: lateJobs.length,
      unscheduled: unscheduledCount,
      quotesWaiting: quotesWaiting.length,
      quotesApproved,
      pastDueInvoices: pastDueInvoices.length,
      openInvoices: openInvoices.length,
      newCalls,
      needsInvoice,
    },
    quotesWaiting: quotesWaiting.map((quote) => ({
      id: quote.id,
      number: quote.number,
      title: quote.title,
      clientName: clientName(quote.client),
    })),
    pastDueInvoices: pastDueInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      clientName: clientName(invoice.client),
      balance: Number(invoice.balance),
    })),
  };
}
