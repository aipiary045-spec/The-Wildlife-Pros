"use client";

import { ClockControls, type Sheet } from "@/components/timesheets/ClockControls";

export function ClockCard({
  initialCurrent,
  initialRecent,
}: {
  initialCurrent: Sheet | null;
  initialRecent: Sheet[];
}) {
  return <ClockControls initialCurrent={initialCurrent} initialRecent={initialRecent} />;
}
