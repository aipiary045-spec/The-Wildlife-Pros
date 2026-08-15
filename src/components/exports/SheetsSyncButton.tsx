"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SheetsSyncButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function sync() {
    setBusy(true);
    setError("");
    setNotice("");
    const response = await fetch("/api/exports/google-sheets", { method: "POST" });
    const data = (await response.json()) as {
      error?: string;
      spreadsheetUrl?: string;
      createdNew?: boolean;
    };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Sync failed");
      return;
    }
    setNotice(
      data.createdNew
        ? "Created the Wildlife Pros workbook and wrote the first export."
        : "Updated the existing workbook. New records were added; existing rows were refreshed.",
    );
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={!configured || busy}
        onClick={sync}
        className="rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync to Google Sheets"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
    </div>
  );
}
