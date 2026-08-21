import { NextResponse } from "next/server";
import { calendarFeedUrl, createCalendarFeedToken } from "@/lib/calendar-feed";
import { withAuth } from "@/lib/api";

export const GET = withAuth(async (session, request) => {
  const url = new URL(request.url);
  const forUserId = url.searchParams.get("userId") ?? session.id;
  if (forUserId !== session.id && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Not allowed to view that calendar link." }, { status: 403 });
  }
  const token = await createCalendarFeedToken(forUserId, session.organizationId);
  const feedUrl = calendarFeedUrl(token, url.origin);
  return NextResponse.json({ feedUrl, userId: forUserId });
});
