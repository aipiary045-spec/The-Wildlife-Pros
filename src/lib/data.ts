import { addDays, endOfDay, startOfDay, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";

function n(value: unknown) {
  return Number(value ?? 0);
}

function bucketCounts(rows: Array<{ createdAt: Date }>, days: Date[]) {
  return days.map((day) => {
    const key = startOfDay(day).getTime();
    return rows.filter((row) => startOfDay(row.createdAt).getTime() === key).length;
  });
}

export async function getDashboardData() {
  const today = new Date();
  const from = startOfDay(today);
  const to = endOfDay(today);
  const sparkStart = startOfDay(addDays(today, -6));
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const sparkDays = Array.from({ length: 7 }, (_, index) => addDays(sparkStart, index));

  const [
    jobsToday,
    technicians,
    requestGroups,
    quoteGroups,
    jobGroups,
    invoiceGroups,
    completedNoInvoice,
    recentRequests,
    recentQuotes,
    recentJobs,
    recentInvoices,
    paymentsWeek,
    openBalance,
    recentCaptures,
    activeTraps,
    clockedIn,
    unscheduled,
    clients,
  ] = await Promise.all([
    prisma.job.findMany({
      where: {
        scheduledStart: { gte: from, lte: to },
        status: { notIn: ["CANCELLED"] },
      },
      include: { client: true, property: true, technician: true },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "OWNER", "ADMIN", "DISPATCHER"] } },
      orderBy: { firstName: "asc" },
    }),
    prisma.serviceRequest.groupBy({ by: ["status"], _count: true }),
    prisma.quote.groupBy({ by: ["status"], _count: true, _sum: { total: true } }),
    prisma.job.groupBy({ by: ["status"], _count: true, _sum: { total: true } }),
    prisma.invoice.groupBy({ by: ["status"], _count: true, _sum: { total: true, balance: true } }),
    prisma.job.aggregate({
      where: { status: "COMPLETED", invoices: { none: {} } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.serviceRequest.findMany({
      where: { createdAt: { gte: sparkStart } },
      select: { createdAt: true },
    }),
    prisma.quote.findMany({
      where: { createdAt: { gte: sparkStart } },
      select: { createdAt: true, status: true },
    }),
    prisma.job.findMany({
      where: { createdAt: { gte: sparkStart } },
      select: { createdAt: true, status: true, completedAt: true },
    }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: sparkStart } },
      select: { createdAt: true, status: true },
    }),
    prisma.payment.aggregate({
      where: { createdAt: { gte: weekStart } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { notIn: ["PAID", "VOID"] } },
      _sum: { balance: true },
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
    prisma.job.findMany({
      where: { status: "UNSCHEDULED" },
      include: { client: true, property: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.client.findMany({
      include: { properties: { select: { id: true, address1: true, city: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const requestCount = Object.fromEntries(requestGroups.map((row) => [row.status, row._count]));
  const quoteByStatus = Object.fromEntries(
    quoteGroups.map((row) => [row.status, { count: row._count, total: n(row._sum.total) }]),
  );
  const jobByStatus = Object.fromEntries(
    jobGroups.map((row) => [row.status, { count: row._count, total: n(row._sum.total) }]),
  );
  const invoiceByStatus = Object.fromEntries(
    invoiceGroups.map((row) => [
      row.status,
      { count: row._count, total: n(row._sum.total), balance: n(row._sum.balance) },
    ]),
  );

  const quoteAwaiting = ["SENT", "VIEWED"].reduce(
    (acc, status) => ({
      count: acc.count + (quoteByStatus[status]?.count ?? 0),
      total: acc.total + (quoteByStatus[status]?.total ?? 0),
    }),
    { count: 0, total: 0 },
  );
  const jobsActive = ["SCHEDULED", "EN_ROUTE", "ON_SITE", "IN_PROGRESS"].reduce(
    (acc, status) => ({
      count: acc.count + (jobByStatus[status]?.count ?? 0),
      total: acc.total + (jobByStatus[status]?.total ?? 0),
    }),
    { count: 0, total: 0 },
  );
  const invoicesAwaiting = ["SENT", "VIEWED", "PARTIAL"].reduce(
    (acc, status) => ({
      count: acc.count + (invoiceByStatus[status]?.count ?? 0),
      balance: acc.balance + (invoiceByStatus[status]?.balance ?? 0),
    }),
    { count: 0, balance: 0 },
  );

  const todayMoney = jobsToday.reduce((sum, job) => sum + n(job.total), 0);
  const completedToday = jobsToday.filter((job) => job.status === "COMPLETED" || job.status === "INVOICED");
  const activeToday = jobsToday.filter((job) =>
    ["EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(job.status),
  );
  const stillToGo = jobsToday.filter((job) => !["COMPLETED", "INVOICED", "CANCELLED"].includes(job.status));

  return {
    jobsToday,
    technicians,
    clients,
    unscheduled,
    recentCaptures,
    activeTraps,
    clockedIn,
    today: {
      total: jobsToday.length,
      totalMoney: todayMoney,
      toGo: stillToGo.length,
      toGoMoney: stillToGo.reduce((sum, job) => sum + n(job.total), 0),
      active: activeToday.length,
      activeMoney: activeToday.reduce((sum, job) => sum + n(job.total), 0),
      completed: completedToday.length,
      completedMoney: completedToday.reduce((sum, job) => sum + n(job.total), 0),
    },
    requests: {
      new: requestCount.NEW ?? 0,
      assessed: requestCount.ASSESSED ?? 0,
      converted: (requestCount.CONVERTED_QUOTE ?? 0) + (requestCount.CONVERTED_JOB ?? 0),
      spark: bucketCounts(recentRequests, sparkDays),
    },
    quotes: {
      approved: quoteByStatus.APPROVED ?? { count: 0, total: 0 },
      awaiting: quoteAwaiting,
      draft: quoteByStatus.DRAFT ?? { count: 0, total: 0 },
      spark: bucketCounts(recentQuotes, sparkDays),
      converted: bucketCounts(
        recentQuotes.filter((row) => row.status === "CONVERTED" || row.status === "APPROVED"),
        sparkDays,
      ),
    },
    jobs: {
      needsInvoice: { count: completedNoInvoice._count, total: n(completedNoInvoice._sum.total) },
      unscheduled: jobByStatus.UNSCHEDULED ?? { count: 0, total: 0 },
      active: jobsActive,
      spark: bucketCounts(recentJobs, sparkDays),
      completed: bucketCounts(
        recentJobs.filter((row) => row.completedAt || row.status === "COMPLETED" || row.status === "INVOICED"),
        sparkDays,
      ),
    },
    invoices: {
      overdue: invoiceByStatus.OVERDUE ?? { count: 0, total: 0, balance: 0 },
      awaiting: invoicesAwaiting,
      draft: invoiceByStatus.DRAFT ?? { count: 0, total: 0, balance: 0 },
      spark: bucketCounts(recentInvoices, sparkDays),
      paid: bucketCounts(
        recentInvoices.filter((row) => row.status === "PAID"),
        sparkDays,
      ),
    },
    payments: {
      collectedWeek: n(paymentsWeek._sum.amount),
      openBalance: n(openBalance._sum.balance),
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
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "OWNER", "ADMIN", "DISPATCHER"] } },
      orderBy: { firstName: "asc" },
    }),
    prisma.client.findMany({
      include: { properties: { select: { id: true, address1: true, city: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);
  return { jobs, unscheduled, technicians, clients };
}
