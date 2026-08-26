"use client";

import { useEffect, useState } from "react";
import {
  flushOfflineQueue,
  pendingMutationCount,
  pendingMutationLabels,
  subscribeOfflineQueue,
} from "@/lib/field-fetch";

function formatPendingLabels(labels: string[]) {
  if (labels.length === 0) return "";
  const shown = labels.slice(0, 3);
  const extra = labels.length > 3;
  return shown.join(" · ") + (extra ? " · …" : "");
}

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [labels, setLabels] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const syncCount = () => {
      void pendingMutationCount().then(setPending);
      void pendingMutationLabels().then(setLabels);
    };
    const onOnline = () => {
      setOnline(true);
      setUploading(true);
      void flushOfflineQueue().finally(() => {
        setUploading(false);
        syncCount();
      });
    };
    const onOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    syncCount();
    const unsubscribe = subscribeOfflineQueue(syncCount);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const timer = window.setInterval(() => {
      if (navigator.onLine) void flushOfflineQueue().then(() => syncCount());
      else syncCount();
    }, 30_000);

    if (navigator.onLine) {
      void flushOfflineQueue().finally(syncCount);
    }

    return () => {
      unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(timer);
    };
  }, []);

  if (online && pending === 0 && !uploading) return null;

  const labelSummary = pending > 0 ? formatPendingLabels(labels) : "";

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-ink md:px-6">
      {!online ? (
        <p>
          No signal. Clock, check-in, check-out, and captures stay on this phone and upload when you have data.
          {pending > 0 ? ` ${pending} waiting.` : ""}
          {labelSummary ? ` ${labelSummary}` : ""}
        </p>
      ) : uploading || pending > 0 ? (
        <p>
          {uploading
            ? "Uploading saved field work…"
            : `${pending} saved action${pending === 1 ? "" : "s"} waiting to upload.`}
          {labelSummary ? ` ${labelSummary}` : ""}
        </p>
      ) : null}
    </div>
  );
}
