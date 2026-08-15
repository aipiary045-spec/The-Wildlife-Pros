import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { ClockControls } from "@/components/timesheets/ClockControls";
import { getSession } from "@/lib/auth";
import { getMyTimesheet } from "@/lib/timesheets";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const myTime = await getMyTimesheet(session.id);

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3 md:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange">The Wildlife Pros</p>
            <p className="text-sm text-stone-600">
              {session.firstName} {session.lastName} · {session.role.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ClockControls compact initialCurrent={myTime.current} initialRecent={myTime.recent} />
            <a
              href="/field"
              className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white md:hidden"
            >
              Field app
            </a>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
