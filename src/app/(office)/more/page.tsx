import { LogoutButton } from "@/components/layout/LogoutButton";
import { getSession } from "@/lib/auth";
import { moreItems } from "@/lib/nav";
import { isTechnician } from "@/lib/paths";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const session = await getSession();
  if (!session) return null;
  const items = moreItems(session.role);
  const tech = isTechnician(session.role);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">More</h1>
        <p className="text-stone-600">
          {tech ? "Time off, traps, species log, and sign out." : "Work orders, intake, quotes, traps, and the rest of the office tools."}
        </p>
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
