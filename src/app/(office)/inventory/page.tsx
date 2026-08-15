import { AddEquipmentForm } from "@/components/inventory/AddEquipmentForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EQUIPMENT_TYPE_LABEL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const equipment = await prisma.equipment.findMany({
    include: {
      deployments: {
        where: { retrievedAt: null },
        include: { property: true, job: { include: { client: true } } },
        orderBy: { deployedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { serialNumber: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Traps & gear</h1>
        <p className="text-stone-600">
          Add cages, one-ways, and cameras here. Deploy them from the job you are standing on.
        </p>
      </div>
      <AddEquipmentForm serials={equipment.map((item) => item.serialNumber)} />
      {equipment.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-panel px-4 py-6 text-center text-sm text-stone-500">
          Nothing in inventory yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {equipment.map((item) => {
            const live = item.deployments.find((deployment) => !deployment.retrievedAt);
            return (
              <article key={item.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-orange">{item.serialNumber}</p>
                    <h2 className="font-semibold">{item.name}</h2>
                    <p className="text-sm text-stone-500">{EQUIPMENT_TYPE_LABEL[item.type] ?? item.type}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {live ? (
                  <p className="mt-3 text-sm">
                    {live.locationNote} · {live.property.address1}
                    {live.targetSpecies ? ` · ${live.targetSpecies}` : ""}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-stone-500">In the shop / truck stock.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
