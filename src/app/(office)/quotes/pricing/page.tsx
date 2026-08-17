import { redirect } from "next/navigation";
import { PriceListBoard } from "@/components/quotes/PriceListBoard";
import { QuotesSubnav } from "@/components/quotes/QuotesSubnav";
import { getSession } from "@/lib/auth";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";
import { canManagePriceList } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function QuotePricingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isTechnician(session.role) || !canManagePriceList(session.role)) redirect("/field");

  const services = await prisma.service.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Price list</h1>
        <p className="text-stone-600">
          Office catalog for quotes. Add a line, set the price, then pick it when you write an estimate.
        </p>
      </div>
      <QuotesSubnav current="pricing" />
      <PriceListBoard
        items={services.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          jobType: item.jobType,
          unitPrice: Number(item.unitPrice),
          taxable: item.taxable,
          active: item.active,
        }))}
      />
    </div>
  );
}
