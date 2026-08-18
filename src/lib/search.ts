import { phoneDigits } from "@/lib/intake";
import { clientName, propertyAddress } from "@/lib/utils";

export type SearchResultKind = "client" | "job" | "quote" | "invoice";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  href: string;
};

export function normalizeSearchQuery(query: string) {
  return query.trim();
}

export function searchQueryReady(query: string) {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length >= 2) return true;
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 3;
}

export function groupSearchResults(results: SearchResult[]) {
  const order: SearchResultKind[] = ["client", "job", "quote", "invoice"];
  return order
    .map((kind) => ({
      kind,
      items: results.filter((item) => item.kind === kind),
    }))
    .filter((group) => group.items.length > 0);
}

export const SEARCH_KIND_LABEL: Record<SearchResultKind, string> = {
  client: "Clients",
  job: "Work orders",
  quote: "Quotes",
  invoice: "Invoices",
};

export function clientSearchResult(client: {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  phone?: string | null;
  properties: Array<{ address1: string; city: string }>;
}): SearchResult {
  const property = client.properties[0];
  return {
    id: client.id,
    kind: "client",
    title: clientName(client),
    subtitle: [client.phone, property ? `${property.address1}, ${property.city}` : ""].filter(Boolean).join(" · "),
    href: `/clients/${client.id}`,
  };
}

export function jobSearchResult(job: {
  id: string;
  number: string;
  title: string;
  client: { firstName: string; lastName: string; companyName?: string | null };
  property: { address1: string; city: string; state: string; postalCode: string };
}): SearchResult {
  return {
    id: job.id,
    kind: "job",
    title: `${job.number} · ${job.title}`,
    subtitle: `${clientName(job.client)} · ${propertyAddress(job.property)}`,
    href: `/jobs/${job.id}`,
  };
}

export function quoteSearchResult(quote: {
  id: string;
  number: string;
  title: string;
  client: { firstName: string; lastName: string; companyName?: string | null };
}): SearchResult {
  return {
    id: quote.id,
    kind: "quote",
    title: `${quote.number} · ${quote.title}`,
    subtitle: clientName(quote.client),
    href: `/quotes/${quote.id}`,
  };
}

export function invoiceSearchResult(invoice: {
  id: string;
  number: string;
  client: { firstName: string; lastName: string; companyName?: string | null };
  balance: { toString(): string } | number;
}): SearchResult {
  return {
    id: invoice.id,
    kind: "invoice",
    title: invoice.number,
    subtitle: `${clientName(invoice.client)} · $${Number(invoice.balance).toFixed(2)} due`,
    href: `/invoices/${invoice.id}`,
  };
}

export function phoneSearchFilter(query: string) {
  const digits = phoneDigits(query);
  if (digits.length < 3) return null;
  return digits;
}
