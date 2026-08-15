import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const WORKBOOK_TITLE = "CritterOps — The Wildlife Pros";

type Tab = {
  name: string;
  headers: string[];
  rows: string[][];
};

function serviceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  return JSON.parse(raw) as {
    client_email: string;
    private_key: string;
  };
}

export function sheetsConfigured() {
  return Boolean(serviceAccount());
}

function sheetsClient() {
  const credentials = serviceAccount();
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  }
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}

function cell(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function loadTabs(): Promise<Tab[]> {
  const [clients, jobs, invoices, payments, traps, captures, timesheets] = await Promise.all([
    prisma.client.findMany({ include: { properties: true }, orderBy: { lastName: "asc" } }),
    prisma.job.findMany({
      include: { client: true, property: true, technician: true },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.invoice.findMany({ include: { client: true, job: true }, orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ include: { invoice: true }, orderBy: { receivedOn: "desc" } }),
    prisma.equipment.findMany({
      include: { deployments: { include: { property: true }, take: 1, orderBy: { deployedAt: "desc" } } },
      orderBy: { serialNumber: "asc" },
    }),
    prisma.captureEvent.findMany({
      include: { species: true, job: { include: { property: true } } },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.timesheet.findMany({
      include: { user: true, punches: true },
      orderBy: { date: "desc" },
    }),
  ]);

  return [
    {
      name: "Clients",
      headers: ["id", "firstName", "lastName", "company", "email", "phone", "status", "properties"],
      rows: clients.map((item) => [
        item.id,
        item.firstName,
        item.lastName,
        item.companyName ?? "",
        item.email ?? "",
        item.phone ?? "",
        item.status,
        item.properties.map((property) => `${property.label}: ${property.address1}`).join(" | "),
      ]),
    },
    {
      name: "Jobs",
      headers: ["id", "number", "title", "type", "status", "client", "address", "technician", "start", "total"],
      rows: jobs.map((item) => [
        item.id,
        item.number,
        item.title,
        item.type,
        item.status,
        `${item.client.firstName} ${item.client.lastName}`,
        item.property.address1,
        item.technician ? `${item.technician.firstName} ${item.technician.lastName}` : "",
        item.scheduledStart?.toISOString() ?? "",
        String(item.total),
      ]),
    },
    {
      name: "Invoices",
      headers: ["id", "number", "client", "job", "status", "total", "balance", "dueOn"],
      rows: invoices.map((item) => [
        item.id,
        item.number,
        `${item.client.firstName} ${item.client.lastName}`,
        item.job?.number ?? "",
        item.status,
        String(item.total),
        String(item.balance),
        item.dueOn?.toISOString() ?? "",
      ]),
    },
    {
      name: "Payments",
      headers: ["id", "invoice", "amount", "method", "reference", "squarePaymentId", "receivedOn"],
      rows: payments.map((item) => [
        item.id,
        item.invoice.number,
        String(item.amount),
        item.method,
        item.reference ?? "",
        item.squarePaymentId ?? "",
        item.receivedOn.toISOString(),
      ]),
    },
    {
      name: "Traps",
      headers: ["id", "serialNumber", "name", "type", "status", "location"],
      rows: traps.map((item) => [
        item.id,
        item.serialNumber,
        item.name,
        item.type,
        item.status,
        item.deployments[0]?.locationNote ?? "",
      ]),
    },
    {
      name: "Captures",
      headers: ["id", "species", "quantity", "disposition", "address", "capturedAt"],
      rows: captures.map((item) => [
        item.id,
        item.species.commonName,
        String(item.quantity),
        item.disposition,
        item.job.property.address1,
        item.capturedAt.toISOString(),
      ]),
    },
    {
      name: "Timesheets",
      headers: ["id", "technician", "date", "status", "punches", "breakMin"],
      rows: timesheets.map((item) => [
        item.id,
        `${item.user.firstName} ${item.user.lastName}`,
        item.date.toISOString(),
        item.status,
        item.punches
          .map((punch) => `${punch.clockInAt.toISOString()}–${punch.clockOutAt?.toISOString() ?? "open"}`)
          .join(" | "),
        String(item.breakMin),
      ]),
    },
  ];
}

async function resolveSpreadsheet(
  drive: ReturnType<typeof google.drive>,
  sheets: ReturnType<typeof google.sheets>,
  existingId?: string | null,
) {
  const envId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (envId) {
    return { id: envId, created: false };
  }
  if (existingId) {
    try {
      await sheets.spreadsheets.get({ spreadsheetId: existingId });
      return { id: existingId, created: false };
    } catch {
      // fall through and reuse or create
    }
  }

  const found = await drive.files.list({
    q: `name = '${WORKBOOK_TITLE.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 1,
  });
  if (found.data.files?.[0]?.id) {
    return { id: found.data.files[0].id, created: false };
  }

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: WORKBOOK_TITLE },
      sheets: [{ properties: { title: "Clients" } }],
    },
    fields: "spreadsheetId,spreadsheetUrl",
  });
  const id = created.data.spreadsheetId;
  if (!id) throw new Error("Google did not return a spreadsheet id");

  const owner = process.env.GOOGLE_SHEETS_OWNER_EMAIL;
  if (owner) {
    await drive.permissions.create({
      fileId: id,
      requestBody: { type: "user", role: "writer", emailAddress: owner },
      sendNotificationEmail: false,
    });
  }
  return { id, created: true };
}

async function ensureTabs(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  names: string[],
) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set((meta.data.sheets ?? []).map((sheet) => sheet.properties?.title).filter(Boolean));
  const missing = names.filter((name) => !existing.has(name));
  if (missing.length === 0) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    },
  });
}

function upsertRows(headers: string[], current: string[][], incoming: string[][]) {
  const existing = current.length ? current : [headers];
  const header = existing[0]?.length ? existing[0] : headers;
  const index = new Map<string, number>();
  existing.slice(1).forEach((row, offset) => {
    if (row[0]) index.set(row[0], offset + 1);
  });
  const next = existing.map((row) => [...row]);
  if (next.length === 0) next.push(header);
  for (const row of incoming) {
    const id = row[0];
    const found = index.get(id);
    if (found != null) {
      next[found] = row;
    } else {
      index.set(id, next.length);
      next.push(row);
    }
  }
  next[0] = header;
  return next;
}

export async function syncOrganizationToGoogleSheets() {
  const { sheets, drive } = sheetsClient();
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error("No organization found");

  const tabs = await loadTabs();
  const resolved = await resolveSpreadsheet(drive, sheets, org.googleSpreadsheetId);
  const spreadsheetId = resolved.id;
  await ensureTabs(
    sheets,
    spreadsheetId,
    tabs.map((tab) => tab.name),
  );

  for (const tab of tabs) {
    const current = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tab.name}'!A:Z`,
    });
    const merged = upsertRows(tab.headers, (current.data.values as string[][] | undefined) ?? [], tab.rows);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tab.name}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: merged.map((row) => row.map(cell)) },
    });
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "spreadsheetUrl" });
  const url = meta.data.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      googleSpreadsheetId: spreadsheetId,
      googleSpreadsheetUrl: url,
      lastSheetsSyncAt: new Date(),
    },
  });

  return {
    spreadsheetId,
    spreadsheetUrl: updated.googleSpreadsheetUrl,
    lastSheetsSyncAt: updated.lastSheetsSyncAt,
    tabs: tabs.map((tab) => ({ name: tab.name, rows: tab.rows.length })),
    createdNew: resolved.created,
  };
}
