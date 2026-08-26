import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Time off lives on the combined Time tracker at /timesheets?tab=time-off. */
export default async function TimeOffPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ? `&month=${encodeURIComponent(params.month)}` : "";
  redirect(`/timesheets?tab=time-off${month}`);
}
