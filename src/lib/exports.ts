import { prisma } from "@/lib/prisma";
import { clientName, formatPhone, propertyAddress } from "@/lib/utils";

export type ExportTab = {
  name: string;
  headers: string[];
  rows: string[][];
};

export const EXPORT_CATEGORIES = {
  clients: {
    id: "clients",
    label: "Clients",
    sheetName: "Clients",
    description: "Names, contact info, status, and property addresses.",
  },
  properties: {
    id: "properties",
    label: "Properties",
    sheetName: "Properties",
    description: "Every service address with access notes and coordinates.",
  },
  quotes: {
    id: "quotes",
    label: "Quotes",
    sheetName: "Quotes",
    description: "Estimates, totals, status, and linked client.",
  },
  jobs: {
    id: "jobs",
    label: "Work orders",
    sheetName: "Jobs",
    description: "Jobs on the book with schedule, tech, and totals.",
  },
  invoices: {
    id: "invoices",
    label: "Invoices",
    sheetName: "Invoices",
    description: "Billed work, balances, and due dates.",
  },
  payments: {
    id: "payments",
    label: "Payments",
    sheetName: "Payments",
    description: "Square, cash, and check payments against invoices.",
  },
  species: {
    id: "species",
    label: "Species log",
    sheetName: "Captures",
    description: "Captures, disposition, client, job, and site.",
  },
  traps: {
    id: "traps",
    label: "Traps & gear",
    sheetName: "Traps",
    description: "Serialized equipment and latest field location.",
  },
  deployments: {
    id: "deployments",
    label: "Trap deployments",
    sheetName: "Deployments",
    description: "What is set where, bait, target species, and status.",
  },
  timesheets: {
    id: "timesheets",
    label: "Timesheets",
    sheetName: "Timesheets",
    description: "Daily punches, break time, and approval status.",
  },
  team: {
    id: "team",
    label: "Team",
    sheetName: "Team",
    description: "Staff logins, roles, and contact info.",
  },
  "price-list": {
    id: "price-list",
    label: "Price list",
    sheetName: "Price list",
    description: "Quote catalog lines, prices, and visibility.",
  },
  intake: {
    id: "intake",
    label: "Intake requests",
    sheetName: "Intake",
    description: "Inbound service requests before they become clients.",
  },
} as const;

export type ExportCategoryId = keyof typeof EXPORT_CATEGORIES;

export const EXPORT_CATEGORY_IDS = Object.keys(EXPORT_CATEGORIES) as ExportCategoryId[];

export function isExportCategory(value: string): value is ExportCategoryId {
  return value in EXPORT_CATEGORIES;
}

