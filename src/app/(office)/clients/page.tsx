import { prisma } from "@/lib/prisma";
import { NewClientButton } from "@/components/crm/NewClientDialog";
import { ClientList } from "@/components/crm/ClientList";
import { PageHeader } from "@/components/layout/PageHeader";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: { properties: true, _count: { select: { jobs: true, invoices: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        description="Names, phones, and service addresses. Open a person to edit the record or add another property."
        related={[{ href: "/jobs", label: "Jobs" }]}
        actions={<NewClientButton />}
      />
      <ClientList clients={clients} />
    </div>
  );
}
