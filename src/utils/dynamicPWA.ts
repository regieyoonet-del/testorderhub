/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemSettings } from '../types';
import { DEFAULT_PWA_ICONS } from './pwaIconUtils';

const BRANDING_CACHE = 'pwa-branding-cache';

/**
 * Registers the service worker for PWA installability and offline shell support.
 * Guaranteed: Does NOT cache Google Sheets, Apps Script, or live business data.
 */
export function registerPwaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Check for updates
        reg.update();
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration notice:', err);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}

/**
 * Applies custom PWA branding while maintaining a STABLE, VALID HTTP/HTTPS manifest URL.
 * CRITICAL FIX: NEVER replaces <link rel="manifest"> with a blob: or data: URL,
 * which Chrome on macOS explicitly rejects as non-installable.
 */
export function applyPwaBranding(settings: Partial<SystemSettings>) {
  if (typeof document === 'undefined') return;

  const appName = settings.hubName?.trim() || 'ARH Print Hub';
  const shortName = settings.shortHubName?.trim() || 'ARH Hub';

  const hasCustomIcon = Boolean(settings.pwaIconUrl || settings.pwaIcon512Url);
  const icon192 = settings.pwaIcon192Url || settings.pwaIconUrl || DEFAULT_PWA_ICONS.icon192;
  const icon512 = settings.pwaIcon512Url || settings.pwaIconUrl || DEFAULT_PWA_ICONS.icon512;
  const iconMaskable = settings.pwaIconMaskableUrl || settings.pwaIconUrl || DEFAULT_PWA_ICONS.iconMaskable;
  const appleIcon = settings.pwaIcon192Url || settings.pwaIconUrl || DEFAULT_PWA_ICONS.appleTouchIcon;

  // 1. Update Apple Touch Icon (used by iOS Safari Home Screen)
  let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    document.head.appendChild(appleLink);
  }
  appleLink.href = appleIcon;

  // 2. Update Mobile Web App Title meta tag
  let titleMeta = document.querySelector<HTMLMetaElement>("meta[name='apple-mobile-web-app-title']");
  if (!titleMeta) {
    titleMeta = document.createElement('meta');
    titleMeta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(titleMeta);
  }
  titleMeta.content = shortName;

  let appNameMeta = document.querySelector<HTMLMetaElement>("meta[name='application-name']");
  if (!appNameMeta) {
    appNameMeta = document.createElement('meta');
    appNameMeta.name = 'application-name';
    document.head.appendChild(appNameMeta);
  }
  appNameMeta.content = shortName;

  // 3. Ensure stable, permanent Manifest URL (<link rel="manifest">)
  // Must ALWAYS be a permanent HTTP/HTTPS URL (/manifest.webmanifest)
  let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.id = 'manifest-link';
    document.head.appendChild(manifestLink);
  }
  // Enforce permanent production relative URL - NEVER use blob: or data: URL
  if (manifestLink.getAttribute('href') !== '/manifest.webmanifest') {
    manifestLink.setAttribute('href', '/manifest.webmanifest');
  }

  // 4. Update custom manifest in Service Worker branding cache if custom branding is provided
  if (typeof window !== 'undefined' && 'caches' in window) {
    if (hasCustomIcon || appName !== 'ARH Print Hub' || shortName !== 'ARH Hub') {
      const dynamicManifest = {
        id: '/',
        name: appName,
        short_name: shortName,
        description: `${appName} - B2B ordering hub, job management, and production portal.`,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a0a0a',
        background_color: '#ffffff',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: icon192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: icon192,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: icon512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: iconMaskable,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      };

      caches.open(BRANDING_CACHE).then((cache) => {
        const responseWebmanifest = new Response(JSON.stringify(dynamicManifest, null, 2), {
          headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'no-cache'
          }
        });
        const responseJson = new Response(JSON.stringify(dynamicManifest, null, 2), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        cache.put('/manifest.webmanifest', responseWebmanifest);
        cache.put('/manifest.json', responseJson);
      }).catch((err) => {
        console.warn('[PWA] Cache branding error:', err);
      });
    } else {
      // Revert to static manifest by clearing custom cached override
      caches.open(BRANDING_CACHE).then((cache) => {
        cache.delete('/manifest.webmanifest');
        cache.delete('/manifest.json');
      }).catch(() => {});
    }
  }
}
