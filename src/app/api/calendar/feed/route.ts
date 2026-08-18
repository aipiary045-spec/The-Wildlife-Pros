import { NextResponse } from "next/server";
import { buildTechnicianIcsFeed, readCalendarFeedToken } from "@/lib/calendar-feed";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }
  const payload = await readCalendarFeedToken(token);
  if (!payload) {
    return new NextResponse("Invalid or expired calendar link", { status: 401 });
  }
  const ics = await buildTechnicianIcsFeed(payload);
  if (!ics) {
    return new NextResponse("Technician not found", { status: 404 });
  }
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="critterops-schedule.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
