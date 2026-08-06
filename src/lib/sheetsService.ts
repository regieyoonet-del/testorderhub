/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Product, CompanyProfile, CatalogProduct, QuoteEnquiry, ColorOption, OrderPortal, OrderItem } from '../types';
import { INITIAL_CATALOG_PRODUCTS } from '../data/initialCatalog';
import { parseColorList, resolveColorHex } from '../utils/colorUtils';
import { DEFAULT_QUOTE_NOTES } from '../constants/quoteDefaults';
import { EMBEDDED_APPS_SCRIPT_URL } from '../config';

export { parseColorList, resolveColorHex };

export interface AllSheetsData {
  products: Product[] | null;
  companies: CompanyProfile[] | null;
  orders: Order[] | null;
  adminSettings: any | null;
  quoteEnquiries: QuoteEnquiry[] | null;
  catalogProducts: CatalogProduct[] | null;
  portals: OrderPortal[] | null;
}

function parseArrayProp(val: any): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val.map(String);
  const str = String(val).trim();
  if (!str) return undefined;
  if (str.includes(';||;')) return str.split(';||;').map(s => s.trim()).filter(Boolean);
  if (str.includes(',')) return str.split(',').map(s => s.trim()).filter(Boolean);
  return [str];
}

function parseObjectProp(val: any): Record<string, any> | undefined {
  if (!val) return undefined;
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  try {
    return JSON.parse(String(val));
  } catch {
    return undefined;
  }
}

function parseVariantPrices(val: any): Record<string, number> | undefined {
  const parsed = parseObjectProp(val);
  if (!parsed) return undefined;
  const res: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed)) {
    res[k] = Number(v) || 0;
  }
  return res;
}

function parseColorImages(val: any): Record<string, string> | undefined {
  const parsed = parseObjectProp(val);
  if (!parsed) return undefined;
  const res: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    res[k] = String(v);
  }
  return res;
}

function parseColors(val: any): ColorOption[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val as ColorOption[];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map(c => ({ name: c.trim(), hex: '#000000' }));
    }
  }
  return undefined;
}

function parseOrderItems(val: any): OrderItem[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((it: any) => {
      const unitPrice = Number(getProp(it, ['UnitPrice', 'unitPrice', 'Price', 'price']) || 0);
      return {
        productId: String(getProp(it, ['ProductID', 'productId', 'id']) || ''),
        productName: String(getProp(it, ['ProductName', 'productName', 'Name', 'name']) || ''),
        imageUrl: String(getProp(it, ['ImageUrl', 'imageUrl', 'ImageURL', 'imageURL']) || ''),
        quantity: Number(getProp(it, ['Quantity', 'quantity', 'Qty', 'qty']) || 1),
        price: unitPrice,
        unitPrice: unitPrice,
        selectedSize: getProp(it, ['SelectedSize', 'selectedSize', 'Size', 'size']) ? String(getProp(it, ['SelectedSize', 'selectedSize', 'Size', 'size'])) : undefined,
        selectedColor: getProp(it, ['SelectedColor', 'selectedColor', 'Color', 'color']) ? String(getProp(it, ['SelectedColor', 'selectedColor', 'Color', 'color'])) : undefined,
        submitterName: getProp(it, ['SubmitterName', 'submitterName', 'Name', 'CustomerName']) ? String(getProp(it, ['SubmitterName', 'submitterName', 'Name', 'CustomerName'])) : undefined,
        submitterEmail: getProp(it, ['SubmitterEmail', 'submitterEmail', 'Email', 'CustomerEmail']) ? String(getProp(it, ['SubmitterEmail', 'submitterEmail', 'Email', 'CustomerEmail'])) : undefined,
        submitterPhone: getProp(it, ['SubmitterPhone', 'submitterPhone', 'Phone']) ? String(getProp(it, ['SubmitterPhone', 'submitterPhone', 'Phone'])) : undefined
      };
    });
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parseOrderItems(parsed);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Case-insensitive, space-insensitive, typo-tolerant property accessor for Google Sheet JSON objects.
 * Supports a single key string or an array of candidate keys.
 */
function getProp(obj: any, key: string | string[]): any {
  if (!obj) return undefined;
  const keys = Array.isArray(key) ? key : [key];
  const cleanKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // 1. First pass: exact match on normalized alphanumeric key
  for (const k of Object.keys(obj)) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanKeys.includes(cleanK)) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return obj[k];
      }
    }
  }

  // 2. Second pass: typo-tolerant fuzzy matching (e.g. "Decription", "Bae Price", "Contact Peron", "Delivery Addre", "Uername", "Pacode", "Statu")
  const SEMANTIC_KEYWORDS = ['email', 'person', 'number', 'phone', 'address', 'notes', 'price', 'name', 'status', 'portal', 'company', 'passcode', 'username', 'id'];

  for (const k of Object.keys(obj)) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanK) continue;
    const cleanKNoS = cleanK.replace(/s/g, '');

    for (const ck of cleanKeys) {
      if (!ck) continue;
      const ckNoS = ck.replace(/s/g, '');

      if (cleanKNoS === ckNoS) {
        if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
          return obj[k];
        }
      }

      // Semantic conflict check: Do not match if cleanK and ck contain different keywords from SEMANTIC_KEYWORDS
      const cleanKWords = SEMANTIC_KEYWORDS.filter(w => cleanK.includes(w));
      const ckWords = SEMANTIC_KEYWORDS.filter(w => ck.includes(w));
      const hasConflict = cleanKWords.some(w => !ckWords.includes(w)) || ckWords.some(w => !cleanKWords.includes(w));
      if (hasConflict) continue;

      if (levenshteinDistance(cleanK, ck) <= 2) {
        if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
          return obj[k];
        }
      }
    }
  }

  return undefined;
}

function resolveUrl(url?: string): string {
  const cleaned = (url || '').trim();
  return cleaned || EMBEDDED_APPS_SCRIPT_URL;
}

/**
 * Service to handle Google Sheets App Script API connections.
 * It communicates with the user's deployed Google Apps Script.
 */
