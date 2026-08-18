import { redirect } from "next/navigation";
import { TodayBoard } from "@/components/dashboard/TodayBoard";
import { RecentPanel } from "@/components/layout/RecentPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { getSession } from "@/lib/auth";
import { isTechnician } from "@/lib/paths";
import { getTodayOverview } from "@/lib/today";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isTechnician(session.role)) redirect("/field");

  const data = await getTodayOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today"
        description="A quick read on what needs attention before you dive into the schedule or call log."
        related={[
          { href: "/schedule", label: "Schedule" },
          { href: "/calls", label: "Call log" },
          { href: "/clients", label: "Clients" },
        ]}
      />
      <RecentPanel />
      <TodayBoard data={data} />
    </div>
  );
}
