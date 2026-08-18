"use client";

import { useEffect, useState } from "react";
import { Pin } from "lucide-react";
import { PINNED_STORAGE_KEY, parsePinned, togglePinnedClients } from "@/lib/recent";

export function PinClientButton({ clientId, label }: { clientId: string; label: string }) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    try {
      const list = parsePinned(window.localStorage.getItem(PINNED_STORAGE_KEY));
      setPinned(list.some((item) => item.id === clientId));
    } catch {
      setPinned(false);
    }
  }, [clientId]);

  function toggle() {
    try {
      const list = parsePinned(window.localStorage.getItem(PINNED_STORAGE_KEY));
      const next = togglePinnedClients(list, clientId, label);
      window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      setPinned(next.some((item) => item.id === clientId));
      window.dispatchEvent(new Event("critterops-pinned"));
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold"
    >
      <Pin size={16} className={pinned ? "fill-orange text-orange" : "text-stone-500"} />
      {pinned ? "Pinned" : "Pin client"}
    </button>
  );
}
