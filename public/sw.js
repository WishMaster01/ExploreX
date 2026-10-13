// Lightweight pass-through worker for clients that still request /sw.js.
// No fetch handler is registered, so requests continue to use the network.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
