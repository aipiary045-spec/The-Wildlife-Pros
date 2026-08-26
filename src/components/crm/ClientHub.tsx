import Link from "next/link";
import { format } from "date-fns";
import { buildClientPipeline } from "@/lib/client-pipeline";

export function ClientPipeline({
  openCalls,
  jobs,
}: {
  openCalls: number;
  jobs: Array<{ id: string; status: string }>;
}) {
  const stages = buildClientPipeline({ openCalls, jobs });
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-semibold">Pipeline</h2>
      <p className="mt-1 text-sm text-stone-600">Call → work order → done</p>
      <ol className="mt-4 flex flex-wrap gap-2">
        {stages.map((stage) => (
          <li
            key={stage.id}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              stage.state === "current"
                ? "bg-orange text-white"
                : stage.state === "done"
                  ? "bg-emerald-50 text-emerald-900"
                  : stage.state === "skipped"
                    ? "bg-background text-stone-400"
                    : "border border-line bg-background text-stone-600"
            }`}
          >
            {stage.label}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ClientQuickActions({
  clientId,
  phone,
}: {
  clientId: string;
  phone?: string | null;
}) {
  const callHref = phone ? `/calls?phone=${encodeURIComponent(phone.replace(/\D/g, ""))}` : "/calls";
  return (
    <section className="flex flex-wrap gap-2">
      <Link href={callHref} className="min-h-11 rounded-lg bg-orange px-4 text-sm font-semibold text-white inline-flex items-center">
        Log call
      </Link>
      <Link
        href={`/schedule?clientId=${clientId}`}
        className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold inline-flex items-center"
      >
        Schedule work
      </Link>
      <Link href="#open-work" className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold inline-flex items-center">
        Open work
      </Link>
    </section>
  );
}

export function ClientHubPanel({
  id,
  title,
  empty,
  children,
}: {
  id?: string;
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section id={id} className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {hasChildren ? children : <p className="text-sm text-stone-500">{empty}</p>}
    </section>
  );
}

export function ClientRecordRow({
  href,
  primary,
  secondary,
  badge,
}: {
  href: string;
  primary: string;
  secondary?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link href={href} className="block rounded-xl px-1 py-2 hover:bg-background">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{primary}</p>
          {secondary ? <p className="text-xs text-stone-500">{secondary}</p> : null}
        </div>
        {badge}
      </div>
    </Link>
  );
}

export function formatWhen(value: Date | string | null | undefined) {
  return value ? format(new Date(value), "MMM d, h:mm a") : "Unscheduled";
}
