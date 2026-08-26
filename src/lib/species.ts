import { prisma } from "@/lib/prisma";

export async function resolveSpeciesId(
  organizationId: string,
  input: { speciesId?: string; speciesName?: string },
) {
  if (input.speciesId) {
    const existing = await prisma.species.findFirst({
      where: { id: input.speciesId, organizationId },
      select: { id: true },
    });
    if (!existing) throw new Error("Species not found.");
    return existing.id;
  }
  const name = input.speciesName?.trim() ?? "";
  if (!name) throw new Error("Pick a species or type a new one.");
  const existing = await prisma.species.findFirst({
    where: { organizationId, commonName: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing.id;
  const created = await prisma.species.create({
    data: { organizationId, commonName: name },
  });
  return created.id;
}
