/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __pwaPrompt?: BeforeInstallPromptEvent | null;
  }
}

export interface PlatformInfo {
  isMac: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isAndroid: boolean;
  isChrome: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isFirefox: boolean;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__pwaPrompt) {
      return window.__pwaPrompt;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });

  const [isInIframe, setIsInIframe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isMac: false,
        isIOS: false,
        isWindows: false,
        isAndroid: false,
        isChrome: false,
        isSafari: false,
        isEdge: false,
        isFirefox: false
      };
    }
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isMac = (/macintosh|mac os x/.test(ua) || (navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0)) && !isIOS;
    const isWindows = /windows|win32/.test(ua);
    const isAndroid = /android/.test(ua);
    const isEdge = /edg\//.test(ua);
    const isChrome = /chrome|chromium|crios/.test(ua) && !isEdge;
    const isSafari = /safari/.test(ua) && !isChrome && !isEdge && !isAndroid;
    const isFirefox = /firefox|fxios/.test(ua);

    return {
      isMac,
      isIOS,
      isWindows,
      isAndroid,
      isChrome,
      isSafari,
      isEdge,
      isFirefox
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check standalone display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // If early prompt already exists on window
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = () => {
      if (window.__pwaPrompt) {
        setDeferredPrompt(window.__pwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.__pwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-installed', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-installed', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__pwaPrompt : null);
    if (!promptEvent) return false;

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') window.__pwaPrompt = null;
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Native installation prompt failed:', err);
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__pwaPrompt)),
    isInstalled,
    isInIframe,
    platformInfo,
    install
  };
}
