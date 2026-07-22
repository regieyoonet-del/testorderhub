/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Product, CompanyProfile } from '../types';

/**
 * Case-insensitive, space-insensitive property accessor for Google Sheet JSON objects.
 */
function getProp(obj: any, key: string): any {
  if (!obj) return undefined;
  const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const k of Object.keys(obj)) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanK === cleanKey) {
      return obj[k];
    }
  }
  return undefined;
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
    if (!url) return false;
    
    // Clean up the URL
    const cleanedUrl = url.trim();
    
    try {
      const response = await fetch(`${cleanedUrl}?action=ping`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
      console.error('Error saving order to Google Sheets:', error);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        return data as Order[];
      }
      return null;
    } catch (error) {
      console.error('Error fetching orders from Google Sheets:', error);
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
      console.error('Error saving product to Google Sheets:', error);
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
      console.error('Error deleting product from Google Sheets:', error);
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
      console.error('Error saving company to Google Sheets:', error);
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
      console.error('Error deleting company from Google Sheets:', error);
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
      console.error('Error updating order status in Google Sheets:', error);
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
      console.error('Error deleting order from Google Sheets:', error);
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
          })()
        }));
      }
      return null;
    } catch (error) {
      console.error('Error fetching products from Google Sheets:', error);
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
      console.error('Error fetching companies from Google Sheets:', error);
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
        const hubName = getProp(item, 'HubName') || getProp(item, 'Hub Name');
        if (hubName) {
          return {
            hubName: String(hubName),
            shortHubName: String(getProp(item, 'ShortHubName') || getProp(item, 'Short Hub Name') || ''),
            orderPrefix: String(getProp(item, 'OrderPrefix') || getProp(item, 'Order Prefix') || ''),
            currencySymbol: String(getProp(item, 'CurrencySymbol') || getProp(item, 'Currency Symbol') || ''),
            colorTheme: String(getProp(item, 'ColorTheme') || getProp(item, 'Color Theme') || 'classic_noir'),
            adminUsername: String(getProp(item, 'AdminUsername') || getProp(item, 'Admin Username') || 'admin'),
            adminPasscode: String(getProp(item, 'AdminPasscode') || getProp(item, 'Admin Passcode') || '1234'),
            adminEmail: String(getProp(item, 'AdminEmail') || getProp(item, 'Admin Email') || ''),
            logoUrl: String(getProp(item, 'AppLogoURL') || getProp(item, 'App Logo URL') || getProp(item, 'LogoURL') || getProp(item, 'Logo URL') || '')
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching admin settings from Google Sheets:', error);
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
      console.error('Error saving admin settings to Google Sheets:', error);
      return false;
    }
  }
};
