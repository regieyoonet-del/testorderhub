// ARH Print Hub - Service Worker for PWA Installation & Offline Shell Support
// Designed strictly for PWA installation compliance across macOS Chrome, Windows, Android, and iOS.
// GUARANTEE: Google Sheets API, Apps Script sync, external Auth, and live business data
// are NEVER cached or intercepted - they pass directly to the network.

const SW_VERSION = 'arh-pwa-v2.1';
const BRANDING_CACHE = 'pwa-branding-cache';
const SHELL_CACHE = 'pwa-shell-v2';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  // Pre-cache shell assets so Chrome's PWA installability offline check succeeds
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA] Pre-cache notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so the service worker controls the page on first load
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== BRANDING_CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER intercept or cache Google Sheets, Apps Script, Google APIs, Auth, or mutating requests
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('google') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // 2. Dynamic branding & manifest requests: check BRANDING_CACHE first
  if (
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/custom-pwa-192.png' ||
    url.pathname === '/custom-pwa-512.png'
  ) {
    event.respondWith(
      caches.open(BRANDING_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        // If manifest.json requested and not in cache, fallback to manifest.webmanifest
        if (url.pathname === '/manifest.json') {
          return (await caches.match('/manifest.webmanifest')) || fetch('/manifest.webmanifest');
        }
        return fetch(event.request);
      })
    );
    return;
  }

  // 3. Navigation requests (HTML documents) - Network first, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const shell = await caches.match('/');
          if (shell) return shell;
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 4. Precached static shell icons and assets: Stale-while-revalidate or Network-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
            const copy = networkResponse.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
