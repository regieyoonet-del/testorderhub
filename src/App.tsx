/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CompanyProfile, Order, CartItem, AppsScriptConfig, SystemSettings, CatalogProduct, QuoteEnquiry, OrderPortal } from './types';
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
    : (initMatch?.deliveryAddress || 'Standard Delivery Address On File');

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
    const cached = localStorage.getItem('rp_system_settings');
    const parsed = cached ? JSON.parse(cached) : {};
    return {
      hubName: parsed.hubName || 'ARH Print Hub',
      shortHubName: parsed.shortHubName || 'ARH',
      orderPrefix: parsed.orderPrefix || 'ARH-2026',
      currencySymbol: parsed.currencySymbol || 'Php',
      colorTheme: parsed.colorTheme || 'classic_noir',
      adminEmail: (parsed.adminEmail && parsed.adminEmail.trim() !== '') ? parsed.adminEmail : 'regie.yoonet@gmail.com',
      logoUrl: parsed.logoUrl || '',
      adminUsername: parsed.adminUsername || localStorage.getItem('rp_admin_username') || 'admin',
      adminPasscode: parsed.adminPasscode || localStorage.getItem('rp_admin_passcode') || 'admin123'
    };
  });

  // Client Authentication State
  const [loggedInUser, setLoggedInUser] = useState<{ role: 'admin' | 'client'; companyId?: string } | null>(() => {
    const cached = localStorage.getItem('rp_logged_in_user');
    return cached ? JSON.parse(cached) : null;
  });

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
    localStorage.setItem('rp_system_settings', JSON.stringify(systemSettings));
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
      setActivePublicPortal(match);
      setIsResolvingPortal(false);
      return;
    }

    // 3. If not found locally yet or if connected to Sheets, fetch live data from Google Sheets
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      setIsResolvingPortal(true);
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
          fetchedPortals.forEach(p => poMap.set(p.id, p));
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
          setActivePublicPortal(fetchedMatch);
        }
        setIsResolvingPortal(false);
      }).catch(err => {
        console.error('Error fetching portals and companies for share token:', err);
        setIsResolvingPortal(false);
      });
    } else {
      setIsResolvingPortal(false);
    }
  }, [urlPortalToken, orderPortals, companies, products, appsScriptConfig.isConnected, appsScriptConfig.webAppUrl]);

  useEffect(() => {
    if (loggedInUser) {
      localStorage.setItem('rp_logged_in_user', JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem('rp_logged_in_user');
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

  const syncWithSheets = async () => {
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const url = appsScriptConfig.webAppUrl;
      setIsSyncingSheets(true);
      
      try {
        // 1. Fetch products
        const fetchedProducts = await sheetsService.fetchProducts(url);

        // 2. Fetch companies
        const fetchedCompanies = await sheetsService.fetchCompanies(url);
        if (fetchedCompanies !== null) {
          setCompanies(prevCompanies => {
            const map = new Map<string, CompanyProfile>();
            prevCompanies.forEach(co => map.set(co.id, co));

            fetchedCompanies.forEach(fetchedCo => {
              const existingLocal = map.get(fetchedCo.id);
              if (existingLocal) {
                const mergedCo: CompanyProfile = {
                  ...existingLocal,
                  name: (fetchedCo.name && fetchedCo.name.trim() !== '') ? fetchedCo.name : existingLocal.name,
                  username: (fetchedCo.username && fetchedCo.username.trim() !== '') ? fetchedCo.username.trim().toLowerCase() : existingLocal.username,
                  passcode: (fetchedCo.passcode && fetchedCo.passcode.trim() !== '') ? fetchedCo.passcode : existingLocal.passcode,
                  contactPerson: (fetchedCo.contactPerson && fetchedCo.contactPerson.trim() !== '') ? fetchedCo.contactPerson : existingLocal.contactPerson,
                  contactEmail: (fetchedCo.contactEmail && fetchedCo.contactEmail.trim() !== '') ? fetchedCo.contactEmail : existingLocal.contactEmail,
                  contactPhone: (fetchedCo.contactPhone && fetchedCo.contactPhone.trim() !== '') ? fetchedCo.contactPhone : existingLocal.contactPhone,
                  deliveryAddress: (fetchedCo.deliveryAddress && fetchedCo.deliveryAddress.trim() !== '') ? fetchedCo.deliveryAddress : existingLocal.deliveryAddress,
                  logoUrl: (fetchedCo.logoUrl !== undefined && fetchedCo.logoUrl !== null && fetchedCo.logoUrl.trim() !== '') ? fetchedCo.logoUrl : existingLocal.logoUrl,
                  poRequired: fetchedCo.poRequired !== undefined ? fetchedCo.poRequired : existingLocal.poRequired,
                  enabledProductIds: (fetchedCo.enabledProductIds && fetchedCo.enabledProductIds.length > 0)
                    ? fetchedCo.enabledProductIds
                    : existingLocal.enabledProductIds,
                  customProducts: (fetchedCo.customProducts && fetchedCo.customProducts.length > 0)
                    ? fetchedCo.customProducts
                    : existingLocal.customProducts
                };
                map.set(fetchedCo.id, sanitizeCompany(mergedCo));
              } else {
                map.set(fetchedCo.id, sanitizeCompany(fetchedCo));
              }
            });

            return Array.from(map.values()).map(sanitizeCompany);
          });
        }

        // 3. Merge products from fetchedProducts and company customProducts
        if (fetchedProducts !== null || fetchedCompanies !== null) {
          setProducts(prevProducts => {
            const map = new Map<string, Product>();
            prevProducts.forEach(p => map.set(p.id, p));
            if (fetchedProducts) {
              fetchedProducts.forEach(p => map.set(p.id, p));
            }
            if (fetchedCompanies) {
              fetchedCompanies.forEach(c => {
                if (Array.isArray(c.customProducts)) {
                  c.customProducts.forEach(cp => {
                    if (cp && cp.id) map.set(cp.id, cp);
                  });
                }
              });
            }
            return Array.from(map.values());
          });
        }

        // 3. Fetch orders
        const fetchedOrders = await sheetsService.fetchOrders(url);
        if (fetchedOrders !== null) {
          setOrders(prevOrders => {
            const map = new Map<string, Order>();
            prevOrders.forEach(o => map.set(o.id, o));

            fetchedOrders.forEach(fo => {
              const local = map.get(fo.id);
              if (local) {
                const isLocalStatusSet = local.status && local.status !== 'Pending' && local.status !== 'Pending Approval';
                map.set(fo.id, {
                  ...fo,
                  status: isLocalStatusSet ? local.status : fo.status,
                  items: (fo.items && fo.items.length > 0) ? fo.items : local.items
                });
              } else {
                map.set(fo.id, fo);
              }
            });

            return Array.from(map.values());
          });
        }

        // 4. Fetch admin settings
        const fetchedSettings = await sheetsService.fetchAdminSettings(url);
        if (fetchedSettings) {
          const currentAdminUser = fetchedSettings.adminUsername || localStorage.getItem('rp_admin_username') || systemSettings.adminUsername || 'admin';
          const currentAdminPass = fetchedSettings.adminPasscode || localStorage.getItem('rp_admin_passcode') || systemSettings.adminPasscode || 'admin123';

          setSystemSettings({
            hubName: fetchedSettings.hubName,
            shortHubName: fetchedSettings.shortHubName,
            orderPrefix: fetchedSettings.orderPrefix,
            currencySymbol: fetchedSettings.currencySymbol,
            colorTheme: fetchedSettings.colorTheme || 'classic_noir',
            adminEmail: fetchedSettings.adminEmail || '',
            logoUrl: fetchedSettings.logoUrl || '',
            adminUsername: currentAdminUser,
            adminPasscode: currentAdminPass
          });
          localStorage.setItem('rp_admin_username', currentAdminUser);
          localStorage.setItem('rp_admin_passcode', currentAdminPass);
        }

        // 5. Fetch quote enquiries
        const fetchedQuotes = await sheetsService.fetchQuoteEnquiries(url);
        if (fetchedQuotes !== null) {
          setQuoteEnquiries(fetchedQuotes.map(q => ({
            ...q,
            quoteNotes: (q.quoteNotes && q.quoteNotes.trim() !== '') ? q.quoteNotes : DEFAULT_QUOTE_NOTES
          })));
        }

        // 6. Fetch catalog products
        const fetchedCatalogProducts = await sheetsService.fetchCatalogProducts(url);
        if (fetchedCatalogProducts !== null) {
          setCatalogProducts(fetchedCatalogProducts.map(sanitizeCatalogProduct));
        }

        // 7. Fetch order portals
        const fetchedPortals = await sheetsService.fetchPortals(url);
        if (fetchedPortals !== null) {
          setOrderPortals(prevPortals => {
            const map = new Map<string, OrderPortal>();
            prevPortals.forEach(p => map.set(p.id, p));
            fetchedPortals.forEach(p => map.set(p.id, p));
            return Array.from(map.values());
          });
        }

        setLastSyncedTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Error syncing with Google Sheets:', err);
      } finally {
        setIsSyncingSheets(false);
      }
    }
  };

  // Pull live data from Sheets on load or config change
  useEffect(() => {
    syncWithSheets();
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
      co.enabledProductIds = products.map(p => p.id);
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

    if (Array.isArray(co.customProducts) && co.customProducts.length > 0) {
      setProducts(prev => {
        const map = new Map<string, Product>();
        prev.forEach(p => map.set(p.id, p));
        co.customProducts!.forEach(cp => map.set(cp.id, cp));
        return Array.from(map.values());
      });
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

    if (Array.isArray(sanitized.customProducts) && sanitized.customProducts.length > 0) {
      setProducts(prev => {
        const map = new Map<string, Product>();
        prev.forEach(p => map.set(p.id, p));
        sanitized.customProducts!.forEach(cp => map.set(cp.id, cp));
        return Array.from(map.values());
      });
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
    // 1. Sync deletions (works for both online/offline)
    for (const oldOrd of orders) {
      const stillExists = newOrders.some(newOrd => newOrd.id === oldOrd.id);
      if (!stillExists) {
        if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
          await sheetsService.deleteOrder(appsScriptConfig.webAppUrl, oldOrd.id);
        }
      }
    }

    // 2. Sync status changes (works for both online/offline)
    for (const newOrd of newOrders) {
      const oldOrd = orders.find(o => o.id === newOrd.id);
      if (oldOrd && oldOrd.status !== newOrd.status) {
        if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
          await sheetsService.updateOrderStatus(appsScriptConfig.webAppUrl, newOrd.id, newOrd.status);
        }
      }
    }

    setOrders(newOrders);
  };

  const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
    const updatedSettings: SystemSettings = {
      ...newSettings,
      adminUsername: newSettings.adminUsername || localStorage.getItem('rp_admin_username') || 'admin',
      adminPasscode: newSettings.adminPasscode || localStorage.getItem('rp_admin_passcode') || 'admin123'
    };

    setSystemSettings(updatedSettings);
    if (updatedSettings.adminUsername) {
      localStorage.setItem('rp_admin_username', updatedSettings.adminUsername);
    }
    if (updatedSettings.adminPasscode) {
      localStorage.setItem('rp_admin_passcode', updatedSettings.adminPasscode);
    }

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
          sizeOptions: cp.sizes,
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
      const adminUsername = systemSettings.adminUsername || localStorage.getItem('rp_admin_username') || 'admin';
      const adminPasscode = systemSettings.adminPasscode || localStorage.getItem('rp_admin_passcode') || 'admin123';
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
      console.error('Force sync failed:', e);
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
    const subtotal = itemsToProcess.reduce((acc, item) => acc + (Number(item.product.basePrice) * Number(item.quantity)), 0);
    const shippingCost = formData.shippingCost !== undefined ? formData.shippingCost : (subtotal >= 500 ? 0 : 15.00);
    const finalAmount = subtotal + shippingCost;

    const lineItems = itemsToProcess.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      imageUrl: item.product.imageUrl,
      quantity: Number(item.quantity),
      price: Number(item.product.basePrice),
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      customDetails: item.customDetails
    }));

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
      syncPortalProductsToSheets(url, newPortal.productIds, newPortal.companyId);
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
      syncPortalProductsToSheets(url, updatedPortal.productIds, updatedPortal.companyId);
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
    const subtotal = orderData.items.reduce((acc, it) => acc + (it.product.basePrice * it.quantity), 0);
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
      items: orderData.items.map(it => ({
        productId: it.product.id,
        productName: it.product.name,
        imageUrl: it.product.imageUrl,
        quantity: it.quantity,
        price: it.product.basePrice,
        selectedSize: it.selectedSize,
        selectedColor: it.selectedColor,
        customDetails: it.customDetails
      })),
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
    const hasExplicitEnabledList = Array.isArray(enabledIds) && enabledIds.length > 0;

    // First pass: add master products filtered by enabledProductIds if specified
    masterList.forEach(p => {
      if (!hasExplicitEnabledList || enabledIds!.includes(p.id)) {
        productMap.set(p.id, p);
      }
    });

    // Second pass: add/override with company custom products
    if (Array.isArray(company.customProducts) && company.customProducts.length > 0) {
      company.customProducts.forEach(cp => {
        if (!hasExplicitEnabledList || enabledIds!.includes(cp.id) || company.customProducts?.some(c => c.id === cp.id)) {
          productMap.set(cp.id, cp);
        }
      });
    }

    return Array.from(productMap.values());
  };

  const scopedProducts = getCompanyProducts(activeCompany, products);

  // Helper to ensure selected portal products exist in Google Sheets
  const syncPortalProductsToSheets = (url: string, productIds?: string[], companyId?: string) => {
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
          sizeOptions: cp.sizes,
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
        sheetsService.saveProduct(url, prod);
      }
    });
  };

  // Render public order portal if active or opened via share link
  if (activePublicPortal) {
    const portalCompany = companies.find(c => c.id === activePublicPortal.companyId) || activeCompany;
    
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
          sizeOptions: cp.sizes,
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
        <style dangerouslySetInnerHTML={{ __html: getThemeStyles(systemSettings.colorTheme || 'classic_noir') }} />
        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto animate-pulse">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-black uppercase tracking-tight">Loading Company Storefront...</h2>
          <p className="text-xs text-gray-500 font-mono">Retrieving custom product listings and access rights.</p>
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
                  <span className="font-bold text-black">{successOrder.contactPerson}</span>
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
