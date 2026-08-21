"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ViewMode } from "@/lib/view-mode";

export function ViewModeToggle({ mode }: { mode: ViewMode }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function switchMode(next: ViewMode) {
    if (next === mode || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/auth/view-mode", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      const data = (await response.json()) as { redirect?: string; error?: string };
      if (!response.ok) return;
      router.push(typeof data.redirect === "string" ? data.redirect : next === "field" ? "/field" : "/dashboard");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Working view</p>
          <p className="mt-1 text-sm text-muted">
            Switch to field view when you are on a trapline for the day. Office tools stay available when you switch back.
          </p>
        </div>
      </div>
      <div
        className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-line bg-background p-1"
        role="group"
        aria-label="Working view"
      >
        <button
          type="button"
          disabled={saving}
          onClick={() => switchMode("office")}
          className={`rounded-full px-3 py-2.5 text-sm font-semibold transition ${
            mode === "office" ? "bg-orange text-white shadow-sm" : "text-stone-600 hover:text-ink"
          }`}
        >
          Office
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => switchMode("field")}
          className={`rounded-full px-3 py-2.5 text-sm font-semibold transition ${
            mode === "field" ? "bg-orange text-white shadow-sm" : "text-stone-600 hover:text-ink"
          }`}
        >
          Field
        </button>
      </div>
    </div>
  );
}
