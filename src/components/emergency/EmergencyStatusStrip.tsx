"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Siren } from "lucide-react";
import { EMERGENCY_ESCALATION_MINUTES } from "@/lib/emergency";

type ActiveDispatch = {
  id: string;
  jobId: string;
  message: string;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
  createdAt: string;
  job: {
    id: string;
    title: string;
    property: { address1: string; city: string };
    technician: { firstName: string; lastName: string } | null;
  };
};

export function EmergencyStatusStrip() {
  const [dispatches, setDispatches] = useState<ActiveDispatch[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/emergency-dispatch", { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as { dispatches?: ActiveDispatch[] };
      const open = (data.dispatches ?? []).filter((dispatch) => !dispatch.acknowledgedAt);
      setDispatches(open);
    } catch {
      // Offline: keep the last list.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    const onReturn = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [load]);

  if (!dispatches.length) return null;

  return (
    <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-800">
          <Siren size={14} />
          Active emergency{dispatches.length === 1 ? "" : " dispatches"}
        </p>
        {dispatches.map((dispatch) => {
          const overdue =
            !dispatch.acknowledgedAt &&
            Date.now() - new Date(dispatch.createdAt).getTime() >= EMERGENCY_ESCALATION_MINUTES * 60_000;
          const techName = dispatch.job.technician
            ? `${dispatch.job.technician.firstName} ${dispatch.job.technician.lastName}`
            : "Unassigned";
          return (
            <Link
              key={dispatch.id}
              href={`/jobs/${dispatch.jobId}`}
              className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-900 hover:border-rose-300"
            >
              {dispatch.job.title} · {techName}
              {overdue ? " · not acknowledged yet" : dispatch.escalatedAt ? " · backup notified" : ""}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
