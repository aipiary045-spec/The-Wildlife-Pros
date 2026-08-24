import Link from "next/link";
import { SchedulingPoolBoard } from "@/components/schedule/SchedulingPoolBoard";
import { VisitPlanForm } from "@/components/schedule/VisitPlanForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { loadSchedulingPool } from "@/lib/scheduling-pool";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SchedulingPoolPage() {
  const [pool, technicians, clients] = await Promise.all([
    loadSchedulingPool(),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "ADMIN"] } },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, color: true },
    }),
    prisma.client.findMany({
      include: { properties: { select: { id: true, address1: true, city: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scheduling pool"
        description="Everything that still needs a day on the calendar. Pick stops here, place them on the schedule, then optimize driving order on Routes."
        related={[
          { href: "/schedule", label: "Calendar" },
          { href: "/routes", label: "Route optimizer" },
        ]}
      />
      <VisitPlanForm
        clients={clients}
        technicians={technicians}
      />
      <SchedulingPoolBoard pool={pool} technicians={technicians} />
      {pool.counts.total === 0 ? (
        <p className="text-center text-sm text-stone-500">
          Need a multi-visit package? Create a visit plan above, or{" "}
          <Link href="/jobs" className="font-semibold text-orange hover:underline">
            add a work order
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
