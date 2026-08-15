import { startOfMonth, startOfWeek } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const [weekPayments, monthPayments, openInvoices, completedWeek, captures, traps, timesheets] = await Promise.all([
    prisma.payment.aggregate({ where: { createdAt: { gte: weekStart } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({
      where: { status: { notIn: ["PAID", "VOID"] } },
      _sum: { balance: true },
      _count: true,
    }),
    prisma.job.count({
      where: { status: { in: ["COMPLETED", "INVOICED"] }, completedAt: { gte: weekStart } },
    }),
    prisma.captureEvent.groupBy({
      by: ["speciesId"],
      _sum: { quantity: true },
    }),
    prisma.equipmentDeployment.count({
      where: { status: { in: ["DEPLOYED", "ACTIVE_CAPTURE", "NEEDS_CHECK"] } },
    }),
    prisma.timesheet.findMany({
      where: { date: { gte: weekStart } },
      include: { user: true, punches: true },
    }),
  ]);

  const species = await prisma.species.findMany({
    where: { id: { in: captures.map((row) => row.speciesId) } },
  });
  const speciesName = Object.fromEntries(species.map((item) => [item.id, item.commonName]));

  const techMinutes = timesheets.reduce<Record<string, { name: string; minutes: number }>>((acc, sheet) => {
    const minutes = sheet.punches.reduce((sum, punch) => {
      const end = punch.clockOutAt ?? now;
      return sum + Math.max(0, (end.getTime() - punch.clockInAt.getTime()) / 60000);
    }, 0);
    const name = `${sheet.user.firstName} ${sheet.user.lastName}`;
    acc[sheet.userId] = { name, minutes: (acc[sheet.userId]?.minutes ?? 0) + minutes - sheet.breakMin };
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Reports</h1>
        <p className="text-stone-600">Money collected, work finished, and what came out of the traps this week.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected this week" value={formatMoney(weekPayments._sum.amount ?? 0)} />
        <Stat label="Collected this month" value={formatMoney(monthPayments._sum.amount ?? 0)} />
        <Stat
          label="Still on the books"
          value={formatMoney(openInvoices._sum.balance ?? 0)}
          hint={`${openInvoices._count} open invoice${openInvoices._count === 1 ? "" : "s"}`}
        />
        <Stat label="Jobs finished this week" value={String(completedWeek)} />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Captures</h2>
          {captures.length === 0 ? <p className="text-sm text-stone-500">No captures logged yet.</p> : null}
          {captures.map((row) => (
            <p key={row.speciesId} className="flex justify-between py-1 text-sm">
              <span>{speciesName[row.speciesId] ?? "Unknown"}</span>
              <span className="font-medium">{row._sum.quantity ?? 0}</span>
            </p>
          ))}
          <p className="mt-3 text-xs text-stone-500">{traps} trap{traps === 1 ? "" : "s"} still in the field.</p>
        </article>
        <article className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="mb-3 font-semibold">Tech hours this week</h2>
          {Object.keys(techMinutes).length === 0 ? (
            <p className="text-sm text-stone-500">No punches this week.</p>
          ) : null}
          {Object.values(techMinutes).map((row) => (
            <p key={row.name} className="flex justify-between py-1 text-sm">
              <span>{row.name}</span>
              <span className="font-medium">{(Math.max(0, row.minutes) / 60).toFixed(1)} hr</span>
            </p>
          ))}
        </article>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </article>
  );
}
