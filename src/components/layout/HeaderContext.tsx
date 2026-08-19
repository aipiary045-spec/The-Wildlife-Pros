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
      <p className="page-eyebrow">The Wildlife Pros</p>
      <p className="truncate font-display text-lg tracking-wide text-ink md:text-xl">
        {moreChild ? (
          <>
            <Link href="/more" className="text-orange hover:underline md:hidden">
              All tools
            </Link>
            <span className="font-normal text-muted-soft md:hidden"> / </span>
          </>
        ) : null}
        {label}
      </p>
      <p className="truncate text-xs font-medium text-muted-soft">{name}</p>
    </div>
  );
}
