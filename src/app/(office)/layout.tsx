import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { HeaderContext } from "@/components/layout/HeaderContext";
import { InstallHint } from "@/components/layout/InstallHint";
import { OfflineStatus } from "@/components/layout/OfflineStatus";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { Sidebar } from "@/components/layout/Sidebar";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { getSession } from "@/lib/auth";
import { isTechnician } from "@/lib/paths";
import { getMyTimesheet } from "@/lib/timesheets";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const myTime = isTechnician(session.role) ? await getMyTimesheet(session.id) : null;

  return (
    <div className="flex min-h-dvh">
      <div className="sticky top-0 hidden h-dvh md:block">
        <Sidebar role={session.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 overflow-visible border-b border-line bg-panel/95 px-4 py-3 backdrop-blur md:px-6"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <HeaderContext role={session.role} name={`${session.firstName} ${session.lastName}`} />
          <div className="flex shrink-0 items-center gap-2">
            <NotificationCenter showIntake={!isTechnician(session.role)} />
            {myTime ? (
              <ClockControls compact initialCurrent={myTime.current} initialRecent={myTime.recent} />
            ) : null}
          </div>
        </header>
        <OfflineStatus />
        <main className="min-w-0 flex-1 overflow-x-clip p-3 md:p-6">{children}</main>
      </div>
      <BottomNav role={session.role} />
      <InstallHint />
    </div>
  );
}
