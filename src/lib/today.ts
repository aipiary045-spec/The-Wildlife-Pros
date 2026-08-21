import { endOfDay, startOfDay } from "date-fns";
import { getActiveCheckIns } from "@/lib/active-checkins.server";
import { invoiceAge } from "@/lib/invoice-aging";
import { OPEN_REQUEST_STATUSES } from "@/lib/intake";
import { isLateForCheckIn, minutesLate } from "@/lib/late-checkin";
import { prisma } from "@/lib/prisma";
import { STALE_TRAP_DAYS } from "@/lib/trap-qr";
import { clientName, propertyAddress } from "@/lib/utils";

export async function getTodayOverview(now = new Date()) {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const lateCutoff = new Date(now.getTime() - 60 * 60 * 1000);
  const staleCutoff = new Date(now.getTime() - STALE_TRAP_DAYS * 24 * 60 * 60 * 1000);

  const [
    todayJobs,
    lateRows,
    activeCheckIns,
    unscheduledCount,
    quotesWaiting,
    quotesApprovedRows,
    quotesApproved,
    needsInvoiceRows,
    openInvoices,
    newCalls,
    needsInvoice,
    staleTraps,
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
    getActiveCheckIns(now),
    prisma.job.count({ where: { status: "UNSCHEDULED" } }),
    prisma.quote.findMany({
      where: { status: { in: ["SENT", "VIEWED"] } },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.quote.findMany({
      where: { status: "APPROVED", jobs: { none: {} } },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.quote.count({
      where: { status: "APPROVED", jobs: { none: {} } },
    }),
    prisma.job.findMany({
      where: { status: "COMPLETED", invoices: { none: {} } },
      include: { client: true, property: true },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { status: { notIn: ["PAID", "VOID"] } },
      include: { client: true },
      orderBy: { dueOn: "asc" },
      take: 6,
    }),
    prisma.serviceRequest.count({ where: { status: { in: [...OPEN_REQUEST_STATUSES] } } }),
    prisma.job.count({ where: { status: "COMPLETED", invoices: { none: {} } } }),
    prisma.equipmentDeployment.findMany({
      where: { retrievedAt: null, deployedAt: { lte: staleCutoff } },
      include: {
        equipment: true,
        job: { include: { client: true } },
      },
      orderBy: { deployedAt: "asc" },
      take: 5,
    }),
  ]);

  const lateJobs = lateRows
    .filter((job) => isLateForCheckIn(job, now))
    .map((job) => ({
      id: job.id,
      number: job.number,
      title: job.title,
      clientName: clientName(job.client),
      clientPhone: job.client.phone,
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
      clientPhone: job.client.phone,
      address: propertyAddress(job.property),
      technicianName: job.technician ? `${job.technician.firstName} ${job.technician.lastName}` : "Unassigned",
    })),
    lateJobs,
    staleTraps: staleTraps.map((deployment) => ({
      id: deployment.id,
      jobId: deployment.jobId,
      serial: deployment.equipment.serialNumber,
      locationNote: deployment.locationNote,
      clientName: clientName(deployment.job.client),
      deployedAt: deployment.deployedAt,
    })),
    counts: {
      todayJobs: todayJobs.length,
      lateJobs: lateJobs.length,
      staleTraps: staleTraps.length,
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
      clientPhone: quote.client.phone,
    })),
    quotesApproved: quotesApprovedRows.map((quote) => ({
      id: quote.id,
      number: quote.number,
      title: quote.title,
      clientName: clientName(quote.client),
      clientPhone: quote.client.phone,
    })),
    needsInvoiceJobs: needsInvoiceRows.map((job) => ({
      id: job.id,
      number: job.number,
      title: job.title,
      clientName: clientName(job.client),
      clientPhone: job.client.phone,
      address: propertyAddress(job.property),
      completedAt: job.completedAt,
    })),
    pastDueInvoices: pastDueInvoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      clientName: clientName(invoice.client),
      clientPhone: invoice.client.phone,
      balance: Number(invoice.balance),
    })),
    activeCheckIns,
  };
}
