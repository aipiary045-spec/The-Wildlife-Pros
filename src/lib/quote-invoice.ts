import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { nextNumber } from "@/lib/utils";
import { quoteCanInvoice } from "@/lib/quotes";

export class QuoteInvoiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "QuoteInvoiceError";
    this.status = status;
  }
}

export async function convertQuoteToInvoice(input: { quoteId: string; createdById: string }) {
  const quote = await prisma.quote.findUnique({
    where: { id: input.quoteId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      invoices: { select: { id: true } },
    },
  });
  if (!quote) throw new QuoteInvoiceError("Quote not found", 404);
  if (!quoteCanInvoice(quote.status)) {
    throw new QuoteInvoiceError("This quote cannot be invoiced yet. Send it to the customer and get approval first.");
  }
  if (quote.invoices.length > 0) throw new QuoteInvoiceError("This quote already has an invoice.");

  const items = quote.lineItems.map((item) => ({
    name: item.name,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    taxable: item.taxable,
    serviceId: item.serviceId ?? undefined,
  }));

  return prisma.$transaction(async (tx) => {
    const count = await tx.invoice.count();
    const invoice = await tx.invoice.create({
      data: {
        number: nextNumber("INV", count),
        clientId: quote.clientId,
        propertyId: quote.propertyId,
        quoteId: quote.id,
        createdById: input.createdById,
        status: "DRAFT",
        dueOn: addDays(new Date(), 14),
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        balance: quote.total,
        lineItems: {
          create: quote.lineItems.map((item, index) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxable: item.taxable,
            serviceId: item.serviceId,
            sortOrder: index,
          })),
        },
      },
      include: { lineItems: true, client: true },
    });

    if (quote.status === "SENT" || quote.status === "VIEWED") {
      await tx.quote.update({
        where: { id: quote.id },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
    }

    return invoice;
  });
}
