import { prisma } from "@/lib/prisma";

/** Resolve typed species text to an existing id or a new common name for the API. */
export function matchSpeciesInput(
  query: string,
  species: Array<{ id: string; commonName: string }>,
): { speciesId?: string; speciesName?: string } {
  const name = query.trim();
  if (!name) return {};
  const match = species.find((item) => item.commonName.toLowerCase() === name.toLowerCase());
  if (match) return { speciesId: match.id };
  return { speciesName: name };
}

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
