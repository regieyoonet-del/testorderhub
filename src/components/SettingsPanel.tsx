/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CompanyProfile, AppsScriptConfig } from '../types';
import AppsScriptInstructions from './AppsScriptInstructions';
import { Check, Wifi, WifiOff, AlertCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { sheetsService } from '../lib/sheetsService';

interface SettingsPanelProps {
  config: AppsScriptConfig;
  onUpdateConfig: (config: AppsScriptConfig) => void;
  companies?: CompanyProfile[];
  onAddCompany?: (co: CompanyProfile) => void;
  onUpdateCompany?: (co: CompanyProfile) => void;
  totalOrders: number;
  productsCount: number;
  onForceSyncAll: () => Promise<boolean>;
  onPullFromSheets?: () => Promise<void>;
  isSyncingSheets?: boolean;
}

export default function SettingsPanel({
  config,
  onUpdateConfig,
  totalOrders,
  onForceSyncAll,
  onPullFromSheets,
  isSyncingSheets
}: SettingsPanelProps) {
  // Sync States
  const [url, setUrl] = useState(config.webAppUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [pullStatus, setPullStatus] = useState<'idle' | 'success'>('idle');

  const handleTestConnection = async () => {
    if (!url.trim()) {
      alert('Please enter an Apps Script URL first.');
      return;
    }
    setIsTesting(true);
    setTestResult('idle');
    
    // We try to test connection
    const success = await sheetsService.testConnection(url);
    setIsTesting(false);
    
    if (success) {
      setTestResult('success');
      onUpdateConfig({
        webAppUrl: url.trim(),
        isConnected: true,
        lastSyncTime: new Date().toISOString()
      });
    } else {
      setTestResult('failed');
      // Still update url so they don't lose it, but marked as offline
      onUpdateConfig({
        webAppUrl: url.trim(),
        isConnected: false
      });
    }
  };

  const handleTriggerSyncAll = async () => {
    setIsSyncingAll(true);
    setSyncStatus('idle');
    const ok = await onForceSyncAll();
    setIsSyncingAll(false);
    if (ok) {
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } else {
      setSyncStatus('failed');
      setTimeout(() => setSyncStatus('idle'), 4000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
      {/* Left Column: Connections */}
      <div className="space-y-8">
        
        {/* Google Sheet Connection Card */}
        <div className="bg-white border-2 border-black p-6 space-y-5 rounded-none">
          <div className="flex items-center justify-between border-b border-gray-150 pb-3">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-black" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">Google Sheets Connection</h3>
            </div>
            
            {config.isConnected ? (
              <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 border border-black">
                <Wifi className="w-3 h-3 text-white" /> Synced Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-white text-gray-400 px-2 py-0.5 border border-gray-300">
                <WifiOff className="w-3 h-3 text-gray-400" /> Offline Mode
              </span>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono">
              Google Apps Script Web App URL:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-white border border-black text-xs px-2.5 py-2 text-black font-mono focus:outline-none"
                id="apps-script-url-input"
              />
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="bg-black text-white px-4 py-2 text-xs uppercase font-bold tracking-widest border border-black hover:bg-white hover:text-black transition-colors shrink-0 cursor-pointer focus:outline-none"
                id="test-connection-btn"
              >
                {isTesting ? 'Testing...' : 'Test & Connect'}
              </button>
            </div>
          </div>

          {/* Test Outcomes Message */}
          {testResult === 'success' && (
            <div className="bg-gray-50 border border-black p-3.5 text-xs text-black font-mono leading-relaxed flex items-start gap-2 animate-slide-up">
              <Check className="w-4 h-4 text-black shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase text-[9px] tracking-wider">Connection Verified!</p>
                <p className="text-gray-600 mt-0.5">Your Google Spreadsheet backend is now active and syncing live orders.</p>
              </div>
            </div>
          )}

          {testResult === 'failed' && (
            <div className="bg-red-50 border border-red-200 p-4 text-xs text-red-900 font-mono leading-relaxed space-y-2 animate-slide-up rounded-xl">
              <div className="flex items-center gap-2 font-bold uppercase text-[10px] text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Web App Connection Failed</span>
              </div>
              <p className="text-red-800 text-[11px]">
                Could not establish connection to the Google Apps Script endpoint. Please double-check the following 4 deployment settings:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[10px] text-red-900 bg-white/70 p-2.5 rounded-lg border border-red-100">
                <li><strong>Access Level:</strong> "Who has access" MUST be set to <strong>Anyone</strong> (not "Only myself").</li>
                <li><strong>Execution Mode:</strong> "Execute as" MUST be set to <strong>Me (your email)</strong>.</li>
                <li><strong>URL Endpoint:</strong> Ensure URL ends with <code className="bg-red-100 px-1 font-bold text-red-900">/exec</code> (NOT <code className="line-through text-gray-500">/edit</code> or <code className="line-through text-gray-500">/dev</code>).</li>
                <li><strong>Updating existing code:</strong> Click <strong>Deploy &gt; Manage deployments &gt; Edit (Pencil) &gt; Version: New version &gt; Deploy</strong>.</li>
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 font-mono text-[10px] text-gray-500">
            <div>
              <span>Synced Orders:</span>
              <span className="font-bold text-black block text-sm mt-0.5">{totalOrders} records</span>
            </div>
            <div>
              <span>Database Status:</span>
              <span className="font-bold text-black block text-sm mt-0.5">
                {config.isConnected ? 'Connected Cloud' : 'Local Storage'}
              </span>
            </div>
          </div>

          {config.isConnected && (
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
              <button
                onClick={async () => {
                  if (onPullFromSheets) {
                    await onPullFromSheets();
                    setPullStatus('success');
                    setTimeout(() => setPullStatus('idle'), 4000);
                  }
                }}
                disabled={isSyncingSheets}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white disabled:bg-gray-200 disabled:text-gray-400 py-2.5 px-4 text-xs font-bold uppercase tracking-wider border border-black flex items-center justify-center gap-2 cursor-pointer focus:outline-none transition-colors"
                id="pull-sheets-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                {isSyncingSheets ? 'Fetching Live Data from Sheet...' : 'Fetch & Sync Data from Google Sheet'}
              </button>

              {pullStatus === 'success' && (
                <p className="text-[10px] text-emerald-700 font-mono text-center font-bold animate-pulse">
                  ✓ Successfully updated app data to match Google Sheet!
                </p>
              )}

              <button
                onClick={handleTriggerSyncAll}
                disabled={isSyncingAll}
                className="w-full bg-black hover:bg-neutral-800 text-white disabled:bg-gray-200 disabled:text-gray-400 py-2.5 px-4 text-xs font-bold uppercase tracking-wider border border-black flex items-center justify-center gap-2 cursor-pointer focus:outline-none transition-colors"
                id="force-sync-sheets-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                {isSyncingAll ? 'Pushing All Sandbox Data...' : 'Push All Local App Data to Google Sheet'}
              </button>

              {syncStatus === 'success' && (
                <p className="text-[10px] text-green-600 font-mono text-center animate-pulse">
                  ✓ Successfully pushed all companies, products, and orders to your Google Sheet!
                </p>
              )}
              {syncStatus === 'failed' && (
                <p className="text-[10px] text-red-600 font-mono text-center">
                  ✗ Push failed. Please check your App Script logs.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Copyable Google Apps Script Instructions */}
      <div>
        <AppsScriptInstructions />
      </div>
    </div>
  );
}
