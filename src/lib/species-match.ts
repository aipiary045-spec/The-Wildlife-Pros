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
