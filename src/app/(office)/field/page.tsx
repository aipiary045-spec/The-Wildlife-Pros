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
    <div className="mx-auto max-w-lg space-y-4">
      <div className="sunset-panel rounded-2xl px-5 py-6 text-ink">
        <p className="text-xs font-bold uppercase tracking-[0.25em]">Field route</p>
        <h1 className="mt-1 font-display text-3xl">
          {jobs.length} stop{jobs.length === 1 ? "" : "s"} {view === "week" ? "this week" : "today"}
        </h1>
        <p>{session.firstName}, run them in order and clock the day.</p>
      </div>
      <ClockControls initialCurrent={myTime.current} initialRecent={myTime.recent} />
      <ScheduleToolbar view={view} date={date} basePath="/field" />
      <FieldJobList jobs={jobs} days={days} showTech={session.role !== "TECHNICIAN"} />
    </div>
  );
}
