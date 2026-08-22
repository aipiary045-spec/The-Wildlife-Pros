import { redirect } from "next/navigation";
import { IntakeBoard } from "@/components/intake/IntakeBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAppContext } from "@/lib/app-context";
import { canManageIntake, phoneDigits } from "@/lib/intake";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CallLogPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const context = await getAppContext();
  if (!context) redirect("/login");
  if (context.fieldView || !canManageIntake(context.session.role)) redirect("/field");

  const params = await searchParams;
  const [requests, clients, technicians] = await Promise.all([
    prisma.serviceRequest.findMany({
      include: { client: true, property: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      include: { properties: { select: { id: true, address1: true, city: true, state: true, postalCode: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["TECHNICIAN", "ADMIN"] } },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Call log"
        description="Open calls wait for a quote or a first trip. Log a new one only when you need to."
        related={[
          { href: "/quotes", label: "Quotes" },
          { href: "/clients", label: "Clients" },
        ]}
      />
      <IntakeBoard
        initialPhone={phoneDigits(params.phone)}
        clients={clients}
        technicians={technicians}
        requests={requests.map((item) => ({
          id: item.id,
          title: item.title,
          details: item.details,
          status: item.status,
          source: item.source,
          preferredAt: item.preferredAt,
          createdAt: item.createdAt,
          client: item.client,
          property: item.property
            ? { id: item.property.id, address1: item.property.address1, city: item.property.city }
            : null,
        }))}
      />
    </div>
  );
}
