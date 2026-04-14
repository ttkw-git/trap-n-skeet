// ═══════════════════════════════════════════════
// service-worker.js — Offline cache
// Bump CACHE_NAME version when deploying updates
// ═══════════════════════════════════════════════

const CACHE_NAME = 'trapnskeet-v1';

const ASSETS = [
  './index.html',
  './manifest.json',
  './css/theme.css',
  './css/components.css',
  './js/app.js',
  './js/storage.js',
  './js/utils.js',
  './js/disciplines/american-trap.js',
  './js/disciplines/skeet.js',
  './js/disciplines/olympic-trap.js',
  './js/screens/home.js',
  './js/screens/shooting.js',
  './js/screens/summary.js',
  './js/screens/history.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Install: cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
