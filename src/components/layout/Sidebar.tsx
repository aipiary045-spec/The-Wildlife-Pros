"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { pathMatches, sidebarGroups } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = sidebarGroups(role);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="app-sidebar flex h-full w-[17.5rem] flex-col text-white">
      <div className="flex items-center gap-3 border-b border-white/8 px-5 py-5">
        <div className="rounded-2xl bg-white/6 p-1.5 ring-1 ring-white/10">
          <Logo size={40} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/90">The Wildlife Pros</p>
          <p className="text-sm text-white/55">CritterOps</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-xs font-semibold text-white/40">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathMatches(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.description}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-gradient-to-r from-orange to-orange-bright text-white shadow-glow"
                        : "text-white/72 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <Icon size={17} className={active ? "opacity-100" : "opacity-80 group-hover:opacity-100"} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <button
        type="button"
        onClick={logout}
        className="m-3 flex items-center gap-2 rounded-xl border border-white/8 px-3 py-2.5 text-left text-sm font-medium text-white/65 transition hover:border-white/14 hover:bg-white/6 hover:text-white"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </aside>
  );
}
