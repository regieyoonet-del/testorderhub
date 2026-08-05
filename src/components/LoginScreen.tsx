/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CompanyProfile, SystemSettings } from '../types';
import { KeyRound, User, ShieldCheck, Building, HelpCircle, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  companies: CompanyProfile[];
  onLogin: (role: 'admin' | 'client', companyId?: string) => void;
  systemSettings: SystemSettings;
}

export default function LoginScreen({ companies, onLogin, systemSettings }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = passcode.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Please fill in both fields.');
      return;
    }

    // Check Admin Credentials
    const savedAdminUser = (systemSettings?.adminUsername || 'admin').toLowerCase();
    const savedAdminPass = systemSettings?.adminPasscode || 'admin123';

    const isAdminUserMatch = trimmedUser === savedAdminUser || (savedAdminUser === 'admin' && trimmedUser === 'admin');
    const isAdminPassMatch = trimmedPass === savedAdminPass || (savedAdminPass === 'admin123' && (trimmedPass === 'admin123' || trimmedPass === 'admin'));

    if (isAdminUserMatch && isAdminPassMatch) {
      onLogin('admin');
      return;
    }

    // Check Client Credentials
    const foundCo = companies.find(
      (co) =>
        co.username?.toLowerCase() === trimmedUser &&
        co.passcode === trimmedPass
    );

    if (foundCo) {
      onLogin('client', foundCo.id);
    } else {
      setError('Invalid username or passcode. Please check your credentials and try again.');
    }
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
                Username
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. acme"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white text-sm pl-11 pr-4 py-3 rounded-xl focus:outline-none transition-all text-black font-semibold"
                  id="login-username-input"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-mono font-bold">
                Passcode
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3.5 w-4 h-4 text-gray-400" />
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black focus:bg-white text-sm pl-11 pr-11 py-3 rounded-xl focus:outline-none transition-all text-black font-semibold font-mono"
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
              className="w-full bg-black text-white py-3.5 rounded-xl text-xs uppercase font-extrabold tracking-widest border border-black hover:bg-white hover:text-black transition-all cursor-pointer shadow-md mt-6"
              id="login-submit-btn"
            >
              Sign In to Catalog
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
