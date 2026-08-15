import { format } from "date-fns";
import { SheetsSyncButton } from "@/components/exports/SheetsSyncButton";
import { prisma } from "@/lib/prisma";
import { sheetsConfigured } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const org = await prisma.organization.findFirst();
  const configured = sheetsConfigured();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Exports</h1>
        <p className="text-stone-600">
          Push operations data into one Google workbook. The first sync creates{" "}
          <strong>CritterOps — The Wildlife Pros</strong>. Every later sync updates that same file —
          it does not create a new spreadsheet.
        </p>
      </div>
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-2 font-semibold">Google Sheets</h2>
        <p className="mb-4 text-sm text-stone-600">
          Tabs: Clients, Jobs, Invoices, Payments, Traps, Captures, Timesheets. Rows are matched by
          record id, so a second upload refreshes existing lines and appends only new ones.
        </p>
        {org?.googleSpreadsheetUrl ? (
          <p className="mb-3 text-sm">
            Current workbook:{" "}
            <a href={org.googleSpreadsheetUrl} className="font-medium text-orange" target="_blank" rel="noreferrer">
              Open in Google Sheets
            </a>
            {org.lastSheetsSyncAt ? ` · last sync ${format(org.lastSheetsSyncAt, "PPpp")}` : ""}
          </p>
        ) : (
          <p className="mb-3 text-sm text-stone-500">No workbook linked yet. The first successful sync creates it.</p>
        )}
        {!configured ? (
          <div className="mb-4 rounded-xl bg-background px-3 py-3 text-sm text-stone-600">
            Add a Google service account in <code>.env</code>:
            <pre className="mt-2 overflow-x-auto text-xs">
              {`GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
GOOGLE_SHEETS_OWNER_EMAIL='owner@thewildlifepros.com'`}
            </pre>
            Share is automatic to that owner email. Optional: set{" "}
            <code>GOOGLE_SHEETS_SPREADSHEET_ID</code> to force a specific existing file.
          </div>
        ) : null}
        <SheetsSyncButton configured={configured} />
      </section>
    </div>
  );
}
