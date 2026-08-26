import { PipelineCard } from "@/components/dashboard/PipelineCard";

export type PipelineOverviewData = {
  requests: { new: number; assessed: number; converted: number; spark: number[] };
  jobs: {
    unscheduled: number;
    active: number;
    completed: number;
    spark: number[];
    finished: number[];
  };
  field: {
    activeTraps: number;
    captureWeek: number;
    clockedIn: number;
  };
};

export function PipelineOverview(props: PipelineOverviewData) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <PipelineCard
        title="Incoming calls"
        accent="#38bdf8"
        rows={[
          { label: "New", count: props.requests.new },
          { label: "Looked at", count: props.requests.assessed },
          { label: "Scheduled", count: props.requests.converted },
        ]}
        action="View call log"
        href="/calls"
        spark={props.requests.spark}
      />
      <PipelineCard
        title="Work orders"
        accent="#eab308"
        rows={[
          { label: "Unscheduled", count: props.jobs.unscheduled },
          { label: "On the board", count: props.jobs.active },
          { label: "Finished", count: props.jobs.completed },
        ]}
        action="View work orders"
        href="/jobs"
        spark={props.jobs.spark}
        compare={props.jobs.finished}
      />
      <PipelineCard
        title="Field activity"
        accent="#34d399"
        rows={[
          { label: "Traps in the field", count: props.field.activeTraps },
          { label: "Captures this week", count: props.field.captureWeek },
          { label: "On the clock now", count: props.field.clockedIn },
        ]}
        action="View species log"
        href="/activity"
        spark={[0, 0, 0, 0, 0, 0, 0]}
      />
    </section>
  );
}
