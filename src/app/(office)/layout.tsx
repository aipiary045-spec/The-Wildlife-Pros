import { redirect } from "next/navigation";
import { OfficeShell } from "@/components/layout/OfficeShell";
import { ViewModeToggle } from "@/components/layout/ViewModeToggle";
import { getAppContext } from "@/lib/app-context";
import { canSwitchViewMode } from "@/lib/view-mode";
import { getMyTimesheet } from "@/lib/timesheets";

export const dynamic = "force-dynamic";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const context = await getAppContext();
  if (!context) redirect("/login");
  const { session, fieldView, navRole, viewMode } = context;
  const myTime = fieldView ? await getMyTimesheet(session.id) : null;
  const showViewToggle = canSwitchViewMode(session.role);
  const viewToggle = showViewToggle ? (
    <div className="mx-3 mb-2 rounded-xl border border-white/10 bg-white/5 p-2">
      <ViewModeToggle mode={viewMode} compact />
    </div>
  ) : null;

  return (
    <OfficeShell
      role={navRole}
      name={`${session.firstName} ${session.lastName}`}
      fieldView={fieldView}
      sidebarFooter={viewToggle}
      myTime={myTime}
    >
      {children}
    </OfficeShell>
  );
}
