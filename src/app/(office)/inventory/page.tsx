import { InventoryBoard } from "@/components/inventory/InventoryBoard";
import { PageHeader } from "@/components/layout/PageHeader";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getSession();
  const [equipment, locations] = await Promise.all([
    prisma.equipment.findMany({
      include: {
        location: true,
        deployments: {
          where: { retrievedAt: null },
          include: { property: true, job: { include: { client: true } } },
          orderBy: { deployedAt: "desc" },
          take: 1,
        },
        _count: { select: { deployments: true } },
      },
      orderBy: { serialNumber: "asc" },
    }),
    prisma.inventoryLocation.findMany({
      where: session ? { organizationId: session.organizationId } : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Traps & gear"
        description="Sorted by where it lives — shop, truck, shed — plus what is currently in the field."
        related={[{ href: "/activity", label: "Species log" }]}
      />
      <InventoryBoard
        serials={equipment.map((item) => item.serialNumber)}
        locations={locations}
        equipment={equipment.map((item) => ({
          ...item,
          deploymentCount: item._count.deployments,
        }))}
      />
    </div>
  );
}
