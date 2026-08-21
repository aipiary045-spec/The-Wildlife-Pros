import { LogoutButton } from "@/components/layout/LogoutButton";
import { ViewModeToggle } from "@/components/layout/ViewModeToggle";
import { getAppContext } from "@/lib/app-context";
import { moreGroups } from "@/lib/nav";
import { canSwitchViewMode } from "@/lib/view-mode";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const context = await getAppContext();
  if (!context) return null;
  const { session, viewMode, fieldView, navRole } = context;
  const groups = moreGroups(navRole);
  const showViewToggle = canSwitchViewMode(session.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">More</h1>
        <p className="mt-1 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
          {fieldView
            ? "Time off, traps, species log, and sign out."
            : "Call log, quotes, invoices, and the rest of the office tools — grouped by what they are for."}
        </p>
      </div>
      {showViewToggle ? (
        <div className="md:hidden">
          <ViewModeToggle mode={viewMode} />
        </div>
      ) : null}
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h2 className="page-eyebrow px-1">{group.title}</h2>
          <div className="grid gap-2">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="card card-interactive flex min-h-14 items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange/15 to-orange/5 text-orange ring-1 ring-orange/15">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.label}</span>
                    {item.description ? <span className="block text-sm text-muted">{item.description}</span> : null}
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
