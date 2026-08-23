import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clientSearchResult,
  equipmentSearchResult,
  invoiceSearchResult,
  jobSearchResult,
  normalizeSearchQuery,
  phoneSearchFilter,
  quoteSearchResult,
  searchQueryReady,
} from "@/lib/search";

import { isOfficeRole } from "@/lib/roles";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);

  const query = normalizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "");
  if (!searchQueryReady(query)) {
    return NextResponse.json({ results: [] });
  }

  const phone = phoneSearchFilter(query);

  const [clients, jobs, quotes, invoices, equipment] = await Promise.all([
    prisma.client.findMany({
      where: phone
        ? {
            OR: [
              { phone: { contains: phone } },
              { altPhone: { contains: phone } },
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { companyName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { companyName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { properties: { some: { address1: { contains: query, mode: "insensitive" } } } },
            ],
          },
      include: { properties: { take: 1, select: { address1: true, city: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 5,
    }),
    prisma.job.findMany({
      where: {
        OR: [
          { number: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
          { client: { firstName: { contains: query, mode: "insensitive" } } },
          { client: { lastName: { contains: query, mode: "insensitive" } } },
          { property: { address1: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { client: true, property: true },
      orderBy: { scheduledStart: "desc" },
      take: 5,
    }),
    prisma.quote.findMany({
      where: {
        OR: [
          { number: { contains: query, mode: "insensitive" } },
          { title: { contains: query, mode: "insensitive" } },
          { client: { firstName: { contains: query, mode: "insensitive" } } },
          { client: { lastName: { contains: query, mode: "insensitive" } } },
        ],
        ...(isOfficeRole(session.role)
          ? {}
          : {
              OR: [
                { createdById: session.id },
                { status: { in: ["SENT", "VIEWED", "APPROVED", "CONVERTED"] } },
              ],
            }),
      },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    isOfficeRole(session.role)
      ? prisma.invoice.findMany({
          where: {
            OR: [
              { number: { contains: query, mode: "insensitive" } },
              { client: { firstName: { contains: query, mode: "insensitive" } } },
              { client: { lastName: { contains: query, mode: "insensitive" } } },
            ],
          },
          include: { client: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.equipment.findMany({
      where: {
        OR: [
          { serialNumber: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { serialNumber: "asc" },
      take: 5,
    }),
  ]);

  const results = [
    ...clients.map(clientSearchResult),
    ...jobs.map(jobSearchResult),
    ...quotes.map(quoteSearchResult),
    ...invoices.map(invoiceSearchResult),
    ...equipment.map(equipmentSearchResult),
  ];

  return NextResponse.json({ results });
}
