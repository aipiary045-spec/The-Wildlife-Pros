"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Next.js/Turbopack does not emit the worker's shared sibling chunk; serve both from /public.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export type RouteMapStop = {
  sequence: number;
  title: string;
  lat: number;
  lng: number;
};

export type RouteMapData = {
  home?: { lat: number; lng: number } | null;
  stops: RouteMapStop[];
  /** Mapbox/GeoJSON [lng, lat] road polyline when available. */
  geometry?: Array<[number, number]>;
};

/** Raster OSM tiles — reliable in Next.js without vector-tile worker edge cases. */
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const ROUTE_SOURCE = "critterops-route";
const ROUTE_LAYER = "critterops-route-line";

function straightLineGeometry(data: RouteMapData): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  if (data.home) coords.push([data.home.lng, data.home.lat]);
  for (const stop of data.stops) coords.push([stop.lng, stop.lat]);
  if (data.home) coords.push([data.home.lng, data.home.lat]);
  return coords;
}

function fitMap(map: MapLibreMap, coords: Array<[number, number]>) {
  if (coords.length === 0) return;
  if (coords.length === 1) {
    map.jumpTo({ center: coords[0], zoom: 12 });
    return;
  }
  const bounds = coords.reduce(
    (box, coord) => box.extend(coord),
    new LngLatBounds(coords[0], coords[0]),
  );
  map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
}

function setRouteLine(map: MapLibreMap, coords: Array<[number, number]>) {
  const feature = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: coords.length >= 2 ? coords : [],
    },
  };
  const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData(feature);
    return;
  }
  map.addSource(ROUTE_SOURCE, { type: "geojson", data: feature });
  map.addLayer({
    id: ROUTE_LAYER,
    type: "line",
    source: ROUTE_SOURCE,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": "#E85D04",
      "line-width": 4,
      "line-opacity": 0.9,
    },
  });
}

function markerElement(label: string, variant: "home" | "stop") {
  const el = document.createElement("div");
  el.className =
    variant === "home"
      ? "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-ink text-[10px] font-bold text-white shadow-md"
      : "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange text-xs font-bold text-white shadow-md";
  el.textContent = label;
  el.title = label;
  return el;
}

export function RouteMap({ data, className }: { data: RouteMapData | null; className?: string }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [-80.84, 35.23],
      zoom: 10,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (event) => {
      console.error("Route map error:", event.error?.message ?? event);
    });
    mapRef.current = map;

    const resize = () => map.resize();
    map.once("load", () => {
      resize();
      window.setTimeout(resize, 100);
    });

    const shell = shellRef.current;
    const observer =
      shell && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => resize())
        : null;
    if (shell) observer?.observe(shell);
    window.addEventListener("resize", resize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;

    const apply = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const line =
        data.geometry && data.geometry.length > 1 ? data.geometry : straightLineGeometry(data);
      setRouteLine(map, line);

      if (data.home) {
        markersRef.current.push(
          new Marker({ element: markerElement("H", "home") })
            .setLngLat([data.home.lng, data.home.lat])
            .setPopup(new Popup({ offset: 16 }).setText("Home / shop"))
            .addTo(map),
        );
      }

      for (const stop of data.stops) {
        markersRef.current.push(
          new Marker({ element: markerElement(String(stop.sequence), "stop") })
            .setLngLat([stop.lng, stop.lat])
            .setPopup(new Popup({ offset: 16 }).setText(`#${stop.sequence} · ${stop.title}`))
            .addTo(map),
        );
      }

      const fitCoords: Array<[number, number]> = [...line];
      if (fitCoords.length === 0 && data.home) fitCoords.push([data.home.lng, data.home.lat]);
      for (const stop of data.stops) fitCoords.push([stop.lng, stop.lat]);
      fitMap(map, fitCoords);
      window.requestAnimationFrame(() => map.resize());
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [data]);

  return (
    <div
      ref={shellRef}
      className={
        className ??
        "route-map-shell h-72 w-full overflow-hidden rounded-2xl border border-line bg-background md:h-[28rem]"
      }
    >
      <div ref={containerRef} className="h-full w-full" aria-label="Route map preview" role="img" />
    </div>
  );
}
