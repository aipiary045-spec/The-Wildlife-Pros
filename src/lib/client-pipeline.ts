export type PipelineStage = {
  id: string;
  label: string;
  state: "done" | "current" | "upcoming" | "skipped";
  href?: string;
};

export function buildClientPipeline(input: {
  openCalls: number;
  jobs: Array<{ id: string; status: string }>;
}): PipelineStage[] {
  const activeJob = input.jobs.some((job) => !["COMPLETED", "INVOICED", "CANCELLED"].includes(job.status));
  const completedJob = input.jobs.some((job) => ["COMPLETED", "INVOICED"].includes(job.status));

  const stages: Array<Omit<PipelineStage, "state">> = [
    { id: "call", label: "Call / intake" },
    { id: "job", label: "Work order" },
    { id: "done", label: "Done" },
  ];

  const flags = {
    call: input.openCalls > 0 || activeJob || completedJob,
    job: activeJob || completedJob,
    done: completedJob,
  };

  let currentSet = false;
  return stages.map((stage) => {
    const id = stage.id as keyof typeof flags;
    if (!flags[id]) {
      return { ...stage, state: "skipped" as const };
    }
    if (completedJob && id === "done") {
      return { ...stage, state: "done" as const };
    }
    if (completedJob && id !== "done") {
      return { ...stage, state: "done" as const };
    }
    if (!currentSet) {
      if (
        (id === "call" && input.openCalls > 0) ||
        (id === "job" && activeJob) ||
        (id === "done" && false)
      ) {
        currentSet = true;
        return { ...stage, state: "current" as const };
      }
    }
    if (id === "call" && !input.openCalls && (activeJob || completedJob)) {
      return { ...stage, state: "done" as const };
    }
    if (!currentSet && flags[id]) {
      currentSet = true;
      return { ...stage, state: "current" as const };
    }
    return { ...stage, state: currentSet ? ("upcoming" as const) : ("done" as const) };
  });
}
