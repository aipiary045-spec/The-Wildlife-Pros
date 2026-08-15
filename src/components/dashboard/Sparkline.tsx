export function Sparkline({
  series,
  compare,
  className,
}: {
  series: number[];
  compare?: number[];
  className?: string;
}) {
  const width = 220;
  const height = 48;
  const max = Math.max(1, ...series, ...(compare ?? []));
  function points(values: number[]) {
    if (values.length < 2) return "";
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - 4 - (value / max) * (height - 8);
        return `${x},${y}`;
      })
      .join(" ");
  }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className ?? "mt-3 h-12 w-full"} aria-hidden>
      <polyline fill="none" stroke="#E85D04" strokeWidth="2" points={points(series)} />
      {compare ? <polyline fill="none" stroke="#F9C74F" strokeWidth="2" points={points(compare)} /> : null}
    </svg>
  );
}
