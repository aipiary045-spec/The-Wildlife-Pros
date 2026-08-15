import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { sheetsConfigured, syncOrganizationToGoogleSheets } from "@/lib/sheets";

const OFFICE = new Set(["OWNER", "ADMIN", "DISPATCHER", "ACCOUNTING"]);

export const GET = withAuth(async (session) => {
  if (!OFFICE.has(session.role)) return jsonError("Office role required", 403);
  const org = await prisma.organization.findFirst({
    select: {
      googleSpreadsheetId: true,
      googleSpreadsheetUrl: true,
      lastSheetsSyncAt: true,
    },
  });
  return NextResponse.json({
    configured: sheetsConfigured(),
    spreadsheetId: org?.googleSpreadsheetId ?? null,
    spreadsheetUrl: org?.googleSpreadsheetUrl ?? null,
    lastSheetsSyncAt: org?.lastSheetsSyncAt ?? null,
  });
});

export const POST = withAuth(async (session) => {
  if (!OFFICE.has(session.role)) return jsonError("Office role required", 403);
  if (!sheetsConfigured()) {
    return jsonError("Add GOOGLE_SERVICE_ACCOUNT_JSON to enable Google Sheets sync", 503);
  }
  try {
    const result = await syncOrganizationToGoogleSheets();
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Sheets sync failed", 502);
  }
});
