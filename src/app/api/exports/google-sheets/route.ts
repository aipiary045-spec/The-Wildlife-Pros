import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, withAuth } from "@/lib/api";
import { EXPORT_CATEGORIES, EXPORT_CATEGORY_IDS, isExportCategory, loadExportRowCounts } from "@/lib/exports";
import { sheetsConfigured, syncOrganizationToGoogleSheets } from "@/lib/sheets";

const OFFICE = new Set(["OWNER", "ADMIN", "DISPATCHER", "ACCOUNTING"]);

export const GET = withAuth(async (session) => {
  if (!OFFICE.has(session.role)) return jsonError("Office role required", 403);
  const [org, counts] = await Promise.all([
    prisma.organization.findFirst({
      select: {
        googleSpreadsheetId: true,
        googleSpreadsheetUrl: true,
        lastSheetsSyncAt: true,
      },
    }),
    loadExportRowCounts(),
  ]);
  return NextResponse.json({
    configured: sheetsConfigured(),
    spreadsheetId: org?.googleSpreadsheetId ?? null,
    spreadsheetUrl: org?.googleSpreadsheetUrl ?? null,
    lastSheetsSyncAt: org?.lastSheetsSyncAt ?? null,
    categories: EXPORT_CATEGORY_IDS.map((id) => ({
      id,
      label: EXPORT_CATEGORIES[id].label,
      description: EXPORT_CATEGORIES[id].description,
      sheetName: EXPORT_CATEGORIES[id].sheetName,
      rows: counts[id],
    })),
  });
});

export const POST = withAuth(async (session, request) => {
  if (!OFFICE.has(session.role)) return jsonError("Office role required", 403);
  if (!sheetsConfigured()) {
    return jsonError("Add GOOGLE_SERVICE_ACCOUNT_JSON to enable Google Sheets sync", 503);
  }
  let categories: string[] | undefined;
  try {
    const body = (await request.json()) as { categories?: string[] };
    if (Array.isArray(body.categories) && body.categories.length > 0) {
      categories = body.categories;
      const invalid = categories.find((item) => !isExportCategory(item));
      if (invalid) return jsonError(`Unknown export category: ${invalid}`, 400);
    }
  } catch {
    // empty body = full sync
  }
  try {
    const result = await syncOrganizationToGoogleSheets({
      categories: categories as never,
    });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Sheets sync failed", 502);
  }
});
