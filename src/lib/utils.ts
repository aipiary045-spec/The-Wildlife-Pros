import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number | string | { toString(): string }) {
  const amount = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatPhone(value?: string | null) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
}

export function clientName(client: {
  firstName: string;
  lastName: string;
  companyName?: string | null;
}) {
  const person = `${client.firstName} ${client.lastName}`.trim();
  return client.companyName ? `${client.companyName} · ${person}` : person;
}

export function propertyAddress(property: {
  address1: string;
  city: string;
  state: string;
  postalCode: string;
}) {
  return `${property.address1}, ${property.city}, ${property.state} ${property.postalCode}`;
}

export function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function nextNumber(prefix: string, count: number) {
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}
