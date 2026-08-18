import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { resolvePropertyCoordinates } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError("Sign in required", 401);
  const { id } = await context.params;
  const body = await request.json();
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) return jsonError("Property not found", 404);

  const address1 = typeof body.address1 === "string" ? body.address1.trim() : existing.address1;
  const city = typeof body.city === "string" ? body.city.trim() : existing.city;
  const state = typeof body.state === "string" ? body.state.trim() : existing.state;
  const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : existing.postalCode;
  const addressChanged =
    address1 !== existing.address1 ||
    city !== existing.city ||
    state !== existing.state ||
    postalCode !== existing.postalCode;

  const coords = addressChanged
    ? await resolvePropertyCoordinates({ address1, city, state, postalCode, lat: null, lng: null })
    : { lat: existing.lat, lng: existing.lng };

  const property = await prisma.property.update({
    where: { id },
    data: {
      label: typeof body.label === "string" ? body.label.trim() || "Primary" : existing.label,
      address1,
      address2: typeof body.address2 === "string" ? body.address2.trim() || null : existing.address2,
      city,
      state,
      postalCode,
      accessNotes: typeof body.accessNotes === "string" ? body.accessNotes.trim() || null : existing.accessNotes,
      gateCode: typeof body.gateCode === "string" ? body.gateCode.trim() || null : existing.gateCode,
      petsOnSite: typeof body.petsOnSite === "boolean" ? body.petsOnSite : existing.petsOnSite,
      lat: coords.lat,
      lng: coords.lng,
    },
  });

  return NextResponse.json({ property });
}
