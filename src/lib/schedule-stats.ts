export function dayAppointmentStats(jobs: Array<{ status: string }>) {
  const live = jobs.filter((job) => job.status !== "CANCELLED");
  const completed = live.filter((job) => job.status === "COMPLETED" || job.status === "INVOICED");
  const active = live.filter((job) => ["EN_ROUTE", "ON_SITE", "IN_PROGRESS"].includes(job.status));
  const toGo = live.filter((job) => !["COMPLETED", "INVOICED"].includes(job.status));
  return {
    total: live.length,
    toGo: toGo.length,
    active: active.length,
    completed: completed.length,
  };
}
