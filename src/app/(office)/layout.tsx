import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getSession } from "@/lib/auth";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

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
          <a
            href="/field"
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white md:hidden"
          >
            Field app
          </a>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
