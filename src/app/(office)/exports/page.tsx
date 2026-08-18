import { format } from "date-fns";
import { ExportBoard } from "@/components/exports/ExportBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { EXPORT_CATEGORIES, EXPORT_CATEGORY_IDS, loadExportRowCounts } from "@/lib/exports";
import { prisma } from "@/lib/prisma";
import { sheetsConfigured } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const [org, counts] = await Promise.all([prisma.organization.findFirst(), loadExportRowCounts()]);
  const configured = sheetsConfigured();
  const categories = EXPORT_CATEGORY_IDS.map((id) => ({
    id,
    label: EXPORT_CATEGORIES[id].label,
    description: EXPORT_CATEGORIES[id].description,
    sheetName: EXPORT_CATEGORIES[id].sheetName,
    rows: counts[id],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data exports"
        description={
          <>
            Download a CSV for one category, or sync chosen tabs into the shared Google workbook. CSV downloads work
            without any Google setup.
          </>
        }
        related={[{ href: "/reports", label: "Reports" }, { href: "/invoices", label: "Invoices" }]}
      />
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-2 font-semibold">Google Sheets workbook</h2>
        <p className="mb-4 text-sm text-stone-600">
          The first sync creates <strong>CritterOps — The Wildlife Pros</strong>. Later syncs update the same file —
          rows match on record id so existing lines refresh and new ones append.
        </p>
        {org?.googleSpreadsheetUrl ? (
          <p className="mb-4 text-sm">
            Current workbook:{" "}
            <a href={org.googleSpreadsheetUrl} className="font-medium text-orange" target="_blank" rel="noreferrer">
              Open in Google Sheets
            </a>
            {org.lastSheetsSyncAt ? ` · last sync ${format(org.lastSheetsSyncAt, "PPpp")}` : ""}
          </p>
        ) : (
          <p className="mb-4 text-sm text-stone-500">No workbook linked yet. Sync any category to create it.</p>
        )}
        {!configured ? (
          <div className="mb-4 rounded-xl bg-background px-3 py-3 text-sm text-stone-600">
            Google Sheets sync needs a service account in <code>.env</code>:
            <pre className="mt-2 overflow-x-auto text-xs">
              {`GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
GOOGLE_SHEETS_OWNER_EMAIL='admin@thewildlifepros.com'`}
            </pre>
            Optional: set <code>GOOGLE_SHEETS_SPREADSHEET_ID</code> to force a specific workbook. CSV downloads below
            work without this.
          </div>
        ) : null}
        <ExportBoard configured={configured} categories={categories} />
      </section>
    </div>
  );
}
