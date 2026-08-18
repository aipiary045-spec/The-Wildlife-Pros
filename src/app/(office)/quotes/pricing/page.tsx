import { redirect } from "next/navigation";
import { PriceListBoard } from "@/components/quotes/PriceListBoard";
import { QuotesSubnav } from "@/components/quotes/QuotesSubnav";
import { PageHeader } from "@/components/layout/PageHeader";
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
      <PageHeader
        title="Price list"
        description="Office catalog for quotes. Add a line, set the price, then pick it when you write an estimate."
        related={[{ href: "/quotes", label: "Quotes" }]}
      />
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
