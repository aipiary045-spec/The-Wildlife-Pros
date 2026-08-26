import Link from "next/link";

export function TimesheetTabs({
  active,
  month,
}: {
  active: "hours" | "time-off";
  month?: string;
}) {
  const hoursHref = "/timesheets";
  const timeOffHref = month ? `/timesheets?tab=time-off&month=${month}` : "/timesheets?tab=time-off";

  return (
    <div className="flex rounded-full border border-line bg-panel p-1">
      <Link
        href={hoursHref}
        className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold ${
          active === "hours" ? "bg-orange text-white" : "text-stone-600"
        }`}
      >
        Hours
      </Link>
      <Link
        href={timeOffHref}
        className={`flex-1 rounded-full py-2.5 text-center text-sm font-semibold ${
          active === "time-off" ? "bg-orange text-white" : "text-stone-600"
        }`}
      >
        Time off
      </Link>
    </div>
  );
}
