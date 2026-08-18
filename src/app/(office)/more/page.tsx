import { LogoutButton } from "@/components/layout/LogoutButton";
import { getSession } from "@/lib/auth";
import { moreGroups } from "@/lib/nav";
import { isTechnician } from "@/lib/paths";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const session = await getSession();
  if (!session) return null;
  const groups = moreGroups(session.role);
  const tech = isTechnician(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">More</h1>
        <p className="text-stone-600">
          {tech
            ? "Time off, traps, species log, and sign out."
            : "Call log, quotes, invoices, and the rest of the office tools — grouped by what they are for."}
        </p>
      </div>
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h2 className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{group.title}</h2>
          <div className="grid gap-2">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-panel px-4 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    {item.description ? <span className="block text-sm text-stone-500">{item.description}</span> : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      <LogoutButton />
    </div>
  );
}
