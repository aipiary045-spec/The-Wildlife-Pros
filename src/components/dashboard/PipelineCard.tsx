import Link from "next/link";
import { Sparkline } from "./Sparkline";
import { formatMoney } from "@/lib/utils";

export type PipelineRow = {
  label: string;
  count: number;
  money?: number;
};

export function PipelineCard({
  title,
  accent,
  rows,
  action,
  href,
  spark,
  compare,
}: {
  title: string;
  accent: string;
  rows: PipelineRow[];
  action: string;
  href: string;
  spark: number[];
  compare?: number[];
}) {
  return (
    <article className="card card-interactive group flex flex-col overflow-hidden">
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between gap-2 border-b border-line/70 pb-2 last:border-0 last:pb-0">
              <span className="text-muted">{row.label}</span>
              <span className="font-semibold tabular-nums">
                {row.count}
                {row.money != null ? ` · ${formatMoney(row.money)}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <Link href={href} className="btn-secondary mt-5 min-h-10 group-hover:border-orange/30">
          {action}
        </Link>
        <Sparkline series={spark} compare={compare} />
      </div>
    </article>
  );
}
