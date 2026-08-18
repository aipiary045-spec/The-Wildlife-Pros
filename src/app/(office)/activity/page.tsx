import { PageHeader } from "@/components/layout/PageHeader";
import { CaptureLog } from "@/components/species/CaptureLog";
import { listCaptureEvents } from "@/lib/species-log";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const captures = await listCaptureEvents();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Species log"
        description="All captures across clients and jobs. Log new entries on a work order; they show up here automatically."
        related={[{ href: "/inventory", label: "Traps & gear" }]}
      />
      <div className="rounded-2xl border border-line bg-panel p-4 md:p-5">
        <CaptureLog
          captures={captures}
          showClient
          emptyMessage="No captures logged yet. Open a job and use Species activity to record the first one."
        />
      </div>
    </div>
  );
}
