import { HomeDashboard } from "@/components/dashboard/HomeDashboard";
import { getDashboardData } from "@/lib/data";

export const dynamic = "force-dynamic";

function toCard(job: {
  id: string;
  number: string;
  title: string;
  type: string;
  status: string;
  scheduledStart: Date | null;
  durationMin: number;
  instructions: string | null;
  technicianId: string | null;
  sourceJobId: string | null;
  client: { firstName: string; lastName: string; companyName: string | null };
  property: { address1: string };
}) {
  return {
    id: job.id,
    number: job.number,
    title: job.title,
    type: job.type,
    status: job.status,
    scheduledStart: job.scheduledStart,
    durationMin: job.durationMin,
    instructions: job.instructions,
    technicianId: job.technicianId,
    sourceJobId: job.sourceJobId,
    client: job.client,
    property: job.property,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <HomeDashboard
      today={data.today}
      requests={data.requests}
      quotes={data.quotes}
      jobs={data.jobs}
      invoices={data.invoices}
      payments={data.payments}
      technicians={data.technicians}
      clients={data.clients}
      fieldPulse={{
        activeTraps: data.activeTraps,
        clockedIn: data.clockedIn,
        latestCapture: data.recentCaptures[0]
          ? {
              species: data.recentCaptures[0].species.commonName,
              address: data.recentCaptures[0].job.property.address1,
            }
          : undefined,
      }}
      jobsToday={data.jobsToday.map(toCard)}
      unscheduled={data.unscheduled.map(toCard)}
    />
  );
}
