// ARH Print Hub - Conservative Service Worker for PWA Installation
// Designed strictly for PWA installation compliance across Android, Chrome, and Desktop.
// To protect live Google Sheets sync, Apps Script requests, and Vercel deployments,
// dynamic data caching is strictly prohibited. All requests pass through directly to the network.

const SW_VERSION = 'arh-pwa-v1';

self.addEventListener('install', (event) => {
  // Activate new worker immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim control over all open tabs immediately and clear any legacy caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Pass-through handler: Allow the browser to handle all requests over the network.
  // Never intercept or cache Google Sheets, Apps Script, Auth, or dynamic state.
  return;
});
