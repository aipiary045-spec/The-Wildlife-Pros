import { format } from "date-fns";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const [applications, submissions, products] = await Promise.all([
    prisma.chemicalApplication.findMany({
      include: { product: true, job: { include: { property: true, client: true } }, technician: true },
      orderBy: { appliedAt: "desc" },
    }),
    prisma.formSubmission.findMany({
      include: { template: true, job: true, technician: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.chemicalProduct.findMany({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-wide">Compliance</h1>
        <p className="text-stone-600">
          EPA product log, application rates, and state wildlife / pesticide forms.
        </p>
      </div>
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-semibold">Chemical library</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="rounded-xl bg-background px-3 py-2 text-sm">
              <p className="font-medium">{product.name}</p>
              <p className="text-stone-500">EPA {product.epaNumber}</p>
              <p className="text-xs">{product.activeIngredient}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-semibold">Applications</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-stone-500">
            <tr>
              <th className="py-2">Date</th>
              <th className="py-2">Product</th>
              <th className="py-2">Target</th>
              <th className="py-2">Rate</th>
              <th className="py-2">Site</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-t border-line">
                <td className="py-2">{format(app.appliedAt, "MMM d")}</td>
                <td className="py-2">
                  {app.product.name}
                  <p className="text-xs text-stone-500">{app.product.epaNumber}</p>
                </td>
                <td className="py-2">{app.targetPests}</td>
                <td className="py-2">{app.rate}</td>
                <td className="py-2">{app.job.property.address1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 font-semibold">Filed forms</h2>
        {submissions.map((item) => (
          <p key={item.id} className="py-1 text-sm">
            {item.template.name} · {item.template.jurisdiction} · {format(item.submittedAt, "PPP")}
          </p>
        ))}
      </section>
    </div>
  );
}
