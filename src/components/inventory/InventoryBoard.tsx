"use client";

import { useMemo, useState } from "react";
import { AddEquipmentForm } from "@/components/inventory/AddEquipmentForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EQUIPMENT_TYPE_LABEL } from "@/lib/constants";

type Gear = {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  status: string;
  locationId: string | null;
  location: { id: string; name: string } | null;
  deployments: Array<{
    locationNote: string;
    targetSpecies: string | null;
    property: { address1: string };
  }>;
};

export function InventoryBoard({
  equipment,
  locations,
  serials,
}: {
  equipment: Gear[];
  locations: Array<{ id: string; name: string }>;
  serials: string[];
}) {
  const [filter, setFilter] = useState("all");
  const groups = useMemo(() => {
    const byLocation = new Map<string, Gear[]>();
    for (const item of equipment) {
      const key =
        item.status === "DEPLOYED" || item.status === "ACTIVE_CAPTURE" || item.status === "NEEDS_CHECK"
          ? "In the field"
          : item.location?.name ?? "Unassigned location";
      byLocation.set(key, [...(byLocation.get(key) ?? []), item]);
    }
    return [...byLocation.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [equipment]);

  const visible = filter === "all" ? groups : groups.filter(([name]) => name === filter);

  return (
    <div className="space-y-5">
      <AddEquipmentForm serials={serials} locations={locations} />
      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        {groups.map(([name, items]) => (
          <FilterChip key={name} label={`${name} (${items.length})`} active={filter === name} onClick={() => setFilter(name)} />
        ))}
      </div>
      {visible.map(([name, items]) => (
        <section key={name} className="space-y-2">
          <h2 className="font-semibold">{name}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const live = item.deployments[0];
              return (
                <article key={item.id} className="rounded-2xl border border-line bg-panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-orange">{item.serialNumber}</p>
                      <h3 className="font-semibold">{item.name}</h3>
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
                    <p className="mt-3 text-sm text-stone-500">{item.location?.name ?? "No location assigned"}</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm font-semibold ${active ? "bg-orange text-white" : "border border-line text-stone-600"}`}
    >
      {label}
    </button>
  );
}
