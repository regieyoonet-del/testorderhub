/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanyProfile, SystemSettings, AppNotification } from '../types';
import NotificationBell from './NotificationBell';
import {
  ShoppingCart,
  Repeat,
  Menu
} from 'lucide-react';

interface HeaderProps {
  companies: CompanyProfile[];
  selectedCompany: CompanyProfile;
  onCompanyChange: (company: CompanyProfile) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  onCartToggle: () => void;
  userRole: 'admin' | 'client' | 'staff';
  onLogout: () => void;
  systemSettings: SystemSettings;
  isSheetsConnected?: boolean;
  isSyncingSheets?: boolean;
  onSyncSheets?: () => void;
  notifications?: AppNotification[];
  onMarkNotificationAsRead?: (id: string) => void;
  onMarkAllNotificationsAsRead?: () => void;
  onClearNotifications?: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
  onMobileNavToggle?: () => void;
  currentStaffName?: string;
}

export default function Header({
  companies,
  selectedCompany,
  onCompanyChange,
  activeTab,
  setActiveTab,
  cartCount,
  onCartToggle,
  userRole,
  onLogout,
  systemSettings,
  isSheetsConnected,
  isSyncingSheets,
  onSyncSheets,
  notifications = [],
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onClearNotifications,
  onSelectNotification,
  onMobileNavToggle,
  currentStaffName
}: HeaderProps) {
  return (
    <header className="bg-white border-b-2 border-black sticky top-0 z-40">
      {/* Main Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 sm:px-8 flex items-center justify-between gap-4">
        {/* Brand Typography */}
        <div className="flex items-center space-x-3 select-none min-w-0">
          {onMobileNavToggle && (
            <button
              type="button"
              onClick={onMobileNavToggle}
              className="p-2.5 rounded-2xl text-black hover:bg-gray-100 transition-all cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px] shrink-0 border-2 border-black active:scale-95 shadow-xs"
              aria-label="Toggle Navigation Menu"
              id="header-menu-toggle-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {userRole === 'client' && selectedCompany ? (
            <>
              {selectedCompany.logoUrl ? (
                <img
                  src={selectedCompany.logoUrl}
                  alt={selectedCompany.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-black text-white w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold font-mono text-base sm:text-lg tracking-tight leading-none rounded-xl shrink-0 uppercase">
                  {selectedCompany.name ? selectedCompany.name.slice(0, 2) : 'CO'}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tighter uppercase text-black leading-none truncate">
                  {selectedCompany.name}
                </h1>
              </div>
            </>
          ) : userRole === 'staff' ? (
            <>
              {systemSettings?.logoUrl ? (
                <img
                  src={systemSettings.logoUrl}
                  alt={systemSettings.hubName}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-black text-white p-2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold font-mono text-lg sm:text-xl tracking-tight leading-none rounded-xl shrink-0">
                  {systemSettings?.shortHubName || 'ARH'}
                </div>
              )}
              <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tighter uppercase text-black leading-none truncate">
                  {systemSettings?.hubName || 'ARH Print Hub'}
                </h1>
                <span className="inline-flex items-center text-[10px] font-mono font-bold bg-neutral-900 text-white px-2 py-0.5 rounded-full w-fit mt-1 sm:mt-0 tracking-wider uppercase">
                  Staff Portal{currentStaffName ? ` • ${currentStaffName}` : ''}
                </span>
              </div>
            </>
          ) : (
            <>
              {systemSettings?.logoUrl ? (
                <img
                  src={systemSettings.logoUrl}
                  alt={systemSettings.hubName}
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-black text-white p-2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold font-mono text-lg sm:text-xl tracking-tight leading-none rounded-xl shrink-0">
                  {systemSettings?.shortHubName || 'ARH'}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tighter uppercase text-black leading-none truncate">
                  {systemSettings?.hubName || 'ARH Print Hub'}
                </h1>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {(userRole === 'admin' || userRole === 'staff') && isSheetsConnected && onSyncSheets && (
            <button
              onClick={onSyncSheets}
              disabled={isSyncingSheets}
              className="border border-black bg-emerald-50 text-emerald-900 hover:bg-emerald-100 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 rounded-xl shrink-0 disabled:opacity-50"
              title="Fetch fresh data from Google Sheets"
              id="sync-sheets-btn"
            >
              <Repeat className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin text-emerald-700' : ''}`} />
              <span className="hidden sm:inline">{isSyncingSheets ? 'Syncing...' : 'Sync Sheets'}</span>
            </button>
          )}

          {/* Persistent Notification Bell */}
          <NotificationBell
            userRole={userRole}
            companyName={userRole === 'client' ? selectedCompany?.name : undefined}
            notifications={notifications}
            onMarkAsRead={onMarkNotificationAsRead || (() => {})}
            onMarkAllAsRead={onMarkAllNotificationsAsRead || (() => {})}
            onClearAll={onClearNotifications || (() => {})}
            onSelectNotification={onSelectNotification}
          />

          {/* Client Only: Shopping Cart */}
          {userRole === 'client' && (
            <button
              onClick={onCartToggle}
              className="relative border border-black bg-white p-2.5 text-black hover:bg-black hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 rounded-xl"
              aria-label="Toggle Shopping Cart"
              id="cart-toggle-btn"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-mono border border-white font-extrabold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
