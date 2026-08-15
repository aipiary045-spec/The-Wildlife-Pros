import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const equipment = await prisma.equipment.findMany({
    include: {
      deployments: {
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
        <h1 className="font-display text-3xl tracking-wide">Traps & gear</h1>
        <p className="text-stone-600">Serialized inventory mapped to job sites — cage traps, one-ways, cameras.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {equipment.map((item) => {
          const live = item.deployments[0];
          return (
            <article key={item.id} className="rounded-2xl border border-line bg-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-orange">{item.serialNumber}</p>
                  <h2 className="font-semibold">{item.name}</h2>
                  <p className="text-sm text-stone-500">{item.type.replaceAll("_", " ")}</p>
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
    </div>
  );
}
