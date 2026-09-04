/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { SystemSettings } from '../types';
import { processPwaIcon, DEFAULT_PWA_ICONS } from '../utils/pwaIconUtils';
import { applyPwaBranding } from '../utils/dynamicPWA';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Smartphone,
  Upload,
  RotateCcw,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  HelpCircle,
  Eye,
  Info
} from 'lucide-react';

interface AdminAppBrandingProps {
  systemSettings: SystemSettings;
  onUpdateSystemSettings: (settings: SystemSettings) => void;
  onForceSyncAll?: () => Promise<boolean>;
}

export const AdminAppBranding: React.FC<AdminAppBrandingProps> = ({
  systemSettings,
  onUpdateSystemSettings
}) => {
  const [pwaIconUrl, setPwaIconUrl] = useState(systemSettings.pwaIconUrl || '');
  const [pwaIcon192Url, setPwaIcon192Url] = useState(systemSettings.pwaIcon192Url || '');
  const [pwaIcon512Url, setPwaIcon512Url] = useState(systemSettings.pwaIcon512Url || '');
  const [pwaIconMaskableUrl, setPwaIconMaskableUrl] = useState(systemSettings.pwaIconMaskableUrl || '');

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [previewTab, setPreviewTab] = useState<'homescreen' | 'launcher' | 'squircle'>('homescreen');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active display icon for preview (custom or default)
  const activeIconSrc = pwaIcon512Url || pwaIconUrl || DEFAULT_PWA_ICONS.icon512;
  const isCustomIconActive = Boolean(pwaIconUrl || pwaIcon512Url);
  const currentShortName = systemSettings.shortHubName || 'ARH Hub';

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Check size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setStatusMessage({
        text: 'Image file is too large. Please upload an image under 5MB.',
        type: 'error'
      });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const processed = await processPwaIcon(file);

      setPwaIconUrl(processed.masterUrl);
      setPwaIcon192Url(processed.icon192);
      setPwaIcon512Url(processed.icon512);
      setPwaIconMaskableUrl(processed.iconMaskable);

      setStatusMessage({
        text: `Image successfully processed (${processed.width}×${processed.height}px)! Generated 192x192, 512x512, and maskable PWA formats. Click "Save App Branding" below to apply.`,
        type: 'success'
      });
    } catch (err: any) {
      setStatusMessage({
        text: 'Failed to process image: ' + (err?.message || 'Invalid file format'),
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    const updatedSettings: SystemSettings = {
      ...systemSettings,
      pwaIconUrl: pwaIconUrl.trim(),
      pwaIcon192Url: pwaIcon192Url.trim(),
      pwaIcon512Url: pwaIcon512Url.trim(),
      pwaIconMaskableUrl: pwaIconMaskableUrl.trim()
    };

    onUpdateSystemSettings(updatedSettings);

    // Apply live dynamic PWA manifest and link updates immediately
    applyPwaBranding(updatedSettings);

    setStatusMessage({
      text: 'PWA branding updated successfully! The new app icon is now active across mobile and desktop installations.',
      type: 'success'
    });

    setTimeout(() => {
      setStatusMessage(null);
    }, 6000);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset the PWA app icon back to the default official ARH Print Hub icon?')) {
      setPwaIconUrl('');
      setPwaIcon192Url('');
      setPwaIcon512Url('');
      setPwaIconMaskableUrl('');

      const updatedSettings: SystemSettings = {
        ...systemSettings,
        pwaIconUrl: '',
        pwaIcon192Url: '',
        pwaIcon512Url: '',
        pwaIconMaskableUrl: ''
      };

      onUpdateSystemSettings(updatedSettings);
      applyPwaBranding(updatedSettings);

      setStatusMessage({
        text: 'Reset to default ARH Print Hub icon.',
        type: 'success'
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  return (
    <div className="bg-white border-2 border-black p-6 space-y-6 rounded-none shadow-2xs text-left" id="admin-pwa-branding-card">
      {/* Header */}
      <div className="border-b border-gray-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              Progressive Web App (PWA) &amp; Mobile App Icon
            </h3>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">
              Admin-controlled branding for mobile home screens, app drawers, and PWA installs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCustomIconActive ? (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-black text-white px-2.5 py-1 border border-black">
              <Sparkles className="w-3 h-3 text-white" /> Custom Icon Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-gray-100 text-gray-700 px-2.5 py-1 border border-gray-300">
              Default ARH Icon
            </span>
          )}
        </div>
      </div>

      {/* Purpose Explanation Banner */}
      <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-black uppercase">
          <Info className="w-4 h-4 text-black" />
          <span>Where This App Icon Appears</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed font-mono">
          This image serves as the official mobile application asset when users install ARH Print Hub on their phones, tablets, or computers:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px] font-mono text-gray-700">
          <div className="bg-white border border-gray-200 p-2.5 rounded-lg">
            <span className="font-bold text-black block">1. Mobile App Icon</span>
            <span>Android home screen &amp; iOS web clip icon</span>
          </div>
          <div className="bg-white border border-gray-200 p-2.5 rounded-lg">
            <span className="font-bold text-black block">2. PWA Launcher</span>
            <span>Desktop &amp; Chromebook standalone window icon</span>
          </div>
          <div className="bg-white border border-gray-200 p-2.5 rounded-lg">
            <span className="font-bold text-black block">3. App Drawer</span>
            <span>Android application drawer / search listing</span>
          </div>
          <div className="bg-white border border-gray-200 p-2.5 rounded-lg">
            <span className="font-bold text-black block">4. Splash Screen</span>
            <span>Launch screen when opening the installed app</span>
          </div>
        </div>
        <div className="text-[10px] text-gray-500 font-mono pt-1">
          * Note: Changing this PWA icon does <strong>not</strong> modify the internal ARH Print Hub portal logo used inside headers, quotations, or invoices.
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono leading-relaxed flex items-start gap-2.5 animate-slide-up ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Controls & Previews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Upload & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* File Upload Zone */}
          <div className="space-y-2">
            <label className="block text-[11px] uppercase tracking-wider text-black font-bold font-mono">
              Upload New App Icon:
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-black bg-gray-50/60 hover:bg-gray-100/60 p-6 rounded-xl text-center cursor-pointer transition-colors space-y-2"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-black text-white flex items-center justify-center shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-black">
                  Click to select or drag and drop image file
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Recommended: <strong>512×512 pixels or larger</strong> (Square PNG, JPG, WebP, or SVG)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
            <p className="text-[10px] text-gray-500 font-mono">
              The built-in processor automatically converts your image into high-resolution 192×192, 512×512, and safe-zone padded maskable formats.
            </p>
          </div>

          {/* Direct Base64 / URL input (Alternative) */}
          <div className="space-y-1.5 pt-2 border-t border-gray-150">
            <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
              Or specify Direct Image / CDN Web URL:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={pwaIconUrl}
                onChange={(e) => {
                  const val = e.target.value;
                  setPwaIconUrl(val);
                  setPwaIcon512Url(val);
                  setPwaIcon192Url(val);
                }}
                placeholder="https://... or data:image/png;base64,..."
                className="flex-1 bg-white border border-gray-300 focus:border-black rounded-lg px-3 py-2 text-xs font-mono text-black focus:outline-none"
              />
              {pwaIconUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    if (pwaIconUrl) {
                      await handleFileUpload(await (await fetch(pwaIconUrl)).blob() as File);
                    }
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-black text-xs font-mono font-bold rounded-lg border border-gray-300 cursor-pointer"
                  title="Optimize and generate standard PWA sizes from this URL"
                >
                  Process
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="bg-black text-white hover:bg-neutral-800 disabled:bg-gray-200 disabled:text-gray-400 px-5 py-2.5 text-xs uppercase font-bold tracking-widest border border-black transition-colors cursor-pointer shadow-sm flex items-center gap-2"
              id="save-pwa-branding-btn"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Processing Image...' : 'Save App Branding'}</span>
            </button>

            {isCustomIconActive && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="bg-white text-gray-700 hover:text-red-700 hover:border-red-300 px-4 py-2.5 text-xs font-mono uppercase font-bold tracking-wider border border-gray-300 transition-colors cursor-pointer flex items-center gap-1.5"
                id="reset-pwa-icon-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default Icon</span>
              </button>
            )}
          </div>

          {/* In-App Installation Tester for Admin */}
          <div className="pt-4 border-t border-gray-150 space-y-2">
            <span className="block text-[10px] font-mono font-bold uppercase text-gray-500">
              PWA Installation Test on this Device:
            </span>
            <div className="flex items-center gap-3">
              <PWAInstallButton variant="settings" appName={systemSettings.hubName || 'ARH Print Hub'} />
            </div>
          </div>
        </div>

        {/* Right Column: Realistic Multi-Format Previews (5 cols) */}
        <div className="lg:col-span-5 bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-black">
              <Eye className="w-4 h-4 text-black" />
              <span>Live Visual Mockup</span>
            </div>

            {/* Preview View Tabs */}
            <div className="flex rounded-lg bg-gray-200 p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setPreviewTab('homescreen')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  previewTab === 'homescreen' ? 'bg-white text-black font-bold shadow-2xs' : 'text-gray-600'
                }`}
              >
                Home Screen
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('launcher')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  previewTab === 'launcher' ? 'bg-white text-black font-bold shadow-2xs' : 'text-gray-600'
                }`}
              >
                App Drawer
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('squircle')}
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                  previewTab === 'squircle' ? 'bg-white text-black font-bold shadow-2xs' : 'text-gray-600'
                }`}
              >
                Squircle
              </button>
            </div>
          </div>

          {/* Mockup Display Container */}
          <div className="flex items-center justify-center p-4">
            {previewTab === 'homescreen' && (
              /* Simulated Smartphone Home Screen with App Grid */
              <div className="w-56 bg-neutral-900 rounded-3xl p-4 shadow-xl border-4 border-neutral-800 space-y-4 text-center">
                {/* Status Bar */}
                <div className="flex justify-between items-center text-[9px] text-white/60 font-mono px-1">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-white/40"></span>
                    <span className="w-3 h-1.5 rounded-sm border border-white/40"></span>
                  </div>
                </div>

                {/* Home Screen Icons Grid */}
                <div className="grid grid-cols-3 gap-3 py-2 items-start justify-items-center">
                  {/* Companion app 1 */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      <Layers className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[9px] text-white/80 font-mono truncate w-12">Sheets</span>
                  </div>

                  {/* ARH PRINT HUB PRIMARY ICON */}
                  <div className="flex flex-col items-center space-y-1 relative">
                    <div className="w-12 h-12 rounded-2xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-lg transform transition-transform hover:scale-105 overflow-hidden">
                      <img
                        src={activeIconSrc}
                        alt="PWA App Icon"
                        className="w-full h-full object-contain rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-[9px] text-white font-mono font-bold tracking-tight truncate w-14">
                      {currentShortName}
                    </span>
                  </div>

                  {/* Companion app 2 */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      <Smartphone className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[9px] text-white/80 font-mono truncate w-12">Portal</span>
                  </div>
                </div>

                <div className="text-[9px] text-white/50 font-mono pt-1">
                  Mobile Home Screen Preview
                </div>
              </div>
            )}

            {previewTab === 'launcher' && (
              /* Android Circular Launcher Icon */
              <div className="flex flex-col items-center space-y-3 py-4">
                <div className="w-24 h-24 rounded-full bg-black p-2 border-2 border-gray-300 shadow-xl flex items-center justify-center overflow-hidden">
                  <img
                    src={pwaIconMaskableUrl || activeIconSrc}
                    alt="Maskable Launcher Icon"
                    className="w-full h-full object-contain rounded-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center">
                  <span className="font-bold font-mono text-sm text-black block">{currentShortName}</span>
                  <span className="text-[10px] text-gray-500 font-mono">Android Circular Mask</span>
                </div>
              </div>
            )}

            {previewTab === 'squircle' && (
              /* Apple iOS / Modern Squircle Icon */
              <div className="flex flex-col items-center space-y-3 py-4">
                <div className="w-24 h-24 rounded-2xl bg-black p-2 border border-gray-300 shadow-xl flex items-center justify-center overflow-hidden">
                  <img
                    src={activeIconSrc}
                    alt="Squircle Icon"
                    className="w-full h-full object-contain rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center">
                  <span className="font-bold font-mono text-sm text-black block">{currentShortName}</span>
                  <span className="text-[10px] text-gray-500 font-mono">iOS Squircle Format</span>
                </div>
              </div>
            )}
          </div>

          {/* Generated Manifest Assets List */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-1.5 text-[10px] font-mono text-gray-600">
            <span className="font-bold text-black uppercase block">Active Manifest Asset Sizes:</span>
            <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
              <span>Standard (192×192 PNG)</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
            <div className="flex justify-between items-center py-0.5 border-b border-gray-100">
              <span>High-Res (512×512 PNG)</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span>Maskable (512×512 Safe-Zone)</span>
              <span className="text-emerald-700 font-bold">✓ Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
