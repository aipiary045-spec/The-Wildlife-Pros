"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isMoreDestination, pageLabel } from "@/lib/nav";

export function HeaderContext({ role, name }: { role: string; name: string }) {
  const pathname = usePathname();
  const label = pageLabel(pathname, role);
  const moreChild = isMoreDestination(pathname, role) && pathname !== "/more";

  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.2em] text-orange md:text-xs">The Wildlife Pros</p>
      <p className="truncate text-sm font-semibold text-ink">
        {moreChild ? (
          <>
            <Link href="/more" className="text-orange hover:underline md:hidden">
              All tools
            </Link>
            <span className="font-normal text-stone-400 md:hidden"> / </span>
          </>
        ) : null}
        {label}
      </p>
      <p className="truncate text-xs text-stone-500">{name}</p>
    </div>
  );
}
