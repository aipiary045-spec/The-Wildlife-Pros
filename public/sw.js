const APP_CACHE = "critterops-app-v2";
const PAGE_CACHE = "critterops-pages-v2";
const API_CACHE = "critterops-api-v2";
const PRECACHE = [
  "/offline.html",
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];
const FIELD_PREFIXES = ["/field", "/jobs", "/timesheets", "/more", "/time-off", "/inventory", "/activity"];

function isFieldPath(pathname) {
  return FIELD_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isApiGet(pathname) {
  if (pathname === "/api/timesheets/me" || pathname === "/api/jobs/late-checkin" || pathname === "/api/jobs") return true;
  return /^\/api\/jobs\/[^/]+$/.test(pathname);
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) ?? (await cache.match(new URL(request.url).pathname));
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([APP_CACHE, PAGE_CACHE, API_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isApiGet(url.pathname)) {
    event.respondWith(
      networkFirst(request, API_CACHE).catch(() => new Response(JSON.stringify({ offline: true }), { headers: { "Content-Type": "application/json" }, status: 503 })),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(request, isFieldPath(url.pathname) ? PAGE_CACHE : APP_CACHE);
        } catch {
          const pages = await caches.open(PAGE_CACHE);
          const cached =
            (await pages.match(request)) ??
            (await pages.match(url.pathname)) ??
            (await caches.match("/offline.html"));
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.open(APP_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
  }
});
