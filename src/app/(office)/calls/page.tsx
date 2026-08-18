import { redirect } from "next/navigation";
import { IntakeBoard } from "@/components/intake/IntakeBoard";
import { getSession } from "@/lib/auth";
import { canManageIntake, phoneDigits } from "@/lib/intake";
import { isTechnician } from "@/lib/paths";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CallLogPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isTechnician(session.role) || !canManageIntake(session.role)) redirect("/field");

  const params = await searchParams;
  const [requests, clients] = await Promise.all([
    prisma.serviceRequest.findMany({
      include: { client: true, property: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      include: { properties: { select: { id: true, address1: true, city: true, state: true, postalCode: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl tracking-wide md:text-3xl">Call log</h1>
        <p className="text-stone-600">
          Open calls wait for a quote or a first trip. Log a new one only when you need to.
        </p>
      </div>
      <IntakeBoard
        initialPhone={phoneDigits(params.phone)}
        clients={clients}
        requests={requests.map((item) => ({
          id: item.id,
          title: item.title,
          details: item.details,
          status: item.status,
          source: item.source,
          preferredAt: item.preferredAt,
          createdAt: item.createdAt,
          client: item.client,
          property: item.property,
        }))}
      />
    </div>
  );
}