export const sheetsService = {
  /**
   * Test if the Apps Script URL is valid and responds correctly.
   */
  async testConnection(url: string): Promise<boolean> {
    const cleanedUrl = resolveUrl(url);
    
    try {
      const response = await fetch(`${cleanedUrl}?action=ping`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        return false;
      }
      
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return data && (data.status === 'success' || data.message !== undefined);
      } catch (e) {
        // Sometimes Apps Script returns plain text or HTML on redirection, but responds
        return text.toLowerCase().includes('script') || text.toLowerCase().includes('success') || text.length > 0;
      }
    } catch (error) {
      console.warn('Sheets connection test warning:', error);
      // If it failed due to CORS on GET but reached, we can assume it might still work for POST,
      // but let's be conservative. If we got an error, we return false.
      return false;
    }
  },

  /**
   * Save a new order to Google Sheets.
   */
  async saveOrder(url: string, order: Order): Promise<boolean> {
    if (!url) return false;
    
    const cleanedUrl = url.trim();
    
    try {
      // We use no-cors or standard cors with JSON payload.
      // Apps Script web apps handle POST requests beautifully.
      const payload = {
        action: 'createOrder',
        order: order
      };

      const response = await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors', // standard Apps Script POST redirect can trigger CORS, no-cors works perfectly for simple appends!
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      // With no-cors, the response status is 0, which is normal and indicates success in sending the payload.
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveOrder):', error);
      return false;
    }
  },

  /**
   * Fetch all orders from Google Sheets.
   */
  async fetchOrders(url: string): Promise<Order[] | null> {
    if (!url) return null;
    
    const cleanedUrl = url.trim();
    
    try {
      const response = await fetch(`${cleanedUrl}?action=getOrders`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        return data.map(item => {
          const rawStatus = getProp(item, ['Status', 'status', 'Statu']);
          const portalId = String(getProp(item, ['PortalID', 'Portal ID', 'portalId']) || '');
          const portalName = String(getProp(item, ['PortalName', 'Portal Name', 'portalName']) || '');
          const orderId = String(getProp(item, ['OrderID', 'Order ID', 'id']) || '');
          const isPortalOrder = orderId.startsWith('ord-portal-') || Boolean(portalId) || Boolean(portalName);

          const rawStatusStr = String(rawStatus || '').trim();
          let status: any = rawStatusStr;
          if (!status) {
            status = isPortalOrder ? 'Pending Approval' : 'Pending';
          } else if (status === 'Pending Confirmation' || status === 'Pending Review') {
            status = 'Pending Approval';
          }

          return {
            id: orderId,
            orderNumber: String(getProp(item, ['OrderNumber', 'Order Number', 'orderNumber', 'Order #', 'OrderNo', 'Order No']) || ''),
            companyName: String(getProp(item, ['CompanyName', 'Company Name', 'companyName', 'Company', 'Client', 'Client Name', 'ClientName']) || ''),
            contactEmail: String(getProp(item, ['ContactEmail', 'Contact Email', 'contactEmail', 'Email', 'CustomerEmail', 'SubmitterEmail', 'BuyerEmail', 'CorporateEmail', 'Buyer Corporate Email', 'Customer Email', 'Purchaser Email']) || ''),
            contactPerson: String(getProp(item, ['ContactPerson', 'Contact Person', 'contactPerson', 'ContactPeron', 'CustomerName', 'Customer Name', 'Purchaser', 'Purchaser Name', 'Purchaser / Submitter', 'SubmitterName', 'Submitter Name', 'Submitter', 'Name', 'ShopperName', 'Shopper Name', 'Shopper', 'BuyerName', 'Buyer Name', 'Buyer', 'Customer', 'Ordering Customer']) || ''),
            contactNumber: String(getProp(item, ['ContactNumber', 'Contact Number', 'contactNumber', 'Phone', 'ContactPhone', 'CustomerPhone', 'Mobile', 'ShopperPhone', 'Shopper Phone', 'ContactNo', 'Contact No', 'Phone Number', 'Phone #', 'Mobile Number']) || ''),
            fbMessengerLink: String(getProp(item, ['FBMessengerLink', 'FB Messenger Link', 'fbMessengerLink', 'FacebookMessengerLink', 'FBMessenger', 'Messenger', 'Facebook Messenger Link', 'FB Messenger', 'MessengerLink', 'Messenger Link', 'Facebook Link']) || ''),
            deliveryAddress: String(getProp(item, ['DeliveryAddress', 'Delivery Address', 'deliveryAddress', 'DeliveryAddre', 'Address', 'DeliveryDept', 'Department / Address', 'Address / Dept', 'ShippingAddress', 'StandardAddress', 'Standard Address', 'Delivery Address / Dept', 'Shipping Address', 'Dept / Address', 'Location']) || ''),
            poNumber: String(getProp(item, ['PONumber', 'PO Number', 'poNumber', 'PO / Cost Center', 'PO / Cost Center #', 'POCostCenter', 'PO', 'CostCenter', 'PO #', 'Cost Center']) || ''),
            totalAmount: Number(getProp(item, ['TotalAmount', 'Total Amount', 'totalAmount', 'Amount', 'Total']) || 0),
            status: status,
            createdAt: String(getProp(item, ['CreatedAt', 'Created At', 'createdAt', 'Date', 'SubmittedAt']) || new Date().toISOString()),
            notes: String(getProp(item, ['Notes', 'notes', 'SpecialNotes', 'OrderNotes', 'Special Notes', 'Purchaser Remarks & Notes', 'Remarks', 'Order Notes', 'Comments', 'Note', 'Order Remarks', 'Customer Notes', 'Purchaser Notes']) || ''),
            portalId: portalId,
            portalName: portalName,
            items: (() => {
            const rawItems = getProp(item, ['items', 'Items', 'OrderItems', 'Order Items']);
            if (Array.isArray(rawItems)) {
              return rawItems.map(it => ({
                productId: String(getProp(it, ['ProductID', 'Product ID', 'productId']) || ''),
                productName: String(getProp(it, ['ProductName', 'Product Name', 'productName']) || ''),
                imageUrl: String(getProp(it, ['ImageURL', 'Image URL', 'imageUrl']) || ''),
                quantity: Number(getProp(it, ['Quantity', 'quantity']) || 1),
                price: Number(getProp(it, ['Price', 'price']) || 0),
                selectedSize: String(getProp(it, ['SelectedSize', 'Selected Size', 'selectedSize']) || ''),
                selectedColor: String(getProp(it, ['SelectedColor', 'Selected Color', 'selectedColor']) || ''),
                customDetails: getProp(it, ['CustomDetails', 'Custom Details', 'customDetails'])
              }));
            }
            return [];
          })()
        };
      });
    }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchOrders):', error);
      return null;
    }
  },

  /**
   * Save (create or update) a product in Google Sheets.
   */
  async saveProduct(url: string, product: Product): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveProduct', product })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveProduct):', error);
      return false;
    }
  },

  /**
   * Delete a product from Google Sheets.
   */
  async deleteProduct(url: string, productId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteProduct', productId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteProduct):', error);
      return false;
    }
  },

  /**
   * Save (create or update) a company in Google Sheets.
   */
  async saveCompany(url: string, company: CompanyProfile): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveCompany', company })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveCompany):', error);
      return false;
    }
  },

  /**
   * Delete a company from Google Sheets.
   */
  async deleteCompany(url: string, companyId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteCompany', companyId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteCompany):', error);
      return false;
    }
  },

  /**
   * Update an order status in Google Sheets.
   */
  async updateOrderStatus(url: string, orderId: string, status: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateOrderStatus', orderId, status })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (updateOrderStatus):', error);
      return false;
    }
  },

  /**
   * Delete an order from Google Sheets.
   */
  async deleteOrder(url: string, orderId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteOrder', orderId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteOrder):', error);
      return false;
    }
  },

  /**
   * Fetch all products from Google Sheets.
   */
  async fetchProducts(url: string): Promise<Product[] | null> {
    if (!url) return null;
    const cleanedUrl = url.trim();
    try {
      const response = await fetch(`${cleanedUrl}?action=getProducts`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, 'ProductID') || getProp(item, 'id') || ''),
          name: String(getProp(item, 'Name') || ''),
          category: (getProp(item, 'Category') || 'Uniforms') as any,
          description: String(getProp(item, 'Description') || ''),
          imageUrl: String(getProp(item, 'ImageURL') || getProp(item, 'imageUrl') || ''),
          basePrice: Number(getProp(item, 'BasePrice') || 0),
          originalPrice: getProp(item, 'OriginalPrice') ? Number(getProp(item, 'OriginalPrice')) : undefined,
          minQuantity: Number(getProp(item, 'MinQuantity') || 1),
          unit: String(getProp(item, 'Unit') || 'pcs'),
          sizeOptions: getProp(item, 'SizeOptions') ? String(getProp(item, 'SizeOptions')).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
          colorOptions: getProp(item, 'ColorOptions') ? String(getProp(item, 'ColorOptions')).split(',').map((s: string) => s.trim()).filter(Boolean) : undefined,
          frequentlyOrdered: getProp(item, 'FrequentlyOrdered') === 'TRUE' || getProp(item, 'FrequentlyOrdered') === true,
          shippingFee: getProp(item, 'ShippingFee') !== undefined && getProp(item, 'ShippingFee') !== '' ? Number(getProp(item, 'ShippingFee')) : 0,
          leadTime: (getProp(item, 'LeadTime') || getProp(item, 'leadTime')) ? String(getProp(item, 'LeadTime') || getProp(item, 'leadTime')) : '5-7 Business Days',
          imageUrls: (() => {
            const val = getProp(item, 'ImageURLs') || getProp(item, 'imageUrls');
            if (!val) return undefined;
            const strVal = String(val);
            if (strVal.includes(';||;')) {
              return strVal.split(';||;').map((s: string) => s.trim()).filter(Boolean);
            }
            return strVal.split(',').map((s: string) => s.trim()).filter(Boolean);
          })(),
          customFields: (() => {
            const val = getProp(item, 'CustomFields') || getProp(item, 'customFields');
            if (!val) return undefined;
            try {
              return JSON.parse(String(val));
            } catch (e) {
              console.error('Error parsing custom fields:', e);
              return undefined;
            }
          })(),
          variantPrices: (() => {
            const val = getProp(item, 'VariantPrices') || getProp(item, 'variantPrices');
            if (!val) return undefined;
            try { return typeof val === 'object' ? val : JSON.parse(String(val)); } catch { return undefined; }
          })(),
          colorImages: (() => {
            const val = getProp(item, 'ColorImages') || getProp(item, 'colorImages');
            if (!val) return undefined;
            try { return typeof val === 'object' ? val : JSON.parse(String(val)); } catch { return undefined; }
          })()
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchProducts):', error);
      return null;
    }
  },

  /**
   * Fetch all companies from Google Sheets.
   */
  async fetchCompanies(url: string): Promise<CompanyProfile[] | null> {
    if (!url) return null;
    const cleanedUrl = url.trim();
    try {
      const response = await fetch(`${cleanedUrl}?action=getCompanies`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, 'CompanyID') || getProp(item, 'id') || ''),
          name: String(getProp(item, 'CompanyName') || getProp(item, 'name') || ''),
          contactPerson: String(getProp(item, 'ContactPerson') || getProp(item, 'contactPerson') || ''),
          contactEmail: String(getProp(item, 'ContactEmail') || getProp(item, 'contactEmail') || ''),
          contactPhone: String(getProp(item, 'ContactPhone') || getProp(item, 'contactPhone') || ''),
          deliveryAddress: String(getProp(item, 'DeliveryAddress') || getProp(item, 'deliveryAddress') || ''),
          username: String(getProp(item, 'Username') || getProp(item, 'username') || ''),
          passcode: String(getProp(item, 'Passcode') || getProp(item, 'passcode') || ''),
          poRequired: getProp(item, 'PORequired') === 'TRUE' || getProp(item, 'PORequired') === true || String(getProp(item, 'PORequired')).toUpperCase() === 'TRUE',
          logoUrl: String(getProp(item, 'LogoURL') || getProp(item, 'logoUrl') || ''),
          enabledProductIds: (() => {
            const val = getProp(item, 'ApprovedProducts');
            if (val === undefined || val === null || String(val).trim() === '') {
              return undefined; // undefined means all products enabled by default
            }
            const trimmed = String(val).trim();
            if (trimmed.toUpperCase() === 'NONE') return [];
            return trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
          })(),
          customProducts: (() => {
            const val = getProp(item, 'CustomProducts');
            if (!val) return undefined;
            try {
              return JSON.parse(String(val));
            } catch (e) {
              return undefined;
            }
          })()
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchCompanies):', error);
      return null;
    }
  },

  /**
   * Fetch admin settings from Google Sheets.
   */
  async fetchAdminSettings(url: string): Promise<any | null> {
    if (!url) return null;
    const cleanedUrl = url.trim();
    try {
      const response = await fetch(`${cleanedUrl}?action=getAdminSettings`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const item = await response.json();
      if (item) {
        const hubName = getProp(item, ['HubName', 'Hub Name', 'hubName', 'Hub']) || 'ARH Print Hub';
        const adminUsername = String(getProp(item, ['AdminUsername', 'Admin Username', 'AdminUser', 'Admin User', 'Username', 'User']) || '').trim();
        const adminPasscode = String(getProp(item, ['AdminPasscode', 'Admin Passcode', 'AdminPassword', 'Admin Password', 'Passcode', 'Password', 'Pass']) || '').trim();
        
        return {
          hubName: String(hubName),
          shortHubName: String(getProp(item, ['ShortHubName', 'Short Hub Name', 'shortHubName']) || ''),
          orderPrefix: String(getProp(item, ['OrderPrefix', 'Order Prefix', 'orderPrefix']) || ''),
          currencySymbol: String(getProp(item, ['CurrencySymbol', 'Currency Symbol', 'currencySymbol']) || ''),
          colorTheme: String(getProp(item, ['ColorTheme', 'Color Theme', 'colorTheme']) || 'classic_noir'),
          adminUsername: adminUsername,
          adminPasscode: adminPasscode,
          adminEmail: String(getProp(item, ['AdminEmail', 'Admin Email', 'adminEmail']) || ''),
          logoUrl: String(getProp(item, ['AppLogoURL', 'App Logo URL', 'LogoURL', 'Logo URL', 'logoUrl']) || '')
        };
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchAdminSettings):', error);
      return null;
    }
  },

  /**
   * Save (create or update) admin settings in Google Sheets.
   */
  async saveAdminSettings(url: string, settings: any, adminUser: string, adminPass: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAdminSettings',
          settings,
          adminUsername: adminUser,
          adminPasscode: adminPass
        })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveAdminSettings):', error);
      return false;
    }
  },

  /**
   * Save (create or update) a catalog product (ARH Products) in Google Sheets.
   */
  async saveCatalogProduct(url: string, product: CatalogProduct): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveCatalogProduct', product })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveCatalogProduct):', error);
      return false;
    }
  },

  /**
   * Delete a catalog product from Google Sheets.
   */
  async deleteCatalogProduct(url: string, productId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteCatalogProduct', productId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteCatalogProduct):', error);
      return false;
    }
  },

  /**
   * Fetch catalog products from Google Sheets.
   */
  async fetchCatalogProducts(url: string): Promise<CatalogProduct[] | null> {
    if (!url) return null;
    const cleanedUrl = url.trim();
    try {
      const response = await fetch(`${cleanedUrl}?action=getCatalogProducts`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => {
          const id = String(getProp(item, ['ProductID', 'id', 'Product ID']) || '');
          const sku = String(getProp(item, ['SKU', 'sku', 'Product SKU']) || '');
          const name = String(getProp(item, ['Name', 'name', 'Product Name']) || '');

          // Find initial catalog match if available for fallback enrichment
          const initMatch = INITIAL_CATALOG_PRODUCTS.find(
            p => (id && p.id === id) || (sku && p.sku === sku) || (name && p.name.toLowerCase().trim() === name.toLowerCase().trim())
          );

          let brandingMethods = (() => {
            const val = getProp(item, [
              'BrandingMethods', 'brandingMethods', 'Branding Method', 'BrandingMethod',
              'Branding', 'Branding Methods', 'Branding Options', 'BrandingOption',
              'Branding_Methods', 'Branding_Method', 'Preferred Branding Method'
            ]);
            if (!val) return [];
            if (Array.isArray(val)) return val.map((s: any) => String(s).trim()).filter(Boolean);
            return String(val).split(/[,;/|]/).map((s: string) => s.trim()).filter(Boolean);
          })();

          if (brandingMethods.length === 0 && initMatch?.brandingMethods && initMatch.brandingMethods.length > 0) {
            brandingMethods = [...initMatch.brandingMethods];
          }
          if (brandingMethods.length === 0) {
            brandingMethods = ['Laser Engraving', 'Screen Printing', 'Digital Print'];
          }

          let colors = (() => {
            const val = getProp(item, [
              'Colors', 'colors', 'Colours', 'colours', 'Color', 'Colour',
              'Color Options', 'Colour Options', 'Color_Options', 'Colour_Options', 'ColorOptions', 'ColourOptions'
            ]);
            return parseColorList(val);
          })();

          if (colors.length === 0 && initMatch?.colors && initMatch.colors.length > 0) {
            colors = [...initMatch.colors];
          }
          if (colors.length === 0) {
            colors = [
              { name: 'Onyx Black', hex: '#212121' },
              { name: 'Pure White', hex: '#FFFFFF' },
              { name: 'Navy Blue', hex: '#1B2A4A' }
            ];
          }

          return {
            id: id || `cat-${Date.now().toString().slice(-6)}`,
            sku: sku || initMatch?.sku || '',
            name: name || initMatch?.name || 'Promotional Product',
            category: String(getProp(item, ['Category', 'category', 'Product Category']) || initMatch?.category || 'Apparel'),
            description: String(getProp(item, ['Description', 'description', 'Details']) || initMatch?.description || ''),
            specifications: String(getProp(item, ['Specifications', 'specifications']) || initMatch?.specifications || ''),
            imageUrl: String(getProp(item, ['ImageURL', 'imageUrl', 'Image URL']) || initMatch?.imageUrl || ''),
            imageUrls: (() => {
              const val = getProp(item, ['ImageURLs', 'imageUrls', 'Image URLs']);
              if (!val) return initMatch?.imageUrls;
              const strVal = String(val);
              if (strVal.includes(';||;')) return strVal.split(';||;').map((s: string) => s.trim()).filter(Boolean);
              return strVal.split(',').map((s: string) => s.trim()).filter(Boolean);
            })(),
            moq: Number(getProp(item, ['MOQ', 'moq', 'Min Quantity']) || initMatch?.moq || 50),
            leadTime: String(getProp(item, ['LeadTime', 'leadTime', 'Lead Time']) || initMatch?.leadTime || '7-10 Business Days'),
            brandingMethods,
            colors,
            sizes: (() => {
              const val = getProp(item, ['Sizes', 'sizes', 'Size Options']);
              if (!val) return initMatch?.sizes;
              return String(val).split(',').map((s: string) => s.trim()).filter(Boolean);
            })(),
            variantPrices: (() => {
              const val = getProp(item, ['VariantPrices', 'variantPrices']);
              if (!val) return initMatch?.variantPrices;
              try { return typeof val === 'object' ? val : JSON.parse(String(val)); } catch { return initMatch?.variantPrices; }
            })(),
            colorImages: (() => {
              const val = getProp(item, ['ColorImages', 'colorImages']);
              if (!val) return initMatch?.colorImages;
              try { return typeof val === 'object' ? val : JSON.parse(String(val)); } catch { return initMatch?.colorImages; }
            })(),
            status: (getProp(item, ['Status', 'status']) || initMatch?.status || 'Active') as 'Active' | 'Hidden',
            createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || initMatch?.createdAt || new Date().toISOString())
          };
        });
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchCatalogProducts):', error);
      return null;
    }
  },

  /**
   * Save a quote enquiry to Google Sheets.
   */
  async saveQuoteEnquiry(url: string, enquiry: QuoteEnquiry): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveQuoteEnquiry', enquiry })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveQuoteEnquiry):', error);
      return false;
    }
  },

  /**
   * Fetch all quote enquiries from Google Sheets.
   */
  async fetchQuoteEnquiries(url: string): Promise<QuoteEnquiry[] | null> {
    if (!url) return null;
    const cleanedUrl = url.trim();
    try {
      const response = await fetch(`${cleanedUrl}?action=getQuoteEnquiries`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['EnquiryID', 'id', 'Enquiry ID', 'Quote ID', 'QuoteID']) || ''),
          enquiryNumber: String(getProp(item, ['EnquiryNumber', 'enquiryNumber', 'Enquiry Number', 'Quote Number', 'QuoteNumber']) || ''),
          productId: String(getProp(item, ['ProductID', 'productId', 'Product ID']) || ''),
          productName: String(getProp(item, ['ProductName', 'productName', 'Product Name']) || ''),
          productCategory: String(getProp(item, ['ProductCategory', 'productCategory', 'Product Category']) || ''),
          companyId: String(getProp(item, ['CompanyID', 'companyId', 'Company ID']) || ''),
          companyName: String(getProp(item, ['CompanyName', 'companyName', 'Company Name', 'Company']) || ''),
          contactPerson: String(getProp(item, ['ContactPerson', 'contactPerson', 'Contact Person', 'Person', 'Name']) || ''),
          contactEmail: String(getProp(item, ['ContactEmail', 'contactEmail', 'Contact Email', 'Email']) || ''),
          contactPhone: String(getProp(item, ['ContactPhone', 'contactPhone', 'Contact Phone', 'Phone']) || ''),
          quantity: Number(getProp(item, ['Quantity', 'quantity', 'Qty']) || 1),
          preferredBrandingMethod: String(getProp(item, ['PreferredBrandingMethod', 'preferredBrandingMethod', 'Preferred Branding Method', 'Branding Method', 'Branding']) || ''),
          preferredColor: String(getProp(item, ['PreferredColor', 'preferredColor', 'Preferred Color', 'Color', 'Colour']) || ''),
          preferredSize: String(getProp(item, ['PreferredSize', 'preferredSize', 'Preferred Size', 'Size', 'Variant']) || ''),
          notes: String(getProp(item, ['Notes', 'notes', 'Customization Notes', 'CustomizationNotes', 'Remark', 'Remarks', 'Comments', 'Comment', 'Project Notes', 'Note']) || ''),
          status: (getProp(item, ['Status', 'status']) || 'New') as any,
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At', 'Date']) || new Date().toISOString()),
          quotedUnitPrice: getProp(item, ['QuotedUnitPrice', 'quotedUnitPrice', 'Quoted Unit Price', 'UnitPrice']) ? Number(getProp(item, ['QuotedUnitPrice', 'quotedUnitPrice', 'Quoted Unit Price', 'UnitPrice'])) : undefined,
          quotedTotalPrice: getProp(item, ['QuotedTotalPrice', 'quotedTotalPrice', 'Quoted Total Price', 'TotalPrice', 'Quoted Total']) ? Number(getProp(item, ['QuotedTotalPrice', 'quotedTotalPrice', 'Quoted Total Price', 'TotalPrice', 'Quoted Total'])) : undefined,
          quotedTax: getProp(item, ['QuotedTax', 'quotedTax', 'Quoted Tax', 'Tax']) ? Number(getProp(item, ['QuotedTax', 'quotedTax', 'Quoted Tax', 'Tax'])) : undefined,
          quotedShipping: getProp(item, ['QuotedShipping', 'quotedShipping', 'Quoted Shipping', 'Shipping']) ? Number(getProp(item, ['QuotedShipping', 'quotedShipping', 'Quoted Shipping', 'Shipping'])) : undefined,
          quoteNotes: (() => {
            const val = getProp(item, ['QuoteNotes', 'quoteNotes', 'Quote Notes']);
            if (val && String(val).trim() !== '') return String(val).trim();
            return DEFAULT_QUOTE_NOTES;
          })(),
          quotedValidUntil: String(getProp(item, ['QuotedValidUntil', 'quotedValidUntil', 'Quoted Valid Until', 'Valid Until']) || ''),
          quotedAt: String(getProp(item, ['QuotedAt', 'quotedAt', 'Quoted At']) || ''),
          quotedLineItems: (() => {
            const val = getProp(item, ['QuotedLineItems', 'quotedLineItems', 'Quoted Line Items', 'Line Items']);
            if (!val) return undefined;
            try { return JSON.parse(String(val)); } catch (e) { return undefined; }
          })(),
          requestedProductAddition: (() => {
            const val = getProp(item, ['RequestedProductAddition', 'requestedProductAddition', 'Requested Product Addition']);
            return val === true || String(val).toUpperCase() === 'TRUE';
          })(),
          requestedProductAdditionAt: String(getProp(item, ['RequestedProductAdditionAt', 'requestedProductAdditionAt', 'Requested Product Addition At']) || ''),
          requestedProductNotes: String(getProp(item, ['RequestedProductNotes', 'requestedProductNotes', 'Requested Product Notes']) || '')
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchQuoteEnquiries):', error);
      return null;
    }
  },

  /**
   * Delete a quote enquiry from Google Sheets.
   */
  async deleteQuoteEnquiry(url: string, enquiryId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteQuoteEnquiry', enquiryId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteQuoteEnquiry):', error);
      return false;
    }
  },

  /**
   * Update a quote enquiry status in Google Sheets.
   */
  async updateQuoteEnquiryStatus(url: string, enquiryId: string, status: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateQuoteEnquiryStatus', enquiryId, status })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (updateQuoteEnquiryStatus):', error);
      return false;
    }
  },

  /**
   * Fetch all Order Portals from Google Sheets.
   */
  async fetchPortals(url: string): Promise<OrderPortal[] | null> {
    if (!url) return null;
    const cleanedUrl = url.trim();
    try {
      const response = await fetch(`${cleanedUrl}?action=getPortals`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['PortalID', 'portalId', 'id', 'Portal ID']) || ''),
          companyId: String(getProp(item, ['CompanyID', 'companyId', 'Company ID']) || ''),
          companyName: String(getProp(item, ['CompanyName', 'companyName', 'Company Name', 'Company']) || ''),
          name: String(getProp(item, ['PortalName', 'portalName', 'Portal Name', 'Name', 'name']) || ''),
          description: String(getProp(item, ['Description', 'description']) || ''),
          status: (getProp(item, ['Status', 'status']) || 'Active') as any,
          productIds: (() => {
            const val = getProp(item, ['ProductIDs', 'productIds', 'Product IDs']);
            if (!val) return [];
            const valStr = String(val).trim();
            if (valStr.startsWith('[') && valStr.endsWith(']')) {
              try {
                const parsed = JSON.parse(valStr);
                if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean);
              } catch (e) {}
            }
            return valStr.split(',').map((s: string) => s.trim()).filter(Boolean);
          })(),
          customPrices: (() => {
            const val = getProp(item, ['CustomPrices', 'customPrices', 'Custom Prices', 'Portal Pricing', 'Portal Prices', 'PortalPricing', 'PortalPrices', 'Storefront Display Price', 'StorefrontDisplayPrice']);
            if (!val) return undefined;
            let parsedObj: any = val;
            if (typeof val === 'string') {
              try {
                parsedObj = JSON.parse(val);
              } catch (e) {
                return undefined;
              }
            }
            if (parsedObj && typeof parsedObj === 'object' && !Array.isArray(parsedObj)) {
              const res: Record<string, number> = {};
              for (const [k, v] of Object.entries(parsedObj)) {
                const num = Number(v);
                if (!isNaN(num)) res[k] = num;
              }
              return Object.keys(res).length > 0 ? res : undefined;
            }
            return undefined;
          })(),
          customVariantPrices: (() => {
            const val = getProp(item, ['CustomVariantPrices', 'customVariantPrices', 'Custom Variant Prices', 'Variant Pricing', 'VariantPricing']);
            if (!val) return undefined;
            let parsedObj: any = val;
            if (typeof val === 'string') {
              try {
                parsedObj = JSON.parse(val);
              } catch (e) {
                return undefined;
              }
            }
            if (parsedObj && typeof parsedObj === 'object' && !Array.isArray(parsedObj)) {
              const res: Record<string, Record<string, number>> = {};
              for (const [pId, vObj] of Object.entries(parsedObj)) {
                if (vObj && typeof vObj === 'object') {
                  const inner: Record<string, number> = {};
                  for (const [vKey, vVal] of Object.entries(vObj)) {
                    const num = Number(vVal);
                    if (!isNaN(num)) inner[vKey] = num;
                  }
                  if (Object.keys(inner).length > 0) res[pId] = inner;
                }
              }
              return Object.keys(res).length > 0 ? res : undefined;
            }
            return undefined;
          })(),
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString()),
          shareToken: String(getProp(item, ['ShareToken', 'shareToken', 'Share Token']) || '')
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchPortals):', error);
      return null;
    }
  },

  /**
   * Save an Order Portal to Google Sheets.
   */
  async savePortal(url: string, portal: OrderPortal): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'savePortal', portal })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (savePortal):', error);
      return false;
    }
  },

  /**
   * Delete an Order Portal from Google Sheets.
   */
  async deletePortal(url: string, portalId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePortal', portalId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deletePortal):', error);
      return false;
    }
  },

  /**
   * Single-roundtrip bulk fetch of all database tables from Apps Script for fast sign-in & initial load sync.
   */
  async fetchAllData(url: string): Promise<AllSheetsData | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${cleanedUrl}?action=getAllData`, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) return null;
      const text = await response.text();
      let raw: any;
      try {
        raw = JSON.parse(text);
      } catch {
        return null;
      }
      if (!raw || typeof raw !== 'object' || raw.status === 'error') return null;

      // Extract products
      let products: Product[] | null = null;
      if (Array.isArray(raw.products)) {
        products = raw.products.map((item: any) => ({
          id: String(getProp(item, ['ProductID', 'Product ID', 'id']) || `prod-${Date.now()}`),
          name: String(getProp(item, ['Name', 'ProductName', 'Product Name', 'name']) || ''),
          category: String(getProp(item, ['Category', 'category']) || 'Apparel') as any,
          description: String(getProp(item, ['Description', 'description']) || ''),
          imageUrl: String(getProp(item, ['ImageURL', 'Image URL', 'imageUrl']) || ''),
          imageUrls: (() => {
            const val = getProp(item, ['ImageURLs', 'Image URLs', 'imageUrls']);
            if (Array.isArray(val)) return val.map(String);
            if (typeof val === 'string' && val.trim()) return val.split(';||;').map(s => s.trim()).filter(Boolean);
            return undefined;
          })(),
          basePrice: Number(getProp(item, ['BasePrice', 'Base Price', 'basePrice']) || 0),
          minQuantity: Number(getProp(item, ['MOQ', 'minQuantity', 'MinQuantity']) || 1),
          unit: String(getProp(item, ['Unit', 'unit']) || 'pcs'),
          leadTime: String(getProp(item, ['LeadTime', 'Lead Time', 'leadTime']) || '5-7 Days'),
          sizeOptions: parseArrayProp(getProp(item, ['Sizes', 'sizeOptions', 'SizeOptions'])),
          colorOptions: parseArrayProp(getProp(item, ['Colors', 'colorOptions', 'ColorOptions'])),
          frequentlyOrdered: true
        }));
      }

      // Extract companies
      let companies: CompanyProfile[] | null = null;
      if (Array.isArray(raw.companies)) {
        companies = raw.companies.map((item: any) => ({
          id: String(getProp(item, ['CompanyID', 'Company ID', 'id']) || `co-${Date.now()}`),
          name: String(getProp(item, ['CompanyName', 'Company Name', 'Name', 'name']) || ''),
          logoUrl: String(getProp(item, ['LogoURL', 'Logo URL', 'logoUrl']) || ''),
          contactPerson: String(getProp(item, ['ContactPerson', 'Contact Person', 'contactPerson']) || ''),
          contactEmail: String(getProp(item, ['ContactEmail', 'Contact Email', 'contactEmail']) || ''),
          contactPhone: String(getProp(item, ['ContactPhone', 'Contact Phone', 'contactPhone']) || ''),
          deliveryAddress: String(getProp(item, ['DeliveryAddress', 'Delivery Address', 'deliveryAddress']) || ''),
          assignedPriceLevel: String(getProp(item, ['PriceLevel', 'Price Level', 'assignedPriceLevel']) || 'tier_standard'),
          username: String(getProp(item, ['Username', 'username']) || ''),
          passcode: String(getProp(item, ['Passcode', 'passcode']) || ''),
          poRequired: getProp(item, ['PORequired', 'PO Required']) === 'TRUE' || getProp(item, ['PORequired', 'PO Required']) === true || String(getProp(item, ['PORequired', 'PO Required'])).toUpperCase() === 'TRUE',
          enabledProductIds: (() => {
            const val = getProp(item, ['ApprovedProducts', 'Approved Products', 'enabledProductIds', 'EnabledProductIDs']);
            if (val === undefined || val === null || String(val).trim() === '') return undefined;
            const trimmed = String(val).trim();
            if (trimmed.toUpperCase() === 'NONE') return [];
            return trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
          })(),
          customProducts: (() => {
            const val = getProp(item, ['CustomProducts', 'Custom Products', 'customProducts']);
            if (!val) return undefined;
            try {
              return typeof val === 'string' ? JSON.parse(val) : val;
            } catch (e) {
              return undefined;
            }
          })()
        }));
      }

      // Extract orders
      let orders: Order[] | null = null;
      if (Array.isArray(raw.orders)) {
        orders = raw.orders.map((item: any) => {
          const orderId = String(getProp(item, ['OrderID', 'Order ID', 'id']) || `ord-${Date.now()}`);
          const rawStatus = String(getProp(item, ['Status', 'status']) || 'Pending Approval');
          let status: any = 'Pending Approval';
          if (rawStatus.toLowerCase().includes('approve')) status = 'Approved';
          else if (rawStatus.toLowerCase().includes('reject')) status = 'Rejected';
          else if (rawStatus.toLowerCase().includes('production') || rawStatus.toLowerCase().includes('print')) status = 'In Production';
          else if (rawStatus.toLowerCase().includes('dispatch') || rawStatus.toLowerCase().includes('shipped') || rawStatus.toLowerCase().includes('deliv')) status = 'Dispatched';

          return {
            id: orderId,
            orderNumber: String(getProp(item, ['OrderNumber', 'Order Number', 'orderNumber', 'Order #', 'OrderNo', 'Order No']) || ''),
            companyName: String(getProp(item, ['CompanyName', 'Company Name', 'companyName', 'Company', 'Client', 'Client Name', 'ClientName']) || ''),
            contactEmail: String(getProp(item, ['ContactEmail', 'Contact Email', 'contactEmail', 'Email', 'CustomerEmail', 'SubmitterEmail', 'BuyerEmail', 'CorporateEmail', 'Buyer Corporate Email', 'Customer Email', 'Purchaser Email']) || ''),
            contactPerson: String(getProp(item, ['ContactPerson', 'Contact Person', 'contactPerson', 'ContactPeron', 'CustomerName', 'Customer Name', 'Purchaser', 'Purchaser Name', 'Purchaser / Submitter', 'Purchaser/Submitter', 'Submitter / Purchaser', 'SubmitterName', 'Submitter Name', 'Submitter', 'Name', 'ShopperName', 'Shopper Name', 'Shopper', 'BuyerName', 'Buyer Name', 'Buyer', 'Customer', 'Ordering Customer', 'Purchaser / Customer']) || ''),
            contactNumber: String(getProp(item, ['ContactNumber', 'Contact Number', 'contactNumber', 'Phone', 'ContactPhone', 'CustomerPhone', 'Mobile', 'ShopperPhone', 'Shopper Phone', 'ContactNo', 'Contact No', 'Phone Number', 'Phone #', 'Mobile Number', 'Customer Phone', 'Submitter Phone']) || ''),
            fbMessengerLink: String(getProp(item, ['FBMessengerLink', 'FB Messenger Link', 'fbMessengerLink', 'FacebookMessengerLink', 'FBMessenger', 'Messenger', 'Facebook Messenger Link', 'FB Messenger', 'MessengerLink', 'Messenger Link', 'Facebook Link']) || ''),
            deliveryAddress: String(getProp(item, ['DeliveryAddress', 'Delivery Address', 'deliveryAddress', 'DeliveryAddre', 'Address', 'DeliveryDept', 'Department / Address', 'Address / Dept', 'Address/Dept', 'ShippingAddress', 'StandardAddress', 'Standard Address', 'Delivery Address / Dept', 'Delivery Address/Dept', 'Shipping Address', 'Dept / Address', 'Dept/Address', 'Department', 'Location']) || ''),
            poNumber: String(getProp(item, ['PONumber', 'PO Number', 'poNumber', 'PO / Cost Center', 'PO / Cost Center #', 'POCostCenter', 'PO', 'CostCenter', 'PO #', 'Cost Center', 'CostCenter#']) || ''),
            totalAmount: Number(getProp(item, ['TotalAmount', 'Total Amount', 'totalAmount', 'Amount', 'Total']) || 0),
            status: status,
            createdAt: String(getProp(item, ['CreatedAt', 'Created At', 'createdAt', 'Date', 'SubmittedAt']) || new Date().toISOString()),
            notes: String(getProp(item, ['Notes', 'notes', 'SpecialNotes', 'OrderNotes', 'Special Notes', 'Purchaser Remarks & Notes', 'Purchaser Remarks and Notes', 'Remarks', 'Order Notes', 'Comments', 'Note', 'Order Remarks', 'Customer Notes', 'Purchaser Notes', 'Special Instructions', 'Instructions']) || ''),
            portalId: String(getProp(item, ['PortalID', 'Portal ID', 'portalId']) || ''),
            portalName: String(getProp(item, ['PortalName', 'Portal Name', 'portalName']) || ''),
            items: parseOrderItems(getProp(item, 'items') || getProp(item, 'Items') || getProp(item, 'OrderItems') || getProp(item, 'orderItems'))
          };
        });
      }

      // Extract admin settings
      let adminSettings: any | null = null;
      if (raw.adminSettings && typeof raw.adminSettings === 'object') {
        const item = raw.adminSettings;
        adminSettings = {
          hubName: getProp(item, 'HubName') || getProp(item, 'hubName'),
          shortHubName: getProp(item, 'ShortHubName') || getProp(item, 'shortHubName'),
          orderPrefix: getProp(item, 'OrderPrefix') || getProp(item, 'orderPrefix'),
          currencySymbol: getProp(item, 'CurrencySymbol') || getProp(item, 'currencySymbol'),
          colorTheme: getProp(item, 'ColorTheme') || getProp(item, 'colorTheme'),
          adminEmail: getProp(item, 'AdminEmail') || getProp(item, 'adminEmail'),
          logoUrl: getProp(item, 'LogoURL') || getProp(item, 'logoUrl'),
          adminUsername: getProp(item, 'AdminUsername') || getProp(item, 'adminUsername'),
          adminPasscode: getProp(item, 'AdminPasscode') || getProp(item, 'adminPasscode')
        };
      }

      // Extract quote enquiries
      let quoteEnquiries: QuoteEnquiry[] | null = null;
      if (Array.isArray(raw.quotes)) {
        quoteEnquiries = raw.quotes.map((item: any) => ({
          id: String(getProp(item, 'EnquiryID') || getProp(item, 'id') || `quote-${Date.now()}`),
          companyName: String(getProp(item, 'CompanyName') || getProp(item, 'companyName') || ''),
          contactPerson: String(getProp(item, 'ContactPerson') || getProp(item, 'contactPerson') || ''),
          contactEmail: String(getProp(item, 'ContactEmail') || getProp(item, 'contactEmail') || ''),
          contactNumber: String(getProp(item, 'ContactNumber') || getProp(item, 'contactNumber') || ''),
          productName: String(getProp(item, 'ProductName') || getProp(item, 'productName') || ''),
          quantity: Number(getProp(item, 'Quantity') || getProp(item, 'quantity') || 1),
          specs: String(getProp(item, 'Specs') || getProp(item, 'specs') || ''),
          status: String(getProp(item, 'Status') || getProp(item, 'status') || 'New Quote Request') as any,
          createdAt: String(getProp(item, 'CreatedAt') || getProp(item, 'createdAt') || new Date().toISOString()),
          quotedUnitPrice: getProp(item, 'QuotedUnitPrice') ? Number(getProp(item, 'QuotedUnitPrice')) : undefined,
          quoteNotes: String(getProp(item, 'QuoteNotes') || getProp(item, 'quoteNotes') || ''),
          companyId: getProp(item, 'CompanyID') ? String(getProp(item, 'CompanyID')) : undefined
        }));
      }

      // Extract catalog products
      let catalogProducts: CatalogProduct[] | null = null;
      if (Array.isArray(raw.catalogProducts)) {
        catalogProducts = raw.catalogProducts.map((item: any) => ({
          id: String(getProp(item, 'ProductID') || getProp(item, 'id') || `cat-${Date.now()}`),
          name: String(getProp(item, 'Name') || getProp(item, 'name') || 'Unnamed Catalog Item'),
          category: String(getProp(item, 'Category') || getProp(item, 'category') || 'Apparel'),
          description: String(getProp(item, 'Description') || getProp(item, 'description') || ''),
          specifications: String(getProp(item, 'Specifications') || getProp(item, 'specifications') || ''),
          imageUrl: String(getProp(item, 'ImageURL') || getProp(item, 'imageUrl') || ''),
          imageUrls: (() => {
            const val = getProp(item, ['ImageURLs', 'imageUrls', 'Image URLs']);
            if (Array.isArray(val)) return val.map(String);
            if (typeof val === 'string' && val.trim()) return val.split(';||;').map(s => s.trim()).filter(Boolean);
            return undefined;
          })(),
          moq: Number(getProp(item, 'MOQ') || getProp(item, 'moq') || 10),
          brandingMethods: parseArrayProp(getProp(item, 'BrandingMethods') || getProp(item, 'brandingMethods')),
          colors: parseColors(getProp(item, 'Colors') || getProp(item, 'colors')),
          sizes: parseArrayProp(getProp(item, 'Sizes') || getProp(item, 'sizes')),
          variantPrices: parseVariantPrices(getProp(item, 'VariantPrices') || getProp(item, 'variantPrices')),
          colorImages: parseColorImages(getProp(item, 'ColorImages') || getProp(item, 'colorImages')),
          status: String(getProp(item, 'Status') || getProp(item, 'status') || 'Active') as any,
          createdAt: String(getProp(item, 'CreatedAt') || getProp(item, 'createdAt') || new Date().toISOString())
        }));
      }

      // Extract portals
      let portals: OrderPortal[] | null = null;
      if (Array.isArray(raw.portals)) {
        portals = raw.portals.map((item: any) => ({
          id: String(getProp(item, 'PortalID') || getProp(item, 'id') || `portal-${Date.now()}`),
          token: String(getProp(item, 'Token') || getProp(item, 'token') || ''),
          title: String(getProp(item, 'Title') || getProp(item, 'title') || 'Ordering Portal'),
          companyId: String(getProp(item, 'CompanyID') || getProp(item, 'companyId') || ''),
          companyName: String(getProp(item, 'CompanyName') || getProp(item, 'companyName') || ''),
          productIds: parseArrayProp(getProp(item, 'ProductIDs') || getProp(item, 'productIds')),
          customPrices: parseObjectProp(getProp(item, 'CustomPrices') || getProp(item, 'customPrices')),
          customVariantPrices: parseObjectProp(getProp(item, 'CustomVariantPrices') || getProp(item, 'customVariantPrices')),
          active: String(getProp(item, 'Active') || getProp(item, 'active') || 'true') !== 'false',
          createdAt: String(getProp(item, 'CreatedAt') || getProp(item, 'createdAt') || new Date().toISOString()),
          bannerImageUrl: getProp(item, 'BannerImageUrl') ? String(getProp(item, 'BannerImageUrl')) : undefined,
          welcomeMessage: getProp(item, 'WelcomeMessage') ? String(getProp(item, 'WelcomeMessage')) : undefined
        }));
      }

      return {
        products,
        companies,
        orders,
        adminSettings,
        quoteEnquiries,
        catalogProducts,
        portals
      };
    } catch (err) {
      console.warn('Google Sheets fetchAllData notice:', err);
      return null;
    }
  }
};
