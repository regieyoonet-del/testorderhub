/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Product,
  CompanyProfile,
  Order,
  CartItem,
  AppsScriptConfig,
  SystemSettings,
  CatalogProduct,
  QuoteEnquiry,
  OrderPortal,
  AppNotification,
  Job,
  JobColumn,
  JobItemColumn,
  JobStatus,
  StaffMember,
  StaffAccount,
  AttendanceRecord,
  AuthUser,
  PayrollRecord,
  ExpenseRecord,
  ExpenseCategory,
  RecurringExpenseRule,
  getDisplayPurchaserName
} from './types';
import { INITIAL_PRODUCTS, INITIAL_COMPANIES, INITIAL_ORDERS, INITIAL_PORTALS } from './data/mockData';
import { INITIAL_CATALOG_PRODUCTS, INITIAL_QUOTE_ENQUIRIES, sanitizeCatalogProduct } from './data/initialCatalog';
import { INITIAL_JOBS, DEFAULT_JOB_COLUMNS, DEFAULT_JOB_ITEM_COLUMNS, createJobFromOrder } from './data/initialJobs';
import { INITIAL_STAFF_MEMBERS, INITIAL_STAFF_ACCOUNTS, INITIAL_ATTENDANCE_RECORDS, generateAttendanceId } from './data/initialFinance';
import {
  formatLocalDate,
  normalizeAttendanceDate,
  normalizeStaffId,
  calculateHoursWorked,
  isRecordActiveClockIn,
  cleanClockOut,
  cleanClockIn
} from './utils/attendanceUtils';
import { DEFAULT_QUOTE_NOTES } from './constants/quoteDefaults';
import { sheetsService } from './lib/sheetsService';
import { EMBEDDED_APPS_SCRIPT_URL } from './config';
import Header from './components/Header';
import ProductCatalog from './components/ProductCatalog';
import BrowseProducts from './components/BrowseProducts';
import OrderHistory from './components/OrderHistory';
import QuoteRequestHistory from './components/QuoteRequestHistory';
import CustomerSettings from './components/CustomerSettings';
import SettingsPanel from './components/SettingsPanel';
import Cart from './components/Cart';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import StaffDashboard from './components/StaffDashboard';
import NavigationDrawer from './components/NavigationDrawer';
import { applyPwaBranding, registerPwaServiceWorker } from './utils/dynamicPWA';
import OrderPortals from './components/OrderPortals';
import PublicOrderPortal from './components/PublicOrderPortal';
import { getProductUnitPrice } from './utils/pricing';
import { getItemColorImage } from './utils/colorUtils';
import { Check, AlertCircle, ShoppingBag, ArrowRight, Printer, RefreshCw, Store } from 'lucide-react';

function getThemeStyles(colorHex: string) {
  let primary = colorHex || '#000000';
  
  // Map legacy preset ids if they exist
  if (primary === 'classic_noir') primary = '#000000';
  else if (primary === 'royal_emerald') primary = '#064e3b';
  else if (primary === 'deep_ocean') primary = '#1e3a8a';
  else if (primary === 'sunset_crimson') primary = '#881337';
  else if (primary === 'warm_amber') primary = '#78350f';

  // Make sure it starts with '#' if it's a hex code
  if (!primary.startsWith('#')) {
    primary = '#' + primary;
  }

  // Fallback for invalid hex code
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(primary)) {
    primary = '#000000';
  }

  // Expand shorthand hex (e.g. #03f -> #0033ff)
  if (primary.length === 4) {
    primary = '#' + primary[1] + primary[1] + primary[2] + primary[2] + primary[3] + primary[3];
  }

  // Helper to adjust color brightness
  const adjustBrightness = (hex: string, percent: number) => {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = Math.max(0, Math.min(255, Math.round(R * (1 + percent))));
    G = Math.max(0, Math.min(255, Math.round(G * (1 + percent))));
    B = Math.max(0, Math.min(255, Math.round(B * (1 + percent))));

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  const primaryHover = adjustBrightness(primary, -0.15);

  // Generate light tint background (blend 96% with white)
  let r = parseInt(primary.substring(1, 3), 16);
  let g = parseInt(primary.substring(3, 5), 16);
  let b = parseInt(primary.substring(5, 7), 16);
  const blend = (c: number) => Math.round(c + (255 - c) * 0.96).toString(16).padStart(2, '0');
  const primaryLight = `#${blend(r)}${blend(g)}${blend(b)}`;

  return `
    :root {
      --color-brand: ${primary} !important;
      --color-brand-hover: ${primaryHover} !important;
      --color-brand-light: ${primaryLight} !important;
      --color-brand-border: ${primary} !important;
    }
    
    .bg-black {
      background-color: var(--color-brand) !important;
    }
    .hover\\:bg-neutral-800:hover {
      background-color: var(--color-brand-hover) !important;
    }
    .hover\\:bg-neutral-900:hover {
      background-color: var(--color-brand-hover) !important;
    }
    .border-black {
      border-color: var(--color-brand) !important;
    }
    .text-black {
      color: var(--color-brand) !important;
    }
    .hover\\:text-black:hover {
      color: var(--color-brand) !important;
    }
    .hover\\:bg-black:hover {
      background-color: var(--color-brand) !important;
    }
    .selection\\:bg-black::selection {
      background-color: var(--color-brand) !important;
    }
    .ring-black {
      --tw-ring-color: var(--color-brand) !important;
    }
    .peer-checked\\:bg-black:checked ~ div,
    .peer-checked\\:bg-black:checked {
      background-color: var(--color-brand) !important;
    }
  `;
}

function encodeSecret(str?: string): string {
  if (!str) return '';
  try {
    return btoa(encodeURIComponent(str));
  } catch {
    return str;
  }
}

function decodeSecret(str?: string): string {
  if (!str) return '';
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return str;
  }
}

const FALLBACK_COMPANY: CompanyProfile = {
  id: 'fallback',
  name: 'Standard Guest',
  logoUrl: '',
  deliveryAddress: 'Standard Address Office',
  contactPerson: 'Guest User',
  contactEmail: 'guest@example.com',
  contactPhone: '',
  poRequired: false,
  enabledProductIds: [],
  customProducts: []
};

