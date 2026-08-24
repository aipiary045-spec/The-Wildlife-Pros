"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { HeaderContext } from "@/components/layout/HeaderContext";
import { InstallHint } from "@/components/layout/InstallHint";
import { OfflineStatus } from "@/components/layout/OfflineStatus";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { EmergencyDispatchButton } from "@/components/emergency/EmergencyDispatchButton";
import { EmergencyStatusStrip } from "@/components/emergency/EmergencyStatusStrip";
import { Sidebar } from "@/components/layout/Sidebar";
import { ClockStatusBar } from "@/components/timesheets/ClockStatusBar";
import type { Sheet } from "@/components/timesheets/ClockControls";
import { cn } from "@/lib/utils";

type MyTime = {
  current: Sheet | null;
  recent: Sheet[];
};

type EmergencyData = {
  technicians: ComponentProps<typeof EmergencyDispatchButton>["technicians"];
  clients: ComponentProps<typeof EmergencyDispatchButton>["clients"];
};

type OfficeShellProps = {
  role: string;
  name: string;
  fieldView: boolean;
  sidebarFooter?: ReactNode;
  myTime: MyTime | null;
  emergency?: EmergencyData | null;
  children: ReactNode;
};

export function OfficeShell({ role, name, fieldView, sidebarFooter, myTime, emergency, children }: OfficeShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-dvh">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 hidden bg-black/45 backdrop-blur-[1px] md:block"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden h-dvh w-[17.5rem] transition-transform duration-200 ease-out md:block",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!menuOpen}
      >
        <Sidebar role={role} footer={sidebarFooter} onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header
          className="app-header sticky top-0 z-20 flex items-center justify-between gap-3 overflow-visible px-4 py-3 md:px-6"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-ink transition hover:border-line-strong hover:bg-background md:flex"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <HeaderContext role={role} name={name} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!fieldView && emergency ? (
              <EmergencyDispatchButton technicians={emergency.technicians} clients={emergency.clients} />
            ) : null}
            <GlobalSearch />
            <NotificationCenter showIntake={!fieldView} />
          </div>
        </header>
        {fieldView && myTime ? (
          <ClockStatusBar initialCurrent={myTime.current} initialRecent={myTime.recent} />
        ) : null}
        {!fieldView ? <EmergencyStatusStrip /> : null}
        <OfflineStatus />
        <main className="min-w-0 flex-1 overflow-x-clip p-4 md:p-8">{children}</main>
      </div>
      <BottomNav role={role} />
      <InstallHint />
    </div>
  );
}
