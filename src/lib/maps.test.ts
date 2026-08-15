import assert from "node:assert/strict";
import { test } from "node:test";
import { appleMapsDirUrl, googleMapsDirUrl, googleMapsRouteUrl, mapsQuery } from "./maps";

test("mapsQuery prefers the street address over GPS", () => {
  assert.equal(
    mapsQuery({
      address: "812 Willow Crest Ln, Charlotte, NC 28210",
      lat: 35.168,
      lng: -80.848,
    }),
    "812 Willow Crest Ln, Charlotte, NC 28210",
  );
});

test("mapsQuery falls back to coordinates when there is no address", () => {
  assert.equal(mapsQuery({ address: "  ", lat: 35.2, lng: -80.84 }), "35.2,-80.84");
  assert.equal(mapsQuery({}), null);
});

test("Google Maps dir URL sends the address as destination", () => {
  const url = googleMapsDirUrl({
    address: "812 Willow Crest Ln, Charlotte, NC 28210",
    lat: 35.168,
    lng: -80.848,
  });
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("destination"), "812 Willow Crest Ln, Charlotte, NC 28210");
  assert.equal(parsed.searchParams.get("travelmode"), "driving");
  assert.equal(parsed.searchParams.get("origin"), null);
});

test("multi-stop route uses current location as origin and addresses as waypoints", () => {
  const url = googleMapsRouteUrl([
    { address: "812 Willow Crest Ln, Charlotte, NC 28210" },
    { address: "200 Oakridge Club Dr, Charlotte, NC 28211" },
    { address: "640 Riverbend Rd, Matthews, NC 28105" },
  ]);
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("destination"), "640 Riverbend Rd, Matthews, NC 28105");
  assert.equal(
    parsed.searchParams.get("waypoints"),
    "812 Willow Crest Ln, Charlotte, NC 28210|200 Oakridge Club Dr, Charlotte, NC 28211",
  );
});

test("Apple Maps dir URL also uses the address", () => {
  const url = appleMapsDirUrl({ address: "101 Park Ave, Charlotte, NC 28202", lat: 35.2, lng: -80.8 });
  assert.ok(url);
  assert.equal(new URL(url).searchParams.get("daddr"), "101 Park Ave, Charlotte, NC 28202");
});
