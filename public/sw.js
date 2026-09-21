// ARH Print Hub - Service Worker for PWA Installation & Static Asset Support
// Strictly ensures development modules, Vite scripts, and dynamic business data are NEVER intercepted.

const SW_VERSION = 'arh-pwa-v3.0';
const BRANDING_CACHE = 'pwa-branding-cache-v3';
const STATIC_ASSETS_CACHE = 'pwa-static-v3';

const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_ASSETS_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA] Pre-cache notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Purge ALL old caches to ensure any stale code or scripts from previous versions are wiped clean
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== BRANDING_CACHE && k !== STATIC_ASSETS_CACHE)
          .map((k) => {
            console.log('[PWA] Purging stale cache:', k);
            return caches.delete(k);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. NEVER intercept or cache Vite, development modules, source files, dynamic APIs, or Google endpoints
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('google') ||
    url.hostname.includes('googleapis.com') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.includes('.vite') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.jsx') ||
    url.pathname.endsWith('.css') ||
    url.search.includes('v=') ||
    url.search.includes('t=') ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return; // Pass directly to network
  }

  // 2. Dynamic branding & manifest requests
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
        if (url.pathname === '/manifest.json') {
          return (await caches.match('/manifest.webmanifest')) || fetch('/manifest.webmanifest');
        }
        return fetch(event.request);
      })
    );
    return;
  }

  // 3. For all other requests (including HTML navigation), always prefer network
  // Only serve from cache if network fails and it is an exact matched static PWA icon
  if (PRECACHE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }
});
