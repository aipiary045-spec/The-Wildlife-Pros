"use client";

import { useState } from "react";

export function CollapsibleJobSection({
  title,
  collapsedHint,
  defaultOpen = false,
  children,
  id,
  className = "",
  emphasized = false,
}: {
  title: string;
  collapsedHint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  id?: string;
  className?: string;
  emphasized?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      id={id}
      className={`rounded-xl border border-line bg-background/60 ${emphasized ? "border-orange/30 bg-orange/5" : ""} ${className}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
      >
        <span>{title}</span>
        <span className="shrink-0 text-xs font-normal text-stone-500">
          {open ? "Hide" : (collapsedHint ?? "Add")}
        </span>
      </button>
      {open ? <div className="space-y-4 border-t border-line px-4 pb-4 pt-3">{children}</div> : null}
    </section>
  );
}
