import Link from "next/link";
import { redirect } from "next/navigation";
import { FieldJobList } from "@/components/field/FieldJobList";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { getSession } from "@/lib/auth";
import { parseDateParam, parseScheduleView, scheduleRange } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getMyTimesheet } from "@/lib/timesheets";

export const dynamic = "force-dynamic";

export default async function FieldPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const view = parseScheduleView(params.view);
  const date = parseDateParam(params.date);
  const { from, to, days } = scheduleRange(view, date);
  const myTime = await getMyTimesheet(session.id);
  const jobs = await prisma.job.findMany({
    where: {
      technicianId: session.role === "TECHNICIAN" ? session.id : undefined,
      status: { notIn: ["CANCELLED"] },
      scheduledStart: { gte: from, lte: to },
    },
    include: { client: true, property: true, technician: true, deployments: { include: { equipment: true } } },
    orderBy: { scheduledStart: "asc" },
  });

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-10">
      <header className="sunset-panel px-5 pb-8 pt-10 text-ink">
        <p className="text-xs font-bold uppercase tracking-[0.25em]">The Wildlife Pros</p>
        <h1 className="mt-2 font-display text-3xl">Field app</h1>
        <p>
          {session.firstName}, {jobs.length} stop{jobs.length === 1 ? "" : "s"}{" "}
          {view === "week" ? "this week" : "today"}.
        </p>
      </header>
      <div className="-mt-4 space-y-3 px-4">
        <ClockControls initialCurrent={myTime.current} initialRecent={myTime.recent} />
        <ScheduleToolbar view={view} date={date} basePath="/field" />
        <FieldJobList jobs={jobs} days={days} showTech={session.role !== "TECHNICIAN"} />
        <Link href="/dashboard" className="block pt-4 text-center text-sm font-medium text-orange">
          Back to office
        </Link>
      </div>
    </div>
  );
}
