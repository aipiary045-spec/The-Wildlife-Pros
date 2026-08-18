"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isMoreDestination, pathMatches, primaryTabs } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function BottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const tabs = primaryTabs(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/more" ? isMoreDestination(pathname, role) : pathMatches(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                  active ? "text-orange" : "text-stone-500",
                )}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
