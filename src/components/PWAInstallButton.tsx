/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Share, PlusSquare, X, Check } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer' | 'settings' | 'compact';
  appName?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  appName = 'ARH Print Hub'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed, show subtle installed badge in settings, but hide in header/drawer
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
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 5000);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Ambient explanation for browsers where prompt was dismissed or not triggered yet
      alert(`To install ${appName} as an app, tap your browser's menu (three dots or share button) and select "Install app" or "Add to Home screen".`);
    }
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

        {showIOSGuide && (
          <IOSInstallModal onClose={() => setShowIOSGuide(false)} appName={appName} />
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
            {isIOS ? 'iOS' : 'PWA'}
          </span>
        </button>

        {showIOSGuide && (
          <IOSInstallModal onClose={() => setShowIOSGuide(false)} appName={appName} />
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
          <span>{isInstallable ? 'Install PWA on this Device' : isIOS ? 'Install on iPhone / iPad' : 'Install / Add to Home Screen'}</span>
        </button>

        {installSuccess && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-700 font-bold">
            <Check className="w-4 h-4 text-emerald-600" />
            Installation initiated!
          </span>
        )}
      </div>

      {showIOSGuide && (
        <IOSInstallModal onClose={() => setShowIOSGuide(false)} appName={appName} />
      )}
    </>
  );
};

interface IOSModalProps {
  onClose: () => void;
  appName: string;
}

const IOSInstallModal: React.FC<IOSModalProps> = ({ onClose, appName }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-sm w-full p-6 space-y-4 shadow-2xl relative text-left">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0 font-bold font-mono">
            ARH
          </div>
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-tight">Install {appName}</h3>
            <p className="text-[11px] text-gray-500 font-mono">Add to iPhone or iPad Home Screen</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 text-xs text-gray-700 font-mono">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
              1
            </div>
            <p className="leading-relaxed">
              Tap the <strong>Share</strong> icon <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> in your Safari bottom bar.
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
              Tap <strong>Add</strong> at top-right. Launch directly from your home screen like a native app.
            </p>
          </div>
        </div>

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
