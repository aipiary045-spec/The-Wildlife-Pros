import Link from "next/link";

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-stone-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <span className="text-stone-400">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="font-semibold text-orange hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-stone-700">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
