import { redirect } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallHint } from "@/components/layout/InstallHint";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/lib/auth";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <div className="sticky top-0 hidden h-dvh md:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-panel/95 px-4 py-3 backdrop-blur md:px-6"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-orange md:text-xs">The Wildlife Pros</p>
            <p className="truncate text-sm text-stone-600">
              {session.firstName} {session.lastName} · {session.role.toLowerCase()}
            </p>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <BottomNav role={session.role} />
      <InstallHint />
    </div>
  );
}
