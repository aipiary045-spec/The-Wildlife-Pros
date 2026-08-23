type FieldCounts = {
  deployments: number;
  captures: number;
  entryPoints: number;
  photos: number;
};

export function JobFieldStats({ counts, compact = false }: { counts: FieldCounts; compact?: boolean }) {
  const items = [
    { label: "trap", value: counts.deployments },
    { label: "capture", value: counts.captures },
    { label: "entry point", value: counts.entryPoints },
    { label: "photo", value: counts.photos },
  ].filter((item) => item.value > 0);

  if (!items.length) {
    return compact ? null : <p className="text-sm text-stone-500">No field data logged yet</p>;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "justify-end"}`}>
      {items.map((item) => (
        <span
          key={item.label}
          className={`rounded-full bg-background text-stone-700 ${
            compact ? "px-2 py-0.5 text-[11px] font-medium" : "px-2.5 py-1 text-xs font-semibold"
          }`}
        >
          {item.value} {item.label}
          {item.value === 1 ? "" : "s"}
        </span>
      ))}
    </div>
  );
}
