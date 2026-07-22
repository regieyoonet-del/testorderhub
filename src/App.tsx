/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CompanyProfile, Order, CartItem, AppsScriptConfig, SystemSettings } from './types';
import { INITIAL_PRODUCTS, INITIAL_COMPANIES, INITIAL_ORDERS } from './data/mockData';
import { sheetsService } from './lib/sheetsService';
import { emailService } from './lib/emailService';
import Header from './components/Header';
import ProductCatalog from './components/ProductCatalog';
import OrderHistory from './components/OrderHistory';
import SettingsPanel from './components/SettingsPanel';
import Cart from './components/Cart';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import { Check, AlertCircle, ShoppingBag, ArrowRight, Printer, RefreshCw, LogOut } from 'lucide-react';

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
    enabledProductIds: co.enabledProductIds && co.enabledProductIds.length > 0
      ? co.enabledProductIds
      : (initMatch?.enabledProductIds || [])
  };
};

export default function App() {
  // ----------------------------------------------------
  // Persistent States with LocalStorage Cache
  // ----------------------------------------------------
  
  const [products, setProducts] = useState<Product[]>(() => {
    const cached = localStorage.getItem('rp_master_products');
    return cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
  });
  
  const [companies, setCompanies] = useState<CompanyProfile[]>(() => {
    const cached = localStorage.getItem('rp_companies');
    const loaded: CompanyProfile[] = cached ? JSON.parse(cached) : INITIAL_COMPANIES;
    return loaded.map(sanitizeCompany);
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const cached = localStorage.getItem('rp_orders');
    return cached ? JSON.parse(cached) : INITIAL_ORDERS;
  });

  const [appsScriptConfig, setAppsScriptConfig] = useState<AppsScriptConfig>(() => {
    const cached = localStorage.getItem('rp_apps_script_config');
    return cached ? JSON.parse(cached) : { webAppUrl: '', isConnected: false };
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
      logoUrl: parsed.logoUrl || ''
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
  const [activeTab, setActiveTab] = useState('catalog');
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

  // Pull live data from Sheets on load if connected
  useEffect(() => {
    const syncWithSheets = async () => {
      if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
        const url = appsScriptConfig.webAppUrl;
        
        // 1. Fetch products
        const fetchedProducts = await sheetsService.fetchProducts(url);
        if (fetchedProducts !== null) {
          setProducts(fetchedProducts);
        }

        // 2. Fetch companies
        const fetchedCompanies = await sheetsService.fetchCompanies(url);
        if (fetchedCompanies !== null && fetchedCompanies.length > 0) {
          setCompanies(prevCompanies => {
            const merged = [...prevCompanies];
            fetchedCompanies.forEach(rawCo => {
              const co = sanitizeCompany(rawCo);
              const idx = merged.findIndex(c => c.id === co.id);
              if (idx !== -1) {
                const existing = merged[idx];
                merged[idx] = sanitizeCompany({
                  ...existing,
                  ...co,
                  name: (co.name && co.name.trim() !== '') ? co.name : existing.name,
                  username: (co.username && co.username.trim() !== '') ? co.username : existing.username,
                  passcode: (co.passcode && co.passcode.trim() !== '') ? co.passcode : existing.passcode,
                  contactPerson: (co.contactPerson && co.contactPerson.trim() !== '') ? co.contactPerson : existing.contactPerson,
                  contactEmail: (co.contactEmail && co.contactEmail.trim() !== '') ? co.contactEmail : existing.contactEmail,
                  contactPhone: (co.contactPhone && co.contactPhone.trim() !== '') ? co.contactPhone : existing.contactPhone,
                  deliveryAddress: (co.deliveryAddress && co.deliveryAddress.trim() !== '') ? co.deliveryAddress : existing.deliveryAddress,
                  logoUrl: (co.logoUrl && co.logoUrl.trim() !== '') ? co.logoUrl : existing.logoUrl,
                  customProducts: co.customProducts && co.customProducts.length > 0
                    ? co.customProducts
                    : existing.customProducts,
                  enabledProductIds: co.enabledProductIds !== undefined && co.enabledProductIds.length > 0
                    ? co.enabledProductIds
                    : existing.enabledProductIds
                });
              } else {
                merged.push(co);
              }
            });
            return merged.map(sanitizeCompany);
          });
        }

        // 3. Fetch orders
        const fetchedOrders = await sheetsService.fetchOrders(url);
        if (fetchedOrders !== null) {
          setOrders(fetchedOrders);
        }

        // 4. Fetch admin settings
        const fetchedSettings = await sheetsService.fetchAdminSettings(url);
        if (fetchedSettings) {
          setSystemSettings({
            hubName: fetchedSettings.hubName,
            shortHubName: fetchedSettings.shortHubName,
            orderPrefix: fetchedSettings.orderPrefix,
            currencySymbol: fetchedSettings.currencySymbol,
            colorTheme: fetchedSettings.colorTheme || 'classic_noir',
            adminEmail: fetchedSettings.adminEmail || '',
            logoUrl: fetchedSettings.logoUrl || ''
          });
          if (fetchedSettings.adminUsername) {
            localStorage.setItem('rp_admin_username', fetchedSettings.adminUsername);
          }
          if (fetchedSettings.adminPasscode) {
            localStorage.setItem('rp_admin_passcode', fetchedSettings.adminPasscode);
          }
        }
      }
    };
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

    if (!co.enabledProductIds || co.enabledProductIds.length === 0) {
      co.enabledProductIds = products.map(p => p.id);
    }
    setCompanies(prev => [...prev, co]);
    setSelectedCompanyId(co.id);

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveCompany(appsScriptConfig.webAppUrl, co);
    }
  };

  const handleUpdateCompany = (updatedCo: CompanyProfile) => {
    const sanitized = sanitizeCompany(updatedCo);
    setCompanies(prev => prev.map(c => c.id === sanitized.id ? sanitized : c));

    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      sheetsService.saveCompany(appsScriptConfig.webAppUrl, sanitized);
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
    const appsScriptUrl = appsScriptConfig.webAppUrl?.trim() || undefined;

    // 1. Sync deletions & trigger automated cancellation email (works for both online/offline)
    for (const oldOrd of orders) {
      const stillExists = newOrders.some(newOrd => newOrd.id === oldOrd.id);
      if (!stillExists) {
        if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
          await sheetsService.deleteOrder(appsScriptConfig.webAppUrl, oldOrd.id);
        }

        // Trigger automated cancel/delete email to admin
        const company = companies.find(c => c.name === oldOrd.companyName) || {
          id: 'co-unknown',
          name: oldOrd.companyName,
          contactPerson: oldOrd.contactPerson || 'Representative',
          contactEmail: oldOrd.contactEmail || '',
          contactPhone: '',
          deliveryAddress: oldOrd.deliveryAddress,
          poRequired: false
        };
        await emailService.sendOrderCancelAdminEmail(oldOrd, company, systemSettings, appsScriptUrl);
      }
    }

    // 2. Sync status changes & trigger automated emails (works for both online/offline)
    for (const newOrd of newOrders) {
      const oldOrd = orders.find(o => o.id === newOrd.id);
      if (oldOrd && oldOrd.status !== newOrd.status) {
        if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
          await sheetsService.updateOrderStatus(appsScriptConfig.webAppUrl, newOrd.id, newOrd.status);
        }

        // Trigger automated email notifications
        const company = companies.find(c => c.name === newOrd.companyName) || {
          id: 'co-unknown',
          name: newOrd.companyName,
          contactPerson: newOrd.contactPerson || 'Representative',
          contactEmail: newOrd.contactEmail || '',
          contactPhone: '',
          deliveryAddress: newOrd.deliveryAddress,
          poRequired: false
        };

        // Email to company about status change
        await emailService.sendOrderStatusChangedEmail(newOrd, company, oldOrd.status, newOrd.status, systemSettings, appsScriptUrl);

        // Email to admin if canceled
        if (newOrd.status === 'Canceled') {
          await emailService.sendOrderCancelAdminEmail(newOrd, company, systemSettings, appsScriptUrl);
        }
      }
    }

    setOrders(newOrders);
  };

  const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
    setSystemSettings(newSettings);
    if (appsScriptConfig.isConnected && appsScriptConfig.webAppUrl) {
      const adminUsername = localStorage.getItem('rp_admin_username') || 'admin';
      const adminPasscode = localStorage.getItem('rp_admin_passcode') || '1234';
      sheetsService.saveAdminSettings(appsScriptConfig.webAppUrl, newSettings, adminUsername, adminPasscode);
    }
  };

  const handleForceSyncAll = async (): Promise<boolean> => {
    if (!appsScriptConfig.isConnected || !appsScriptConfig.webAppUrl) {
      return false;
    }
    const url = appsScriptConfig.webAppUrl;
    try {
      // 1. Sync all products
      for (const p of products) {
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
      const adminUsername = localStorage.getItem('rp_admin_username') || 'admin';
      const adminPasscode = localStorage.getItem('rp_admin_passcode') || '1234';
      await sheetsService.saveAdminSettings(url, systemSettings, adminUsername, adminPasscode);
      return true;
    } catch (e) {
      console.error('Force sync failed:', e);
      return false;
    }
  };

  const handleLogin = (role: 'admin' | 'client', companyId?: string) => {
    setLoggedInUser({ role, companyId });

    if (role === 'client' && companyId) {
      const company = companies.find(c => c.id === companyId);
      if (company) {
        const appsScriptUrl = appsScriptConfig.webAppUrl?.trim() || undefined;
        emailService.sendNewDeviceLoginEmail(company, systemSettings, appsScriptUrl);
      }
    }
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

    // Send automated email notifications on successful order placement (to client and admin)
    const appsScriptUrl = appsScriptConfig.webAppUrl?.trim() || undefined;
    await Promise.all([
      emailService.sendOrderPlacementClientEmail(newOrder, activeCompany, systemSettings, appsScriptUrl),
      emailService.sendOrderPlacementAdminEmail(newOrder, activeCompany, systemSettings, appsScriptUrl)
    ]);

    setOrders(prev => [newOrder, ...prev]);
    // Clear only checked items from cart, keep unchecked items
    setCart(prev => prev.filter(item => !itemsToProcess.some(processed => processed.id === item.id)));
    setIsCartOpen(false);
    setIsSubmitting(false);
    setSuccessOrder(newOrder);
  };

  // ----------------------------------------------------
  // Scope and Filter master products/orders to active client
  // ----------------------------------------------------
  const scopedProducts = activeCompany?.customProducts?.filter(p => {
    const enabledIds = activeCompany.enabledProductIds || [];
    return enabledIds.includes(p.id);
  }) || [];

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
            {activeTab === 'admin' && loggedInUser.role === 'admin' && (
              <AdminDashboard
                products={products}
                companies={companies}
                orders={orders}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                onDeleteCompany={handleDeleteCompany}
                onUpdateProducts={handleUpdateProducts}
                onUpdateOrders={handleUpdateOrders}
                onSimulateClient={(coId) => {
                  setSelectedCompanyId(coId);
                  setActiveTab('catalog');
                }}
                systemSettings={systemSettings}
                onUpdateSystemSettings={handleUpdateSystemSettings}
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
            
            {activeTab === 'history' && (
              <OrderHistory
                orders={orders}
                selectedCompanyName={activeCompany.name}
                onReorderPastOrder={handleReorderPastOrder}
                appsScriptUrl={appsScriptConfig.isConnected ? appsScriptConfig.webAppUrl : undefined}
              />
            )}
            
            {activeTab === 'sync' && loggedInUser.role === 'admin' && (
              <SettingsPanel
                config={appsScriptConfig}
                onUpdateConfig={handleUpdateConfig}
                companies={companies}
                onAddCompany={handleAddCompany}
                onUpdateCompany={handleUpdateCompany}
                totalOrders={orders.length}
                productsCount={products.length}
                onForceSyncAll={handleForceSyncAll}
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
