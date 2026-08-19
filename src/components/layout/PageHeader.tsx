import Link from "next/link";

export function PageHeader({
  title,
  description,
  actions,
  related,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  related?: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {description ? <div className="mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">{description}</div> : null}
        {related && related.length > 0 ? (
          <p className="mt-3 flex flex-wrap gap-2">
            {related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="chip chip-accent hover:border-orange/40"
              >
                {link.label}
              </Link>
            ))}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div> : null}
    </div>
  );
}
