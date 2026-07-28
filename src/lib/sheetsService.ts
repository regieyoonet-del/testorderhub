/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Product, CompanyProfile, CatalogProduct, QuoteEnquiry, ColorOption, OrderPortal } from '../types';
import { INITIAL_CATALOG_PRODUCTS } from '../data/initialCatalog';
import { parseColorList, resolveColorHex } from '../utils/colorUtils';
import { DEFAULT_QUOTE_NOTES } from '../constants/quoteDefaults';

export { parseColorList, resolveColorHex };

/**
 * Case-insensitive, space-insensitive property accessor for Google Sheet JSON objects.
 * Supports a single key string or an array of candidate keys.
 */
function getProp(obj: any, key: string | string[]): any {
  if (!obj) return undefined;
  const keys = Array.isArray(key) ? key : [key];
  const cleanKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

  for (const k of Object.keys(obj)) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanKeys.includes(cleanK)) {
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
            adminUsername: String(getProp(item, 'AdminUsername') || getProp(item, 'Admin Username') || ''),
            adminPasscode: String(getProp(item, 'AdminPasscode') || getProp(item, 'Admin Passcode') || ''),
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
      console.error('Error saving catalog product to Google Sheets:', error);
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
      console.error('Error deleting catalog product from Google Sheets:', error);
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
            status: (getProp(item, ['Status', 'status']) || initMatch?.status || 'Active') as 'Active' | 'Hidden',
            createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || initMatch?.createdAt || new Date().toISOString())
          };
        });
      }
      return null;
    } catch (error) {
      console.error('Error fetching catalog products from Google Sheets:', error);
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
      console.error('Error saving quote enquiry to Google Sheets:', error);
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
      console.error('Error fetching quote enquiries from Google Sheets:', error);
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
      console.error('Error deleting quote enquiry from Google Sheets:', error);
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
      console.error('Error updating quote status in Google Sheets:', error);
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
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString()),
          shareToken: String(getProp(item, ['ShareToken', 'shareToken', 'Share Token']) || '')
        }));
      }
      return null;
    } catch (error) {
      console.error('Error fetching portals from Google Sheets:', error);
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
      console.error('Error saving portal to Google Sheets:', error);
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
      console.error('Error deleting portal from Google Sheets:', error);
      return false;
    }
  }
};
