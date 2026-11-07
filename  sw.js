const CACHE_NAME = "ayan-cache-v1.3";
const urlsToCache = [
  "./",
  "./index.html"
  // જો તમારી પાસે બીજી કોઈ CSS કે JS ફાઇલો અલગથી હોય તો અહીં ઉમેરી શકો છો
];

// ૧. સર્વિસ વર્કર ઇન્સ્ટોલ કરવું અને ફાઇલો કૅશ કરવી
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("AYAN: ફાઇલો કૅશ થઈ રહી છે...");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ૨. જૂની કૅશ ફાઇલો ડિલીટ કરવી અને નવું વર્ઝન એક્ટિવ કરવું
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log("AYAN: જૂની કૅશ હટાવી રહ્યા છીએ:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ૩. ઇન્ટરનેટ ન હોય ત્યારે કૅશમાંથી ડેટા પૂરો પાડવો (Fetch)
self.addEventListener("fetch", event => {
  // CDN પરથી લોડ થતી લાઇબ્રેરીઓ (જેમ કે WebLLM, Tesseract, TensorFlow) ને નેટવર્ક દ્વારા હેન્ડલ કરવા દેવી
  if (event.request.url.includes("cdn.jsdelivr.net") || event.request.url.includes("esm.run")) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // લોકલ ફાઇલો માટે કૅશ ફર્સ્ટ સ્ટ્રેટેજી
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      // જો ઇન્ટરનેટ પણ ન હોય અને ફાઇલ કૅશમાંય ન હોય તો (વૈકલ્પિક હેન્ડલિંગ)
      return caches.match("./index.html");
    })
  );
});