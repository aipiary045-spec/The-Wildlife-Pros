import Link from "next/link";
import { format } from "date-fns";
import { DISPOSITION_LABEL } from "@/lib/constants";

export type CaptureLogRow = {
  id: string;
  capturedAt: Date;
  quantity: number;
  disposition: string;
  locationNote: string | null;
  species: { commonName: string };
  job: { id: string; number: string; property: { address1: string } };
  client?: { id: string; firstName: string; lastName: string; companyName?: string | null };
  deployment?: { equipment: { serialNumber: string } } | null;
};

function clientLabel(client: NonNullable<CaptureLogRow["client"]>) {
  const person = `${client.firstName} ${client.lastName}`.trim();
  return client.companyName ? `${client.companyName} · ${person}` : person;
}

export function CaptureLog({
  captures,
  showClient = false,
  showJob = false,
  emptyMessage = "No captures logged yet.",
}: {
  captures: CaptureLogRow[];
  showClient?: boolean;
  showJob?: boolean;
  emptyMessage?: string;
}) {
  if (captures.length === 0) {
    return <p className="text-sm text-stone-600">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {captures.map((capture) => (
          <article key={capture.id} className="rounded-xl border border-line bg-background p-3">
            <p className="text-xs text-stone-500">{format(capture.capturedAt, "MMM d, h:mm a")}</p>
            <p className="font-semibold">
              {capture.quantity} {capture.species.commonName}
            </p>
            <p className="text-sm text-stone-600">{DISPOSITION_LABEL[capture.disposition]}</p>
            {showClient && capture.client ? (
              <p className="text-sm">
                <Link href={`/clients/${capture.client.id}`} className="font-medium text-orange hover:underline">
                  {clientLabel(capture.client)}
                </Link>
              </p>
            ) : null}
            {showJob ? (
              <p className="text-sm">
                <Link href={`/jobs/${capture.job.id}`} className="font-medium text-orange hover:underline">
                  {capture.job.number}
                </Link>
                <span className="text-stone-600"> · {capture.job.property.address1}</span>
              </p>
            ) : (
              <p className="text-xs text-stone-500">
                {capture.job.property.address1}
                {capture.locationNote ? ` · ${capture.locationNote}` : ""}
                {capture.deployment?.equipment.serialNumber ? ` · ${capture.deployment.equipment.serialNumber}` : ""}
              </p>
            )}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Species</th>
              <th className="px-3 py-2">Disposition</th>
              {showClient ? <th className="px-3 py-2">Client</th> : null}
              {showJob ? <th className="px-3 py-2">Job</th> : null}
              <th className="px-3 py-2">Site</th>
              <th className="px-3 py-2">Gear</th>
            </tr>
          </thead>
          <tbody>
            {captures.map((capture) => (
              <tr key={capture.id} className="border-t border-line">
                <td className="px-3 py-2">{format(capture.capturedAt, "MMM d, h:mm a")}</td>
                <td className="px-3 py-2">
                  {capture.quantity} {capture.species.commonName}
                </td>
                <td className="px-3 py-2">{DISPOSITION_LABEL[capture.disposition]}</td>
                {showClient && capture.client ? (
                  <td className="px-3 py-2">
                    <Link href={`/clients/${capture.client.id}`} className="font-medium text-orange hover:underline">
                      {clientLabel(capture.client)}
                    </Link>
                  </td>
                ) : null}
                {showJob ? (
                  <td className="px-3 py-2">
                    <Link href={`/jobs/${capture.job.id}`} className="font-medium text-orange hover:underline">
                      {capture.job.number}
                    </Link>
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  {capture.job.property.address1}
                  {capture.locationNote ? <p className="text-xs text-stone-500">{capture.locationNote}</p> : null}
                </td>
                <td className="px-3 py-2">{capture.deployment?.equipment.serialNumber ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
