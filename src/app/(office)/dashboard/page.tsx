import { redirect } from "next/navigation";
import { TodayBoard } from "@/components/dashboard/TodayBoard";
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
        description="Your stops for the day — everything else stays tucked away until you need it."
        related={[
          { href: "/schedule", label: "Schedule" },
          { href: "/calls", label: "Call log" },
        ]}
      />
      <TodayBoard data={data} />
    </div>
  );
}
