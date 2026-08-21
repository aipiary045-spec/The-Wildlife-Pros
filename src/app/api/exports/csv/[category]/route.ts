import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { exportFilename, isExportCategory, loadExportTab, toCsv } from "@/lib/exports";
import { isOfficeRole } from "@/lib/roles";

export async function GET(_request: Request, context: { params: Promise<{ category: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  if (!isOfficeRole(session.role)) return jsonError("Office role required", 403);
  const { category } = await context.params;
  if (!isExportCategory(category)) return jsonError("Unknown export category", 404);
  const tab = await loadExportTab(category);
  const csv = toCsv(tab);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(category)}"`,
    },
  });
}
