import { DayOffPanel } from "@/components/timesheets/DayOffPanel";
import { getSession } from "@/lib/auth";
import { dateKey } from "@/lib/dates";
import { canReviewDayOff } from "@/lib/day-off";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TimeOffPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const office = canReviewDayOff(session.role);
  const from = startOfDay(new Date());
  from.setDate(from.getDate() - 7);

  const requests = await prisma.availabilityBlock.findMany({
    where: office ? { date: { gte: from } } : { userId: session.id, date: { gte: from } },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { date: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Time off</h1>
        <p className="text-stone-600">
          {isTechnician(session.role)
            ? "Ask for a day off. Dispatch sees it here and blocks your schedule after they approve it."
            : "Approve a tech’s day off to block that day on the board."}
        </p>
      </div>
      <DayOffPanel
        userId={session.id}
        canReview={office}
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
