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
    <svg viewBox={`0 0 ${width} ${height}`} className={className ?? "mt-4 h-12 w-full"} aria-hidden>
      <defs>
        <linearGradient id="spark-primary" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff6f1a" />
          <stop offset="100%" stopColor="#e85d04" />
        </linearGradient>
        <linearGradient id="spark-compare" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f9c74f" />
          <stop offset="100%" stopColor="#f48c06" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="url(#spark-primary)" strokeWidth="2.25" strokeLinecap="round" points={points(series)} />
      {compare ? (
        <polyline fill="none" stroke="url(#spark-compare)" strokeWidth="2" strokeLinecap="round" opacity="0.85" points={points(compare)} />
      ) : null}
    </svg>
  );
}