function cell(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function toCsv(tab: ExportTab) {
  const escape = (value: string) => {
    if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
    return value;
  };
  return [tab.headers, ...tab.rows]
    .map((row) => row.map((value) => escape(cell(value))).join(","))
    .join("\r\n");
}

export function exportFilename(category: ExportCategoryId, when = new Date()) {
  const stamp = when.toISOString().slice(0, 10);
  return `critterops-${category}-${stamp}.csv`;
}

async function loadClientsTab(): Promise<ExportTab> {
  const clients = await prisma.client.findMany({
    include: { properties: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return {
    name: EXPORT_CATEGORIES.clients.sheetName,
    headers: [
      "id",
      "firstName",
      "lastName",
      "company",
      "email",
      "phone",
      "status",
      "notes",
      "createdAt",
      "properties",
    ],
    rows: clients.map((item) => [
      item.id,
      item.firstName,
      item.lastName,
      item.companyName ?? "",
      item.email ?? "",
      formatPhone(item.phone),
      item.status,
      item.notes ?? "",
      item.createdAt.toISOString(),
      item.properties.map((property) => `${property.label}: ${propertyAddress(property)}`).join(" | "),
    ]),
  };
}

async function loadPropertiesTab(): Promise<ExportTab> {
  const properties = await prisma.property.findMany({
    include: { client: true },
    orderBy: [{ client: { lastName: "asc" } }, { label: "asc" }],
  });
  return {
    name: EXPORT_CATEGORIES.properties.sheetName,
    headers: [
      "id",
      "client",
      "label",
      "address1",
      "city",
      "state",
      "postalCode",
      "lat",
      "lng",
      "accessNotes",
      "petsOnSite",
    ],
    rows: properties.map((item) => [
      item.id,
      clientName(item.client),
      item.label,
      item.address1,
      item.city,
      item.state,
      item.postalCode,
      item.lat == null ? "" : String(item.lat),
      item.lng == null ? "" : String(item.lng),
      item.accessNotes ?? "",
      item.petsOnSite ? "yes" : "no",
    ]),
  };
}

async function loadQuotesTab(): Promise<ExportTab> {
  const quotes = await prisma.quote.findMany({
    include: { client: true, property: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    name: EXPORT_CATEGORIES.quotes.sheetName,
    headers: ["id", "number", "title", "client", "address", "status", "total", "validUntil", "createdAt"],
    rows: quotes.map((item) => [
      item.id,
      item.number,
      item.title,
      clientName(item.client),
      item.property ? propertyAddress(item.property) : "",
      item.status,
      String(item.total),
      item.validUntil?.toISOString() ?? "",
      item.createdAt.toISOString(),
    ]),
  };
}

async function loadJobsTab(): Promise<ExportTab> {
  const jobs = await prisma.job.findMany({
    include: { client: true, property: true, technician: true },
    orderBy: { scheduledStart: "asc" },
  });
  return {
    name: EXPORT_CATEGORIES.jobs.sheetName,
    headers: [
      "id",
      "number",
      "title",
      "type",
      "status",
      "client",
      "address",
      "technician",
      "scheduledStart",
      "scheduledEnd",
      "total",
      "createdAt",
    ],
    rows: jobs.map((item) => [
      item.id,
      item.number,
      item.title,
      item.type,
      item.status,
      clientName(item.client),
      propertyAddress(item.property),
      item.technician ? `${item.technician.firstName} ${item.technician.lastName}` : "",
      item.scheduledStart?.toISOString() ?? "",
      item.scheduledEnd?.toISOString() ?? "",
      String(item.total),
      item.createdAt.toISOString(),
    ]),
  };
}

async function loadInvoicesTab(): Promise<ExportTab> {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, job: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    name: EXPORT_CATEGORIES.invoices.sheetName,
    headers: ["id", "number", "client", "job", "status", "total", "balance", "dueOn", "createdAt"],
    rows: invoices.map((item) => [
      item.id,
      item.number,
      clientName(item.client),
      item.job?.number ?? "",
      item.status,
      String(item.total),
      String(item.balance),
      item.dueOn?.toISOString() ?? "",
      item.createdAt.toISOString(),
    ]),
  };
}

async function loadPaymentsTab(): Promise<ExportTab> {
  const payments = await prisma.payment.findMany({
    include: { invoice: { include: { client: true } } },
    orderBy: { receivedOn: "desc" },
  });
  return {
    name: EXPORT_CATEGORIES.payments.sheetName,
    headers: ["id", "invoice", "client", "amount", "method", "reference", "squarePaymentId", "receivedOn"],
    rows: payments.map((item) => [
      item.id,
      item.invoice.number,
      clientName(item.invoice.client),
      String(item.amount),
      item.method,
      item.reference ?? "",
      item.squarePaymentId ?? "",
      item.receivedOn.toISOString(),
    ]),
  };
}

async function loadSpeciesTab(): Promise<ExportTab> {
  const captures = await prisma.captureEvent.findMany({
    include: {
      species: true,
      technician: true,
      job: { include: { client: true, property: true } },
      deployment: { include: { equipment: true } },
    },
    orderBy: { capturedAt: "desc" },
  });
  return {
    name: EXPORT_CATEGORIES.species.sheetName,
    headers: [
      "id",
      "species",
      "quantity",
      "disposition",
      "client",
      "job",
      "address",
      "locationNote",
      "gear",
      "technician",
      "capturedAt",
    ],
    rows: captures.map((item) => [
      item.id,
      item.species.commonName,
      String(item.quantity),
      item.disposition,
      clientName(item.job.client),
      item.job.number,
      item.job.property.address1,
      item.locationNote ?? "",
      item.deployment?.equipment.serialNumber ?? "",
      item.technician ? `${item.technician.firstName} ${item.technician.lastName}` : "",
      item.capturedAt.toISOString(),
    ]),
  };
}

async function loadTrapsTab(): Promise<ExportTab> {
  const traps = await prisma.equipment.findMany({
    include: { deployments: { include: { property: true }, take: 1, orderBy: { deployedAt: "desc" } } },
    orderBy: { serialNumber: "asc" },
  });
  return {
    name: EXPORT_CATEGORIES.traps.sheetName,
    headers: ["id", "serialNumber", "name", "type", "status", "manufacturer", "location"],
    rows: traps.map((item) => [
      item.id,
      item.serialNumber,
      item.name,
      item.type,
      item.status,
      item.manufacturer ?? "",
      item.deployments[0]?.locationNote ?? "",
    ]),
  };
}

async function loadDeploymentsTab(): Promise<ExportTab> {
  const deployments = await prisma.equipmentDeployment.findMany({
    include: {
      equipment: true,
      property: { include: { client: true } },
      job: true,
    },
    orderBy: { deployedAt: "desc" },
  });
  return {
    name: EXPORT_CATEGORIES.deployments.sheetName,
    headers: [
      "id",
      "serialNumber",
      "client",
      "job",
      "address",
      "status",
      "targetSpecies",
      "baitUsed",
      "locationNote",
      "deployedAt",
      "retrievedAt",
    ],
    rows: deployments.map((item) => [
      item.id,
      item.equipment.serialNumber,
      clientName(item.property.client),
      item.job.number,
      propertyAddress(item.property),
      item.status,
      item.targetSpecies ?? "",
      item.baitUsed ?? "",
      item.locationNote ?? "",
      item.deployedAt.toISOString(),
      item.retrievedAt?.toISOString() ?? "",
    ]),
  };
}

async function loadTimesheetsTab(): Promise<ExportTab> {
  const timesheets = await prisma.timesheet.findMany({
    include: { user: true, punches: true },
    orderBy: { date: "desc" },
  });
  return {
    name: EXPORT_CATEGORIES.timesheets.sheetName,
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
  };
}

async function loadTeamTab(): Promise<ExportTab> {
  const users = await prisma.user.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  return {
    name: EXPORT_CATEGORIES.team.sheetName,
    headers: ["id", "firstName", "lastName", "email", "phone", "role", "status", "color"],
    rows: users.map((item) => [
      item.id,
      item.firstName,
      item.lastName,
      item.email,
      formatPhone(item.phone),
      item.role,
      item.status,
      item.color ?? "",
    ]),
  };
}

async function loadPriceListTab(): Promise<ExportTab> {
  const services = await prisma.service.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return {
    name: EXPORT_CATEGORIES["price-list"].sheetName,
    headers: ["id", "name", "description", "jobType", "unitPrice", "taxable", "active"],
    rows: services.map((item) => [
      item.id,
      item.name,
      item.description ?? "",
      item.jobType,
      String(item.unitPrice),
      item.taxable ? "yes" : "no",
      item.active ? "yes" : "no",
    ]),
  };
}

async function loadIntakeTab(): Promise<ExportTab> {
  const requests = await prisma.serviceRequest.findMany({
    include: { client: true, property: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    name: EXPORT_CATEGORIES.intake.sheetName,
    headers: ["id", "title", "client", "address", "status", "details", "createdAt"],
    rows: requests.map((item) => [
      item.id,
      item.title,
      item.client ? clientName(item.client) : "",
      item.property ? propertyAddress(item.property) : "",
      item.status,
      item.details ?? "",
      item.createdAt.toISOString(),
    ]),
  };
}

const LOADERS: Record<ExportCategoryId, () => Promise<ExportTab>> = {
  clients: loadClientsTab,
  properties: loadPropertiesTab,
  quotes: loadQuotesTab,
  jobs: loadJobsTab,
  invoices: loadInvoicesTab,
  payments: loadPaymentsTab,
  species: loadSpeciesTab,
  traps: loadTrapsTab,
  deployments: loadDeploymentsTab,
  timesheets: loadTimesheetsTab,
  team: loadTeamTab,
  "price-list": loadPriceListTab,
  intake: loadIntakeTab,
};

export async function loadExportTab(category: ExportCategoryId) {
  return LOADERS[category]();
}

export async function loadExportTabs(categories: ExportCategoryId[] = EXPORT_CATEGORY_IDS) {
  const unique = [...new Set(categories)];
  return Promise.all(unique.map((category) => loadExportTab(category)));
}

export async function loadExportRowCounts() {
  const [
    clients,
    properties,
    quotes,
    jobs,
    invoices,
    payments,
    species,
    traps,
    deployments,
    timesheets,
    team,
    priceList,
    intake,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.property.count(),
    prisma.quote.count(),
    prisma.job.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.captureEvent.count(),
    prisma.equipment.count(),
    prisma.equipmentDeployment.count(),
    prisma.timesheet.count(),
    prisma.user.count(),
    prisma.service.count(),
    prisma.serviceRequest.count(),
  ]);
  return {
    clients,
    properties,
    quotes,
    jobs,
    invoices,
    payments,
    species,
    traps,
    deployments,
    timesheets,
    team,
    "price-list": priceList,
    intake,
  } satisfies Record<ExportCategoryId, number>;
}
