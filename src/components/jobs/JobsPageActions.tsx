"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NewJobDialog, type NewJobRequest, type ScheduleClient } from "@/components/schedule/NewJobDialog";
import type { ScheduleTech } from "@/components/schedule/job-card";

export function JobsPageActions({
  technicians,
  clients,
}: {
  technicians: ScheduleTech[];
  clients: ScheduleClient[];
}) {
  const router = useRouter();
  const [request, setRequest] = useState<NewJobRequest | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setRequest({ day: new Date() })}
        className="min-h-11 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white"
      >
        New job
      </button>
      <NewJobDialog
        request={request}
        technicians={technicians}
        clients={clients}
        onClose={() => setRequest(null)}
        onCreated={() => {
          setRequest(null);
          router.refresh();
        }}
      />
    </>
  );
}
