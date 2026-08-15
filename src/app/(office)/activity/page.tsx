import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { DISPOSITION_LABEL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const captures = await prisma.captureEvent.findMany({
    include: {
      species: true,
      technician: true,
      job: { include: { client: true, property: true } },
      deployment: { include: { equipment: true } },
    },
    orderBy: { capturedAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Species & activity log</h1>
        <p className="text-stone-600">Captures, disposition, and which trap or entry they came from.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-background text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Species</th>
              <th className="px-4 py-3">Disposition</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Gear</th>
            </tr>
          </thead>
          <tbody>
            {captures.map((capture) => (
              <tr key={capture.id} className="border-t border-line">
                <td className="px-4 py-3">{format(capture.capturedAt, "MMM d, h:mm a")}</td>
                <td className="px-4 py-3">
                  {capture.quantity} {capture.species.commonName}
                </td>
                <td className="px-4 py-3">{DISPOSITION_LABEL[capture.disposition]}</td>
                <td className="px-4 py-3">
                  {capture.job.property.address1}
                  <p className="text-xs text-stone-500">{capture.locationNote}</p>
                </td>
                <td className="px-4 py-3">{capture.deployment?.equipment.serialNumber ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
