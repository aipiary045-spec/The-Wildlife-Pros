"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Receipt,
  ShieldCheck,
  Smartphone,
  Squirrel,
  Users,
  Warehouse,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/routes", label: "Routes", icon: MapPinned },
  { href: "/timesheets", label: "Timesheets", icon: Clock },
  { href: "/inventory", label: "Traps & gear", icon: Warehouse },
  { href: "/activity", label: "Species log", icon: Squirrel },
  { href: "/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/exports", label: "Google Sheets", icon: FileSpreadsheet },
  { href: "/field", label: "Tech field app", icon: Smartphone },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col bg-ink text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <Logo size={44} />
        <div>
          <p className="font-display text-sm tracking-[0.18em] text-orange">THE WILDLIFE PROS</p>
          <p className="text-xs text-white/60">CritterOps</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-orange text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={logout}
        className="m-3 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </aside>
  );
}
