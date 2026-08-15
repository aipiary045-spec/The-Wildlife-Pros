import { format } from "date-fns";
import { OptimizeButton } from "@/components/routes/OptimizeButton";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const routes = await prisma.routeDay.findMany({
    include: {
      technician: true,
      stops: {
        include: { job: { include: { client: true, property: true } } },
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { date: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Route optimization</h1>
        <p className="text-stone-600">
          Nearest-neighbor + 2-opt over property coordinates. Persist to rewrite today&apos;s visit order and ETAs.
        </p>
      </div>
      <OptimizeButton />
      <div className="grid gap-4 lg:grid-cols-2">
        {routes.length === 0 ? (
          <p className="text-sm text-stone-500">No saved routes yet. Run optimize after jobs have lat/lng.</p>
        ) : null}
        {routes.map((route) => (
          <article key={route.id} className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                {route.technician.firstName} {route.technician.lastName}
              </h2>
              <p className="text-sm text-stone-500">
                {format(route.date, "MMM d")} · {route.totalMiles} mi · {route.totalDriveMin} min drive
              </p>
            </div>
            <ol className="space-y-2">
              {route.stops.map((stop) => (
                <li key={stop.id} className="rounded-xl bg-background px-3 py-2 text-sm">
                  <span className="mr-2 font-display text-lg text-orange">{stop.sequence}</span>
                  {stop.job.title} · {stop.job.property.address1}
                  <p className="text-xs text-stone-500">
                    +{stop.milesFromPrev} mi · {stop.driveMinFromPrev} min
                    {stop.eta ? ` · ETA ${format(stop.eta, "h:mm a")}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  );
}
