import Link from "next/link";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { getSession } from "@/lib/auth";
import { moreItems } from "@/lib/nav";

export default async function MorePage() {
  const session = await getSession();
  const items = moreItems(session?.role ?? "OWNER");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl tracking-wide">More</h1>
        <p className="text-stone-600">Quotes, traps, compliance, Sheets, and the field route.</p>
      </div>
      <div className="grid gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel px-4 text-base font-medium"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange/10 text-orange">
                <Icon size={18} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <LogoutButton />
      </div>
    </div>
  );
}
