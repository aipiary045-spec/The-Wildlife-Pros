import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { HeaderContext } from "@/components/layout/HeaderContext";
import { InstallHint } from "@/components/layout/InstallHint";
import { OfflineStatus } from "@/components/layout/OfflineStatus";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { RecentTracker } from "@/components/layout/RecentTracker";
import { Sidebar } from "@/components/layout/Sidebar";
import { ViewModeToggle } from "@/components/layout/ViewModeToggle";
import { ClockControls } from "@/components/timesheets/ClockControls";
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
    <div className="flex min-h-dvh">
      <div className="sticky top-0 hidden h-dvh md:block">
        <Sidebar role={navRole} footer={viewToggle} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header
          className="app-header sticky top-0 z-20 flex items-center justify-between gap-3 overflow-visible px-4 py-3 md:px-6"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <HeaderContext role={navRole} name={`${session.firstName} ${session.lastName}`} />
          <div className="flex shrink-0 items-center gap-2">
            <GlobalSearch />
            <NotificationCenter showIntake={!fieldView} />
            {myTime ? (
              <ClockControls compact initialCurrent={myTime.current} initialRecent={myTime.recent} />
            ) : null}
          </div>
        </header>
        <OfflineStatus />
        <main className="min-w-0 flex-1 overflow-x-clip p-4 md:p-8">{children}</main>
      </div>
      <BottomNav role={navRole} />
      <RecentTracker role={navRole} />
      <InstallHint />
    </div>
  );
}
