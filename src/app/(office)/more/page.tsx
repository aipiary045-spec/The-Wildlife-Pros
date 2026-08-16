import { ClockCard } from "@/components/timesheets/ClockCard";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { getSession } from "@/lib/auth";
import { dateKey } from "@/lib/dates";
import { moreItems } from "@/lib/nav";
import { prisma } from "@/lib/prisma";
import { getMyTimesheet } from "@/lib/timesheets";
import { formatDuration, workedMinutes } from "@/lib/time";
import { format, startOfWeek } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const session = await getSession();
  if (!session) return null;
  const items = moreItems(session.role);
  const myTime = await getMyTimesheet(session.id);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const techs = await prisma.user.findMany({
    where: {
      organizationId: session.organizationId,
      status: "ACTIVE",
      role: { in: ["TECHNICIAN", "OWNER", "ADMIN", "DISPATCHER"] },
    },
    include: {
      availabilityBlocks: {
        where: { date: { gte: weekStart }, status: "APPROVED" },
        orderBy: { date: "asc" },
      },
      timesheets: {
        where: { date: { gte: weekStart } },
        include: { punches: true },
      },
    },
    orderBy: { firstName: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">More</h1>
        <p className="text-stone-600">Clock, crew cards, quotes, traps, and the rest of the office tools.</p>
      </div>
      <ClockCard initialCurrent={myTime.current} initialRecent={myTime.recent} />
      <section className="space-y-3">
        <h2 className="font-semibold">Crew</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {techs.map((tech) => {
            const weekMin = tech.timesheets.reduce((sum, sheet) => sum + workedMinutes(sheet.punches, sheet.breakMin), 0);
            const mine = tech.id === session.id;
            return (
              <article key={tech.id} className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: tech.color }}>
                      {tech.firstName.charAt(0)}
                      {tech.lastName.charAt(0)}
                    </span>
                    <div>
                      <p className="font-semibold">
                        {tech.firstName} {tech.lastName}
                        {mine ? " · you" : ""}
                      </p>
                      <p className="text-xs text-stone-500">{tech.role.toLowerCase()} · {formatDuration(weekMin)} this week</p>
                    </div>
                  </div>
                  <Link href="/team" className="text-xs font-semibold text-orange">
                    Open
                  </Link>
                </div>
                <div className="mt-3 text-sm text-stone-600">
                  {tech.availabilityBlocks.length === 0 ? (
                    <p>No approved days off this week.</p>
                  ) : (
                    <p>
                      Off{" "}
                      {tech.availabilityBlocks
                        .map((block) => format(new Date(`${dateKey(block.date)}T12:00:00`), "EEE"))
                        .join(", ")}
                    </p>
                  )}
                  <Link href="/timesheets" className="mt-1 inline-block text-xs font-semibold text-orange">
                    Request or approve days off
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="grid gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel px-4 text-base font-medium"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange/10 text-orange">
                <Icon size={18} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <LogoutButton />
      </div>
    </div>
  );
}
