import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { nextNumber } from "@/lib/utils";
import { jobTypeFromQuoteLines, quoteCanConvert } from "@/lib/quotes";

export class QuoteError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "QuoteError";
    this.status = status;
  }
}

export async function convertQuoteToJob(input: {
  quoteId: string;
  createdById: string;
  technicianId?: string;
  scheduledStart?: Date;
  durationMin?: number;
}) {
  const quote = await prisma.quote.findUnique({
    where: { id: input.quoteId },
    include: { lineItems: { include: { service: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!quote) throw new QuoteError("Quote not found", 404);
  if (!quote.propertyId) throw new QuoteError("Add a service address before converting this quote.");
  if (!quoteCanConvert(quote.status)) throw new QuoteError("This quote cannot be converted to a job.");

  const durationMin = input.durationMin ?? 60;
  const scheduledStart = input.scheduledStart ?? null;
  const scheduledEnd = scheduledStart ? addMinutes(scheduledStart, durationMin) : null;
  const type = jobTypeFromQuoteLines(
    quote.lineItems.map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      taxable: item.taxable,
      serviceId: item.serviceId,
      service: item.service,
    })),
  );

  return prisma.$transaction(async (tx) => {
    const count = await tx.job.count();
    const job = await tx.job.create({
      data: {
        number: nextNumber("JOB", count),
        clientId: quote.clientId,
        propertyId: quote.propertyId!,
        quoteId: quote.id,
        technicianId: input.technicianId,
        createdById: input.createdById,
        type: type as never,
        status: scheduledStart ? "SCHEDULED" : "UNSCHEDULED",
        title: quote.title,
        instructions: quote.message,
        scheduledStart,
        scheduledEnd,
        durationMin,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        includedTrips: quote.includedTrips,
        lineItems: {
          create: quote.lineItems.map((item) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxable: item.taxable,
            serviceId: item.serviceId,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { client: true, property: true, technician: true },
    });
    await tx.quote.update({
      where: { id: quote.id },
      data: { status: "CONVERTED" },
    });
    return job;
  });
}
