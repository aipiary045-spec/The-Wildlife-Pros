import { InventoryBoard } from "@/components/inventory/InventoryBoard";
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
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Traps & gear</h1>
        <p className="text-stone-600">
          Sorted by where it lives — shop, truck, shed — plus what is currently in the field.
        </p>
      </div>
      <InventoryBoard
        serials={equipment.map((item) => item.serialNumber)}
        locations={locations}
        equipment={equipment}
      />
    </div>
  );
}
