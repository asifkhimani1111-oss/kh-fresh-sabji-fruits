
"use strict";

const CACHE_NAME = "ayan-app-v1.3";

const APP_FILES = [
  "./",
  "./index.html"
];

// નવી કૅશ તૈયાર કરો
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// જૂની કૅશ દૂર કરો
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

// નેટવર્ક ઉપલબ્ધ હોય તો નવી ફાઇલ મેળવો,
// નેટવર્ક ન હોય તો કૅશમાંથી પેજ બતાવો.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (
          response &&
          response.ok &&
          event.request.mode === "navigate"
        ) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put("./index.html", copy);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);

        if (cached) return cached;

        if (event.request.mode === "navigate") {
          return (
            await caches.match("./index.html")
          ) || Response.error();
        }

        return Response.error();
      })
  );
});