export const sanitizeCompany = (co: CompanyProfile): CompanyProfile => {
  const initMatch = INITIAL_COMPANIES.find(i => i.id === co.id);

  const name = (co.name && co.name.trim() !== '') ? co.name : (initMatch?.name || 'Corporate Account');

  const username = (co.username && co.username.trim() !== '')
    ? co.username.trim().toLowerCase()
    : (initMatch?.username || name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client');

  const passcode = (co.passcode && co.passcode.trim() !== '')
    ? co.passcode
    : (initMatch?.passcode || `${username.substring(0, 4)}2026`);

  const contactPerson = (co.contactPerson && co.contactPerson.trim() !== '')
    ? co.contactPerson
    : (initMatch?.contactPerson || 'Company Representative');

  const contactEmail = (co.contactEmail && co.contactEmail.trim() !== '')
    ? co.contactEmail
    : (initMatch?.contactEmail || 'office@company.com');

  const contactPhone = (co.contactPhone && co.contactPhone.trim() !== '')
    ? co.contactPhone
    : (initMatch?.contactPhone || '+1 (555) 000-0000');

  const deliveryAddress = (co.deliveryAddress && co.deliveryAddress.trim() !== '')
    ? co.deliveryAddress
    : (initMatch?.deliveryAddress || 'Standard Address On File');

  const logoUrl = (co.logoUrl !== undefined && co.logoUrl !== null) ? co.logoUrl : (initMatch?.logoUrl || '');

  return {
    ...co,
    name,
    username,
    passcode,
    contactPerson,
    contactEmail,
    contactPhone,
    deliveryAddress,
    logoUrl,
    enabledProductIds: co.enabledProductIds !== undefined
      ? co.enabledProductIds
      : (initMatch?.enabledProductIds || [])
  };
};

export const sanitizeMasterProducts = (prods: Product[], comps: CompanyProfile[]): Product[] => {
  const customProductIds = new Set<string>();
  comps.forEach(c => {
    if (Array.isArray(c.customProducts)) {
      c.customProducts.forEach(cp => {
        if (cp && cp.id) customProductIds.add(cp.id);
      });
    }
  });

  const map = new Map<string, Product>();
  prods.forEach(p => {
    if (p && p.id && !customProductIds.has(p.id)) {
      const initMatch = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
      map.set(p.id, {
        ...p,
        addOns: (p.addOns && p.addOns.length > 0) ? p.addOns : initMatch?.addOns
      });
    }
  });
  return Array.from(map.values());
};

export const sanitizeProducts = (prods: Product[]): Product[] => {
  const map = new Map<string, Product>();
  prods.forEach(p => {
    if (p && p.id) {
      const initMatch = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
      map.set(p.id, {
        ...p,
        addOns: (p.addOns && p.addOns.length > 0) ? p.addOns : initMatch?.addOns
      });
    }
  });
  return Array.from(map.values());
};

export default function App() {
  // ----------------------------------------------------
  // Persistent States with LocalStorage Cache
  // ----------------------------------------------------
  
  const [companies, setCompanies] = useState<CompanyProfile[]>(() => {
    const cached = localStorage.getItem('rp_companies');
    const loaded: CompanyProfile[] = cached ? JSON.parse(cached) : INITIAL_COMPANIES;
    return loaded.map(c => {
      const sanitized = sanitizeCompany(c);
      const initComp = INITIAL_COMPANIES.find(ic => ic.id === c.id);
      return {
        ...sanitized,
        customProducts: (sanitized.customProducts || []).map(cp => {
          const initCp = initComp?.customProducts?.find(p => p.id === cp.id);
          const initMaster = INITIAL_PRODUCTS.find(p => p.id === cp.id);
          return {
            ...cp,
            addOns: (cp.addOns && cp.addOns.length > 0) ? cp.addOns : (initCp?.addOns || initMaster?.addOns)
          };
        })
      };
    });
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('rp_master_products');
    const loaded: Product[] = cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
    const mergedLoaded = loaded.map(p => {
      const initMatch = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
      return {
        ...p,
        addOns: (p.addOns && p.addOns.length > 0) ? p.addOns : initMatch?.addOns
      };
    });
    return sanitizeMasterProducts(mergedLoaded, companies);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = localStorage.getItem('rp_orders');
    if (cached) {
      try {
        const parsed: Order[] = JSON.parse(cached);
        // Filter out legacy default mock orders
        return parsed.filter(o => !['ord-1001', 'ord-1002', 'ord-1003'].includes(o.id));
      } catch {
        return [];
      }
    }
    return INITIAL_ORDERS;
  });

  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>(() => {
    const cached = localStorage.getItem('rp_catalog_products');
    const loaded: CatalogProduct[] = cached ? JSON.parse(cached) : INITIAL_CATALOG_PRODUCTS;
    return loaded.map(sanitizeCatalogProduct);
  });

  const [quoteEnquiries, setQuoteEnquiries] = useState<QuoteEnquiry[]>(() => {
    const cached = localStorage.getItem('rp_quote_enquiries');
    return cached ? JSON.parse(cached) : INITIAL_QUOTE_ENQUIRIES;
  });

  const [orderPortals, setOrderPortals] = useState<OrderPortal[]>(() => {
    const cached = localStorage.getItem('rp_order_portals');
    return cached ? JSON.parse(cached) : INITIAL_PORTALS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const cached = localStorage.getItem('rp_notifications');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    const cached = localStorage.getItem('rp_jobs');
    if (cached) {
      try {
        const parsed: Job[] = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [jobColumns, setJobColumns] = useState<JobColumn[]>(() => {
    const cached = localStorage.getItem('rp_job_columns');
    if (!cached) return DEFAULT_JOB_COLUMNS;
    try {
      const parsed: JobColumn[] = JSON.parse(cached);
      if (!Array.isArray(parsed)) return DEFAULT_JOB_COLUMNS;
      const map = new Map<string, JobColumn>();
      for (const col of parsed) {
        if (col && col.id) map.set(col.id, col);
      }
      return Array.from(map.values());
    } catch {
      return DEFAULT_JOB_COLUMNS;
    }
  });

  const [jobItemColumns, setJobItemColumns] = useState<JobItemColumn[]>(() => {
    const cached = localStorage.getItem('rp_job_item_columns');
    if (!cached) return DEFAULT_JOB_ITEM_COLUMNS;
    try {
      const parsed: JobItemColumn[] = JSON.parse(cached);
      if (!Array.isArray(parsed)) return DEFAULT_JOB_ITEM_COLUMNS;
      const map = new Map<string, JobItemColumn>();
      for (const col of parsed) {
        if (col && col.id) map.set(col.id, col);
      }
      return Array.from(map.values());
    } catch {
      return DEFAULT_JOB_ITEM_COLUMNS;
    }
  });

  const [highlightJobId, setHighlightJobId] = useState<string | undefined>(undefined);
  const jobSaveDebounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const hasCleanedUpHistoricalColumnsRef = useRef<boolean>(false);

  const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
    { id: 'cat-salaries', name: 'Salaries & Payroll', isSystem: true, status: 'Active' },
    { id: 'cat-materials', name: 'Raw Materials & Inks', isSystem: true, status: 'Active' },
    { id: 'cat-rent', name: 'Rent & Facilities', isSystem: true, status: 'Active' },
    { id: 'cat-utilities', name: 'Utilities & Power', isSystem: true, status: 'Active' },
    { id: 'cat-equipment', name: 'Equipment & Maintenance', isSystem: true, status: 'Active' },
    { id: 'cat-logistics', name: 'Delivery & Logistics', isSystem: true, status: 'Active' },
    { id: 'cat-software', name: 'Software & Subscriptions', isSystem: true, status: 'Active' },
    { id: 'cat-tax', name: 'Taxes & Licenses', isSystem: true, status: 'Active' },
    { id: 'cat-marketing', name: 'Marketing & Sales', isSystem: true, status: 'Active' },
    { id: 'cat-misc', name: 'Miscellaneous', isSystem: true, status: 'Active' }
  ];

  const [staff, setStaff] = useState<StaffMember[]>(() => {
    const cached = localStorage.getItem('rp_staff');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [payroll, setPayroll] = useState<PayrollRecord[]>(() => {
    const cached = localStorage.getItem('rp_payroll');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const cached = localStorage.getItem('rp_expenses');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseRule[]>(() => {
    const cached = localStorage.getItem('rp_recurring_expenses');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(() => {
    const cached = localStorage.getItem('rp_expense_categories');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EXPENSE_CATEGORIES;
      } catch {
        return DEFAULT_EXPENSE_CATEGORIES;
      }
    }
    return DEFAULT_EXPENSE_CATEGORIES;
  });

  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(() => {
    const cached = localStorage.getItem('rp_staff_accounts');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STAFF_ACCOUNTS;
      } catch {
        return INITIAL_STAFF_ACCOUNTS;
      }
    }
    return INITIAL_STAFF_ACCOUNTS;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const cached = localStorage.getItem('rp_attendance');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r: any) => ({
            ...r,
            date: normalizeAttendanceDate(r.date),
            clockIn: cleanClockIn(r.clockIn),
            clockOut: cleanClockOut(r.clockOut)
          }));
        }
        return INITIAL_ATTENDANCE_RECORDS;
      } catch {
        return INITIAL_ATTENDANCE_RECORDS;
      }
    }
    return INITIAL_ATTENDANCE_RECORDS;
  });

  useEffect(() => {
    localStorage.setItem('rp_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('rp_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('rp_job_columns', JSON.stringify(jobColumns));
  }, [jobColumns]);

  useEffect(() => {
    localStorage.setItem('rp_job_item_columns', JSON.stringify(jobItemColumns));
  }, [jobItemColumns]);

  useEffect(() => {
    localStorage.setItem('rp_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('rp_staff_accounts', JSON.stringify(staffAccounts));
  }, [staffAccounts]);

  useEffect(() => {
    localStorage.setItem('rp_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('rp_payroll', JSON.stringify(payroll));
  }, [payroll]);

  useEffect(() => {
    localStorage.setItem('rp_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('rp_recurring_expenses', JSON.stringify(recurringExpenses));
  }, [recurringExpenses]);

  useEffect(() => {
    localStorage.setItem('rp_expense_categories', JSON.stringify(expenseCategories));
  }, [expenseCategories]);

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.markNotificationRead(appsScriptConfig.webAppUrl, id);
    }
  };

  const handleMarkAllNotificationsAsRead = () => {
    const isTarget = (n: AppNotification) => {
      if (loggedInUser?.role === 'admin') {
        return n.recipientType === 'admin';
      } else {
        const activeCoLower = activeCompany?.name?.trim().toLowerCase();
        return n.recipientType === 'company' && !!n.companyName && n.companyName.trim().toLowerCase() === activeCoLower;
      }
    };

    setNotifications(prev => prev.map(n => isTarget(n) ? { ...n, read: true } : n));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      notifications.filter(n => isTarget(n) && !n.read).forEach(n => {
        sheetsService.markNotificationRead(appsScriptConfig.webAppUrl!, n.id);
      });
    }
  };

  const handleClearNotifications = () => {
    const isTarget = (n: AppNotification) => {
      if (loggedInUser?.role === 'admin') {
        return n.recipientType === 'admin';
      } else {
        const activeCoLower = activeCompany?.name?.trim().toLowerCase();
        return n.recipientType === 'company' && !!n.companyName && n.companyName.trim().toLowerCase() === activeCoLower;
      }
    };

    setNotifications(prev => prev.filter(n => !isTarget(n)));
  };

  const [highlightOrderId, setHighlightOrderId] = useState<string | undefined>(undefined);
  const [highlightOrderNumber, setHighlightOrderNumber] = useState<string | undefined>(undefined);
  const [highlightQuoteId, setHighlightQuoteId] = useState<string | undefined>(undefined);
  const [highlightEnquiryNumber, setHighlightEnquiryNumber] = useState<string | undefined>(undefined);
  const [adminCatalogSection, setAdminCatalogSection] = useState<'catalog' | 'enquiries' | undefined>(undefined);
  const [isAdminNavOpen, setIsAdminNavOpen] = useState<boolean>(false);

  const handleAdminNavToggle = () => {
    setIsAdminNavOpen(prev => !prev);
  };

  const handleSelectNotification = (notif: AppNotification) => {
    const isQuoteNotif =
      notif.type === 'quote_request' ||
      notif.type === 'quote_status_change' ||
      notif.title.toLowerCase().includes('quote') ||
      notif.message.toLowerCase().includes('quote');

    if (loggedInUser?.role === 'admin') {
      setActiveTab('admin');
      if (isQuoteNotif) {
        setAdminCatalogSection('enquiries');
        setHighlightEnquiryNumber(notif.orderNumber || notif.orderId);
      } else {
        setAdminCatalogSection(undefined);
        setHighlightOrderNumber(notif.orderNumber);
        setHighlightOrderId(notif.orderId);
      }
    } else {
      if (notif.companyName && notif.companyName.toLowerCase().trim() !== activeCompany?.name.toLowerCase().trim()) {
        const targetCo = companies.find(c => c.name.toLowerCase().trim() === notif.companyName?.toLowerCase().trim());
        if (targetCo) {
          setSelectedCompanyId(targetCo.id);
        }
      }
      if (isQuoteNotif) {
        setActiveTab('quote-history');
        setHighlightQuoteId(notif.orderId);
        setHighlightEnquiryNumber(notif.orderNumber);
      } else {
        setActiveTab('history');
        setHighlightOrderId(notif.orderId);
        setHighlightOrderNumber(notif.orderNumber);
      }
    }
  };

  const [activePublicPortal, setActivePublicPortal] = useState<OrderPortal | null>(null);
  const [urlPortalToken, setUrlPortalToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('portal');
  });
  const [isResolvingPortal, setIsResolvingPortal] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get('portal');
  });

  const [appsScriptConfig, setAppsScriptConfig] = useState<AppsScriptConfig>(() => {
    const cached = localStorage.getItem('rp_apps_script_config');
    let parsedConfig: AppsScriptConfig | null = null;
    if (cached) {
      try {
        parsedConfig = JSON.parse(cached);
      } catch {}
    }

    // Check if script URL was passed in query parameters (e.g., ?script=... or ?appsScriptUrl=...)
    const params = new URLSearchParams(window.location.search);
    const urlScript = params.get('script') || params.get('appsScriptUrl') || params.get('webAppUrl');
    const envScript = (((import.meta as any).env?.VITE_APPS_SCRIPT_URL) as string) || '';

    // EMBEDDED_APPS_SCRIPT_URL is the canonical source of truth for the active deployment.
    // Outdated URLs stored in localStorage migrate automatically to the embedded URL,
    // while query parameter overrides or explicitly entered custom URLs are honored.
    let effectiveUrl = EMBEDDED_APPS_SCRIPT_URL;
    if (urlScript && urlScript.trim()) {
      effectiveUrl = urlScript.trim();
    } else if (envScript && envScript.trim()) {
      effectiveUrl = envScript.trim();
    } else if (parsedConfig?.isCustomUrl && parsedConfig.webAppUrl && parsedConfig.webAppUrl.trim()) {
      effectiveUrl = parsedConfig.webAppUrl.trim();
    } else if (EMBEDDED_APPS_SCRIPT_URL && EMBEDDED_APPS_SCRIPT_URL.trim()) {
      effectiveUrl = EMBEDDED_APPS_SCRIPT_URL.trim();
    } else if (parsedConfig?.webAppUrl) {
      effectiveUrl = parsedConfig.webAppUrl.trim();
    }

    const finalConfig: AppsScriptConfig = {
      webAppUrl: effectiveUrl.trim(),
      isConnected: true,
      isCustomUrl: parsedConfig?.isCustomUrl || false,
      lastSyncTime: parsedConfig?.lastSyncTime
    };
    localStorage.setItem('rp_apps_script_config', JSON.stringify(finalConfig));
    return finalConfig;
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      localStorage.removeItem('rp_admin_username');
      localStorage.removeItem('rp_admin_passcode');
    } catch {}

    const cached = localStorage.getItem('rp_system_settings');
    let parsed: any = {};
    if (cached) {
      try {
        parsed = JSON.parse(cached);
      } catch {}
    }

    const adminUsername = parsed._sec_au ? decodeSecret(parsed._sec_au) : (parsed.adminUsername || 'admin');
    const adminPasscode = parsed._sec_ap ? decodeSecret(parsed._sec_ap) : (parsed.adminPasscode || 'admin123');

    return {
      hubName: parsed.hubName || 'ARH Print Hub',
      shortHubName: parsed.shortHubName || 'ARH',
      orderPrefix: parsed.orderPrefix || 'ARH-2026',
      currencySymbol: parsed.currencySymbol || 'Php',
      colorTheme: parsed.colorTheme || 'classic_noir',
      adminEmail: (parsed.adminEmail && parsed.adminEmail.trim() !== '') ? parsed.adminEmail : 'regie.yoonet@gmail.com',
      logoUrl: parsed.logoUrl || '',
      faviconUrl: parsed.faviconUrl || '',
      pwaIconUrl: parsed.pwaIconUrl || '',
      pwaIcon192Url: parsed.pwaIcon192Url || '',
      pwaIcon512Url: parsed.pwaIcon512Url || '',
      pwaIconMaskableUrl: parsed.pwaIconMaskableUrl || '',
      companyTagline: parsed.companyTagline !== undefined ? parsed.companyTagline : '',
      companyAddress: parsed.companyAddress !== undefined ? parsed.companyAddress : '',
      taxId: parsed.taxId !== undefined ? parsed.taxId : '',
      adminUsername,
      adminPasscode
    };
  });

  // Client & Staff Authentication State (Session-isolated so new windows/browsers/shared links land on sign-in window)
  const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(() => {
    try {
      localStorage.removeItem('rp_logged_in_user');
      const cached = sessionStorage.getItem('rp_logged_in_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (loggedInUser) {
      sessionStorage.setItem('rp_logged_in_user', JSON.stringify(loggedInUser));
    } else {
      sessionStorage.removeItem('rp_logged_in_user');
    }
  }, [loggedInUser]);

  // Active Selected Company (Admin can change this to preview catalog, client is locked to their profile)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    const cachedCoId = localStorage.getItem('rp_selected_company_id');
    if (cachedCoId) return cachedCoId;
    return INITIAL_COMPANIES[0].id;
  });

  // Derived Active Company Profile
  const activeCompany = (loggedInUser?.role === 'client'
    ? (companies.find(c => c.id === loggedInUser.companyId) || companies[0])
    : (companies.find(c => c.id === selectedCompanyId) || companies[0])) || FALLBACK_COMPANY;

  // Client-isolated cart state with company-specific local storage
  const activeCompanyId = (loggedInUser?.role === 'client' && loggedInUser.companyId)
    ? loggedInUser.companyId
    : (selectedCompanyId || activeCompany?.id || 'default');

  const cartStorageKey = `rp_cart_${activeCompanyId}`;

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const activeId = (loggedInUser?.role === 'client' && loggedInUser.companyId)
        ? loggedInUser.companyId
        : (localStorage.getItem('rp_selected_company_id') || 'default');
      const cached = localStorage.getItem(`rp_cart_${activeId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const currentLoadedCartKeyRef = useRef<string>(cartStorageKey);

  // Reload isolated cart when active company / user changes
  useEffect(() => {
    currentLoadedCartKeyRef.current = cartStorageKey;
    try {
      const cached = localStorage.getItem(cartStorageKey);
      if (cached) {
        setCart(JSON.parse(cached));
      } else {
        setCart([]);
      }
    } catch {
      setCart([]);
    }
  }, [cartStorageKey]);

  // Persist cart to company-specific local storage key ONLY when cart matches current loaded key
  useEffect(() => {
    try {
      if (cartStorageKey && currentLoadedCartKeyRef.current === cartStorageKey) {
        localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      }
    } catch {}
  }, [cart, cartStorageKey]);

  // UI Flow States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const cached = sessionStorage.getItem('rp_logged_in_user');
      const cachedTab = sessionStorage.getItem('rp_active_tab');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (cachedTab) {
          if (parsed?.role === 'admin' && (cachedTab === 'admin' || cachedTab === 'sync')) return cachedTab;
          if (parsed?.role === 'staff') {
            const validStaffTabs = ['dashboard', 'jobs', 'catalog', 'attendance', 'payslips', 'work-history', 'profile'];
            if (validStaffTabs.includes(cachedTab)) return cachedTab;
          }
          if (parsed?.role === 'client') {
            const validClientTabs = ['catalog', 'browse', 'portals', 'history', 'quote-history', 'settings'];
            if (validClientTabs.includes(cachedTab)) return cachedTab;
          }
        }
        if (parsed?.role === 'admin') return 'admin';
        if (parsed?.role === 'staff') return 'dashboard';
        if (parsed?.role === 'client') return 'catalog';
      }
    } catch {}
    return 'browse';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom Modals
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // ----------------------------------------------------
  // Sync States to LocalStorage
  // ----------------------------------------------------
  useEffect(() => {
    localStorage.setItem('rp_master_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (activeTab) {
      sessionStorage.setItem('rp_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.removeItem('rp_admin_username');
      localStorage.removeItem('rp_admin_passcode');
    } catch {}

    const settingsToStore: Record<string, any> = { ...systemSettings };
    if (settingsToStore.adminUsername) {
      settingsToStore._sec_au = encodeSecret(settingsToStore.adminUsername);
      delete settingsToStore.adminUsername;
    }
    if (settingsToStore.adminPasscode) {
      settingsToStore._sec_ap = encodeSecret(settingsToStore.adminPasscode);
      delete settingsToStore.adminPasscode;
    }
    localStorage.setItem('rp_system_settings', JSON.stringify(settingsToStore));
  }, [systemSettings]);

  // Dynamically update browser tab favicon across devices
  useEffect(() => {
    const faviconHref = systemSettings.faviconUrl || systemSettings.logoUrl;
    if (faviconHref) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconHref;
    }
  }, [systemSettings.faviconUrl, systemSettings.logoUrl]);

  // Initialize PWA service worker once on mount
  useEffect(() => {
    registerPwaServiceWorker();
  }, []);

  // Dynamically apply PWA branding, manifest, and icons across sessions
  useEffect(() => {
    applyPwaBranding(systemSettings);
  }, [systemSettings]);

  useEffect(() => {
    localStorage.setItem('rp_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    if (activeCompany) {
      localStorage.setItem('rp_selected_company_id', activeCompany.id);
    }
  }, [activeCompany]);

  useEffect(() => {
    localStorage.setItem('rp_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('rp_catalog_products', JSON.stringify(catalogProducts));
  }, [catalogProducts]);

  useEffect(() => {
    localStorage.setItem('rp_quote_enquiries', JSON.stringify(quoteEnquiries));
  }, [quoteEnquiries]);

  useEffect(() => {
    localStorage.setItem('rp_order_portals', JSON.stringify(orderPortals));
  }, [orderPortals]);

  // Sync shareable link ?portal=...
  useEffect(() => {
    if (!urlPortalToken) {
      setIsResolvingPortal(false);
      return;
    }

    const tokenClean = urlPortalToken.trim();
    const searchParams = new URLSearchParams(window.location.search);
    const urlCp = searchParams.get('cp');
    const urlCvp = searchParams.get('cvp');
    const urlCaop = searchParams.get('caop');

    let urlCustomPrices: Record<string, number> | undefined;
    let urlCustomVariantPrices: Record<string, Record<string, number>> | undefined;
    let urlCustomAddOnPrices: Record<string, Record<string, number>> | undefined;

    if (urlCp) {
      try {
        urlCustomPrices = JSON.parse(decodeURIComponent(urlCp));
      } catch (e) {}
    }
    if (urlCvp) {
      try {
        urlCustomVariantPrices = JSON.parse(decodeURIComponent(urlCvp));
      } catch (e) {}
    }
    if (urlCaop) {
      try {
        urlCustomAddOnPrices = JSON.parse(decodeURIComponent(urlCaop));
      } catch (e) {}
    }

    // 1. Check local portals first
    let match = orderPortals.find(p =>
      p.shareToken?.toLowerCase() === tokenClean.toLowerCase() ||
      p.id?.toLowerCase() === tokenClean.toLowerCase() ||
      p.companyId?.toLowerCase() === tokenClean.toLowerCase()
    );

    // 2. If no direct portal match, check matching companies
    if (!match && companies.length > 0) {
      const matchedCompany = companies.find(c =>
        c.id.toLowerCase() === tokenClean.toLowerCase() ||
        c.username?.toLowerCase() === tokenClean.toLowerCase() ||
        c.name?.toLowerCase() === tokenClean.toLowerCase() ||
        tokenClean.toLowerCase().includes(c.id.toLowerCase()) ||
        tokenClean.toLowerCase().includes((c.username || '').toLowerCase())
      );

      if (matchedCompany) {
        // Find existing portal for this company if any
        match = orderPortals.find(p => p.companyId === matchedCompany.id);

        if (!match) {
          // Virtualize / auto-create default active portal for this company
          const defaultPortal: OrderPortal = {
            id: `portal-${matchedCompany.id}`,
            companyId: matchedCompany.id,
            companyName: matchedCompany.name,
            name: `${matchedCompany.name} Corporate Storefront`,
            description: `Official corporate merchandise & promotional ordering portal for ${matchedCompany.name}.`,
            status: 'Active',
            productIds: matchedCompany.enabledProductIds && matchedCompany.enabledProductIds.length > 0
              ? matchedCompany.enabledProductIds
              : products.map(p => p.id),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            shareToken: `portal-${matchedCompany.username || matchedCompany.id}`
          };
          match = defaultPortal;
          setOrderPortals(prev => [...prev, defaultPortal]);
        }
      }
    }

    if (match) {
      const mergedMatch: OrderPortal = {
        ...match,
        customPrices: urlCustomPrices || match.customPrices,
        customVariantPrices: urlCustomVariantPrices || match.customVariantPrices,
        customAddOnPrices: urlCustomAddOnPrices || match.customAddOnPrices
      };
      setActivePublicPortal(mergedMatch);
      // Only unblock loading state immediately if offline or if we have an exact cached local portal
      const isRealLocalPortal = orderPortals.some(p => p.id === match.id || (p.shareToken && p.shareToken.toLowerCase() === tokenClean.toLowerCase()));
      if (!appsScriptConfig.isConnected || !appsScriptConfig.webAppUrl || isRealLocalPortal) {
        setIsResolvingPortal(false);
      } else {
        setIsResolvingPortal(true);
      }
      // If NOT connected to Sheets, we are done.
      if (!appsScriptConfig.isConnected || !appsScriptConfig.webAppUrl) {
        return;
      }
    } else {
      setIsResolvingPortal(true);
    }

    // 3. If connected to Sheets, fetch live data from Google Sheets in background
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      Promise.all([
        sheetsService.fetchPortals(url),
        sheetsService.fetchCompanies(url),
        sheetsService.fetchProducts(url),
        sheetsService.fetchCatalogProducts(url)
      ]).then(([fetchedPortals, fetchedCompanies, fetchedProducts, fetchedCatalogProducts]) => {
        if (fetchedProducts && fetchedProducts.length > 0) {
          setProducts(prev => {
            const map = new Map<string, Product>();
            prev.forEach(p => map.set(p.id, p));
            fetchedProducts.forEach(p => {
              const existing = map.get(p.id);
              const initMatch = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
              const effectiveAddOns = (p.addOns && p.addOns.length > 0)
                ? p.addOns
                : ((existing?.addOns && existing.addOns.length > 0) ? existing.addOns : initMatch?.addOns);
              map.set(p.id, {
                ...existing,
                ...p,
                addOns: effectiveAddOns
              });
            });
            return Array.from(map.values());
          });
        }

        if (fetchedCatalogProducts && fetchedCatalogProducts.length > 0) {
          setCatalogProducts(prev => {
            const map = new Map<string, CatalogProduct>();
            prev.forEach(p => map.set(p.id, p));
            fetchedCatalogProducts.forEach(p => map.set(p.id, p));
            return Array.from(map.values());
          });
        }

        let updatedCompaniesList = companies;
        if (fetchedCompanies && fetchedCompanies.length > 0) {
          const coMap = new Map<string, CompanyProfile>();
          companies.forEach(c => coMap.set(c.id, c));
          fetchedCompanies.forEach(c => {
            const existing = coMap.get(c.id);
            const mergedCustoms = (c.customProducts && c.customProducts.length > 0) ? c.customProducts : (existing?.customProducts || []);
            coMap.set(c.id, sanitizeCompany({
              ...existing,
              ...c,
              customProducts: mergedCustoms.map(cp => {
                const existingCp = existing?.customProducts?.find(ep => ep.id === cp.id);
                const initCp = INITIAL_COMPANIES.find(ic => ic.id === c.id)?.customProducts?.find(p => p.id === cp.id);
                const initMaster = INITIAL_PRODUCTS.find(p => p.id === cp.id);
                const effectiveAddOns = (cp.addOns && cp.addOns.length > 0)
                  ? cp.addOns
                  : ((existingCp?.addOns && existingCp.addOns.length > 0) ? existingCp.addOns : (initCp?.addOns || initMaster?.addOns));
                return {
                  ...cp,
                  addOns: effectiveAddOns
                };
              })
            }));
          });
          updatedCompaniesList = Array.from(coMap.values());
          setCompanies(updatedCompaniesList);
        }

        let updatedPortalsList = orderPortals;
        if (fetchedPortals && fetchedPortals.length > 0) {
          const poMap = new Map<string, OrderPortal>();
          orderPortals.forEach(p => poMap.set(p.id, p));
          fetchedPortals.forEach(fp => {
            const existing = poMap.get(fp.id);
            poMap.set(fp.id, {
              ...fp,
              customPrices: (fp.customPrices && Object.keys(fp.customPrices).length > 0) ? fp.customPrices : (existing?.customPrices || urlCustomPrices),
              customVariantPrices: (fp.customVariantPrices && Object.keys(fp.customVariantPrices).length > 0) ? fp.customVariantPrices : (existing?.customVariantPrices || urlCustomVariantPrices),
              customAddOnPrices: (fp.customAddOnPrices && Object.keys(fp.customAddOnPrices).length > 0) ? fp.customAddOnPrices : (existing?.customAddOnPrices || urlCustomAddOnPrices)
            });
          });
          updatedPortalsList = Array.from(poMap.values());
          setOrderPortals(updatedPortalsList);
        }

        // Search in updated portals
        let fetchedMatch = updatedPortalsList.find(p =>
          p.shareToken?.toLowerCase() === tokenClean.toLowerCase() ||
          p.id?.toLowerCase() === tokenClean.toLowerCase() ||
          p.companyId?.toLowerCase() === tokenClean.toLowerCase()
        );

        // If no direct portal match, check updated companies
        if (!fetchedMatch && updatedCompaniesList.length > 0) {
          const matchedCo = updatedCompaniesList.find(c =>
            c.id.toLowerCase() === tokenClean.toLowerCase() ||
            c.username?.toLowerCase() === tokenClean.toLowerCase() ||
            c.name?.toLowerCase() === tokenClean.toLowerCase() ||
            tokenClean.toLowerCase().includes(c.id.toLowerCase()) ||
            tokenClean.toLowerCase().includes((c.username || '').toLowerCase())
          );

          if (matchedCo) {
            fetchedMatch = updatedPortalsList.find(p => p.companyId === matchedCo.id);
            if (!fetchedMatch) {
              const defaultPortal: OrderPortal = {
                id: `portal-${matchedCo.id}`,
                companyId: matchedCo.id,
                companyName: matchedCo.name,
                name: `${matchedCo.name} Corporate Storefront`,
                description: `Official corporate merchandise & promotional ordering portal for ${matchedCo.name}.`,
                status: 'Active',
                productIds: matchedCo.enabledProductIds && matchedCo.enabledProductIds.length > 0
                  ? matchedCo.enabledProductIds
                  : (fetchedProducts || products).map(p => p.id),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                shareToken: `portal-${matchedCo.username || matchedCo.id}`
              };
              fetchedMatch = defaultPortal;
              setOrderPortals(prev => [...prev, defaultPortal]);
            }
          }
        }

        if (fetchedMatch) {
          setActivePublicPortal({
            ...fetchedMatch,
            customPrices: (fetchedMatch.customPrices && Object.keys(fetchedMatch.customPrices).length > 0) ? fetchedMatch.customPrices : urlCustomPrices,
            customVariantPrices: (fetchedMatch.customVariantPrices && Object.keys(fetchedMatch.customVariantPrices).length > 0) ? fetchedMatch.customVariantPrices : urlCustomVariantPrices,
            customAddOnPrices: (fetchedMatch.customAddOnPrices && Object.keys(fetchedMatch.customAddOnPrices).length > 0) ? fetchedMatch.customAddOnPrices : urlCustomAddOnPrices
          });
        }
        setIsResolvingPortal(false);
      }).catch(err => {
        console.warn('Google Sheets portal resolution notice:', err);
        setIsResolvingPortal(false);
      });
    } else {
      setIsResolvingPortal(false);
    }
  }, [urlPortalToken, orderPortals, companies, products, appsScriptConfig.isConnected, appsScriptConfig.webAppUrl]);

  useEffect(() => {
    if (activePublicPortal) {
      const updated = orderPortals.find(p => p.id === activePublicPortal.id || p.shareToken === activePublicPortal.shareToken);
      if (updated) {
        if (
          JSON.stringify(updated.customPrices) !== JSON.stringify(activePublicPortal.customPrices) ||
          JSON.stringify(updated.customVariantPrices) !== JSON.stringify(activePublicPortal.customVariantPrices) ||
          JSON.stringify(updated.customAddOnPrices) !== JSON.stringify(activePublicPortal.customAddOnPrices) ||
          updated.name !== activePublicPortal.name ||
          updated.status !== activePublicPortal.status
        ) {
          setActivePublicPortal(prev => prev ? ({
            ...updated,
            customPrices: (updated.customPrices && Object.keys(updated.customPrices).length > 0) ? updated.customPrices : prev.customPrices,
            customVariantPrices: (updated.customVariantPrices && Object.keys(updated.customVariantPrices).length > 0) ? updated.customVariantPrices : prev.customVariantPrices,
            customAddOnPrices: (updated.customAddOnPrices && Object.keys(updated.customAddOnPrices).length > 0) ? updated.customAddOnPrices : prev.customAddOnPrices
          }) : null);
        }
      }
    }
  }, [orderPortals]);

  useEffect(() => {
    try {
      localStorage.removeItem('rp_logged_in_user');
    } catch {}
    if (loggedInUser) {
      sessionStorage.setItem('rp_logged_in_user', JSON.stringify(loggedInUser));
    } else {
      sessionStorage.removeItem('rp_logged_in_user');
    }
  }, [loggedInUser]);

  // Load isolated cart when client profile switches
  useEffect(() => {
    if (activeCompany) {
      const cached = localStorage.getItem(`rp_cart_${activeCompany.id}`);
      setCart(cached ? JSON.parse(cached) : []);
    }
  }, [activeCompany?.id]);

  // Save isolated cart when cart changes
  useEffect(() => {
    if (activeCompany) {
      localStorage.setItem(`rp_cart_${activeCompany.id}`, JSON.stringify(cart));
    }
  }, [cart, activeCompany?.id]);

  useEffect(() => {
    localStorage.setItem('rp_apps_script_config', JSON.stringify(appsScriptConfig));
  }, [appsScriptConfig]);

  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [hasInitialSynced, setHasInitialSynced] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const isSyncingRef = React.useRef(false);

  const syncWithSheets = async (isBackground = false) => {
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const url = appsScriptConfig.webAppUrl;
      if (!isBackground) {
        setIsSyncingSheets(true);
      }
      
      try {
        // Try single-roundtrip bulk fetch first for maximum sync speed (~150ms)
        const allData = await sheetsService.fetchAllData(url);

        let fetchedProducts = allData?.products ?? null;
        let fetchedCompanies = allData?.companies ?? null;
        let fetchedOrders = allData?.orders ?? null;
        let fetchedSettings = allData?.adminSettings ?? null;
        let fetchedQuotes = allData?.quoteEnquiries ?? null;
        let fetchedCatalogProducts = allData?.catalogProducts ?? null;
        let fetchedPortals = allData?.portals ?? null;
        let fetchedNotifications = allData?.notifications ?? null;
        let fetchedJobs = allData?.jobs ?? null;
        let fetchedJobColumns = allData?.jobColumns ?? null;
        let fetchedJobItemColumns = allData?.jobItemColumns ?? null;
        let fetchedStaff = allData?.staff ?? null;
        let fetchedPayroll = allData?.payroll ?? null;
        let fetchedExpenses = allData?.expenses ?? null;
        let fetchedExpenseCategories = allData?.expenseCategories ?? null;
        let fetchedRecurringExpenses = allData?.recurringExpenses ?? null;
        let fetchedStaffAccounts = allData?.staffAccounts ?? null;
        let fetchedAttendance = allData?.attendance ?? null;

        // Fallback to parallel fetches if bulk endpoint was not available or empty
        if (!allData) {
          [
            fetchedProducts,
            fetchedCompanies,
            fetchedOrders,
            fetchedSettings,
            fetchedQuotes,
            fetchedCatalogProducts,
            fetchedPortals,
            fetchedNotifications,
            fetchedJobs,
            fetchedJobColumns,
            fetchedJobItemColumns,
            fetchedStaff,
            fetchedPayroll,
            fetchedExpenses,
            fetchedExpenseCategories,
            fetchedRecurringExpenses,
            fetchedStaffAccounts,
            fetchedAttendance
          ] = await Promise.all([
            sheetsService.fetchProducts(url).catch(() => null),
            sheetsService.fetchCompanies(url).catch(() => null),
            sheetsService.fetchOrders(url).catch(() => null),
            sheetsService.fetchAdminSettings(url).catch(() => null),
            sheetsService.fetchQuoteEnquiries(url).catch(() => null),
            sheetsService.fetchCatalogProducts(url).catch(() => null),
            sheetsService.fetchPortals(url).catch(() => null),
            sheetsService.fetchNotifications(url).catch(() => null),
            sheetsService.fetchJobs(url).catch(() => null),
            sheetsService.fetchJobColumns(url).catch(() => null),
            sheetsService.fetchJobItemColumns(url).catch(() => null),
            sheetsService.fetchStaff(url).catch(() => null),
            sheetsService.fetchPayroll(url).catch(() => null),
            sheetsService.fetchExpenses(url).catch(() => null),
            sheetsService.fetchExpenseCategories(url).catch(() => null),
            sheetsService.fetchRecurringExpenses(url).catch(() => null),
            sheetsService.fetchStaffAccounts(url).catch(() => null),
            sheetsService.fetchAttendance(url).catch(() => null)
          ]);
        }

        // 1. Process companies
        if (fetchedCompanies !== null && fetchedCompanies.length > 0) {
          setCompanies(prevCompanies => {
            return fetchedCompanies.map(fc => {
              const sanitizedFC = sanitizeCompany(fc);
              const existing = prevCompanies.find(p => p.id === fc.id);

              let passcode = sanitizedFC.passcode;
              let username = sanitizedFC.username;

              if (existing) {
                if (existing.passcode && existing.passcode.trim() !== '') {
                  // If fetched passcode is default or empty, preserve user-updated passcode
                  const defaultPass = `${sanitizedFC.username.substring(0, 4)}2026`;
                  if (!sanitizedFC.passcode || sanitizedFC.passcode === defaultPass || sanitizedFC.passcode === 'acme2026') {
                    passcode = existing.passcode;
                  }
                }
                if (existing.username && existing.username.trim() !== '') {
                  if (!sanitizedFC.username || sanitizedFC.username === 'client') {
                    username = existing.username;
                  }
                }
              }

              return {
                ...sanitizedFC,
                username,
                passcode
              };
            });
          });
        }

        // 2. Merge master products from fetchedProducts (excluding company custom products)
        if (fetchedProducts !== null || fetchedCompanies !== null) {
          setProducts(prevProducts => {
            const map = new Map<string, Product>();
            prevProducts.forEach(p => map.set(p.id, p));
            if (fetchedProducts) {
              fetchedProducts.forEach(p => map.set(p.id, p));
            }
            const activeComps = fetchedCompanies || companies;
            return sanitizeMasterProducts(Array.from(map.values()), activeComps);
          });
        }

        // 3. Process orders
        if (fetchedOrders !== null) {
          setOrders(prevOrders => {
            const fetchedIds = new Set(fetchedOrders.map(o => o.id));
            const unsyncedLocal = prevOrders.filter(o => !fetchedIds.has(o.id));

            const localMap = new Map<string, Order>(prevOrders.map(o => [o.id, o]));
            const mergedFetched = fetchedOrders.map(fo => {
              const local = localMap.get(fo.id) || prevOrders.find(o => o.orderNumber && fo.orderNumber && o.orderNumber.trim() === fo.orderNumber.trim());
              if (local) {
                let status = fo.status;
                if (local.status !== 'Pending Approval' && (fo.status === 'Pending Approval' || fo.status === 'Pending')) {
                  status = local.status;
                }

                const isGenericPerson = (p?: string) => !p || !p.trim() || p.trim().toLowerCase() === 'storefront customer' || p.trim().toLowerCase() === 'n/a';
                const isGenericAddress = (a?: string) => !a || !a.trim() || a.trim().toLowerCase() === 'no address specified' || a.trim().toLowerCase() === 'n/a';
                const isGenericNotes = (n?: string) => !n || !n.trim() || n.trim().toLowerCase() === 'none provided';
                const isGenericMessenger = (m?: string) => !m || !m.trim() || m.trim().toLowerCase() === 'not provided' || m.trim().toLowerCase() === 'fb messenger: not provided';

                return {
                  ...fo,
                  status,
                  contactPerson: !isGenericPerson(fo.contactPerson) ? fo.contactPerson : (local.contactPerson || fo.contactPerson || ''),
                  contactNumber: (fo.contactNumber && fo.contactNumber.trim() !== '') ? fo.contactNumber : (local.contactNumber || ''),
                  fbMessengerLink: !isGenericMessenger(fo.fbMessengerLink) ? fo.fbMessengerLink : (local.fbMessengerLink || fo.fbMessengerLink || ''),
                  deliveryAddress: !isGenericAddress(fo.deliveryAddress) ? fo.deliveryAddress : (local.deliveryAddress || fo.deliveryAddress || ''),
                  poNumber: (fo.poNumber && fo.poNumber.trim() !== '') ? fo.poNumber : (local.poNumber || ''),
                  notes: !isGenericNotes(fo.notes) ? fo.notes : (local.notes || fo.notes || ''),
                  contactEmail: (fo.contactEmail && fo.contactEmail.trim() !== '') ? fo.contactEmail : (local.contactEmail || '')
                };
              }
              return fo;
            });

            return [...unsyncedLocal, ...mergedFetched];
          });
        }

        // 4. Process admin settings
        if (fetchedSettings) {
          let currentAdminUser = (fetchedSettings.adminUsername && fetchedSettings.adminUsername.trim() !== '')
            ? fetchedSettings.adminUsername.trim()
            : (systemSettings.adminUsername || 'admin');

          let currentAdminPass = (fetchedSettings.adminPasscode && fetchedSettings.adminPasscode.trim() !== '' && fetchedSettings.adminPasscode.trim() !== 'admin123')
            ? fetchedSettings.adminPasscode.trim()
            : (systemSettings.adminPasscode || 'admin123');

          setSystemSettings(prev => {
            const nextTagline = (fetchedSettings.companyTagline !== undefined && fetchedSettings.companyTagline.trim() !== '')
              ? fetchedSettings.companyTagline
              : (prev.companyTagline || '');
            const nextAddress = (fetchedSettings.companyAddress !== undefined && fetchedSettings.companyAddress.trim() !== '')
              ? fetchedSettings.companyAddress
              : (prev.companyAddress || '');
            const nextTaxId = (fetchedSettings.taxId !== undefined && fetchedSettings.taxId.trim() !== '')
              ? fetchedSettings.taxId
              : (prev.taxId || '');
            const nextHubName = (fetchedSettings.hubName && fetchedSettings.hubName.trim() !== '') ? fetchedSettings.hubName : (prev.hubName || 'ARH Print Hub');
            const nextShortHubName = (fetchedSettings.shortHubName && fetchedSettings.shortHubName.trim() !== '') ? fetchedSettings.shortHubName : (prev.shortHubName || 'ARH');
            const nextOrderPrefix = (fetchedSettings.orderPrefix && fetchedSettings.orderPrefix.trim() !== '') ? fetchedSettings.orderPrefix : (prev.orderPrefix || 'ARH-2026');
            const nextCurrencySymbol = (fetchedSettings.currencySymbol && fetchedSettings.currencySymbol.trim() !== '') ? fetchedSettings.currencySymbol : (prev.currencySymbol || 'Php');
            const nextColorTheme = fetchedSettings.colorTheme || prev.colorTheme || 'classic_noir';
            const nextAdminEmail = (fetchedSettings.adminEmail !== undefined && fetchedSettings.adminEmail.trim() !== '') ? fetchedSettings.adminEmail : (prev.adminEmail || '');
            const nextLogoUrl = (fetchedSettings.logoUrl !== undefined && fetchedSettings.logoUrl.trim() !== '') ? fetchedSettings.logoUrl : (prev.logoUrl || '');
            const nextFaviconUrl = (fetchedSettings.faviconUrl !== undefined && fetchedSettings.faviconUrl.trim() !== '') ? fetchedSettings.faviconUrl : (prev.faviconUrl || '');

            if (
              prev.hubName === nextHubName &&
              prev.shortHubName === nextShortHubName &&
              prev.orderPrefix === nextOrderPrefix &&
              prev.currencySymbol === nextCurrencySymbol &&
              prev.colorTheme === nextColorTheme &&
              prev.adminEmail === nextAdminEmail &&
              prev.logoUrl === nextLogoUrl &&
              prev.faviconUrl === nextFaviconUrl &&
              prev.companyTagline === nextTagline &&
              prev.companyAddress === nextAddress &&
              prev.taxId === nextTaxId &&
              prev.adminUsername === currentAdminUser &&
              prev.adminPasscode === currentAdminPass
            ) {
              return prev;
            }

            return {
              hubName: nextHubName,
              shortHubName: nextShortHubName,
              orderPrefix: nextOrderPrefix,
              currencySymbol: nextCurrencySymbol,
              colorTheme: nextColorTheme,
              adminEmail: nextAdminEmail,
              logoUrl: nextLogoUrl,
              faviconUrl: nextFaviconUrl,
              companyTagline: nextTagline,
              companyAddress: nextAddress,
              taxId: nextTaxId,
              adminUsername: currentAdminUser,
              adminPasscode: currentAdminPass
            };
          });
        }

        // 5. Process quote enquiries
        if (fetchedQuotes !== null) {
          setQuoteEnquiries(fetchedQuotes.map(q => ({
            ...q,
            quoteNotes: (q.quoteNotes && q.quoteNotes.trim() !== '') ? q.quoteNotes : DEFAULT_QUOTE_NOTES
          })));
        }

        // 6. Process catalog products
        if (fetchedCatalogProducts !== null) {
          setCatalogProducts(fetchedCatalogProducts.map(sanitizeCatalogProduct));
        }

        // 7. Process order portals
        if (fetchedPortals !== null) {
          setOrderPortals(prevPortals => {
            const map = new Map<string, OrderPortal>();
            prevPortals.forEach(p => map.set(p.id, p));
            fetchedPortals.forEach(p => {
              const existing = map.get(p.id);
              const customPrices = (p.customPrices && Object.keys(p.customPrices).length > 0)
                ? p.customPrices
                : existing?.customPrices;
              const customVariantPrices = (p.customVariantPrices && Object.keys(p.customVariantPrices).length > 0)
                ? p.customVariantPrices
                : existing?.customVariantPrices;
              map.set(p.id, {
                ...p,
                customPrices,
                customVariantPrices
              });
            });
            return Array.from(map.values());
          });
        }

        // 8. Process notifications
        if (fetchedNotifications !== null && Array.isArray(fetchedNotifications)) {
          setNotifications(prevNotifs => {
            const notifMap = new Map<string, AppNotification>();
            fetchedNotifications.forEach(n => notifMap.set(n.id, n));
            prevNotifs.forEach(n => {
              const existing = notifMap.get(n.id);
              if (existing) {
                notifMap.set(n.id, {
                  ...existing,
                  read: n.read || existing.read
                });
              } else {
                notifMap.set(n.id, n);
              }
            });
            return Array.from(notifMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
        }

        // 9. Process jobs & columns (Google Sheets is the authoritative persistent source of truth)
        if (fetchedJobs !== null && Array.isArray(fetchedJobs)) {
          setJobs(prevJobs => {
            const fetchedMap = new Map(fetchedJobs.map(j => [j.id, j]));
            const fetchedIds = new Set(fetchedJobs.map(j => j.id));
            const now = Date.now();

            // Check if any existing local job has in-progress edits or recent local updates (< 20s)
            // that are newer than the fetched server snapshot. If so, preserve local data so typing is never interrupted!
            const mergedExisting = prevJobs.map(localJob => {
              const serverJob = fetchedMap.get(localJob.id);
              if (!serverJob) return localJob;

              const localUpdated = new Date(localJob.updatedAt || 0).getTime();
              const serverUpdated = new Date(serverJob.updatedAt || 0).getTime();
              const isRecentLocalEdit = (!isNaN(localUpdated) && (now - localUpdated < 20000) && localUpdated > serverUpdated);

              if (isRecentLocalEdit) {
                return localJob;
              }
              return serverJob;
            });

            // Find brand new server jobs not present in local state
            const prevIds = new Set(prevJobs.map(j => j.id));
            const newServerJobs = fetchedJobs.filter(j => !prevIds.has(j.id));

            // Only retain local jobs that haven't reached server yet if created within 60s
            const activeExistingJobs = mergedExisting.filter(j => {
              if (fetchedIds.has(j.id)) return true;
              const createdTimestamp = new Date(j.createdAt || 0).getTime();
              return !isNaN(createdTimestamp) && (now - createdTimestamp < 60000);
            });

            const merged = [...activeExistingJobs, ...newServerJobs];
            // Deduplicate by ID
            const seen = new Set<string>();
            const deduplicated = merged.filter(j => {
              if (seen.has(j.id)) return false;
              seen.add(j.id);
              return true;
            });

            return deduplicated.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          });
        }

        if (fetchedJobColumns !== null && Array.isArray(fetchedJobColumns)) {
          if (fetchedJobColumns.length > 0) {
            const map = new Map<string, JobColumn>();
            for (const col of fetchedJobColumns) {
              if (col && col.id) map.set(col.id, col);
            }
            const deduped = Array.from(map.values());
            setJobColumns(deduped);

            // Auto-clean historical duplicate rows in connected sheet on initial sync if duplicates were present
            if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl && !hasCleanedUpHistoricalColumnsRef.current) {
              hasCleanedUpHistoricalColumnsRef.current = true;
              sheetsService.cleanDuplicateColumns(appsScriptConfig.webAppUrl);
            }
          } else if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
            // Sheet is connected but JobColumns table has no data rows: seed default column schema into Google Sheets
            sheetsService.saveJobColumns(appsScriptConfig.webAppUrl, DEFAULT_JOB_COLUMNS);
          }
        }

        if (fetchedJobItemColumns !== null && Array.isArray(fetchedJobItemColumns)) {
          if (fetchedJobItemColumns.length > 0) {
            const map = new Map<string, JobItemColumn>();
            for (const col of fetchedJobItemColumns) {
              if (col && col.id) map.set(col.id, col);
            }
            const deduped = Array.from(map.values());
            setJobItemColumns(deduped);
          } else if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
            // Sheet is connected but JobItemColumns table has no data rows: seed default item column schema into Google Sheets
            sheetsService.saveJobItemColumns(appsScriptConfig.webAppUrl, DEFAULT_JOB_ITEM_COLUMNS);
          }
        }

        // Process staff
        if (fetchedStaff !== null && Array.isArray(fetchedStaff)) {
          setStaff(prevStaff => {
            const fetchedMap = new Map(fetchedStaff.map(s => [s.id, s]));
            const fetchedIds = new Set(fetchedStaff.map(s => s.id));
            const now = Date.now();
            const mergedExisting = prevStaff.map(localStaff => {
              const serverStaff = fetchedMap.get(localStaff.id);
              if (!serverStaff) return localStaff;
              const localUpdated = new Date(localStaff.updatedAt || 0).getTime();
              const serverUpdated = new Date(serverStaff.updatedAt || 0).getTime();
              if (!isNaN(localUpdated) && (now - localUpdated < 20000) && localUpdated > serverUpdated) {
                return localStaff;
              }
              return serverStaff;
            });
            const prevIds = new Set(prevStaff.map(s => s.id));
            const newServerStaff = fetchedStaff.filter(s => !prevIds.has(s.id));
            const activeExisting = mergedExisting.filter(s => {
              if (fetchedIds.has(s.id)) return true;
              const createdTimestamp = new Date(s.createdAt || 0).getTime();
              return !isNaN(createdTimestamp) && (now - createdTimestamp < 60000);
            });
            const merged = [...activeExisting, ...newServerStaff];
            const seen = new Set<string>();
            return merged.filter(s => {
              if (seen.has(s.id)) return false;
              seen.add(s.id);
              return true;
            });
          });
        }

        // Process payroll
        if (fetchedPayroll !== null && Array.isArray(fetchedPayroll)) {
          setPayroll(prevPayroll => {
            const fetchedMap = new Map(fetchedPayroll.map(p => [p.id, p]));
            const fetchedIds = new Set(fetchedPayroll.map(p => p.id));
            const now = Date.now();
            const mergedExisting = prevPayroll.map(localPayroll => {
              const serverPayroll = fetchedMap.get(localPayroll.id);
              if (!serverPayroll) return localPayroll;
              const localUpdated = new Date(localPayroll.updatedAt || 0).getTime();
              const serverUpdated = new Date(serverPayroll.updatedAt || 0).getTime();
              if (!isNaN(localUpdated) && (now - localUpdated < 20000) && localUpdated > serverUpdated) {
                return localPayroll;
              }
              return serverPayroll;
            });
            const prevIds = new Set(prevPayroll.map(p => p.id));
            const newServerPayroll = fetchedPayroll.filter(p => !prevIds.has(p.id));
            const activeExisting = mergedExisting.filter(p => {
              if (fetchedIds.has(p.id)) return true;
              const createdTimestamp = new Date(p.createdAt || 0).getTime();
              return !isNaN(createdTimestamp) && (now - createdTimestamp < 60000);
            });
            const merged = [...activeExisting, ...newServerPayroll];
            const seen = new Set<string>();
            return merged.filter(p => {
              if (seen.has(p.id)) return false;
              seen.add(p.id);
              return true;
            });
          });
        }

        // Process expenses
        if (fetchedExpenses !== null && Array.isArray(fetchedExpenses)) {
          setExpenses(prevExpenses => {
            const fetchedMap = new Map(fetchedExpenses.map(e => [e.id, e]));
            const fetchedIds = new Set(fetchedExpenses.map(e => e.id));
            const now = Date.now();
            const mergedExisting = prevExpenses.map(localExp => {
              const serverExp = fetchedMap.get(localExp.id);
              if (!serverExp) return localExp;
              const localUpdated = new Date(localExp.updatedAt || 0).getTime();
              const serverUpdated = new Date(serverExp.updatedAt || 0).getTime();
              if (!isNaN(localUpdated) && (now - localUpdated < 20000) && localUpdated > serverUpdated) {
                return localExp;
              }
              return serverExp;
            });
            const prevIds = new Set(prevExpenses.map(e => e.id));
            const newServerExpenses = fetchedExpenses.filter(e => !prevIds.has(e.id));
            const activeExisting = mergedExisting.filter(e => {
              if (fetchedIds.has(e.id)) return true;
              const createdTimestamp = new Date(e.createdAt || 0).getTime();
              return !isNaN(createdTimestamp) && (now - createdTimestamp < 60000);
            });
            const merged = [...activeExisting, ...newServerExpenses];
            const seen = new Set<string>();
            return merged.filter(e => {
              if (seen.has(e.id)) return false;
              seen.add(e.id);
              return true;
            });
          });
        }

        // Process expense categories
        if (fetchedExpenseCategories !== null && Array.isArray(fetchedExpenseCategories)) {
          if (fetchedExpenseCategories.length > 0) {
            const catMap = new Map<string, ExpenseCategory>();
            for (const cat of fetchedExpenseCategories) {
              if (cat && cat.id) catMap.set(cat.id, cat);
            }
            setExpenseCategories(Array.from(catMap.values()));
          } else if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
            sheetsService.saveExpenseCategories(appsScriptConfig.webAppUrl, DEFAULT_EXPENSE_CATEGORIES);
          }
        }

        // Process recurring expenses
        if (fetchedRecurringExpenses !== null && Array.isArray(fetchedRecurringExpenses)) {
          setRecurringExpenses(prevRules => {
            const fetchedMap = new Map(fetchedRecurringExpenses.map(r => [r.id, r]));
            const fetchedIds = new Set(fetchedRecurringExpenses.map(r => r.id));
            const now = Date.now();
            const mergedExisting = prevRules.map(localRule => {
              const serverRule = fetchedMap.get(localRule.id);
              if (!serverRule) return localRule;
              const localUpdated = new Date(localRule.updatedAt || 0).getTime();
              const serverUpdated = new Date(serverRule.updatedAt || 0).getTime();
              if (!isNaN(localUpdated) && (now - localUpdated < 20000) && localUpdated > serverUpdated) {
                return localRule;
              }
              return serverRule;
            });
            const prevIds = new Set(prevRules.map(r => r.id));
            const newServerRules = fetchedRecurringExpenses.filter(r => !prevIds.has(r.id));
            const activeExisting = mergedExisting.filter(r => {
              if (fetchedIds.has(r.id)) return true;
              const createdTimestamp = new Date(r.createdAt || 0).getTime();
              return !isNaN(createdTimestamp) && (now - createdTimestamp < 60000);
            });
            const merged = [...activeExisting, ...newServerRules];
            const seen = new Set<string>();
            return merged.filter(r => {
              if (seen.has(r.id)) return false;
              seen.add(r.id);
              return true;
            });
          });
        }

        // Process staff accounts
        if (fetchedStaffAccounts !== null && Array.isArray(fetchedStaffAccounts)) {
          setStaffAccounts(prevAccounts => {
            const fetchedMap = new Map(fetchedStaffAccounts.map(a => [a.id, a]));
            const fetchedIds = new Set(fetchedStaffAccounts.map(a => a.id));
            const now = Date.now();
            const mergedExisting = prevAccounts.map(localAcc => {
              const serverAcc = fetchedMap.get(localAcc.id);
              if (!serverAcc) return localAcc;
              const localUpdated = new Date(localAcc.updatedAt || 0).getTime();
              const serverUpdated = new Date(serverAcc.updatedAt || 0).getTime();
              if (!isNaN(localUpdated) && (now - localUpdated < 20000) && localUpdated > serverUpdated) {
                return localAcc;
              }
              return serverAcc;
            });
            const prevIds = new Set(prevAccounts.map(a => a.id));
            const newServerAccounts = fetchedStaffAccounts.filter(a => !prevIds.has(a.id));
            const activeExisting = mergedExisting.filter(a => {
              if (fetchedIds.has(a.id)) return true;
              const createdTimestamp = new Date(a.createdAt || 0).getTime();
              return !isNaN(createdTimestamp) && (now - createdTimestamp < 60000);
            });
            const merged = [...activeExisting, ...newServerAccounts];
            const seen = new Set<string>();
            return merged.filter(a => {
              if (seen.has(a.id)) return false;
              seen.add(a.id);
              return true;
            });
          });
        }

        // Process attendance
        if (fetchedAttendance !== null && Array.isArray(fetchedAttendance)) {
          setAttendance(prevAttendance => {
            const fetchedMap = new Map(fetchedAttendance.map(a => [a.id, a]));

            const mergedExisting = prevAttendance.map(localAtt => {
              const normLocalDate = normalizeAttendanceDate(localAtt.date);
              const cleanLocalStaffId = normalizeStaffId(localAtt.staffId);

              const serverAtt = fetchedMap.get(localAtt.id) || fetchedAttendance.find(fa => {
                const normServerDate = normalizeAttendanceDate(fa.date);
                const cleanServerStaffId = normalizeStaffId(fa.staffId);
                return (fa.id === localAtt.id) || (cleanServerStaffId && cleanLocalStaffId && cleanServerStaffId === cleanLocalStaffId && normServerDate === normLocalDate);
              });

              if (!serverAtt) return localAtt;

              const cleanLocalIn = cleanClockIn(localAtt.clockIn);
              const cleanLocalOut = cleanClockOut(localAtt.clockOut);
              const cleanServerIn = cleanClockIn(serverAtt.clockIn);
              const cleanServerOut = cleanClockOut(serverAtt.clockOut);

              const isLocalActive = isRecordActiveClockIn(localAtt);

              // 1. If local state has an active ongoing Clock-In session
              if (isLocalActive) {
                // If server has a legitimate subsequent clock-out that occurred on another device/browser
                const serverHasClockOut = Boolean(cleanServerOut);
                const serverUpdated = new Date(serverAtt.updatedAt || 0).getTime();
                const localUpdated = new Date(localAtt.updatedAt || localAtt.createdAt || 0).getTime();
                if (serverHasClockOut && !isNaN(serverUpdated) && serverUpdated > localUpdated) {
                  const hours = Number(serverAtt.totalHours) > 0
                    ? Number(serverAtt.totalHours)
                    : calculateHoursWorked(cleanServerIn || cleanLocalIn, cleanServerOut, normLocalDate);
                  return {
                    ...serverAtt,
                    id: localAtt.id || serverAtt.id,
                    staffId: localAtt.staffId || serverAtt.staffId,
                    staffName: localAtt.staffName || serverAtt.staffName,
                    date: normLocalDate,
                    clockIn: cleanServerIn || cleanLocalIn,
                    clockOut: cleanServerOut,
                    totalHours: hours,
                    status: serverAtt.status || 'Present'
                  };
                }

                // Preserve local active clock-in session
                return {
                  ...serverAtt,
                  id: localAtt.id || serverAtt.id,
                  staffId: localAtt.staffId || serverAtt.staffId,
                  staffName: localAtt.staffName || serverAtt.staffName,
                  date: normLocalDate,
                  clockIn: cleanLocalIn || cleanServerIn,
                  clockOut: undefined,
                  totalHours: 0,
                  status: 'Present',
                  notes: localAtt.notes || serverAtt.notes,
                  createdAt: localAtt.createdAt || serverAtt.createdAt,
                  updatedAt: localAtt.updatedAt || serverAtt.updatedAt
                };
              }

              // 2. If local state has a completed shift (clockIn + clockOut), protect working hours from stale server states
              if (cleanLocalIn && cleanLocalOut) {
                const localHours = Number(localAtt.totalHours) > 0
                  ? Number(localAtt.totalHours)
                  : calculateHoursWorked(cleanLocalIn, cleanLocalOut, normLocalDate);

                // If server response lacks clock-out or has 0 hours, preserve local completed record
                if (!cleanServerOut) {
                  return {
                    ...localAtt,
                    id: localAtt.id || serverAtt.id,
                    date: normLocalDate,
                    clockIn: cleanLocalIn,
                    clockOut: cleanLocalOut,
                    totalHours: localHours,
                    status: localAtt.status || serverAtt.status || 'Present'
                  };
                }

                const localUpdated = new Date(localAtt.updatedAt || localAtt.createdAt || 0).getTime();
                const serverUpdated = new Date(serverAtt.updatedAt || serverAtt.createdAt || 0).getTime();
                if (!isNaN(localUpdated) && localUpdated > serverUpdated) {
                  return {
                    ...localAtt,
                    id: localAtt.id || serverAtt.id,
                    date: normLocalDate,
                    clockIn: cleanLocalIn,
                    clockOut: cleanLocalOut,
                    totalHours: localHours,
                    status: localAtt.status || 'Present'
                  };
                }

                const serverHours = Number(serverAtt.totalHours) > 0
                  ? Number(serverAtt.totalHours)
                  : calculateHoursWorked(cleanServerIn || cleanLocalIn, cleanServerOut, normLocalDate);

                return {
                  ...serverAtt,
                  id: localAtt.id || serverAtt.id,
                  staffId: localAtt.staffId || serverAtt.staffId,
                  staffName: localAtt.staffName || serverAtt.staffName,
                  date: normLocalDate,
                  clockIn: cleanServerIn || cleanLocalIn,
                  clockOut: cleanServerOut,
                  totalHours: serverHours > 0 ? serverHours : localHours,
                  status: serverAtt.status || localAtt.status || 'Present'
                };
              }

              // 3. Fallback timestamp comparison for other states
              const localUpdated = new Date(localAtt.updatedAt || localAtt.createdAt || 0).getTime();
              const serverUpdated = new Date(serverAtt.updatedAt || serverAtt.createdAt || 0).getTime();
              if (!isNaN(localUpdated) && localUpdated > serverUpdated) {
                return localAtt;
              }
              return serverAtt;
            });

            const localIds = new Set(prevAttendance.map(a => a.id));
            const localStaffDates = new Set(prevAttendance.map(a => `${normalizeStaffId(a.staffId)}_${normalizeAttendanceDate(a.date)}`));
            const newServerAttendance = fetchedAttendance.filter(a => {
              const key = `${normalizeStaffId(a.staffId)}_${normalizeAttendanceDate(a.date)}`;
              return !localIds.has(a.id) && !localStaffDates.has(key);
            }).map(a => {
              const normDate = normalizeAttendanceDate(a.date);
              const cIn = cleanClockIn(a.clockIn);
              const cOut = cleanClockOut(a.clockOut);
              const hours = Number(a.totalHours) > 0 ? Number(a.totalHours) : (cIn && cOut ? calculateHoursWorked(cIn, cOut, normDate) : 0);
              return {
                ...a,
                date: normDate,
                clockIn: cIn,
                clockOut: cOut,
                totalHours: hours
              };
            });

            const merged = [...mergedExisting, ...newServerAttendance];
            const seen = new Set<string>();
            const seenStaffDates = new Set<string>();

            // Sort so complete records (active or with hours) are preferred during deduplication
            const sortedMerged = [...merged].sort((a, b) => {
              const aScore = (cleanClockIn(a.clockIn) && cleanClockOut(a.clockOut)) ? 2 : (isRecordActiveClockIn(a) ? 1 : 0);
              const bScore = (cleanClockIn(b.clockIn) && cleanClockOut(b.clockOut)) ? 2 : (isRecordActiveClockIn(b) ? 1 : 0);
              if (bScore !== aScore) return bScore - aScore;
              const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
              const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
              return bTime - aTime;
            });

            return sortedMerged.filter(a => {
              const staffDateKey = `${normalizeStaffId(a.staffId)}_${normalizeAttendanceDate(a.date)}`;
              if (seen.has(a.id) || seenStaffDates.has(staffDateKey)) return false;
              seen.add(a.id);
              seenStaffDates.add(staffDateKey);
              return true;
            });
          });
        }

        setLastSyncedTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn('Google Sheets sync notice:', err);
      } finally {
        setIsSyncingSheets(false);
        isSyncingRef.current = false;
        setHasInitialSynced(true);
      }
    } else {
      setHasInitialSynced(true);
    }
  };

  // Pull live data from Sheets on load or config change
  useEffect(() => {
    syncWithSheets(false);
  }, [appsScriptConfig.isConnected, appsScriptConfig.webAppUrl]);

  // High-frequency silent background polling (every 4 seconds) + instant tab focus/visibility trigger
  useEffect(() => {
    if (!appsScriptConfig.isConnected || !appsScriptConfig.webAppUrl) return;

    const intervalId = setInterval(() => {
      syncWithSheets(true);
    }, 4000);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        syncWithSheets(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [appsScriptConfig.isConnected, appsScriptConfig.webAppUrl]);

  // Ensure default active tab is appropriate for logged-in user
  useEffect(() => {
    if (!loggedInUser) return;
    if (loggedInUser.role === 'admin') {
      if (activeTab !== 'admin' && activeTab !== 'sync') setActiveTab('admin');
    } else if (loggedInUser.role === 'staff') {
      const validStaffTabs = ['dashboard', 'jobs', 'catalog', 'attendance', 'payslips', 'work-history', 'profile'];
      if (!validStaffTabs.includes(activeTab)) setActiveTab('dashboard');
    } else if (loggedInUser.role === 'client') {
      const validClientTabs = ['catalog', 'browse', 'portals', 'history', 'quote-history', 'settings'];
      if (!validClientTabs.includes(activeTab)) setActiveTab('catalog');
    }
  }, [loggedInUser?.role]);

  // ----------------------------------------------------
  // B2B Ordering Actions & Helpers
  // ----------------------------------------------------

  const handleCompanyChange = (co: CompanyProfile) => {
    setSelectedCompanyId(co.id);
  };

  const handleUpdateConfig = (newConfig: AppsScriptConfig) => {
    const isCustom = Boolean(newConfig.webAppUrl && newConfig.webAppUrl.trim() !== EMBEDDED_APPS_SCRIPT_URL.trim());
    const updated: AppsScriptConfig = {
      ...newConfig,
      isCustomUrl: isCustom
    };
    setAppsScriptConfig(updated);
    localStorage.setItem('rp_apps_script_config', JSON.stringify(updated));
  };

  const handleAddCompany = (newCo: CompanyProfile) => {
    const co = sanitizeCompany(newCo);

    if (co.enabledProductIds === undefined) {
      co.enabledProductIds = [];
    }
    setCompanies(prev => [...prev, co]);
    setSelectedCompanyId(co.id);

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      sheetsService.saveCompany(url, co);
      if (Array.isArray(co.customProducts)) {
        co.customProducts.forEach(cp => {
          sheetsService.saveProduct(url, cp);
        });
      }
    }
  };

  const handleUpdateCompany = (updatedCo: CompanyProfile) => {
    const sanitized = sanitizeCompany(updatedCo);

    // Track deleted custom products and sync deletion with Google Sheets
    const oldCompany = companies.find(c => c.id === sanitized.id);
    if (oldCompany && Array.isArray(oldCompany.customProducts)) {
      const newCustomIds = new Set((sanitized.customProducts || []).map(p => p.id));
      oldCompany.customProducts.forEach(oldCp => {
        if (!newCustomIds.has(oldCp.id)) {
          if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
            sheetsService.deleteProduct(appsScriptConfig.webAppUrl, oldCp.id);
          }
        }
      });
    }

    setCompanies(prev => prev.map(c => c.id === sanitized.id ? sanitized : c));

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      sheetsService.saveCompany(url, sanitized);
      if (Array.isArray(sanitized.customProducts)) {
        sanitized.customProducts.forEach(cp => {
          sheetsService.saveProduct(url, cp);
        });
      }
    }
  };

  const handleDeleteCompany = (companyId: string) => {
    setCompanies(prev => prev.filter(c => c.id !== companyId));
    
    if (selectedCompanyId === companyId) {
      const remaining = companies.filter(c => c.id !== companyId);
      if (remaining.length > 0) {
        setSelectedCompanyId(remaining[0].id);
      }
    }

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deleteCompany(appsScriptConfig.webAppUrl, companyId);
    }
  };

  const handleUpdateProducts = (newProducts: Product[]) => {
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      
      // 1. Sync deletions
      products.forEach(oldP => {
        const stillExists = newProducts.some(newP => newP.id === oldP.id);
        if (!stillExists) {
          sheetsService.deleteProduct(url, oldP.id);
        }
      });

      // 2. Sync additions and modifications
      newProducts.forEach(newP => {
        const oldP = products.find(p => p.id === newP.id);
        if (!oldP || JSON.stringify(oldP) !== JSON.stringify(newP)) {
          sheetsService.saveProduct(url, newP);
        }
      });
    }
    setProducts(newProducts);
  };

  const handleUpdateSingleProduct = async (updatedProduct: Product) => {
    const isGlobal = products.some(p => p.id === updatedProduct.id);
    if (isGlobal) {
      const newProducts = products.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      handleUpdateProducts(newProducts);
    } else {
      if (activeCompany && activeCompany.customProducts) {
        const updatedCustoms = activeCompany.customProducts.map(p => p.id === updatedProduct.id ? updatedProduct : p);
        const updatedCompany = { ...activeCompany, customProducts: updatedCustoms };
        handleUpdateCompany(updatedCompany);
      }
      if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
        await sheetsService.saveProduct(appsScriptConfig.webAppUrl, updatedProduct);
      }
    }
  };

  const handleUpdateOrders = async (newOrders: Order[]) => {
    // Detect order status changes and generate notifications for company
    const statusNotifs: AppNotification[] = [];
    for (const newOrd of newOrders) {
      const oldOrd = orders.find(o => o.id === newOrd.id);
      if (oldOrd && oldOrd.status !== newOrd.status) {
        statusNotifs.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          recipientType: 'company',
          companyName: newOrd.companyName,
          title: 'Order Status Changed',
          message: `Order ${newOrd.orderNumber} status changed from "${oldOrd.status}" to "${newOrd.status}".`,
          timestamp: new Date().toISOString(),
          read: false,
          orderId: newOrd.id,
          orderNumber: newOrd.orderNumber,
          type: 'order_status_change'
        });
      }
    }

    if (statusNotifs.length > 0) {
      setNotifications(prev => [...statusNotifs, ...prev]);
      if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
        sheetsService.saveNotifications(appsScriptConfig.webAppUrl, statusNotifs).catch(err => console.warn('Save notification notice:', err));
      }
    }

    // Also synchronize any linked Job's status
    for (const newOrd of newOrders) {
      const oldOrd = orders.find(o => o.id === newOrd.id);
      if (oldOrd && oldOrd.status !== newOrd.status) {
        const linkedJob = jobs.find(j => 
          (j.orderId && j.orderId === newOrd.id) || 
          (j.orderNumber && newOrd.orderNumber && j.orderNumber === newOrd.orderNumber) ||
          (newOrd.jobId && j.id === newOrd.jobId)
        );
        if (linkedJob && linkedJob.status !== newOrd.status) {
          const updatedJobStatus = (newOrd.status === 'Pending Approval' ? 'Pending' : newOrd.status) as JobStatus;
          setJobs(prev => prev.map(j => j.id === linkedJob.id ? { 
            ...j, 
            status: updatedJobStatus, 
            values: { ...j.values, 'col-status': updatedJobStatus }, 
            updatedAt: new Date().toISOString() 
          } : j));
          if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
            sheetsService.updateJobStatus(appsScriptConfig.webAppUrl, linkedJob.id, updatedJobStatus).catch(err => console.warn('Job status sync notice:', err));
          }
        }
      }
    }

    // 1. Update React state immediately for instant feedback and localStorage persistence
    setOrders(newOrders);

    // 2. Sync changes asynchronously with Google Sheets
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;

      // Sync deletions
      for (const oldOrd of orders) {
        const stillExists = newOrders.some(newOrd => newOrd.id === oldOrd.id);
        if (!stillExists) {
          sheetsService.deleteOrder(url, oldOrd.id).catch(err => console.warn('Delete order sync notice:', err));
        }
      }

      // Sync status updates & new orders
      for (const newOrd of newOrders) {
        const oldOrd = orders.find(o => o.id === newOrd.id);
        if (!oldOrd) {
          sheetsService.saveOrder(url, newOrd).catch(err => console.warn('Save order sync notice:', err));
        } else if (oldOrd.status !== newOrd.status) {
          sheetsService.updateOrderStatus(url, newOrd.id, newOrd.status).catch(err => console.warn('Update order status sync notice:', err));
        }
      }
    }
  };

  // Job Management Handlers
  const handleSaveJob = (job: Job, immediate: boolean = false) => {
    const updatedJob: Job = {
      ...job,
      updatedAt: job.updatedAt || new Date().toISOString()
    };

    setJobs(prev => {
      const exists = prev.some(j => j.id === updatedJob.id);
      if (exists) {
        return prev.map(j => j.id === updatedJob.id ? updatedJob : j);
      }
      return [updatedJob, ...prev];
    });

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      const existingTimer = jobSaveDebounceTimers.current.get(updatedJob.id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      if (immediate) {
        jobSaveDebounceTimers.current.delete(updatedJob.id);
        sheetsService.saveJob(url, updatedJob).catch(err => console.warn('Job save sync notice:', err));
      } else {
        const timer = setTimeout(() => {
          jobSaveDebounceTimers.current.delete(updatedJob.id);
          sheetsService.saveJob(url, updatedJob).catch(err => console.warn('Job save sync notice:', err));
        }, 500);
        jobSaveDebounceTimers.current.set(updatedJob.id, timer);
      }
    }

    // Synchronize linked Order if exists
    if (updatedJob.orderId || updatedJob.orderNumber) {
      const linkedOrder = orders.find(o => 
        (updatedJob.orderId && o.id === updatedJob.orderId) || 
        (updatedJob.orderNumber && o.orderNumber && o.orderNumber === updatedJob.orderNumber) ||
        (o.jobId && o.jobId === updatedJob.id)
      );
      if (linkedOrder && linkedOrder.status !== updatedJob.status) {
        const updatedOrders = orders.map(o => o.id === linkedOrder.id ? { ...o, status: updatedJob.status, updatedAt: new Date().toISOString() } : o);
        handleUpdateOrders(updatedOrders);
      }
    }
  };

  const handleUpdateJobStatus = (jobId: string, status: JobStatus) => {
    let targetJob: Job | undefined;
    setJobs(prev => prev.map(j => {
      if (j.id === jobId) {
        targetJob = { ...j, status, values: { ...j.values, 'col-status': status }, updatedAt: new Date().toISOString() };
        return targetJob;
      }
      return j;
    }));

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.updateJobStatus(appsScriptConfig.webAppUrl, jobId, status);
    }

    // Synchronize linked Order if exists
    const target = targetJob || jobs.find(j => j.id === jobId);
    if (target && (target.orderId || target.orderNumber)) {
      const linkedOrder = orders.find(o => 
        (target.orderId && o.id === target.orderId) || 
        (target.orderNumber && o.orderNumber && o.orderNumber === target.orderNumber) ||
        (o.jobId && o.jobId === target.id)
      );
      if (linkedOrder && linkedOrder.status !== status) {
        const updatedOrders = orders.map(o => o.id === linkedOrder.id ? { ...o, status, updatedAt: new Date().toISOString() } : o);
        handleUpdateOrders(updatedOrders);
      }
    }
  };

  const handleDeleteJob = (jobId: string) => {
    const existingTimer = jobSaveDebounceTimers.current.get(jobId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      jobSaveDebounceTimers.current.delete(jobId);
    }
    setJobs(prev => prev.filter(j => j.id !== jobId));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deleteJob(appsScriptConfig.webAppUrl, jobId);
    }
  };

  const handleSaveJobsBatch = (newJobs: Job[]) => {
    setJobs(newJobs);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      jobs.forEach(oldJ => {
        if (!newJobs.some(j => j.id === oldJ.id)) {
          sheetsService.deleteJob(url, oldJ.id);
        }
      });
      newJobs.forEach(j => {
        sheetsService.saveJob(url, j);
      });
    }
  };

  const handleSaveJobColumns = (columns: JobColumn[]) => {
    const map = new Map<string, JobColumn>();
    for (const c of (columns || [])) {
      if (c && c.id) map.set(c.id, c);
    }
    const deduped = Array.from(map.values());
    setJobColumns(deduped);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveJobColumns(appsScriptConfig.webAppUrl, deduped);
    }
  };

  const handleSaveJobItemColumns = (columns: JobItemColumn[]) => {
    const map = new Map<string, JobItemColumn>();
    for (const c of (columns || [])) {
      if (c && c.id) map.set(c.id, c);
    }
    const deduped = Array.from(map.values());
    setJobItemColumns(deduped);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveJobItemColumns(appsScriptConfig.webAppUrl, deduped);
    }
  };

  // Staff Management Handlers
  const handleSaveStaff = (member: StaffMember) => {
    const updated: StaffMember = {
      ...member,
      updatedAt: new Date().toISOString()
    };
    setStaff(prev => {
      const exists = prev.some(s => s.id === updated.id);
      if (exists) {
        return prev.map(s => s.id === updated.id ? updated : s);
      }
      return [updated, ...prev];
    });
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveStaff(appsScriptConfig.webAppUrl, updated).catch(err => console.warn('Save staff sync notice:', err));
    }
  };

  const handleSaveStaffBatch = (staffList: StaffMember[]) => {
    setStaff(staffList);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveStaffBatch(appsScriptConfig.webAppUrl, staffList).catch(err => console.warn('Save staff batch sync notice:', err));
    }
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaff(prev => prev.filter(s => s.id !== staffId));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deleteStaff(appsScriptConfig.webAppUrl, staffId).catch(err => console.warn('Delete staff sync notice:', err));
    }
  };

  // Payroll Management Handlers with Bi-Directional Expense Synchronization
  const handleSavePayroll = (record: PayrollRecord) => {
    const updated: PayrollRecord = {
      ...record,
      updatedAt: new Date().toISOString()
    };
    setPayroll(prev => {
      const exists = prev.some(p => p.id === updated.id);
      if (exists) {
        return prev.map(p => p.id === updated.id ? updated : p);
      }
      return [updated, ...prev];
    });

    // Bi-Directional Synchronization with Expenses
    const targetExpenseId = `EXP-PAY-${updated.id}`;
    if (updated.status === 'Paid') {
      const expenseAmount = Number(updated.netPay || updated.grossPay || 0);
      const linkedExpense: ExpenseRecord = {
        id: targetExpenseId,
        name: `Payroll Disbursal: ${updated.staffName} (${updated.payPeriodStart} - ${updated.payPeriodEnd})`,
        category: 'Salaries / Payroll',
        type: 'Fixed',
        amount: expenseAmount,
        date: updated.payDate || new Date().toISOString().slice(0, 10),
        status: 'Paid',
        paymentStatus: 'Paid',
        paymentDate: updated.payDate || new Date().toISOString().slice(0, 10),
        vendor: updated.staffName,
        referenceNumber: updated.id,
        payrollId: updated.id,
        notes: `Auto-generated from finalized Payroll ${updated.id} (${updated.position || 'Staff'}). Net Pay: ₱${expenseAmount.toLocaleString()}`,
        createdAt: updated.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setExpenses(prev => {
        const existingIdx = prev.findIndex(e => e.id === targetExpenseId || e.payrollId === updated.id);
        if (existingIdx > -1) {
          const copy = [...prev];
          copy[existingIdx] = { ...copy[existingIdx], ...linkedExpense };
          return copy;
        }
        return [linkedExpense, ...prev];
      });

      if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
        sheetsService.saveExpense(appsScriptConfig.webAppUrl, linkedExpense).catch(err => console.warn('Sync linked payroll expense notice:', err));
      }
    } else {
      // If payroll is no longer Paid (e.g. reverted to Draft/Reviewed or Voided), void or remove the linked expense
      setExpenses(prev => {
        const hasLinked = prev.some(e => e.payrollId === updated.id || e.id === targetExpenseId);
        if (!hasLinked) return prev;
        return prev.map(e => {
          if (e.payrollId === updated.id || e.id === targetExpenseId) {
            const nextStatus = updated.status === 'Voided' ? 'Voided' : 'Pending';
            const updatedExp: ExpenseRecord = {
              ...e,
              status: nextStatus,
              paymentStatus: nextStatus,
              updatedAt: new Date().toISOString(),
              notes: `${e.notes || ''} [Linked payroll status: ${updated.status}]`
            };
            if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
              sheetsService.saveExpense(appsScriptConfig.webAppUrl, updatedExp).catch(err => console.warn('Update voided payroll expense notice:', err));
            }
            return updatedExp;
          }
          return e;
        });
      });
    }

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.savePayroll(appsScriptConfig.webAppUrl, updated).catch(err => console.warn('Save payroll sync notice:', err));
    }
  };

  const handleSavePayrollBatch = (records: PayrollRecord[]) => {
    setPayroll(records);

    // Sync any batch records marked Paid
    records.forEach(r => {
      if (r.status === 'Paid') {
        const targetExpenseId = `EXP-PAY-${r.id}`;
        const expenseAmount = Number(r.netPay || r.grossPay || 0);
        const linkedExpense: ExpenseRecord = {
          id: targetExpenseId,
          name: `Payroll Disbursal: ${r.staffName} (${r.payPeriodStart} - ${r.payPeriodEnd})`,
          category: 'Salaries / Payroll',
          type: 'Fixed',
          amount: expenseAmount,
          date: r.payDate || new Date().toISOString().slice(0, 10),
          status: 'Paid',
          paymentStatus: 'Paid',
          paymentDate: r.payDate || new Date().toISOString().slice(0, 10),
          vendor: r.staffName,
          referenceNumber: r.id,
          payrollId: r.id,
          notes: `Auto-generated from Payroll ${r.id}`,
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setExpenses(prev => {
          const idx = prev.findIndex(e => e.id === targetExpenseId || e.payrollId === r.id);
          if (idx > -1) {
            const copy = [...prev];
            copy[idx] = linkedExpense;
            return copy;
          }
          return [linkedExpense, ...prev];
        });
        if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
          sheetsService.saveExpense(appsScriptConfig.webAppUrl, linkedExpense).catch(err => console.warn('Sync linked payroll expense notice:', err));
        }
      }
    });

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.savePayrollBatch(appsScriptConfig.webAppUrl, records).catch(err => console.warn('Save payroll batch sync notice:', err));
    }
  };

  const handleDeletePayroll = (payrollId: string) => {
    setPayroll(prev => prev.filter(p => p.id !== payrollId));
    
    // Also clean up or void the linked expense
    const targetExpenseId = `EXP-PAY-${payrollId}`;
    setExpenses(prev => prev.filter(e => e.id !== targetExpenseId && e.payrollId !== payrollId));

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deletePayroll(appsScriptConfig.webAppUrl, payrollId).catch(err => console.warn('Delete payroll sync notice:', err));
      sheetsService.deleteExpense(appsScriptConfig.webAppUrl, targetExpenseId).catch(err => console.warn('Delete linked expense notice:', err));
    }
  };

  // Expense Management Handlers
  const handleSaveExpense = (expense: ExpenseRecord) => {
    const updated: ExpenseRecord = {
      ...expense,
      updatedAt: new Date().toISOString()
    };
    setExpenses(prev => {
      const exists = prev.some(e => e.id === updated.id);
      if (exists) {
        return prev.map(e => e.id === updated.id ? updated : e);
      }
      return [updated, ...prev];
    });
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveExpense(appsScriptConfig.webAppUrl, updated).catch(err => console.warn('Save expense sync notice:', err));
    }
  };

  const handleSaveExpensesBatch = (expensesList: ExpenseRecord[]) => {
    setExpenses(expensesList);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveExpensesBatch(appsScriptConfig.webAppUrl, expensesList).catch(err => console.warn('Save expenses batch sync notice:', err));
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deleteExpense(appsScriptConfig.webAppUrl, expenseId).catch(err => console.warn('Delete expense sync notice:', err));
    }
  };

  // Recurring Expense & Category Handlers
  const handleSaveRecurringExpense = (rule: RecurringExpenseRule) => {
    const updated: RecurringExpenseRule = {
      ...rule,
      updatedAt: new Date().toISOString()
    };
    setRecurringExpenses(prev => {
      const exists = prev.some(r => r.id === updated.id);
      if (exists) {
        return prev.map(r => r.id === updated.id ? updated : r);
      }
      return [updated, ...prev];
    });
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveRecurringExpense(appsScriptConfig.webAppUrl, updated).catch(err => console.warn('Save recurring expense sync notice:', err));
    }
  };

  const handleSaveRecurringExpensesBatch = (rulesList: RecurringExpenseRule[]) => {
    setRecurringExpenses(rulesList);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveRecurringExpensesBatch(appsScriptConfig.webAppUrl, rulesList).catch(err => console.warn('Save recurring expenses batch sync notice:', err));
    }
  };

  const handleDeleteRecurringExpense = (ruleId: string) => {
    setRecurringExpenses(prev => prev.filter(r => r.id !== ruleId));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deleteRecurringExpense(appsScriptConfig.webAppUrl, ruleId).catch(err => console.warn('Delete recurring expense sync notice:', err));
    }
  };

  const handleSaveExpenseCategories = (categories: ExpenseCategory[]) => {
    setExpenseCategories(categories);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveExpenseCategories(appsScriptConfig.webAppUrl, categories).catch(err => console.warn('Save expense categories sync notice:', err));
    }
  };

  const handleCreateJobFromOrder = (order: Order) => {
    const existingJob = jobs.find(j => j.orderId === order.id || (j.orderNumber && order.orderNumber && j.orderNumber === order.orderNumber));
    if (existingJob) {
      setActiveTab('admin');
      setHighlightJobId(existingJob.id);
      return;
    }

    const newJob = createJobFromOrder(order, jobs);
    setJobs(prev => [newJob, ...prev]);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveJob(appsScriptConfig.webAppUrl, newJob);
    }

    setActiveTab('admin');
    setHighlightJobId(newJob.id);
  };

  const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
    const updatedSettings: SystemSettings = {
      ...newSettings,
      adminUsername: newSettings.adminUsername || systemSettings.adminUsername || 'admin',
      adminPasscode: newSettings.adminPasscode || systemSettings.adminPasscode || 'admin123'
    };

    setSystemSettings(updatedSettings);

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveAdminSettings(
        appsScriptConfig.webAppUrl,
        updatedSettings,
        updatedSettings.adminUsername || 'admin',
        updatedSettings.adminPasscode || 'admin123'
      );
    }
  };

  const handleForceSyncAll = async (): Promise<boolean> => {
    const url = appsScriptConfig.webAppUrl?.trim();
    if (!url) {
      return false;
    }
    try {
      // 1. Sync all products (master products + company custom products + showcase catalog products)
      const allProductsMap = new Map<string, Product>();
      products.forEach(p => allProductsMap.set(p.id, p));
      companies.forEach(co => {
        if (Array.isArray(co.customProducts)) {
          co.customProducts.forEach(cp => allProductsMap.set(cp.id, cp));
        }
      });
      catalogProducts.forEach(cp => {
        const productAsB2b: Product = {
          id: cp.id,
          name: cp.name,
          category: (cp.category || 'Uniforms') as any,
          description: cp.description || '',
          imageUrl: cp.imageUrl || '',
          basePrice: cp.basePrice || 0,
          minQuantity: cp.moq || 1,
          unit: 'pcs',
          leadTime: cp.leadTime || '7-10 Business Days',
          sizeOptions: cp.sizes || (cp as any).sizeOptions || [],
          colorOptions: cp.colors?.map(c => typeof c === 'object' && c ? c.name : String(c)),
          imageUrls: cp.imageUrls,
          frequentlyOrdered: true
        };
        allProductsMap.set(cp.id, productAsB2b);
      });

      for (const p of allProductsMap.values()) {
        await sheetsService.saveProduct(url, p);
      }
      // 2. Sync all companies
      for (const co of companies) {
        await sheetsService.saveCompany(url, co);
      }
      // 3. Sync all orders
      for (const ord of orders) {
        await sheetsService.saveOrder(url, ord);
      }
      // 4. Sync admin settings
      const adminUsername = systemSettings.adminUsername || 'admin';
      const adminPasscode = systemSettings.adminPasscode || 'admin123';
      await sheetsService.saveAdminSettings(url, systemSettings, adminUsername, adminPasscode);
      // 5. Sync catalog products
      for (const cp of catalogProducts) {
        await sheetsService.saveCatalogProduct(url, cp);
      }
      // 6. Sync quote enquiries
      for (const q of quoteEnquiries) {
        await sheetsService.saveQuoteEnquiry(url, q);
      }
      // 7. Sync order portals
      for (const portal of orderPortals) {
        await sheetsService.savePortal(url, portal);
      }
      // 8. Sync jobs & custom job columns
      for (const job of jobs) {
        await sheetsService.saveJob(url, job);
      }
      if (jobColumns && jobColumns.length > 0) {
        await sheetsService.saveJobColumns(url, jobColumns);
      }
      if (jobItemColumns && jobItemColumns.length > 0) {
        await sheetsService.saveJobItemColumns(url, jobItemColumns);
      }
      // 9. Sync staff members
      if (staff && staff.length > 0) {
        await sheetsService.saveStaffBatch(url, staff);
      }
      // 10. Sync payroll records
      if (payroll && payroll.length > 0) {
        await sheetsService.savePayrollBatch(url, payroll);
      }
      // 11. Sync expenses
      if (expenses && expenses.length > 0) {
        await sheetsService.saveExpensesBatch(url, expenses);
      }
      // 12. Sync expense categories
      if (expenseCategories && expenseCategories.length > 0) {
        await sheetsService.saveExpenseCategories(url, expenseCategories);
      }
      // 13. Sync recurring expense rules
      if (recurringExpenses && recurringExpenses.length > 0) {
        await sheetsService.saveRecurringExpensesBatch(url, recurringExpenses);
      }
      return true;
    } catch (e) {
      console.warn('Force sync notice:', e);
      return false;
    }
  };

  // Catalog Product Management Handlers
  const handleAddProductToCompanyCatalog = (newProduct: Product, companyIdentifier: string) => {
    // 1. Update master products list
    setProducts(prev => {
      const exists = prev.some(p => p.id === newProduct.id);
      if (exists) return prev;
      return [newProduct, ...prev];
    });

    const scriptUrl = appsScriptConfig.webAppUrl?.trim();

    // 2. Find matching company by ID or name and add product to company catalog
    setCompanies(prevCompanies => {
      const targetIdx = prevCompanies.findIndex(
        c => c.id === companyIdentifier || c.name.toLowerCase() === companyIdentifier.toLowerCase()
      );

      if (targetIdx > -1) {
        const updated = [...prevCompanies];
        const targetCo = updated[targetIdx];
        const currentCustoms = targetCo.customProducts || [];
        const updatedCustoms = [newProduct, ...currentCustoms.filter(p => p.id !== newProduct.id)];
        const updatedCo = {
          ...targetCo,
          customProducts: updatedCustoms
        };
        updated[targetIdx] = updatedCo;

        if (scriptUrl) {
          sheetsService.saveCompany(scriptUrl, updatedCo);
        }

        return updated;
      } else if (prevCompanies.length > 0) {
        const updated = [...prevCompanies];
        const targetCo = updated[0];
        const currentCustoms = targetCo.customProducts || [];
        const updatedCo = {
          ...targetCo,
          customProducts: [newProduct, ...currentCustoms.filter(p => p.id !== newProduct.id)]
        };
        updated[0] = updatedCo;

        if (scriptUrl) {
          sheetsService.saveCompany(scriptUrl, updatedCo);
        }

        return updated;
      }
      return prevCompanies;
    });

    // 3. Save new product to Google Sheets Products tab
    if (scriptUrl) {
      sheetsService.saveProduct(scriptUrl, newProduct);
    }
  };

  const handleAddCatalogProduct = (product: CatalogProduct) => {
    setCatalogProducts(prev => [product, ...prev]);
    const scriptUrl = appsScriptConfig.webAppUrl?.trim();
    if (scriptUrl) {
      sheetsService.saveCatalogProduct(scriptUrl, product);

      // Also ensure it is listed in the main Products sheet so all devices get the product data
      const productAsB2b: Product = {
        id: product.id,
        name: product.name,
        category: (product.category || 'Uniforms') as any,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        basePrice: (product as any).basePrice || 0,
        minQuantity: product.moq || 1,
        unit: 'pcs',
        leadTime: product.leadTime || '7-10 Business Days',
        sizeOptions: product.sizes,
        colorOptions: product.colors?.map(c => typeof c === 'object' && c ? c.name : String(c)),
        imageUrls: product.imageUrls,
        frequentlyOrdered: true
      };
      sheetsService.saveProduct(scriptUrl, productAsB2b);
    }
  };

  const handleUpdateCatalogProduct = (product: CatalogProduct) => {
    setCatalogProducts(prev => prev.map(p => p.id === product.id ? product : p));
    const scriptUrl = appsScriptConfig.webAppUrl?.trim();
    if (scriptUrl) {
      sheetsService.saveCatalogProduct(scriptUrl, product);

      const productAsB2b: Product = {
        id: product.id,
        name: product.name,
        category: (product.category || 'Uniforms') as any,
        description: product.description || '',
        imageUrl: product.imageUrl || '',
        basePrice: (product as any).basePrice || 0,
        minQuantity: product.moq || 1,
        unit: 'pcs',
        leadTime: product.leadTime || '7-10 Business Days',
        sizeOptions: product.sizes,
        colorOptions: product.colors?.map(c => typeof c === 'object' && c ? c.name : String(c)),
        imageUrls: product.imageUrls,
        frequentlyOrdered: true
      };
      sheetsService.saveProduct(scriptUrl, productAsB2b);
    }
  };

  const handleDeleteCatalogProduct = (productId: string) => {
    setCatalogProducts(prev => prev.filter(p => p.id !== productId));
    const scriptUrl = appsScriptConfig.webAppUrl?.trim();
    if (scriptUrl) {
      sheetsService.deleteCatalogProduct(scriptUrl, productId);
      sheetsService.deleteProduct(scriptUrl, productId);
    }
  };

  // Quote Enquiry Handlers
  const handleAddQuoteEnquiry = (enquiry: QuoteEnquiry) => {
    const adminNotif: AppNotification = {
      id: `notif-quote-admin-${Date.now()}`,
      recipientType: 'admin',
      companyName: enquiry.companyName,
      title: 'New Quote Request',
      message: `New quote request ${enquiry.enquiryNumber || enquiry.id} submitted by ${enquiry.companyName} for "${enquiry.productName}" (Qty: ${enquiry.quantity}).`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: enquiry.id,
      orderNumber: enquiry.enquiryNumber,
      type: 'quote_request'
    };

    const companyNotif: AppNotification = {
      id: `notif-quote-co-${Date.now()}`,
      recipientType: 'company',
      companyName: enquiry.companyName,
      title: 'Quote Request Submitted',
      message: `Your quote request ${enquiry.enquiryNumber || enquiry.id} for "${enquiry.productName}" was received and is under review.`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: enquiry.id,
      orderNumber: enquiry.enquiryNumber,
      type: 'quote_request'
    };

    setNotifications(prev => [companyNotif, adminNotif, ...prev]);
    setQuoteEnquiries(prev => [enquiry, ...prev]);

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveQuoteEnquiry(appsScriptConfig.webAppUrl, enquiry);
      sheetsService.saveNotifications(appsScriptConfig.webAppUrl, [companyNotif, adminNotif]).catch(err => console.warn('Save quote notifications notice:', err));
    }
  };

  const handleSaveQuoteEnquiry = (enquiry: QuoteEnquiry) => {
    const companyNotif: AppNotification = {
      id: `notif-quote-save-co-${Date.now()}`,
      recipientType: 'company',
      companyName: enquiry.companyName,
      title: `Quote Request ${enquiry.enquiryNumber || enquiry.id} Updated`,
      message: `Quote request ${enquiry.enquiryNumber || enquiry.id} ("${enquiry.productName}") status is now "${enquiry.status}".${enquiry.quotedTotalPrice ? ` Total Quoted: $${enquiry.quotedTotalPrice.toFixed(2)}` : ''}`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: enquiry.id,
      orderNumber: enquiry.enquiryNumber,
      type: 'quote_status_change'
    };

    const adminNotif: AppNotification = {
      id: `notif-quote-save-admin-${Date.now()}`,
      recipientType: 'admin',
      companyName: enquiry.companyName,
      title: `Quote Request ${enquiry.enquiryNumber || enquiry.id} Updated`,
      message: `Quote request ${enquiry.enquiryNumber || enquiry.id} (${enquiry.companyName}) updated to "${enquiry.status}".`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: enquiry.id,
      orderNumber: enquiry.enquiryNumber,
      type: 'quote_status_change'
    };

    setNotifications(prev => [companyNotif, adminNotif, ...prev]);
    setQuoteEnquiries(prev => prev.map(q => q.id === enquiry.id ? enquiry : q));

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveQuoteEnquiry(appsScriptConfig.webAppUrl, enquiry);
      sheetsService.saveNotifications(appsScriptConfig.webAppUrl, [companyNotif, adminNotif]).catch(err => console.warn('Save quote notifications notice:', err));
    }
  };

  const handleUpdateQuoteEnquiryStatus = (enquiryId: string, status: QuoteEnquiry['status']) => {
    const targetEnquiry = quoteEnquiries.find(q => q.id === enquiryId);

    if (targetEnquiry) {
      const companyNotif: AppNotification = {
        id: `notif-quote-status-co-${Date.now()}`,
        recipientType: 'company',
        companyName: targetEnquiry.companyName,
        title: `Quote ${targetEnquiry.enquiryNumber || targetEnquiry.id} Status Updated`,
        message: `Quote request ${targetEnquiry.enquiryNumber || targetEnquiry.id} ("${targetEnquiry.productName}") status changed to "${status}".`,
        timestamp: new Date().toISOString(),
        read: false,
        orderId: targetEnquiry.id,
        orderNumber: targetEnquiry.enquiryNumber,
        type: 'quote_status_change'
      };

      const adminNotif: AppNotification = {
        id: `notif-quote-status-admin-${Date.now()}`,
        recipientType: 'admin',
        companyName: targetEnquiry.companyName,
        title: `Quote Status Updated`,
        message: `Quote request ${targetEnquiry.enquiryNumber || targetEnquiry.id} (${targetEnquiry.companyName}) status updated to "${status}".`,
        timestamp: new Date().toISOString(),
        read: false,
        orderId: targetEnquiry.id,
        orderNumber: targetEnquiry.enquiryNumber,
        type: 'quote_status_change'
      };

      setNotifications(prev => [companyNotif, adminNotif, ...prev]);

      if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
        sheetsService.saveNotifications(appsScriptConfig.webAppUrl, [companyNotif, adminNotif]).catch(err => console.warn('Save quote status notifications notice:', err));
      }
    }

    setQuoteEnquiries(prev => prev.map(q => q.id === enquiryId ? { ...q, status } : q));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.updateQuoteEnquiryStatus(appsScriptConfig.webAppUrl, enquiryId, status);
    }
  };

  const handleDeleteQuoteEnquiry = (enquiryId: string) => {
    setQuoteEnquiries(prev => prev.filter(q => q.id !== enquiryId));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deleteQuoteEnquiry(appsScriptConfig.webAppUrl, enquiryId);
    }
  };

  const handleLogin = (
    role: 'admin' | 'client' | 'staff',
    companyId?: string,
    staffInfo?: { staffId: string; accountId: string; name: string; username: string }
  ) => {
    if (role === 'staff' && staffInfo) {
      setLoggedInUser({
        role: 'staff',
        staffId: staffInfo.staffId,
        accountId: staffInfo.accountId,
        name: staffInfo.name,
        username: staffInfo.username
      });
      setActiveTab('dashboard');
    } else {
      setLoggedInUser({ role, companyId });
      if (role === 'client') {
        setActiveTab('catalog');
      } else if (role === 'admin') {
        setActiveTab('admin');
      }
    }
  };

  const handleClockIn = async (staffId: string, staffName: string, notes?: string) => {
    const now = new Date();
    const dateStr = formatLocalDate(now);
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const newAttendance: AttendanceRecord = {
      id: generateAttendanceId(staffId, dateStr),
      staffId,
      staffName,
      date: dateStr,
      clockIn: timeStr,
      clockOut: undefined,
      totalHours: 0,
      status: 'Present',
      notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    setAttendance(prev => {
      const cleanSId = normalizeStaffId(staffId);
      const existingIdx = prev.findIndex(a => a.id === newAttendance.id || (normalizeStaffId(a.staffId) === cleanSId && normalizeAttendanceDate(a.date) === dateStr));
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], ...newAttendance };
        return updated;
      }
      return [newAttendance, ...prev];
    });

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      await sheetsService.saveAttendance(appsScriptConfig.webAppUrl, newAttendance);
    }
  };

  const handleClockOut = async (attendanceId: string, notes?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    let updatedRecord: AttendanceRecord | null = null;

    setAttendance(prev => {
      return prev.map(rec => {
        const isTarget = rec.id === attendanceId ||
          (normalizeStaffId(rec.staffId) === normalizeStaffId(attendanceId) && isRecordActiveClockIn(rec));
        if (isTarget) {
          const hoursWorked = calculateHoursWorked(rec.clockIn, timeStr, rec.date);

          updatedRecord = {
            ...rec,
            clockOut: timeStr,
            totalHours: hoursWorked,
            status: 'Present',
            notes: notes ? (rec.notes ? `${rec.notes} | ${notes}` : notes) : rec.notes,
            updatedAt: now.toISOString()
          };
          return updatedRecord;
        }
        return rec;
      });
    });

    if (updatedRecord && appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      await sheetsService.saveAttendance(appsScriptConfig.webAppUrl, updatedRecord);
    }
  };

  const handleSaveAttendance = (record: AttendanceRecord) => {
    setAttendance(prev => {
      const idx = prev.findIndex(a => a.id === record.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveAttendance(appsScriptConfig.webAppUrl, record);
    }
  };

  const handleSaveAttendanceBatch = (records: AttendanceRecord[]) => {
    setAttendance(prev => {
      const copy = [...prev];
      records.forEach(record => {
        const idx = copy.findIndex(a => a.id === record.id);
        if (idx > -1) {
          copy[idx] = record;
        } else {
          copy.unshift(record);
        }
      });
      return copy;
    });
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      records.forEach(rec => sheetsService.saveAttendance(appsScriptConfig.webAppUrl, rec));
    }
  };

  const handleSaveStaffAccount = (account: StaffAccount) => {
    setStaffAccounts(prev => {
      const idx = prev.findIndex(a => a.id === account.id || a.staffId === account.staffId);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = account;
        return copy;
      }
      return [account, ...prev];
    });
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveStaffAccount(appsScriptConfig.webAppUrl, account);
    }
  };

  const handleDeleteStaffAccount = (accountId: string) => {
    setStaffAccounts(prev => prev.filter(a => a.id !== accountId));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deleteStaffAccount(appsScriptConfig.webAppUrl, accountId);
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    sessionStorage.removeItem('rp_logged_in_user');
    sessionStorage.removeItem('rp_active_tab');
    localStorage.removeItem('rp_logged_in_user');
  };

  /**
   * Helper to generate a unique composite key for the cart line-item.
   */
  const makeCompositeId = (
    productId: string,
    size?: string,
    color?: string,
    customs: Record<string, string> = {}
  ): string => {
    const parts = [productId];
    if (size) parts.push(`sz-${size}`);
    if (color) parts.push(`col-${color}`);
    
    const sortedCustoms = Object.keys(customs)
      .filter(k => customs[k] !== undefined && customs[k] !== null && String(customs[k]).trim() !== '')
      .sort()
      .map(k => `${k}:${String(customs[k]).trim()}`)
      .join('|');
      
    if (sortedCustoms) parts.push(`cust-${sortedCustoms}`);
    return parts.join('_');
  };

  /**
   * Add a single configured product to the shopping cart.
   */
  const handleAddToCart = (newItem: Omit<CartItem, 'id'>) => {
    const qtyToAdd = Number(newItem.quantity) || newItem.product.minQuantity || 1;
    const itemWithNumQty = { ...newItem, quantity: qtyToAdd };
    const compositeId = makeCompositeId(
      itemWithNumQty.product.id,
      itemWithNumQty.selectedSize,
      itemWithNumQty.selectedColor,
      itemWithNumQty.customDetails
    );

    setCart(prev => {
      const matchIdx = prev.findIndex(item => item.id === compositeId);
      if (matchIdx > -1) {
        const updated = [...prev];
        const currentQty = Number(updated[matchIdx].quantity) || 0;
        updated[matchIdx] = {
          ...updated[matchIdx],
          quantity: currentQty + qtyToAdd
        };
        return updated;
      } else {
        return [...prev, { ...itemWithNumQty, id: compositeId }];
      }
    });
  };

  /**
   * Bulk add multiple configured products.
   */
  const handleAddToCartBulk = (newItems: Omit<CartItem, 'id'>[]) => {
    setCart(prev => {
      let updated = [...prev];
      
      newItems.forEach(item => {
        const qtyToAdd = Number(item.quantity) || item.product.minQuantity || 1;
        const itemWithNumQty = { ...item, quantity: qtyToAdd };
        const compositeId = makeCompositeId(
          itemWithNumQty.product.id,
          itemWithNumQty.selectedSize,
          itemWithNumQty.selectedColor,
          itemWithNumQty.customDetails
        );
        
        const matchIdx = updated.findIndex(cartIt => cartIt.id === compositeId);
        if (matchIdx > -1) {
          const currentQty = Number(updated[matchIdx].quantity) || 0;
          updated[matchIdx] = {
            ...updated[matchIdx],
            quantity: currentQty + qtyToAdd
          };
        } else {
          updated.push({ ...itemWithNumQty, id: compositeId });
        }
      });
      
      return updated;
    });
  };

  const handleUpdateCartQuantity = (id: string, qty: number) => {
    const numQty = Number(qty) || 0;
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const boundedQty = Math.max(item.product.minQuantity, numQty);
        return { ...item, quantity: boundedQty };
      }
      return item;
    }));
  };

  const handleRemoveCartItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  /**
   * B2B Order Copy: Copies all line items from a historical order into the current active cart.
   */
  const handleReorderPastOrder = (pastOrder: Order) => {
    const loadedItems: Omit<CartItem, 'id'>[] = [];
    
    pastOrder.items.forEach(pastItem => {
      const catalogProduct = products.find(p => p.id === pastItem.productId);
      if (catalogProduct) {
        loadedItems.push({
          product: catalogProduct,
          quantity: Number(pastItem.quantity) || 1,
          selectedSize: pastItem.selectedSize,
          selectedColor: pastItem.selectedColor,
          selectedAddOns: pastItem.selectedAddOns,
          customDetails: pastItem.customDetails || {},
          unitPrice: pastItem.price ?? pastItem.unitPrice ?? getProductUnitPrice(catalogProduct, pastItem.selectedSize, pastItem.selectedColor)
        });
      }
    });

    handleAddToCartBulk(loadedItems);
    setIsCartOpen(true);
  };

  /**
   * Request Production Checkout.
   */
  const handleCheckoutSubmit = async (formData: {
    poNumber: string;
    notes: string;
    deliveryAddress: string;
    contactPerson: string;
    contactEmail: string;
    contactNumber?: string;
    fbMessengerLink?: string;
    shippingCost?: number;
  }, checkedItems?: CartItem[]) => {
    setIsSubmitting(true);
    
    const itemsToProcess = checkedItems || cart;
    const subtotal = itemsToProcess.reduce((acc, item) => {
      const uPrice = item.unitPrice ?? getProductUnitPrice(item.product, item.selectedSize, item.selectedColor);
      return acc + (uPrice * Number(item.quantity));
    }, 0);
    const shippingCost = formData.shippingCost !== undefined ? formData.shippingCost : (subtotal >= 500 ? 0 : 15.00);
    const finalAmount = subtotal + shippingCost;

    const lineItems = itemsToProcess.map(item => {
      const uPrice = item.unitPrice ?? getProductUnitPrice(item.product, item.selectedSize, item.selectedColor);
      return {
        productId: item.product.id,
        productName: item.product.name,
        imageUrl: getItemColorImage(item.product, item.selectedColor),
        quantity: Number(item.quantity),
        price: uPrice,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
        selectedAddOns: item.selectedAddOns,
        customDetails: item.customDetails
      };
    });

    const serial = 1000 + orders.length + 1;
    const orderNo = `${systemSettings.orderPrefix || 'ARH-2026'}-${serial}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNo,
      companyName: activeCompany.name,
      contactEmail: formData.contactEmail,
      contactPerson: formData.contactPerson,
      contactNumber: formData.contactNumber,
      fbMessengerLink: formData.fbMessengerLink,
      deliveryAddress: formData.deliveryAddress,
      poNumber: formData.poNumber || undefined,
      notes: formData.notes || undefined,
      items: lineItems,
      status: 'Pending',
      totalAmount: finalAmount,
      createdAt: new Date().toISOString()
    };

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      await sheetsService.saveOrder(appsScriptConfig.webAppUrl, newOrder);
    }

    // Generate Admin & Company Notifications for new company order
    const adminNotif: AppNotification = {
      id: `notif-${Date.now()}-admin`,
      recipientType: 'admin',
      title: 'New Company Order',
      message: `New order ${orderNo} placed by ${activeCompany.name} (${systemSettings.currencySymbol || 'Php'} ${finalAmount.toFixed(2)}).`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: newOrder.id,
      orderNumber: orderNo,
      type: 'new_company_order'
    };

    const companyNotif: AppNotification = {
      id: `notif-${Date.now()}-comp`,
      recipientType: 'company',
      companyName: activeCompany.name,
      title: 'Order Placed Successfully',
      message: `Your order ${orderNo} has been placed successfully (${systemSettings.currencySymbol || 'Php'} ${finalAmount.toFixed(2)}).`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: newOrder.id,
      orderNumber: orderNo,
      type: 'new_company_order'
    };

    setNotifications(prev => [companyNotif, adminNotif, ...prev]);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveNotifications(appsScriptConfig.webAppUrl, [companyNotif, adminNotif]).catch(err => console.warn('Save order notifications notice:', err));
    }

    setOrders(prev => [newOrder, ...prev]);
    // Clear only checked items from cart, keep unchecked items
    setCart(prev => prev.filter(item => !itemsToProcess.some(processed => processed.id === item.id)));
    setIsCartOpen(false);
    setIsSubmitting(false);
    setSuccessOrder(newOrder);
  };

  // ----------------------------------------------------
  // Order Portals Handlers
  // ----------------------------------------------------
  const handleCreatePortal = (newPortalData: Omit<OrderPortal, 'id' | 'createdAt' | 'updatedAt' | 'shareToken'>) => {
    const now = new Date().toISOString();
    const token = `portal-${newPortalData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const newPortal: OrderPortal = {
      ...newPortalData,
      id: `portal-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      shareToken: token
    };
    setOrderPortals(prev => [newPortal, ...prev]);

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      sheetsService.savePortal(url, newPortal);
      syncPortalProductsToSheets(url, newPortal.productIds, newPortal.companyId, newPortal.customPrices);
    }
  };

  const handleUpdatePortal = (updatedPortal: OrderPortal) => {
    setOrderPortals(prev => prev.map(p => p.id === updatedPortal.id ? updatedPortal : p));
    if (activePublicPortal?.id === updatedPortal.id) {
      setActivePublicPortal(updatedPortal);
    }

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      sheetsService.savePortal(url, updatedPortal);
      syncPortalProductsToSheets(url, updatedPortal.productIds, updatedPortal.companyId, updatedPortal.customPrices);
    }
  };

  const handleDeletePortal = (portalId: string) => {
    setOrderPortals(prev => prev.filter(p => p.id !== portalId));
    if (activePublicPortal?.id === portalId) {
      setActivePublicPortal(null);
    }

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.deletePortal(appsScriptConfig.webAppUrl, portalId);
    }
  };

  const handlePublicPortalSubmitOrder = async (orderData: {
    contactPerson: string;
    contactNumber?: string;
    fbMessengerLink?: string;
    contactEmail: string;
    deliveryAddress: string;
    poNumber?: string;
    notes?: string;
    items: {
      product: Product;
      quantity: number;
      selectedSize?: string;
      selectedColor?: string;
      customDetails?: Record<string, string>;
    }[];
  }): Promise<Order> => {
    if (!activePublicPortal) throw new Error('No active portal selected');

    const portalCompany = companies.find(c => c.id === activePublicPortal.companyId) || activeCompany;
    const itemsProcessed = orderData.items.map(it => {
      const uPrice = (it as any).unitPrice ?? getProductUnitPrice(it.product, it.selectedSize, it.selectedColor, activePublicPortal);
      return {
        productId: it.product.id,
        productName: it.product.name,
        imageUrl: getItemColorImage(it.product, it.selectedColor),
        quantity: it.quantity,
        price: uPrice,
        selectedSize: it.selectedSize,
        selectedColor: it.selectedColor,
        selectedAddOns: (it as any).selectedAddOns,
        customDetails: it.customDetails
      };
    });
    const subtotal = itemsProcessed.reduce((acc, it) => acc + (it.price * it.quantity), 0);
    const serial = 1000 + orders.length + 1;
    const orderNo = `${systemSettings.orderPrefix || 'ARH-2026'}-${serial}`;

    const newOrder: Order = {
      id: `ord-portal-${Date.now()}`,
      orderNumber: orderNo,
      companyName: portalCompany.name,
      contactEmail: orderData.contactEmail,
      contactPerson: orderData.contactPerson,
      contactNumber: orderData.contactNumber,
      fbMessengerLink: orderData.fbMessengerLink,
      deliveryAddress: orderData.deliveryAddress,
      poNumber: orderData.poNumber,
      notes: orderData.notes,
      portalId: activePublicPortal?.id,
      portalName: activePublicPortal?.name,
      items: itemsProcessed,
      status: 'Pending Approval',
      totalAmount: subtotal,
      createdAt: new Date().toISOString()
    };

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      await sheetsService.saveOrder(appsScriptConfig.webAppUrl, newOrder);
    }

    // Generate Company and Admin notifications for Storefront order
    const companyNotif: AppNotification = {
      id: `notif-${Date.now()}-comp`,
      recipientType: 'company',
      companyName: portalCompany.name,
      title: 'New Storefront Order',
      message: `New storefront order ${orderNo} placed via ${activePublicPortal.name} by ${orderData.contactPerson || 'Customer'}.`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: newOrder.id,
      orderNumber: orderNo,
      type: 'new_storefront_order'
    };

    const adminNotif: AppNotification = {
      id: `notif-${Date.now()}-admin`,
      recipientType: 'admin',
      title: 'New Storefront Order',
      message: `New portal order ${orderNo} submitted for ${portalCompany.name}.`,
      timestamp: new Date().toISOString(),
      read: false,
      orderId: newOrder.id,
      orderNumber: orderNo,
      type: 'new_storefront_order'
    };

    setNotifications(prev => [companyNotif, adminNotif, ...prev]);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveNotifications(appsScriptConfig.webAppUrl, [companyNotif, adminNotif]).catch(err => console.warn('Save storefront notifications notice:', err));
    }

    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  // ----------------------------------------------------
  // Scope and Filter master products/orders to active client
  // ----------------------------------------------------
  const getCompanyProducts = (company: CompanyProfile | null, masterList: Product[]): Product[] => {
    if (!company) return masterList;

    const productMap = new Map<string, Product>();
    const enabledIds = company.enabledProductIds;
    const hasExplicitEnabledList = Array.isArray(enabledIds);

    // Collect custom product IDs belonging to ALL OTHER companies
    const otherCompanyCustomIds = new Set<string>();
    companies.forEach(c => {
      if (c.id !== company.id && Array.isArray(c.customProducts)) {
        c.customProducts.forEach(cp => {
          if (cp && cp.id) otherCompanyCustomIds.add(cp.id);
        });
      }
    });

    // First pass: add master products filtered by enabledProductIds if specified
    masterList.forEach(p => {
      if (otherCompanyCustomIds.has(p.id)) return;
      if (!hasExplicitEnabledList || enabledIds!.includes(p.id)) {
        const initMatch = INITIAL_PRODUCTS.find(ip => ip.id === p.id);
        productMap.set(p.id, {
          ...p,
          addOns: (p.addOns && p.addOns.length > 0) ? p.addOns : initMatch?.addOns
        });
      }
    });

    // Second pass: add/override with THIS company's custom products
    if (Array.isArray(company.customProducts) && company.customProducts.length > 0) {
      company.customProducts.forEach(cp => {
        if (cp && cp.id) {
          const initCp = INITIAL_COMPANIES.find(ic => ic.id === company.id)?.customProducts?.find(p => p.id === cp.id);
          const initMaster = INITIAL_PRODUCTS.find(p => p.id === cp.id);
          productMap.set(cp.id, {
            ...cp,
            addOns: (cp.addOns && cp.addOns.length > 0) ? cp.addOns : (initCp?.addOns || initMaster?.addOns)
          });
        }
      });
    }

    return Array.from(productMap.values());
  };

  const scopedProducts = getCompanyProducts(activeCompany, products);

  // Helper to ensure selected portal products exist in Google Sheets
  const syncPortalProductsToSheets = (url: string, productIds?: string[], companyId?: string, customPrices?: Record<string, number>) => {
    if (!url) return;
    const targetCompany = companies.find(c => c.id === companyId) || activeCompany;

    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));
    if (targetCompany && Array.isArray(targetCompany.customProducts)) {
      targetCompany.customProducts.forEach(cp => productMap.set(cp.id, cp));
    }
    catalogProducts.forEach(cp => {
      if (!productMap.has(cp.id)) {
        productMap.set(cp.id, {
          id: cp.id,
          name: cp.name,
          category: (cp.category || 'Uniforms') as any,
          description: cp.description || '',
          imageUrl: cp.imageUrl || '',
          basePrice: cp.basePrice || 0,
          minQuantity: cp.moq || 1,
          unit: 'pcs',
          leadTime: cp.leadTime || '7-10 Business Days',
          sizeOptions: cp.sizes || (cp as any).sizeOptions || [],
          colorOptions: cp.colors?.map(c => typeof c === 'object' && c ? c.name : String(c)),
          imageUrls: cp.imageUrls,
          frequentlyOrdered: true
        });
      }
    });

    const idsToSync = (productIds && productIds.length > 0)
      ? productIds
      : Array.from(productMap.keys());

    idsToSync.forEach(id => {
      const prod = productMap.get(id);
      if (prod) {
        const portalDisplayPrice = customPrices?.[id];
        const prodToSave = (portalDisplayPrice !== undefined && portalDisplayPrice > 0)
          ? { ...prod, basePrice: portalDisplayPrice }
          : prod;
        sheetsService.saveProduct(url, prodToSave);
      }
    });
  };

  // Render public order portal if active or opened via share link
  if (activePublicPortal) {
    const portalCompany = companies.find(c => c.id.toLowerCase() === activePublicPortal.companyId?.toLowerCase()) ||
      companies.find(c => c.name?.toLowerCase() === activePublicPortal.companyName?.toLowerCase()) ||
      activeCompany;
    
    // Aggregate master products, company custom products, and catalog products
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.id, p));
    if (portalCompany && Array.isArray(portalCompany.customProducts)) {
      portalCompany.customProducts.forEach(cp => productMap.set(cp.id, cp));
    }
    catalogProducts.forEach(cp => {
      if (!productMap.has(cp.id)) {
        productMap.set(cp.id, {
          id: cp.id,
          name: cp.name,
          category: (cp.category || 'Uniforms') as any,
          description: cp.description || '',
          imageUrl: cp.imageUrl || '',
          basePrice: cp.basePrice || 0,
          minQuantity: cp.moq || cp.minQuantity || 1,
          unit: 'pcs',
          leadTime: cp.leadTime,
          sizeOptions: cp.sizes || (cp as any).sizeOptions || [],
          colorOptions: cp.colors?.map(c => typeof c === 'object' && c ? c.name : String(c)),
          imageUrls: cp.imageUrls,
          frequentlyOrdered: true
        });
      }
    });

    const allProductsArray = Array.from(productMap.values());

    let companyAvailableProducts: Product[] = [];
    const companyProducts = getCompanyProducts(portalCompany, allProductsArray);

    if (activePublicPortal.productIds && activePublicPortal.productIds.length > 0) {
      const portalSet = new Set(activePublicPortal.productIds.map(id => String(id).trim()));
      const filtered = companyProducts.filter(p => portalSet.has(String(p.id).trim()));
      // Use filtered if it matched any products, otherwise use companyProducts
      companyAvailableProducts = filtered.length > 0 ? filtered : companyProducts;
    } else {
      companyAvailableProducts = companyProducts;
    }

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles(systemSettings.colorTheme || 'classic_noir') }} />
        <PublicOrderPortal
          portal={activePublicPortal}
          company={portalCompany}
          products={companyAvailableProducts}
          systemSettings={systemSettings}
          onSubmitOrder={handlePublicPortalSubmitOrder}
          isLoggedIn={!!loggedInUser}
          onClosePublicView={() => {
            setActivePublicPortal(null);
            setUrlPortalToken(null);
            if (window.location.search.includes('portal=')) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }}
        />
      </>
    );
  }

  // If URL has ?portal=... parameter and we are currently loading/resolving
  if (urlPortalToken && isResolvingPortal) {
    const tokenClean = urlPortalToken.trim().toLowerCase();
    const tokenNormalized = tokenClean.replace(/^portal-/, '').replace(/^co-/, '');

    // 1. Search in activePublicPortal, state orderPortals, localStorage cached portals, and INITIAL_PORTALS
    let cachedPortals: OrderPortal[] = [];
    try {
      const pStr = localStorage.getItem('rp_order_portals');
      if (pStr) cachedPortals = JSON.parse(pStr);
    } catch (e) {}

    const allPortals = [...orderPortals, ...cachedPortals, ...INITIAL_PORTALS];

    const matchedPortal = activePublicPortal || allPortals.find(p => {
      const pToken = (p.shareToken || '').toLowerCase();
      const pId = (p.id || '').toLowerCase();
      const pCoId = (p.companyId || '').toLowerCase();
      const pCoName = (p.companyName || '').toLowerCase();
      const pName = (p.name || '').toLowerCase();
      return pToken === tokenClean ||
             pId === tokenClean ||
             pCoId === tokenClean ||
             (tokenNormalized !== '' && (
               pToken.includes(tokenNormalized) ||
               pId.includes(tokenNormalized) ||
               pCoId.includes(tokenNormalized) ||
               pCoName.includes(tokenNormalized) ||
               pName.includes(tokenNormalized)
             ));
    });

    // 2. Search in state companies, localStorage cached companies, and INITIAL_COMPANIES
    let cachedCompanies: CompanyProfile[] = [];
    try {
      const cStr = localStorage.getItem('rp_companies');
      if (cStr) cachedCompanies = JSON.parse(cStr);
    } catch (e) {}

    const allCompanies = [...companies, ...cachedCompanies, ...INITIAL_COMPANIES];

    const targetCompanyId = matchedPortal?.companyId?.toLowerCase();
    const targetCompanyName = matchedPortal?.companyName?.toLowerCase();

    const matchedCompany = (targetCompanyId ? allCompanies.find(c => (c.id || '').toLowerCase() === targetCompanyId) : null) ||
      (targetCompanyName ? allCompanies.find(c => (c.name || '').toLowerCase() === targetCompanyName) : null) ||
      allCompanies.find(c => {
        const cId = (c.id || '').toLowerCase();
        const cUser = (c.username || '').toLowerCase();
        const cName = (c.name || '').toLowerCase();
        return cId === tokenClean ||
               cUser === tokenClean ||
               cName === tokenClean ||
               (tokenClean !== '' && (tokenClean.includes(cId) || (cUser !== '' && tokenClean.includes(cUser)))) ||
               (tokenNormalized !== '' && (
                 cId.includes(tokenNormalized) ||
                 (cUser !== '' && cUser.includes(tokenNormalized)) ||
                 cName.includes(tokenNormalized)
               ));
      });

    const logo = matchedCompany?.logoUrl || matchedPortal?.bannerImageUrl || (matchedCompany?.name ? systemSettings.logoUrl : undefined);
    const companyName = matchedCompany?.name || matchedPortal?.companyName || matchedPortal?.name || 'Corporate Storefront';

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles(systemSettings.colorTheme || 'classic_noir') }} />
        <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
          {logo ? (
            <img
              src={logo}
              alt={companyName || 'Company Logo'}
              className="max-h-24 max-w-[280px] object-contain animate-pulse"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-800 shadow-sm animate-pulse">
              <Store className="w-8 h-8 text-black" />
            </div>
          )}
          <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // If URL has ?portal=... parameter but no matching portal was found
  if (urlPortalToken && !activePublicPortal && !isResolvingPortal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles(systemSettings.colorTheme || 'classic_noir') }} />
        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-5 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-black uppercase tracking-tight">Order Portal Unavailable</h2>
            <p className="text-xs text-gray-500 font-sans mt-2 leading-relaxed">
              The order portal link you accessed is invalid, closed, or no longer active. Please contact the company representative for an updated storefront link.
            </p>
          </div>
          <button
            onClick={() => {
              setUrlPortalToken(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
            className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-2xl border border-black shadow-xs transition-all cursor-pointer"
          >
            Go to Portal Sign-In
          </button>
        </div>
      </div>
    );
  }

  // If no user is authenticated, serve the portal gate screen
  if (!loggedInUser) {
    if (!hasInitialSynced && isSyncingSheets) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles(systemSettings.colorTheme || 'classic_noir') }} />
        <LoginScreen
          companies={companies}
          staffAccounts={staffAccounts}
          staff={staff}
          onLogin={handleLogin}
          systemSettings={systemSettings}
          onSyncSheets={syncWithSheets}
          isSyncingSheets={isSyncingSheets}
          lastSyncedTime={lastSyncedTime}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-black selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: getThemeStyles(systemSettings.colorTheme || 'classic_noir') }} />
      {/* Structural Header */}
      <Header
        companies={companies}
        selectedCompany={activeCompany}
        onCompanyChange={handleCompanyChange}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onCartToggle={() => setIsCartOpen(true)}
        userRole={loggedInUser.role}
        onLogout={handleLogout}
        systemSettings={systemSettings}
        isSheetsConnected={appsScriptConfig.isConnected}
        isSyncingSheets={isSyncingSheets}
        onSyncSheets={syncWithSheets}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onClearNotifications={handleClearNotifications}
        onSelectNotification={handleSelectNotification}
        onMobileNavToggle={handleAdminNavToggle}
      />

      {/* Universal Slide-in Navigation Drawer for Client & Non-Admin Views */}
      {activeTab !== 'admin' && activeTab !== 'sync' && (
        <NavigationDrawer
          isOpen={isAdminNavOpen}
          onClose={() => setIsAdminNavOpen(false)}
          company={activeCompany}
          systemSettings={systemSettings}
          userRole={loggedInUser.role}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsAdminNavOpen(false);
          }}
          counts={
            loggedInUser.role === 'staff'
              ? {
                  jobs: jobs.length,
                  catalog: catalogProducts.length,
                  payslips: payroll.filter(p => p.staffId === loggedInUser.staffId).length
                }
              : {
                  catalog: scopedProducts.length,
                  browse: catalogProducts.length,
                  portals: orderPortals.filter(p => p.companyId === activeCompany.id).length,
                  history: orders.filter(o => o.companyName?.toLowerCase() === activeCompany.name?.toLowerCase()).length,
                  quotes: quoteEnquiries.filter(q => q.companyName?.toLowerCase() === activeCompany.name?.toLowerCase()).length
                }
          }
          currentStaffName={loggedInUser.name || 'Staff Member'}
          onLogout={handleLogout}
        />
      )}

      {/* Main App Workspace Stage */}
      <main className={`flex-1 w-full mx-auto px-4 py-8 sm:px-8 ${activeTab === 'admin' || activeTab === 'sync' || loggedInUser.role === 'staff' ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={loggedInUser.role === 'staff' ? `staff-portal-${activeTab}` : activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {loggedInUser.role === 'staff' && (
              <StaffDashboard
                currentUser={loggedInUser}
                staffMember={staff.find(s => s.id === loggedInUser.staffId || s.fullName.toLowerCase() === (loggedInUser.name || '').toLowerCase())}
                staffAccount={staffAccounts.find(sa => sa.id === loggedInUser.accountId || sa.staffId === loggedInUser.staffId || sa.username === loggedInUser.username)}
                attendanceRecords={attendance}
                payrollRecords={payroll}
                jobs={jobs}
                jobColumns={jobColumns}
                jobItemColumns={jobItemColumns}
                companies={companies}
                orders={orders}
                catalogProducts={catalogProducts}
                quoteEnquiries={quoteEnquiries}
                onAddCatalogProduct={handleAddCatalogProduct}
                onUpdateCatalogProduct={handleUpdateCatalogProduct}
                onDeleteCatalogProduct={handleDeleteCatalogProduct}
                onUpdateQuoteEnquiryStatus={handleUpdateQuoteEnquiryStatus}
                onDeleteQuoteEnquiry={handleDeleteQuoteEnquiry}
                onSaveQuoteEnquiry={handleSaveQuoteEnquiry}
                onAddProductToCompanyCatalog={handleAddProductToCompanyCatalog}
                onClockIn={handleClockIn}
                onClockOut={handleClockOut}
                onUpdateAttendance={handleSaveAttendance}
                onSaveJob={handleSaveJob}
                onUpdateJobStatus={handleUpdateJobStatus}
                onDeleteJob={handleDeleteJob}
                onUpdateStaffAccount={handleSaveStaffAccount}
                onUpdateStaffMember={handleSaveStaff}
                onUpdateOrderStatus={(orderId, status) => handleUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))}
                systemSettings={systemSettings}
                currencySymbol={systemSettings.currencySymbol || 'Php'}
                onLogout={handleLogout}
                onSyncSheets={syncWithSheets}
                isSyncingSheets={isSyncingSheets}
                activeTab={activeTab}
                onTabChange={(t) => setActiveTab(t)}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
              />
            )}

            {loggedInUser.role !== 'staff' && (activeTab === 'admin' || activeTab === 'sync') && loggedInUser?.role === 'admin' && (
              <AdminDashboard
                currentUser={loggedInUser}
                products={products}
                companies={companies}
                orders={orders}
                catalogProducts={catalogProducts}
                quoteEnquiries={quoteEnquiries}
                jobs={jobs}
                jobColumns={jobColumns}
                jobItemColumns={jobItemColumns}
                onSaveJob={handleSaveJob}
                onUpdateJobStatus={handleUpdateJobStatus}
                onDeleteJob={handleDeleteJob}
                onSaveJobsBatch={handleSaveJobsBatch}
                onSaveJobColumns={handleSaveJobColumns}
                onSaveJobItemColumns={handleSaveJobItemColumns}
                onCreateJobFromOrder={handleCreateJobFromOrder}
                highlightJobId={highlightJobId}
                staff={staff}
                payroll={payroll}
                attendance={attendance}
                staffAccounts={staffAccounts}
                expenses={expenses}
                recurringExpenses={recurringExpenses}
                expenseCategories={expenseCategories}
                onSaveStaff={handleSaveStaff}
                onSaveStaffBatch={handleSaveStaffBatch}
                onDeleteStaff={handleDeleteStaff}
                onSaveStaffAccount={handleSaveStaffAccount}
                onDeleteStaffAccount={handleDeleteStaffAccount}
                onSavePayroll={handleSavePayroll}
                onSavePayrollBatch={handleSavePayrollBatch}
                onDeletePayroll={handleDeletePayroll}
                onSaveAttendance={handleSaveAttendance}
                onSaveAttendanceBatch={handleSaveAttendanceBatch}
                onSaveExpense={handleSaveExpense}
                onSaveExpensesBatch={handleSaveExpensesBatch}
                onDeleteExpense={handleDeleteExpense}
                onSaveRecurringExpense={handleSaveRecurringExpense}
                onSaveRecurringExpensesBatch={handleSaveRecurringExpensesBatch}
                onDeleteRecurringExpense={handleDeleteRecurringExpense}
                onSaveExpenseCategories={handleSaveExpenseCategories}
                onAddCatalogProduct={handleAddCatalogProduct}
                onUpdateCatalogProduct={handleUpdateCatalogProduct}
                onDeleteCatalogProduct={handleDeleteCatalogProduct}
                onUpdateQuoteEnquiryStatus={handleUpdateQuoteEnquiryStatus}
                onDeleteQuoteEnquiry={handleDeleteQuoteEnquiry}
                onSaveQuoteEnquiry={handleSaveQuoteEnquiry}
                onAddProductToCompanyCatalog={handleAddProductToCompanyCatalog}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onUpdateProducts={handleUpdateProducts}
                onUpdateOrders={handleUpdateOrders}
                onSimulateClient={(coId) => {
                  setSelectedCompanyId(coId);
                  setActiveTab('browse');
                }}
                systemSettings={systemSettings}
                onUpdateSystemSettings={handleUpdateSystemSettings}
                appsScriptConfig={appsScriptConfig}
                onUpdateAppsScriptConfig={handleUpdateConfig}
                onForceSyncAll={handleForceSyncAll}
                onPullFromSheets={syncWithSheets}
                isSyncingSheets={isSyncingSheets}
                initialTab={activeTab === 'sync' ? 'sync' : (adminCatalogSection ? 'catalog' : ((highlightOrderNumber || highlightOrderId) ? 'orders' : undefined))}
                initialCatalogSection={adminCatalogSection}
                highlightEnquiryNumber={highlightEnquiryNumber}
                highlightOrderNumber={highlightOrderNumber}
                highlightOrderId={highlightOrderId}
                isMobileNavOpen={isAdminNavOpen}
                onToggleMobileNav={(open) => setIsAdminNavOpen(typeof open === 'boolean' ? open : !isAdminNavOpen)}
                onLogout={handleLogout}
              />
            )}

            {loggedInUser.role !== 'staff' && activeTab === 'browse' && (
              <BrowseProducts
                products={catalogProducts}
                onAddQuoteEnquiry={handleAddQuoteEnquiry}
                activeCompany={activeCompany}
              />
            )}

            {loggedInUser.role !== 'staff' && activeTab === 'catalog' && (
              <ProductCatalog
                products={scopedProducts}
                onAddToCart={handleAddToCart}
                onUpdateProduct={handleUpdateSingleProduct}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
                userRole={loggedInUser?.role || 'client'}
              />
            )}
            
            {loggedInUser.role !== 'staff' && activeTab === 'portals' && (
              <OrderPortals
                portals={orderPortals}
                activeCompany={activeCompany}
                availableProducts={scopedProducts}
                allProducts={products}
                systemSettings={systemSettings}
                onCreatePortal={handleCreatePortal}
                onUpdatePortal={handleUpdatePortal}
                onDeletePortal={handleDeletePortal}
                onViewPortal={(portal) => setActivePublicPortal(portal)}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
                orders={orders}
                onUpdateOrders={handleUpdateOrders}
                onUpdateOrderStatus={(orderId, status) => handleUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))}
                onAddToCartBulk={handleAddToCartBulk}
                onOpenCart={() => setIsCartOpen(true)}
              />
            )}

            {loggedInUser.role !== 'staff' && activeTab === 'history' && (
              <OrderHistory
                orders={orders}
                selectedCompanyName={activeCompany.name}
                onReorderPastOrder={handleReorderPastOrder}
                onUpdateOrderStatus={(orderId, status) => handleUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
                highlightOrderId={highlightOrderId}
                highlightOrderNumber={highlightOrderNumber}
              />
            )}

            {loggedInUser.role !== 'staff' && activeTab === 'quote-history' && (
              <QuoteRequestHistory
                quoteEnquiries={quoteEnquiries}
                activeCompany={activeCompany}
                onSaveQuoteEnquiry={handleSaveQuoteEnquiry}
                highlightQuoteId={highlightQuoteId}
                highlightEnquiryNumber={highlightEnquiryNumber}
              />
            )}

            {loggedInUser.role !== 'staff' && activeTab === 'settings' && (
              <CustomerSettings
                activeCompany={activeCompany}
                onUpdateCompany={handleUpdateCompany}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Checkout Side-Panel Drawer */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        activeCompany={activeCompany}
        onSubmitOrder={handleCheckoutSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Checkout Success Fullscreen Dialogue Modal */}
      <AnimatePresence>
        {successOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={() => setSuccessOrder(null)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-black max-w-md w-full p-8 rounded-3xl relative z-10 space-y-6 text-center"
              id="order-success-modal"
            >
              <div className="w-16 h-16 bg-black text-white border border-black font-mono text-3xl font-extrabold flex items-center justify-center mx-auto select-none rounded-2xl shadow-md">
                ✓
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono text-gray-500 tracking-widest block font-bold">
                  B2B Order Authorized
                </span>
                <h3 className="text-xl font-extrabold uppercase tracking-tight text-black">
                  Order Submitted!
                </h3>
                <p className="text-xs text-gray-600 font-mono">
                  Assigned Reference: <span className="font-extrabold text-black">{successOrder.orderNumber}</span>
                </p>
              </div>

              <div className="border border-gray-200 rounded-2xl py-4 text-xs space-y-2 font-mono text-left bg-gray-50 px-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Billing Client:</span>
                  <span className="font-bold text-black">{successOrder.companyName}</span>
                </div>
                {successOrder.poNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">PO reference:</span>
                    <span className="font-bold text-black">{successOrder.poNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Buyer Rep:</span>
                  <span className="font-bold text-black">{getDisplayPurchaserName(successOrder)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 text-black font-bold">
                  <span>Total Amount:</span>
                  <span>Php {successOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Your print queue request is active. ARH Print is verifying vector branding files and template layouts. A detailed invoice copy has been dispatched to <span className="underline font-bold text-black">{successOrder.contactEmail}</span>.
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setSuccessOrder(null);
                    setActiveTab('history');
                  }}
                  className="flex-1 bg-white border border-gray-200 text-black py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider hover:border-black transition-colors focus:outline-none cursor-pointer text-center font-mono"
                  id="success-view-history-btn"
                >
                  View Status
                </button>
                <button
                  onClick={() => setSuccessOrder(null)}
                  className="flex-1 bg-black text-white border border-black py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider hover:bg-white hover:text-black transition-all focus:outline-none cursor-pointer text-center font-mono"
                  id="success-dismiss-btn"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
