"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { matchesClientSearch } from "@/lib/clients";
import { clientName, formatPhone } from "@/lib/utils";

export type ClientListRow = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  status: string;
  properties: Array<{ address1: string; city: string }>;
  _count: { jobs: number };
};

export function ClientList({ clients }: { clients: ClientListRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () => clients.filter((client) => matchesClientSearch(client, query)),
    [clients, query],
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="sr-only">Search clients</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, phone, or street"
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5"
        />
      </label>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-stone-500">
          {query.trim() ? "No clients match that search." : "No clients yet."}
        </p>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {visible.map((client) => {
              const property = client.properties[0];
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block rounded-2xl border border-line bg-panel p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{clientName(client)}</p>
                      <p className="text-sm text-stone-600">{formatPhone(client.phone)}</p>
                      {property ? (
                        <p className="text-sm text-stone-500">
                          {property.address1}, {property.city}
                        </p>
                      ) : null}
                      <p className="text-xs text-stone-500">
                        {client.properties.length} propert{client.properties.length === 1 ? "y" : "ies"} · {client._count.jobs}{" "}
                        job{client._count.jobs === 1 ? "" : "s"}
                      </p>
                    </div>
                    <StatusBadge status={client.status} />
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-panel md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Street</th>
                  <th className="px-4 py-3">Work orders</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((client) => {
                  const property = client.properties[0];
                  return (
                    <tr key={client.id} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link href={`/clients/${client.id}`} className="font-medium hover:text-orange">
                          {clientName(client)}
                        </Link>
                        <p className="text-xs text-stone-500">{client.email}</p>
                      </td>
                      <td className="px-4 py-3">{formatPhone(client.phone)}</td>
                      <td className="px-4 py-3">
                        {property ? `${property.address1}, ${property.city}` : "—"}
                        {client.properties.length > 1 ? (
                          <p className="text-xs text-stone-500">+{client.properties.length - 1} more</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{client._count.jobs}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={client.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
