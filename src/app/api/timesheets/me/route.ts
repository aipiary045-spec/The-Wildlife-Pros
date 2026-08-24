import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getMyTimesheet } from "@/lib/timesheets";

export const GET = withAuth(async (session) => {
  const payload = await getMyTimesheet(session.id);
  return NextResponse.json(payload);
});
