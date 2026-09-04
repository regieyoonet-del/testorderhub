/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { CompanyProfile, SystemSettings } from '../types';
import {
  LayoutGrid,
  Layers,
  Globe,
  History,
  FileText,
  Settings,
  Sliders,
  X,
  LogOut,
  Briefcase,
  Package,
  Clock,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  company?: CompanyProfile;
  systemSettings?: SystemSettings;
  userRole: 'admin' | 'client' | 'staff';
  activeTab: string;
  onSelectTab: (tab: string) => void;
  counts?: {
    catalog?: number;
    browse?: number;
    portals?: number;
    history?: number;
    quotes?: number;
    jobs?: number;
    orders?: number;
    payslips?: number;
  };
  onLogout?: () => void;
  currentStaffName?: string;
}

export default function NavigationDrawer({
  isOpen,
  onClose,
  company,
  systemSettings,
  userRole,
  activeTab,
  onSelectTab,
  counts = {},
  onLogout,
  currentStaffName
}: NavigationDrawerProps) {
  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    ...(userRole === 'admin'
      ? [
          {
            id: 'admin',
            label: 'Admin Dashboard',
            icon: Sliders,
            count: null
          }
        ]
      : userRole === 'staff'
      ? [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutGrid,
            count: null
          },
          {
            id: 'jobs',
            label: 'Job Management',
            icon: Briefcase,
            count: counts.jobs !== undefined ? counts.jobs : null
          },
          {
            id: 'catalog',
            label: 'ARH Products',
            icon: Layers,
            count: counts.catalog !== undefined ? counts.catalog : null
          },
          {
            id: 'attendance',
            label: 'Time & Attendance',
            icon: Clock,
            count: null
          },
          {
            id: 'payslips',
            label: 'Payslips',
            icon: FileText,
            count: counts.payslips !== undefined ? counts.payslips : null
          },
          {
            id: 'work-history',
            label: 'Work History',
            icon: History,
            count: null
          },
          {
            id: 'profile',
            label: 'Account Settings',
            icon: User,
            count: null
          }
        ]
      : [
          {
            id: 'catalog',
            label: 'My Catalog',
            icon: LayoutGrid,
            count: counts.catalog !== undefined ? counts.catalog : null
          },
          {
            id: 'browse',
            label: 'ARH Products',
            icon: Layers,
            count: counts.browse !== undefined ? counts.browse : null
          },
          {
            id: 'portals',
            label: 'Storefronts',
            icon: Globe,
            count: counts.portals !== undefined ? counts.portals : null
          },
          {
            id: 'history',
            label: 'Order History',
            icon: History,
            count: counts.history !== undefined ? counts.history : null
          },
          {
            id: 'quote-history',
            label: 'Quote Requests',
            icon: FileText,
            count: counts.quotes !== undefined ? counts.quotes : null
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            count: null
          }
        ]
    )
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex" id="client-nav-drawer-root">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-in Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-80 max-w-[85vw] bg-white border-r-2 border-black h-full flex flex-col p-5 shadow-2xl z-10 justify-between overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Menu"
          >
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {userRole === 'client' && company?.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-10 h-10 object-contain rounded-xl border border-gray-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : userRole === 'client' && company?.name ? (
                    <div className="bg-black text-white w-10 h-10 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                      {company.name.slice(0, 2)}
                    </div>
                  ) : (
                    <div className="bg-black text-white p-2 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      {systemSettings?.shortHubName || 'ARH'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold uppercase text-black block leading-none truncate">
                      {userRole === 'client' ? company?.name || 'Client Menu' : userRole === 'staff' ? 'Staff Portal' : 'Hub Navigation'}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 truncate block">
                      {userRole === 'client' ? 'Client Portal' : userRole === 'staff' ? (currentStaffName || 'Internal Employee') : 'Admin Hub'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center border border-gray-200 shrink-0"
                  aria-label="Close navigation menu"
                  id="close-client-nav-drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Nav Items */}
              <nav className="space-y-2" role="navigation" aria-label="Portal Navigation Sections">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-sans text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] cursor-pointer ${
                        isActive
                          ? 'bg-black text-white shadow-xs'
                          : 'text-gray-700 hover:text-black hover:bg-gray-100'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                      id={`client-nav-item-${item.id}`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.count !== null && item.count !== undefined && (
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white border-white/20'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom Section with PWA Install, Sign Out & Footer */}
            <div className="pt-4 border-t border-gray-200 mt-auto space-y-3">
              {/* Install PWA Button */}
              <PWAInstallButton variant="drawer" appName={systemSettings?.hubName || 'ARH Print Hub'} />

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 border border-black font-sans text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer shadow-xs active:scale-98"
                  id="client-sidebar-signout-btn"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              )}
              <div className="text-center font-mono text-[10px] text-gray-400">
                {userRole === 'client' && company?.name ? `${company.name} • ` : ''}ARH Print Hub v2.0
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
