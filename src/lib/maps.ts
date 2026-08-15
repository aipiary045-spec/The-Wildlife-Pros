export type MapPlace = {
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/** Street address wins. Coordinates are the fallback pin. */
export function mapsQuery(place: MapPlace) {
  const address = place.address?.replace(/\s+/g, " ").trim();
  if (address) return address;
  if (place.lat != null && place.lng != null && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    return `${place.lat},${place.lng}`;
  }
  return null;
}

export function googleMapsDirUrl(destination: MapPlace, waypoints: MapPlace[] = []) {
  const dest = mapsQuery(destination);
  if (!dest) return null;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", dest);
  url.searchParams.set("travelmode", "driving");
  const via = waypoints.map(mapsQuery).filter((value): value is string => Boolean(value));
  if (via.length) url.searchParams.set("waypoints", via.join("|"));
  return url.toString();
}

/** Ordered stops: origin is the phone’s current location. Last stop is the destination. */
export function googleMapsRouteUrl(stops: MapPlace[]) {
  const places = stops.filter((stop) => mapsQuery(stop));
  if (places.length === 0) return null;
  const destination = places[places.length - 1];
  const waypoints = places.slice(0, -1);
  return googleMapsDirUrl(destination, waypoints);
}

export function appleMapsDirUrl(destination: MapPlace) {
  const dest = mapsQuery(destination);
  if (!dest) return null;
  const url = new URL("https://maps.apple.com/");
  url.searchParams.set("daddr", dest);
  url.searchParams.set("dirflg", "d");
  return url.toString();
}
