import Link from "next/link";

export function QuotesSubnav({ current }: { current: "quotes" | "pricing" }) {
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold ${active ? "bg-orange text-white" : "border border-line bg-white text-stone-700"}`;
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/quotes" className={chip(current === "quotes")}>
        Quotes
      </Link>
      <Link href="/quotes/pricing" className={chip(current === "pricing")}>
        Price list
      </Link>
    </div>
  );
}
