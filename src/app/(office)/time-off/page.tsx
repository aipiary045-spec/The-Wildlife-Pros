import { DayOffPanel } from "@/components/timesheets/DayOffPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAppContext } from "@/lib/app-context";
import { dateKey, monthGrid, monthKey, parseMonthParam } from "@/lib/dates";
import { canReviewDayOff } from "@/lib/day-off";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TimeOffPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const context = await getAppContext();
  if (!context) redirect("/login");
  const { session, fieldView } = context;
  const office = canReviewDayOff(session.role) && !fieldView;
  const params = await searchParams;
  const month = parseMonthParam(params.month);
  const { start, end } = monthGrid(month);

  const requests = await prisma.availabilityBlock.findMany({
    where: office
      ? { date: { gte: start, lte: end } }
      : { userId: session.id, date: { gte: start, lte: end } },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Time off"
        description={
          fieldView
            ? "See your days off on the month, then ask for another. The office blocks the schedule after they approve it."
            : "The month shows who is off. Approve a request to block that day on the schedule."
        }
        related={fieldView ? undefined : [{ href: "/timesheets", label: "Timesheets" }, { href: "/schedule", label: "Schedule" }]}
      />
      <DayOffPanel
        userId={session.id}
        canReview={office}
        month={monthKey(month)}
        requests={requests.map((item) => ({
          id: item.id,
          userId: item.userId,
          date: dateKey(item.date),
          reason: item.reason,
          status: item.status,
          userName: `${item.user.firstName} ${item.user.lastName}`,
        }))}
      />
    </div>
  );
}
