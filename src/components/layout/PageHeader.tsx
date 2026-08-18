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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">{title}</h1>
        {description ? <div className="text-stone-600">{description}</div> : null}
        {related && related.length > 0 ? (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-orange">
            {related.map((link) => (
              <Link key={link.href} href={link.href} className="hover:underline">
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
