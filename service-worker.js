// ═══════════════════════════════════════════════
// service-worker.js — Offline cache
// Bump CACHE_NAME version when deploying updates
// ═══════════════════════════════════════════════

const CACHE_NAME = 'trapnskeet-v3';

const ASSETS = [
  './index.html',
  './manifest.json',
  './css/theme.css',
  './css/components.css',
  './js/app.js',
  './js/storage.js',
  './js/utils.js',
  './js/firebase.js',
  './js/sync.js',
  './js/disciplines/american-trap.js',
  './js/disciplines/skeet.js',
  './js/disciplines/olympic-trap.js',
  './js/screens/home.js',
  './js/screens/shooting.js',
  './js/screens/summary.js',
  './js/screens/history.js',
  './js/screens/analytics.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Firebase CDN URLs — never cache these, always fetch fresh from Google
const FIREBASE_CDN = 'https://www.gstatic.com/firebasejs/';

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

// Fetch: Firebase CDN always from network; everything else cache-first
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith(FIREBASE_CDN)) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
