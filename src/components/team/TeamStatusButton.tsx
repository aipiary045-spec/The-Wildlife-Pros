"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { canChangeUser } from "@/lib/team";

export function TeamStatusButton({
  actorId,
  actorRole,
  user,
  activeOwnerCount,
}: {
  actorId: string;
  actorRole: string;
  user: { id: string; role: string; status: string; firstName: string };
  activeOwnerCount: number;
}) {
  const router = useRouter();
  const nextStatus = user.status === "DISABLED" ? "ACTIVE" : "DISABLED";
  const action = nextStatus === "DISABLED" ? "disable" : "enable";
  const allowed = canChangeUser(
    { id: actorId, role: actorRole },
    { id: user.id, role: user.role, status: user.status },
    action,
    activeOwnerCount,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!allowed) return null;

  async function toggle() {
    if (nextStatus === "DISABLED") {
      const ok = window.confirm(
        `Disable ${user.firstName}? They will not be able to sign in, and they drop off the calendar. Jobs and timesheets stay.`,
      );
      if (!ok) return;
    }
    setSaving(true);
    setError("");
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(data.error ?? "Could not update this person.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void toggle()}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
      >
        {saving ? "Saving…" : nextStatus === "DISABLED" ? "Disable" : "Re-enable"}
      </button>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
