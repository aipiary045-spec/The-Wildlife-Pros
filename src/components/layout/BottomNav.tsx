"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isMoreDestination, pathMatches, primaryTabs } from "@/lib/nav";

export function BottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const tabs = primaryTabs(role);

  return (
    <nav
      className="bottom-nav fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/more" ? isMoreDestination(pathname, role) : pathMatches(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className="bottom-nav-link" data-active={active ? "true" : "false"}>
                <Icon size={21} strokeWidth={active ? 2.25 : 1.85} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
