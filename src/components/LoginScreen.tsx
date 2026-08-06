/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CompanyProfile, SystemSettings } from '../types';
import { KeyRound, User, ShieldCheck, Building, HelpCircle, Eye, EyeOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  companies: CompanyProfile[];
  onLogin: (role: 'admin' | 'client', companyId?: string) => void;
  systemSettings: SystemSettings;
  onSyncSheets?: () => Promise<void>;
  isSyncingSheets?: boolean;
  lastSyncedTime?: string | null;
}

export default function LoginScreen({
  companies,
  onLogin,
  systemSettings,
  onSyncSheets,
  isSyncingSheets,
  lastSyncedTime
}: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Trigger fast background sync as soon as sign-in screen mounts on a new device
  useEffect(() => {
    if (onSyncSheets) {
      onSyncSheets().catch(() => {});
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = passcode.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please fill in both fields.');
      return;
    }

    const verifyCredentials = () => {
      // Check Admin Credentials
      const savedAdminUser = (systemSettings?.adminUsername || 'admin').toLowerCase();
      const savedAdminPass = systemSettings?.adminPasscode || 'admin123';

      const isAdminUserMatch = trimmedUser === savedAdminUser || (savedAdminUser === 'admin' && trimmedUser === 'admin');
      const isAdminPassMatch = trimmedPass === savedAdminPass || (savedAdminPass === 'admin123' && (trimmedPass === 'admin123' || trimmedPass === 'admin'));

      if (isAdminUserMatch && isAdminPassMatch) {
        onLogin('admin');
        return true;
      }

      // Check Client Credentials
      const foundCo = companies.find(
        (co) =>
          co.username?.toLowerCase() === trimmedUser &&
          co.passcode === trimmedPass
      );

      if (foundCo) {
        onLogin('client', foundCo.id);
        return true;
      }

      return false;
    };

    // First attempt with current loaded state
    if (verifyCredentials()) {
      return;
    }

    // If initial check fails, perform an immediate fast live sync from Google Sheets in case credentials were updated on another device
    if (onSyncSheets) {
      setIsVerifying(true);
      try {
        await onSyncSheets();
        // Retry verification with freshly synced credentials
        if (verifyCredentials()) {
          return;
        }
      } catch (err) {
        console.warn('Live sync verification notice:', err);
      } finally {
        setIsVerifying(false);
      }
    }

    setError('Invalid username or passcode. Please check your credentials and try again.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 selection:bg-black selection:text-white">
      <div className="max-w-md w-full space-y-6">
        {/* Hub Logo / Brand Typography */}
        <div className="text-center space-y-2">
          {systemSettings?.logoUrl ? (
            <img
              src={systemSettings.logoUrl}
              alt={systemSettings.hubName}
              className="w-16 h-16 object-contain mx-auto mb-4 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="bg-black text-white w-14 h-14 flex items-center justify-center font-bold font-mono text-2xl tracking-tight leading-none mx-auto mb-4 select-none rounded-2xl shadow-sm">
              {systemSettings?.shortHubName || 'ARH'}
            </div>
          )}
          <h2 className="text-3xl font-black tracking-tighter uppercase text-black">
            {systemSettings?.hubName || 'ARH Print Hub'}
          </h2>
        </div>

        {/* Login Card */}
        <div className="bg-white border-2 border-black rounded-[28px] p-8 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 text-xs font-mono rounded-xl flex items-center gap-2">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-mono font-bold">
                B2B Username
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. acme"
                  disabled={isVerifying}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white text-sm pl-11 pr-4 py-3 rounded-xl focus:outline-none transition-all text-black font-semibold disabled:opacity-70"
                  id="login-username-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-mono font-bold">
                Portal Passcode
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  disabled={isVerifying}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white text-sm pl-11 pr-11 py-3 rounded-xl focus:outline-none transition-all text-black font-semibold font-mono disabled:opacity-70"
                  id="login-passcode-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 text-gray-400 hover:text-black cursor-pointer focus:outline-none"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-black text-white py-3.5 rounded-xl text-xs uppercase font-extrabold tracking-widest border border-black hover:bg-white hover:text-black transition-all cursor-pointer shadow-md mt-6 disabled:opacity-70 flex items-center justify-center gap-2"
              id="login-submit-btn"
            >
              {isVerifying && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isVerifying ? 'Verifying with Cloud...' : 'Sign In to Catalog'}</span>
            </button>
          </form>
        </div>

        {/* Live Sync Indicator (Muted & Bottom of Screen) */}
        <div className="text-center pt-2">
          {isSyncingSheets || isVerifying ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-gray-400 opacity-75">
              <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
              <span>CCS Syncing...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-gray-400 opacity-70">
              <CheckCircle2 className="w-3 h-3 text-gray-400" />
              <span>CCS {lastSyncedTime ? `(${lastSyncedTime})` : 'Synced'}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
