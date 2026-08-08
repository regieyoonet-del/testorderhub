/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanyProfile, SystemSettings, AppNotification } from '../types';
import NotificationBell from './NotificationBell';
import {
  Printer,
  ShoppingCart,
  Settings,
  Repeat,
  History,
  LayoutGrid,
  Building2,
  LogOut,
  ShieldAlert,
  Sliders,
  Layers,
  FileText,
  Globe
} from 'lucide-react';

interface HeaderProps {
  companies: CompanyProfile[];
  selectedCompany: CompanyProfile;
  onCompanyChange: (company: CompanyProfile) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  onCartToggle: () => void;
  userRole: 'admin' | 'client';
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
  onSelectNotification
}: HeaderProps) {
  return (
    <header className="bg-white border-b-2 border-black sticky top-0 z-40">
      {/* Main Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 sm:px-8 flex items-center justify-between gap-4">
        {/* Brand Typography */}
        <div className="flex items-center space-x-3 select-none min-w-0">
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
          {userRole === 'admin' && isSheetsConnected && onSyncSheets && (
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
            companyName={selectedCompany?.name}
            notifications={notifications}
            onMarkAsRead={onMarkNotificationAsRead || (() => {})}
            onMarkAllAsRead={onMarkAllNotificationsAsRead || (() => {})}
            onClearAll={onClearNotifications || (() => {})}
            onSelectNotification={onSelectNotification}
          />

          {userRole === 'admin' ? null : (
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

      {/* Tabs Navigation */}
      {(userRole === 'client' || (userRole === 'admin' && activeTab !== 'admin' && activeTab !== 'sync')) && (
        <div className="border-t border-gray-100 max-w-7xl mx-auto px-4 sm:px-8">
          <nav className="flex overflow-x-auto space-x-1 custom-scrollbar pb-1.5 pt-1">
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-2 py-3 px-4 font-sans text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 whitespace-nowrap focus:outline-none cursor-pointer ${
                  activeTab === 'admin'
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400 hover:text-black hover:border-gray-200'
                }`}
                id="tab-btn-admin"
              >
                <Sliders className="w-3.5 h-3.5 text-black" />
                <span>Admin Dashboard</span>
              </button>
            )}

            {[
              { id: 'catalog', label: 'My Catalog', icon: LayoutGrid },
              { id: 'browse', label: 'ARH Products', icon: Layers },
              { id: 'portals', label: 'Order Portals', icon: Globe },
              { id: 'history', label: 'Order History', icon: History },
              { id: 'quote-history', label: 'Quote Requests', icon: FileText },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 px-4 font-sans text-xs uppercase tracking-wider font-bold transition-all border-b-2 whitespace-nowrap focus:outline-none cursor-pointer ${
                    isActive
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-400 hover:text-black hover:border-gray-200'
                  }`}
                  id={`tab-btn-${tab.id}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
