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
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="h-1.5" style={{ background: accent }} />
      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-semibold">{title}</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between gap-2">
              <span className="text-stone-600">{row.label}</span>
              <span className="font-medium">
                {row.count}
                {row.money != null ? ` · ${formatMoney(row.money)}` : ""}
              </span>
            </li>
          ))}
        </ul>
        <Link
          href={href}
          className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold"
        >
          {action}
        </Link>
        <Sparkline series={spark} compare={compare} />
      </div>
    </article>
  );
}
