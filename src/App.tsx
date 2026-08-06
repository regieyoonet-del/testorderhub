/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CompanyProfile, Order, CartItem, AppsScriptConfig, SystemSettings, CatalogProduct, QuoteEnquiry, OrderPortal, getDisplayPurchaserName } from './types';
import { INITIAL_PRODUCTS, INITIAL_COMPANIES, INITIAL_ORDERS, INITIAL_PORTALS } from './data/mockData';
import { INITIAL_CATALOG_PRODUCTS, INITIAL_QUOTE_ENQUIRIES, sanitizeCatalogProduct } from './data/initialCatalog';
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
import OrderPortals from './components/OrderPortals';
import PublicOrderPortal from './components/PublicOrderPortal';
import { getProductUnitPrice } from './utils/pricing';
import { getItemColorImage } from './utils/colorUtils';
import { Check, AlertCircle, ShoppingBag, ArrowRight, Printer, RefreshCw, LogOut, Store } from 'lucide-react';

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
      map.set(p.id, p);
    }
  });
  return Array.from(map.values());
};

export const sanitizeProducts = (prods: Product[]): Product[] => {
  const map = new Map<string, Product>();
  prods.forEach(p => {
    if (p && p.id) {
      map.set(p.id, p);
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
    return loaded.map(sanitizeCompany);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('rp_master_products');
    const loaded: Product[] = cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
    return sanitizeMasterProducts(loaded, companies);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = localStorage.getItem('rp_orders');
    return cached ? JSON.parse(cached) : INITIAL_ORDERS;
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
    let parsedConfig: AppsScriptConfig = cached ? JSON.parse(cached) : { webAppUrl: EMBEDDED_APPS_SCRIPT_URL, isConnected: true };

    // Check if script URL was passed in query parameters (e.g., ?script=... or ?appsScriptUrl=...)
    const params = new URLSearchParams(window.location.search);
    const urlScript = params.get('script') || params.get('appsScriptUrl') || params.get('webAppUrl');
    const envScript = (((import.meta as any).env?.VITE_APPS_SCRIPT_URL) as string) || '';

    const effectiveUrl = (urlScript && urlScript.trim()) || parsedConfig.webAppUrl || (envScript && envScript.trim()) || EMBEDDED_APPS_SCRIPT_URL;
    parsedConfig = {
      webAppUrl: effectiveUrl.trim(),
      isConnected: true
    };
    localStorage.setItem('rp_apps_script_config', JSON.stringify(parsedConfig));
    return parsedConfig;
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
      adminUsername,
      adminPasscode
    };
  });

  // Client Authentication State (Session-isolated so new windows/browsers/shared links land on sign-in window)
  const [loggedInUser, setLoggedInUser] = useState<{ role: 'admin' | 'client'; companyId?: string } | null>(() => {
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

  // Client-isolated cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // UI Flow States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
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

    let urlCustomPrices: Record<string, number> | undefined;
    let urlCustomVariantPrices: Record<string, Record<string, number>> | undefined;

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
        customVariantPrices: urlCustomVariantPrices || match.customVariantPrices
      };
      setActivePublicPortal(mergedMatch);
      setIsResolvingPortal(false);
      // If NOT connected to Sheets, we are done. If connected, we fetch live Sheets data in background silently without blocking the UI!
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
            fetchedProducts.forEach(p => map.set(p.id, p));
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
          fetchedCompanies.forEach(c => coMap.set(c.id, sanitizeCompany(c)));
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
              customVariantPrices: (fp.customVariantPrices && Object.keys(fp.customVariantPrices).length > 0) ? fp.customVariantPrices : (existing?.customVariantPrices || urlCustomVariantPrices)
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
            customVariantPrices: (fetchedMatch.customVariantPrices && Object.keys(fetchedMatch.customVariantPrices).length > 0) ? fetchedMatch.customVariantPrices : urlCustomVariantPrices
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
          updated.name !== activePublicPortal.name ||
          updated.status !== activePublicPortal.status
        ) {
          setActivePublicPortal(prev => prev ? ({
            ...updated,
            customPrices: (updated.customPrices && Object.keys(updated.customPrices).length > 0) ? updated.customPrices : prev.customPrices,
            customVariantPrices: (updated.customVariantPrices && Object.keys(updated.customVariantPrices).length > 0) ? updated.customVariantPrices : prev.customVariantPrices
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

        // Fallback to parallel fetches if bulk endpoint was not available or empty
        if (!allData) {
          [
            fetchedProducts,
            fetchedCompanies,
            fetchedOrders,
            fetchedSettings,
            fetchedQuotes,
            fetchedCatalogProducts,
            fetchedPortals
          ] = await Promise.all([
            sheetsService.fetchProducts(url).catch(() => null),
            sheetsService.fetchCompanies(url).catch(() => null),
            sheetsService.fetchOrders(url).catch(() => null),
            sheetsService.fetchAdminSettings(url).catch(() => null),
            sheetsService.fetchQuoteEnquiries(url).catch(() => null),
            sheetsService.fetchCatalogProducts(url).catch(() => null),
            sheetsService.fetchPortals(url).catch(() => null)
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
              const local = localMap.get(fo.id);
              if (local) {
                // If order was approved or updated locally, do not revert it to 'Pending Approval' if Google Sheets returns stale status
                if (local.status !== 'Pending Approval' && (fo.status === 'Pending Approval' || fo.status === 'Pending')) {
                  return { ...fo, status: local.status };
                }
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

          setSystemSettings({
            hubName: fetchedSettings.hubName || 'ARH Print Hub',
            shortHubName: fetchedSettings.shortHubName || 'ARH',
            orderPrefix: fetchedSettings.orderPrefix || 'ARH-2026',
            currencySymbol: fetchedSettings.currencySymbol || 'Php',
            colorTheme: fetchedSettings.colorTheme || 'classic_noir',
            adminEmail: fetchedSettings.adminEmail || '',
            logoUrl: fetchedSettings.logoUrl || '',
            adminUsername: currentAdminUser,
            adminPasscode: currentAdminPass
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

        setLastSyncedTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn('Google Sheets sync notice:', err);
      } finally {
        setIsSyncingSheets(false);
        isSyncingRef.current = false;
      }
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
    if (loggedInUser?.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('catalog');
    }
  }, [loggedInUser?.role]);

  // ----------------------------------------------------
  // B2B Ordering Actions & Helpers
  // ----------------------------------------------------

  const handleCompanyChange = (co: CompanyProfile) => {
    setSelectedCompanyId(co.id);
  };

  const handleUpdateConfig = (newConfig: AppsScriptConfig) => {
    setAppsScriptConfig(newConfig);
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
    setQuoteEnquiries(prev => [enquiry, ...prev]);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveQuoteEnquiry(appsScriptConfig.webAppUrl, enquiry);
    }
  };

  const handleSaveQuoteEnquiry = (enquiry: QuoteEnquiry) => {
    setQuoteEnquiries(prev => prev.map(q => q.id === enquiry.id ? enquiry : q));
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveQuoteEnquiry(appsScriptConfig.webAppUrl, enquiry);
    }
  };

  const handleUpdateQuoteEnquiryStatus = (enquiryId: string, status: QuoteEnquiry['status']) => {
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

  const handleLogin = (role: 'admin' | 'client', companyId?: string) => {
    setLoggedInUser({ role, companyId });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    sessionStorage.removeItem('rp_logged_in_user');
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
          customDetails: pastItem.customDetails || {}
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
        productMap.set(p.id, p);
      }
    });

    // Second pass: add/override with THIS company's custom products
    if (Array.isArray(company.customProducts) && company.customProducts.length > 0) {
      company.customProducts.forEach(cp => {
        if (cp && cp.id) {
          productMap.set(cp.id, cp);
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

    if (activePublicPortal.productIds && activePublicPortal.productIds.length > 0) {
      const portalSet = new Set(activePublicPortal.productIds.map(id => String(id).trim()));
      companyAvailableProducts = allProductsArray.filter(p => portalSet.has(String(p.id).trim()));

      if (companyAvailableProducts.length === 0) {
        companyAvailableProducts = getCompanyProducts(portalCompany, allProductsArray);
      }
    } else {
      companyAvailableProducts = getCompanyProducts(portalCompany, allProductsArray);
    }

    // Safety fallback: If still 0 products, show all available products
    if (companyAvailableProducts.length === 0 && allProductsArray.length > 0) {
      companyAvailableProducts = allProductsArray;
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
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles(systemSettings.colorTheme || 'classic_noir') }} />
        <LoginScreen
          companies={companies}
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
      />

      {/* Main App Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {(activeTab === 'admin' || activeTab === 'sync') && loggedInUser?.role === 'admin' && (
              <AdminDashboard
                products={products}
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
                initialTab={activeTab === 'sync' ? 'sync' : undefined}
              />
            )}

            {activeTab === 'browse' && (
              <BrowseProducts
                products={catalogProducts}
                onAddQuoteEnquiry={handleAddQuoteEnquiry}
                activeCompany={activeCompany}
              />
            )}

            {activeTab === 'catalog' && (
              <ProductCatalog
                products={scopedProducts}
                onAddToCart={handleAddToCart}
                onUpdateProduct={handleUpdateSingleProduct}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
                userRole={loggedInUser?.role || 'client'}
              />
            )}
            
            {activeTab === 'portals' && (
              <OrderPortals
                portals={orderPortals}
                activeCompany={activeCompany}
                availableProducts={scopedProducts}
                systemSettings={systemSettings}
                onCreatePortal={handleCreatePortal}
                onUpdatePortal={handleUpdatePortal}
                onDeletePortal={handleDeletePortal}
                onViewPortal={(portal) => setActivePublicPortal(portal)}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
                orders={orders}
                onUpdateOrders={handleUpdateOrders}
                onUpdateOrderStatus={(orderId, status) => handleUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))}
              />
            )}

            {activeTab === 'history' && (
              <OrderHistory
                orders={orders}
                selectedCompanyName={activeCompany.name}
                onReorderPastOrder={handleReorderPastOrder}
                onUpdateOrderStatus={(orderId, status) => handleUpdateOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
              />
            )}

            {activeTab === 'quote-history' && (
              <QuoteRequestHistory
                quoteEnquiries={quoteEnquiries}
                activeCompany={activeCompany}
                onSaveQuoteEnquiry={handleSaveQuoteEnquiry}
              />
            )}

            {activeTab === 'settings' && (
              <CustomerSettings
                activeCompany={activeCompany}
                onUpdateCompany={handleUpdateCompany}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Sign Out Button */}
      {loggedInUser && (
        <button
          onClick={handleLogout}
          className="fixed bottom-6 right-6 bg-black text-white hover:bg-white hover:text-black border border-black px-4 py-2.5 rounded-full text-xs uppercase font-extrabold tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg z-40 hover:scale-105 active:scale-95"
          id="floating-logout-btn"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      )}

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
