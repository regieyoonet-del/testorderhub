/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Share,
  PlusSquare,
  X,
  Check,
  ExternalLink,
  Laptop,
  Compass,
  Monitor
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer' | 'settings' | 'compact';
  appName?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  appName = 'ARH Print Hub'
}) => {
  const { isInstallable, isInstalled, isInIframe, platformInfo, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Requirement 3: If already installed / running in standalone mode, hide the Install button
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>App Installed &amp; Running in Standalone Mode</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    // 1. If browser exposes native prompt, trigger it immediately
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 5000);
      }
      return;
    }

    // 2. If native prompt not directly available, show platform-specific guide modal
    setShowGuideModal(true);
  };

  // Render variant styles
  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          title={`Install ${appName} to your device`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase font-bold tracking-wider transition-colors cursor-pointer shrink-0 shadow-2xs border border-black"
          id="pwa-header-install-btn"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>

        {showGuideModal && (
          <PlatformInstallModal
            onClose={() => setShowGuideModal(false)}
            appName={appName}
            isInIframe={isInIframe}
            platformInfo={platformInfo}
          />
        )}
      </>
    );
  }

  if (variant === 'drawer') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase font-bold tracking-wider transition-all cursor-pointer shadow-sm border border-black"
          id="pwa-drawer-install-btn"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Install {appName}</span>
          </div>
          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded font-mono">
            {platformInfo.isMac ? 'macOS' : platformInfo.isIOS ? 'iOS' : 'PWA'}
          </span>
        </button>

        {showGuideModal && (
          <PlatformInstallModal
            onClose={() => setShowGuideModal(false)}
            appName={appName}
            isInIframe={isInIframe}
            platformInfo={platformInfo}
          />
        )}
      </>
    );
  }

  // Settings variant
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase font-bold tracking-wider transition-colors cursor-pointer border border-black shadow-sm"
          id="pwa-settings-install-btn"
        >
          <Download className="w-3.5 h-3.5" />
          <span>
            {isInstallable
              ? 'Install PWA on this Device'
              : platformInfo.isMac
              ? 'Install on Mac'
              : platformInfo.isIOS
              ? 'Install on iPhone / iPad'
              : 'Install App'}
          </span>
        </button>

        {installSuccess && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 font-bold">
            <Check className="w-4 h-4 text-emerald-600" />
            Installation initiated!
          </span>
        )}
      </div>

      {showGuideModal && (
        <PlatformInstallModal
          onClose={() => setShowGuideModal(false)}
          appName={appName}
          isInIframe={isInIframe}
          platformInfo={platformInfo}
        />
      )}
    </>
  );
};

interface PlatformModalProps {
  onClose: () => void;
  appName: string;
  isInIframe: boolean;
  platformInfo: {
    isMac: boolean;
    isIOS: boolean;
    isWindows: boolean;
    isAndroid: boolean;
    isChrome: boolean;
    isSafari: boolean;
    isEdge: boolean;
    isFirefox: boolean;
  };
}

const PlatformInstallModal: React.FC<PlatformModalProps> = ({
  onClose,
  appName,
  isInIframe,
  platformInfo
}) => {
  const openDirectTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 space-y-4 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 font-bold font-mono">
            ARH
          </div>
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-tight">Install {appName}</h3>
            <p className="text-[11px] text-gray-500 font-mono">
              {platformInfo.isMac
                ? 'Desktop App for macOS'
                : platformInfo.isIOS
                ? 'Add to iPhone / iPad'
                : platformInfo.isWindows
                ? 'Desktop App for Windows'
                : 'Standalone Web App'}
            </p>
          </div>
        </div>

        {/* IFRAME NOTICE: If currently inside an iframe (like AI Studio preview), direct to top-level tab */}
        {isInIframe && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-900">
              <Laptop className="w-4 h-4 text-amber-700" />
              <span>Preview Window Detected</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed font-mono">
              Chrome requires Progressive Web Apps to be installed from a direct, top-level browser tab rather than an embedded preview frame.
            </p>
            <button
              onClick={openDirectTab}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-neutral-800 text-xs font-mono uppercase font-bold tracking-wider cursor-pointer shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Full Tab to Install</span>
            </button>
          </div>
        )}

        {/* PLATFORM-SPECIFIC INSTRUCTIONS */}
        {platformInfo.isMac ? (
          /* macOS Instructions */
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 text-xs text-gray-700 font-mono">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-200 font-bold text-black">
              <Laptop className="w-4 h-4 text-black" />
              <span>macOS Chrome / Chromium Installation</span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                1
              </div>
              <p className="leading-relaxed">
                In Chrome's address bar (Omnibox), look for the <strong>Install</strong> icon{' '}
                <Monitor className="w-3.5 h-3.5 inline mx-1 text-black" /> on the right side next to the bookmark star.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                2
              </div>
              <p className="leading-relaxed">
                Or click the <strong>Chrome menu (⋮)</strong> in the upper right &gt; <strong>Save and Share</strong> &gt; select <strong>Install {appName}...</strong>
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                3
              </div>
              <p className="leading-relaxed">
                Click <strong>Install</strong>. {appName} will launch in its own native Mac window and appear in your <strong>Applications</strong> folder and <strong>Dock</strong>.
              </p>
            </div>

            {platformInfo.isSafari && (
              <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-600">
                <strong>Safari on macOS Sonoma+:</strong> Click <strong>File</strong> in the top Mac menu bar &gt; <strong>Add to Dock...</strong>
              </div>
            )}
          </div>
        ) : platformInfo.isIOS ? (
          /* iOS Instructions */
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 text-xs text-gray-700 font-mono">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-200 font-bold text-black">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>iOS Safari Installation</span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                1
              </div>
              <p className="leading-relaxed">
                Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> in your Safari bottom navigation bar.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                2
              </div>
              <p className="leading-relaxed">
                Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-gray-700" />.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                3
              </div>
              <p className="leading-relaxed">
                Tap <strong>Add</strong> at top right. Launch directly from your home screen as a standalone app.
              </p>
            </div>
          </div>
        ) : (
          /* Windows / Android / Generic Desktop Instructions */
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 text-xs text-gray-700 font-mono">
            <div className="flex items-center gap-2 pb-1 border-b border-gray-200 font-bold text-black">
              <Monitor className="w-4 h-4 text-black" />
              <span>Desktop / Android Installation</span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                1
              </div>
              <p className="leading-relaxed">
                Click the <strong>Install</strong> icon in your browser's address bar.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                2
              </div>
              <p className="leading-relaxed">
                Or open your browser menu (three dots <strong>⋮</strong>) and select <strong>Install {appName}</strong>.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-black text-white hover:bg-neutral-800 py-2.5 rounded-xl text-xs font-mono uppercase font-bold tracking-wider transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
};
