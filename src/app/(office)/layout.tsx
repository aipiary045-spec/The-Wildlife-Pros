import { redirect } from "next/navigation";
import { OfficeShell } from "@/components/layout/OfficeShell";
import { ViewModeToggle } from "@/components/layout/ViewModeToggle";
import { getAppContext } from "@/lib/app-context";
import { isTechnician } from "@/lib/paths";
import { canSwitchViewMode } from "@/lib/view-mode";
import { getMyOpenCheckIn } from "@/lib/active-checkins.server";
import { getMyTimesheet } from "@/lib/timesheets";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const context = await getAppContext();
  if (!context) redirect("/login");
  const { session, fieldView, navRole, viewMode } = context;
  const myTime = fieldView
    ? await Promise.all([getMyTimesheet(session.id), getMyOpenCheckIn(session.id)]).then(([time, open]) => ({
        ...time,
        openJob: open
          ? { id: open.jobId, number: open.jobNumber, title: open.jobTitle }
          : null,
      }))
    : null;
  const showViewToggle = canSwitchViewMode(session.role);
  const viewToggle = showViewToggle ? (
    <div className="mx-3 mb-2 rounded-xl border border-white/10 bg-white/5 p-2">
      <ViewModeToggle mode={viewMode} compact />
    </div>
  ) : null;

  const emergency =
    !fieldView && !isTechnician(session.role)
      ? await Promise.all([
          prisma.user.findMany({
            where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "ADMIN"] } },
            orderBy: { firstName: "asc" },
            select: { id: true, firstName: true, lastName: true },
          }),
          prisma.client.findMany({
            include: { properties: { select: { id: true, address1: true, city: true } } },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          }),
        ]).then(([technicians, clients]) => ({ technicians, clients }))
      : null;

  return (
    <OfficeShell
      role={navRole}
      name={`${session.firstName} ${session.lastName}`}
      fieldView={fieldView}
      sidebarFooter={viewToggle}
      myTime={myTime}
      emergency={emergency}
    >
      {children}
    </OfficeShell>
  );
}
