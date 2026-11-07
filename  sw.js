

const CACHE_NAME = "ayan-app-v1";

const APP_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/device.js",
  "./js/camera.js",
  "./js/voice.js",
  "./js/ocr.js",
  "./js/vision.js",
  "./js/ai.js",
  "./js/offline.js"
];

// એપ ઇન્સ્ટોલ અને મુખ્ય ફાઇલો કૅશ કરો
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// જૂની કૅશ સાફ કરો
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// કૅશમાંથી ફાઇલ આપો
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // બીજી વેબસાઇટની ફાઇલો માટે Network જ વાપરો
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (
          response &&
          response.ok &&
          response.type === "basic"
        ) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      }).catch(() => {
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }

        return new Response(
          "આ ફાઇલ ઑફલાઇન ઉપલબ્ધ નથી.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        );
      });
    })
  );
});