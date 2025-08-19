/* global workbox */
// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

workbox.core.clientsClaim();

// Cache JS/CSS with Stale-While-Revalidate
workbox.routing.registerRoute(
  ({request}) => request.destination === 'script' || request.destination === 'style',
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
);

// Cache images
workbox.routing.registerRoute(
  ({request}) => request.destination === 'image',
  new workbox.strategies.CacheFirst({
    cacheName: 'images',
    plugins: [new workbox.expiration.ExpirationPlugin({maxEntries: 60, maxAgeSeconds: 30*24*60*60})]
  })
);

// Offline fallback for navigation
const FALLBACK_HTML_URL = '/index.html';
workbox.routing.registerRoute(
  ({request}) => request.mode === 'navigate',
  async ({event}) => {
    try {
      return await workbox.strategies.NetworkFirst({
        cacheName: 'pages'
      }).handle({event});
    } catch (err) {
      return caches.match(FALLBACK_HTML_URL, {ignoreSearch: true});
    }
  }
);
