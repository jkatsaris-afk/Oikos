const CACHE_NAME = "oikos-os-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/oikos-edu-icon.svg",
  "/app-icons/oikos-default-icon.svg",
  "/app-icons/church-main-icon.svg",
  "/app-icons/church-main-icon.png",
  "/app-icons/church-controller-icon.svg",
  "/app-icons/church-controller-icon.png",
  "/app-icons/church-live-display-icon.svg",
  "/app-icons/church-live-display-icon.png",
  "/app-icons/sports-falcon-icon.svg",
  "/app-icons/campus-icon.svg",
  "/app-icons/admin-icon.svg",
  "/app-icons/business-icon.svg",
  "/app-icons/farm-icon.svg",
  "/app-icons/pages-icon.svg",
  "/app-icons/nightstand-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
