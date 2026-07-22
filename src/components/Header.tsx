/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanyProfile, SystemSettings } from '../types';
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
  Sliders
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
  systemSettings
}: HeaderProps) {
  return (
    <header className="bg-white border-b-2 border-black sticky top-0 z-40">
      {/* Main Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 sm:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Typography */}
        <div className="flex items-center space-x-3 select-none">
          {systemSettings?.logoUrl ? (
            <img
              src={systemSettings.logoUrl}
              alt={systemSettings.hubName}
              className="w-12 h-12 rounded-xl object-cover border border-black shadow-xs shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="bg-black text-white p-2 border border-black flex items-center justify-center font-bold font-mono text-xl tracking-tight leading-none rounded-xl shrink-0">
              {systemSettings?.shortHubName || 'ARH'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tighter uppercase text-black leading-none">
              {systemSettings?.hubName || 'ARH Print Hub'}
            </h1>
          </div>
        </div>

        {/* Company Logo & Cart Action */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {userRole === 'admin' ? null : (
            <>
              {/* Company Logo beside Cart */}
              {selectedCompany.logoUrl ? (
                <div
                  className="w-10 h-10 rounded-xl border border-gray-300 overflow-hidden bg-white shrink-0 flex items-center justify-center shadow-xs"
                  title={selectedCompany.name}
                  id="client-header-logo"
                >
                  <img
                    src={selectedCompany.logoUrl}
                    alt={selectedCompany.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div
                  className="w-10 h-10 rounded-xl bg-black text-white font-mono font-extrabold flex items-center justify-center shrink-0 text-xs uppercase shadow-xs border border-black"
                  title={selectedCompany.name}
                  id="client-header-logo-initials"
                >
                  {selectedCompany.name ? selectedCompany.name.slice(0, 2) : 'CO'}
                </div>
              )}

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
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-t border-gray-100 max-w-7xl mx-auto px-4 sm:px-8">
        <nav className="flex overflow-x-auto space-x-1 custom-scrollbar pb-1.5 pt-1">
          {/* Admin Tab is injected first for admin users */}
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
              <span>Admin Center</span>
            </button>
          )}

          {[
            ...(userRole !== 'admin' ? [
              { id: 'catalog', label: 'Order Catalog', icon: LayoutGrid },
              { id: 'history', label: 'Order History', icon: History }
            ] : []),
            ...(userRole === 'admin' ? [{ id: 'sync', label: 'Google Sheets Sync', icon: Settings }] : [])
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
    </header>
  );
}
