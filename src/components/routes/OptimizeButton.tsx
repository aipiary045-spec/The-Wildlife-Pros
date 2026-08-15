"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OptimizeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  async function run() {
    setLoading(true);
    const response = await fetch("/api/routes/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persist: true }),
    });
    const data = (await response.json()) as {
      assignments?: Array<{ technician?: { firstName: string; lastName: string }; totalMiles: number }>;
    };
    setLoading(false);
    const text = (data.assignments ?? [])
      .map((item) => `${item.technician?.firstName ?? "Tech"} · ${item.totalMiles} mi`)
      .join(" · ");
    setSummary(text || "No geocoded jobs to optimize.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Optimizing…" : "Optimize today's routes"}
      </button>
      {summary ? <p className="text-sm text-stone-600">{summary}</p> : null}
    </div>
  );
}
