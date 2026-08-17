import { DayOffPanel } from "@/components/timesheets/DayOffPanel";
import { getSession } from "@/lib/auth";
import { dateKey, monthGrid, monthKey, parseMonthParam } from "@/lib/dates";
import { canReviewDayOff } from "@/lib/day-off";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TimeOffPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const office = canReviewDayOff(session.role);
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
      <div>
        <h1 className="font-display text-3xl tracking-wide">Time off</h1>
        <p className="text-stone-600">
          {isTechnician(session.role)
            ? "See your days off on the month, then ask for another. Dispatch blocks the board after they approve it."
            : "The month shows who is off. Approve a request to block that day on the board."}
        </p>
      </div>
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
