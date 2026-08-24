import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { parsePlanDate } from "@/lib/route-plan";
import { loadDayRoutableJobs } from "@/lib/scheduling-pool";

export const GET = withAuth(async (_session, request) => {
  const url = new URL(request.url);
  const day = parsePlanDate(url.searchParams.get("date"));
  const jobs = await loadDayRoutableJobs(day);
  return NextResponse.json({ jobs });
});
