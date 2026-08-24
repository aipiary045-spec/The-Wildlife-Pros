import Link from "next/link";
import { visitPlanStats } from "@/lib/visit-plans";

export function ClientVisitPlans({
  plans,
}: {
  plans: Array<{
    id: string;
    title: string;
    totalVisits: number;
    status: string;
    property: { address1: string; city: string };
    jobs: Array<{ id: string; visitNumber: number | null; status: string; scheduledStart: Date | null }>;
  }>;
}) {
  if (plans.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">Visit plans</h2>
        <Link href="/schedule/pool" className="text-sm font-semibold text-orange hover:underline">
          Scheduling pool
        </Link>
      </div>
      <div className="space-y-3">
        {plans.map((plan) => {
          const stats = visitPlanStats(plan, plan.jobs);
          return (
            <article key={plan.id} className="rounded-xl border border-line bg-background px-3 py-3 text-sm">
              <p className="font-semibold">{plan.title}</p>
              <p className="text-stone-600">
                {plan.property.address1}, {plan.property.city}
              </p>
              <p className="mt-1 text-stone-700">
                {stats.completed} done · {stats.scheduled} on calendar · {stats.unscheduled} in pool · {stats.remaining}{" "}
                left to create
              </p>
              <p className="text-xs text-stone-500">
                {plan.totalVisits} visits · {plan.status === "ACTIVE" ? "Active" : plan.status.toLowerCase()}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
