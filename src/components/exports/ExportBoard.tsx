"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExportCategoryId } from "@/lib/exports";

type CategoryCard = {
  id: ExportCategoryId;
  label: string;
  description: string;
  sheetName: string;
  rows: number;
};

export function ExportBoard({
  configured,
  categories,
}: {
  configured: boolean;
  categories: CategoryCard[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<ExportCategoryId>>(() => new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function toggle(id: ExportCategoryId) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(categories.map((item) => item.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function sync(categoriesToSync: ExportCategoryId[], label: string) {
    setBusy(label);
    setError("");
    setNotice("");
    const response = await fetch("/api/exports/google-sheets", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categories: categoriesToSync }),
    });
    const data = (await response.json()) as { error?: string; createdNew?: boolean; tabs?: Array<{ name: string; rows: number }> };
    setBusy(null);
    if (!response.ok) {
      setError(data.error ?? "Sync failed");
      return;
    }
    const tabCount = data.tabs?.length ?? categoriesToSync.length;
    setNotice(
      data.createdNew
        ? `Created the workbook and synced ${tabCount} tab${tabCount === 1 ? "" : "s"}.`
        : `Updated ${tabCount} tab${tabCount === 1 ? "" : "s"} in the existing workbook.`,
    );
    router.refresh();
  }

  const selectedList = [...selected];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={selectAll} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold">
          Select all
        </button>
        <button type="button" onClick={clearSelection} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold">
          Clear
        </button>
        <button
          type="button"
          disabled={!configured || busy !== null}
          onClick={() => void sync(categories.map((item) => item.id), "all")}
          className="rounded-lg bg-orange px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "all" ? "Syncing…" : "Sync all to Google Sheets"}
        </button>
        <button
          type="button"
          disabled={!configured || busy !== null || selectedList.length === 0}
          onClick={() => void sync(selectedList, "selected")}
          className="rounded-lg border border-orange px-3 py-2 text-sm font-semibold text-orange disabled:opacity-50"
        >
          {busy === "selected" ? "Syncing…" : `Sync selected (${selectedList.length})`}
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((item) => {
          const checked = selected.has(item.id);
          return (
            <article key={item.id} className="rounded-2xl border border-line bg-panel p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="font-semibold">{item.label}</span>
                  <span className="ml-2 text-xs text-stone-500">{item.rows} rows</span>
                  <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                  <p className="mt-1 text-xs text-stone-500">Sheets tab: {item.sheetName}</p>
                </span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2 pl-7">
                <a
                  href={`/api/exports/csv/${item.id}`}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold hover:bg-background"
                >
                  Download CSV
                </a>
                <button
                  type="button"
                  disabled={!configured || busy !== null}
                  onClick={() => void sync([item.id], item.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
                >
                  {busy === item.id ? "Syncing…" : "Sync tab"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
