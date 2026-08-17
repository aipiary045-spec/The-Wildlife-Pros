import Link from "next/link";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NavigateLink } from "@/components/maps/NavigateLink";
import { RoutePlanner } from "@/components/routes/RoutePlanner";
import { dateKey, parseDateParam } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { dayWindow } from "@/lib/route-plan";
import { propertyAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = parseDateParam(params.date);
  const dateParam = dateKey(date);
  const { date: dayStart } = dayWindow(date);
  const prev = dateKey(addDays(date, -1));
  const next = dateKey(addDays(date, 1));

  const [technicians, routes] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "OWNER", "DISPATCHER"] } },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, homeLat: true, homeLng: true },
    }),
    prisma.routeDay.findMany({
      where: { date: dayStart },
      include: {
        technician: { select: { id: true, firstName: true, lastName: true } },
        stops: {
          include: { job: { include: { client: true, property: true } } },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Route optimization</h1>
        <p className="text-stone-600 sm:hidden">Preview a driving order, then apply it to the schedule.</p>
        <p className="hidden text-stone-600 sm:block">
          Preview a driving order, then apply it to the schedule. Techs navigate by street address in Google
          or Apple Maps (GPS is only the backup pin). Drive times are straight-line miles at 22 mph unless a
          Mapbox token is set, which snaps the previewed order to road time.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/routes?date=${prev}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel"
          aria-label="Previous day"
        >
          <ChevronLeft size={18} />
        </Link>
        <p className="min-w-0 flex-1 text-center text-sm font-semibold">{format(date, "EEEE, MMM d")}</p>
        <Link
          href={`/routes?date=${next}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel"
          aria-label="Next day"
        >
          <ChevronRight size={18} />
        </Link>
        {dateParam === dateKey(new Date()) ? (
          <p className="text-xs font-semibold text-orange">Today</p>
        ) : (
          <Link href={`/routes?date=${dateKey(new Date())}`} className="text-sm font-semibold text-orange hover:underline">
            Jump to today
          </Link>
        )}
      </div>

      <RoutePlanner date={dateParam} technicians={technicians} />

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Last applied this day</h2>
          <Link href={`/schedule?view=day&date=${dateParam}`} className="text-sm font-medium text-orange">
            Open day board
          </Link>
        </div>
        {routes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-panel px-4 py-6 text-center text-sm text-stone-500">
            Nothing saved for this date yet. Preview, then apply.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {routes.map((route) => (
              <article key={route.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {route.technician.firstName} {route.technician.lastName}
                    </h3>
                    <NavigateLink
                      className="mt-2"
                      label="Navigate this route"
                      stops={route.stops.map((stop) => ({
                        address: propertyAddress(stop.job.property),
                        lat: stop.job.property.lat,
                        lng: stop.job.property.lng,
                      }))}
                    />
                  </div>
                  <p className="text-right text-sm text-stone-500">
                    {route.totalMiles} mi · {route.totalDriveMin} min drive
                    {route.returnMiles ? (
                      <>
                        <br />
                        +{route.returnMiles} mi back to shop
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="mb-3 text-xs uppercase tracking-wider text-stone-500">
                  {route.mode === "rebalance" ? "Rebalanced" : "Kept techs"} · first stop from{" "}
                  {format(new Date(2026, 0, 1, route.startHour), "h:mm a")}
                </p>
                <ol className="space-y-2">
                  {route.stops.map((stop) => (
                    <li key={stop.id} className="rounded-xl bg-background px-3 py-2 text-sm">
                      <span className="mr-2 font-display text-lg text-orange">{stop.sequence}</span>
                      <Link href={`/jobs/${stop.jobId}`}>{stop.job.title}</Link>
                      <p className="text-xs text-stone-500">
                        {stop.job.property.address1} · +{stop.milesFromPrev} mi · {stop.driveMinFromPrev} min
                        {stop.eta ? ` · ETA ${format(stop.eta, "h:mm a")}` : ""}
                      </p>
                      <NavigateLink
                        className="mt-2"
                        destination={{
                          address: propertyAddress(stop.job.property),
                          lat: stop.job.property.lat,
                          lng: stop.job.property.lng,
                        }}
                      />
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
