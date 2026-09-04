/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemSettings } from '../types';
import { DEFAULT_PWA_ICONS } from './pwaIconUtils';

let currentManifestBlobUrl: string | null = null;

/**
 * Registers the lightweight, non-caching service worker for PWA installability.
 */
export function registerPwaServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Check for worker updates
          reg.update();
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration notice:', err);
        });
    });
  }
}

/**
 * Dynamically updates the browser's Web App Manifest and Apple Touch Icon
 * to reflect the latest configured app branding and icon.
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

  // 1. Update Apple Touch Icon
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

  // 3. Update Web App Manifest
  let manifestLink = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.id = 'manifest-link';
    document.head.appendChild(manifestLink);
  }

  if (hasCustomIcon || appName !== 'ARH Print Hub' || shortName !== 'ARH Hub') {
    // Generate dynamic manifest Blob URL
    const manifestJson = {
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

    if (currentManifestBlobUrl) {
      URL.revokeObjectURL(currentManifestBlobUrl);
    }

    const blob = new Blob([JSON.stringify(manifestJson, null, 2)], {
      type: 'application/manifest+json'
    });
    currentManifestBlobUrl = URL.createObjectURL(blob);
    manifestLink.href = currentManifestBlobUrl;
  } else {
    // Revert to static manifest
    if (currentManifestBlobUrl) {
      URL.revokeObjectURL(currentManifestBlobUrl);
      currentManifestBlobUrl = null;
    }
    manifestLink.href = '/manifest.webmanifest';
  }
}
