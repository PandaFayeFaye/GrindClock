// Minimal service worker -- exists only so Chrome recognizes this as a fully
// installable PWA (a fetch handler is part of that check on some Android/Chrome
// versions). Without one, "Add to Home Screen" can fall back to a weaker
// shortcut-style launch that shows a generic bordered icon card instead of the
// real standalone app + custom splash. No caching here on purpose -- everything
// still goes straight to the network, so this never serves stale content.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
