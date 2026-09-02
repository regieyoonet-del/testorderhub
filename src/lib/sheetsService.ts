/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Product, CompanyProfile, CatalogProduct, QuoteEnquiry, ColorOption, OrderPortal, OrderItem, AppNotification, Job, JobColumn, JobItem, JobItemColumn, JobActivity, JobComment, StaffMember, StaffAccount, AttendanceRecord, PayrollRecord, ExpenseRecord, ExpenseCategory, RecurringExpenseRule } from '../types';
import { INITIAL_CATALOG_PRODUCTS } from '../data/initialCatalog';
import { parseColorList, resolveColorHex } from '../utils/colorUtils';
import { normalizeAttendanceDate, cleanClockOut, cleanClockIn, calculateHoursWorked } from '../utils/attendanceUtils';
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
  notifications: AppNotification[] | null;
  jobs: Job[] | null;
  jobColumns: JobColumn[] | null;
  jobItems: JobItem[] | null;
  jobItemColumns: JobItemColumn[] | null;
  jobActivities: JobActivity[] | null;
  jobComments: JobComment[] | null;
  staff: StaffMember[] | null;
  staffAccounts: StaffAccount[] | null;
  attendance: AttendanceRecord[] | null;
  payroll: PayrollRecord[] | null;
  expenses: ExpenseRecord[] | null;
  expenseCategories: ExpenseCategory[] | null;
  recurringExpenses: RecurringExpenseRule[] | null;
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
        selectedAddOns: (() => {
          const val = getProp(it, ['SelectedAddOns', 'selectedAddOns', 'Selected Add-Ons', 'AddOns', 'addOns']);
          if (!val) return undefined;
          try { return typeof val === 'object' ? val : JSON.parse(String(val)); } catch { return undefined; }
        })(),
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

function parseJobItems(val: any): JobItem[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((it: any, idx: number) => ({
      id: String(getProp(it, ['id', 'ItemID', 'itemId']) || `item-${Date.now()}-${idx}`),
      jobId: String(getProp(it, ['jobId', 'JobID', 'job_id']) || ''),
      position: Number(getProp(it, ['position', 'Position']) || idx),
      values: parseObjectProp(getProp(it, ['values', 'Values', 'ValuesJSON'])) || (typeof it.values === 'object' ? it.values : {}),
      createdAt: String(getProp(it, ['createdAt', 'CreatedAt', 'Created Date']) || new Date().toISOString()),
      updatedAt: String(getProp(it, ['updatedAt', 'UpdatedAt', 'Updated Date']) || new Date().toISOString())
    }));
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parseJobItems(parsed);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function parseJobActivities(val: any): JobActivity[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((it: any, idx: number) => ({
      id: String(getProp(it, ['id', 'ActivityID', 'activityId']) || `act-${Date.now()}-${idx}`),
      jobId: String(getProp(it, ['jobId', 'JobID', 'job_id']) || ''),
      user: String(getProp(it, ['user', 'User', 'UserName']) || 'Admin'),
      action: String(getProp(it, ['action', 'Action']) || ''),
      oldValue: getProp(it, ['oldValue', 'OldValue', 'Old Value']) ? String(getProp(it, ['oldValue', 'OldValue', 'Old Value'])) : undefined,
      newValue: getProp(it, ['newValue', 'NewValue', 'New Value']) ? String(getProp(it, ['newValue', 'NewValue', 'New Value'])) : undefined,
      timestamp: String(getProp(it, ['timestamp', 'Timestamp', 'Date']) || new Date().toISOString())
    }));
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parseJobActivities(parsed);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function parseJobComments(val: any): JobComment[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((it: any, idx: number) => ({
      id: String(getProp(it, ['id', 'CommentID', 'commentId', 'Comment ID']) || `cmt-${Date.now()}-${idx}`),
      jobId: String(getProp(it, ['jobId', 'JobID', 'job_id', 'Job ID']) || ''),
      userId: String(getProp(it, ['userId', 'UserID', 'staffId', 'Staff ID', 'User ID']) || 'admin'),
      userName: String(getProp(it, ['userName', 'UserName', 'Name', 'User Name', 'user']) || 'Admin'),
      comment: String(getProp(it, ['comment', 'Comment', 'text', 'Text', 'message']) || ''),
      createdAt: String(getProp(it, ['createdAt', 'CreatedAt', 'Timestamp', 'Created Date', 'Created At']) || new Date().toISOString()),
      updatedAt: getProp(it, ['updatedAt', 'UpdatedAt', 'Updated At']) ? String(getProp(it, ['updatedAt', 'UpdatedAt', 'Updated At'])) : undefined
    })).filter(c => Boolean(c.comment && c.comment.trim() !== ''));
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parseJobComments(parsed);
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
  const objKeys = Object.keys(obj);

  // 1. First pass: exact match on normalized alphanumeric key in candidate key priority order
  for (const ck of keys) {
    if (!ck) continue;
    const cleanCk = ck.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanCk) continue;

    for (const k of objKeys) {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanK === cleanCk) {
        if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
          return obj[k];
        }
      }
    }
  }

  // 2. Second pass: typo-tolerant fuzzy matching in candidate key priority order
  const SEMANTIC_KEYWORDS = ['email', 'person', 'number', 'phone', 'address', 'notes', 'price', 'name', 'status', 'portal', 'company', 'passcode', 'username', 'id'];

  for (const ck of keys) {
    if (!ck) continue;
    const cleanCk = ck.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanCk) continue;
    const cleanCkNoS = cleanCk.replace(/s/g, '');

    for (const k of objKeys) {
      const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!cleanK) continue;
      const cleanKNoS = cleanK.replace(/s/g, '');

      if (cleanKNoS === cleanCkNoS) {
        if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
          return obj[k];
        }
      }

      // Semantic conflict check: Do not match if cleanK and cleanCk contain different keywords from SEMANTIC_KEYWORDS
      const cleanKWords = SEMANTIC_KEYWORDS.filter(w => cleanK.includes(w));
      const ckWords = SEMANTIC_KEYWORDS.filter(w => cleanCk.includes(w));
      const hasConflict = cleanKWords.some(w => !ckWords.includes(w)) || ckWords.some(w => !cleanKWords.includes(w));
      if (hasConflict) continue;

      if (levenshteinDistance(cleanK, cleanCk) <= 2) {
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
            contactPerson: String(getProp(item, ['ContactPerson', 'Contact Person', 'contactPerson', 'ContactPeron', 'CustomerName', 'Customer Name', "Customer's Name", 'Customers Name', 'Customer', 'Purchaser', 'Purchaser Name', 'Purchaser / Submitter', 'SubmitterName', 'Submitter Name', 'Submitter', 'Name', 'ShopperName', 'Shopper Name', 'Shopper', 'BuyerName', 'Buyer Name', 'Buyer', 'Ordering Customer', 'Ordering Person', 'Client Name', 'Client Contact']) || ''),
            contactNumber: String(getProp(item, ['ContactNumber', 'Contact Number', 'contactNumber', 'Contact', 'Phone', 'ContactPhone', 'CustomerPhone', 'Mobile', 'ShopperPhone', 'Shopper Phone', 'ContactNo', 'Contact No', 'Phone Number', 'Phone #', 'Mobile Number']) || ''),
            fbMessengerLink: String(getProp(item, ['FBMessengerLink', 'FB Messenger Link', 'fbMessengerLink', 'FacebookMessengerLink', 'FBMessenger', 'Messenger', 'Facebook Messenger Link', 'FB Messenger', 'MessengerLink', 'Messenger Link', 'Facebook Link', 'FB Link', 'Facebook', 'Messenger Profile', 'FB Messenger Profile', 'Customer Messenger', 'Customer FB Messenger', 'Facebook/Messenger Link', 'Messenger URL', 'FB Messenger URL']) || ''),
            deliveryAddress: String(getProp(item, ['DeliveryAddress', 'Delivery Address', 'deliveryAddress', 'DeliveryAddre', 'Customer Address', "Customer's Address", 'Customers Address', 'Address', 'Shipping Address', 'ShippingAddress', 'DeliveryDept', 'Department / Address', 'Address / Dept', 'StandardAddress', 'Standard Address', 'Delivery Address / Dept', 'Dept / Address', 'Location', 'Full Address', 'Destination Address']) || ''),
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
                selectedAddOns: (() => {
                  const val = getProp(it, ['SelectedAddOns', 'selectedAddOns', 'Selected Add-Ons', 'AddOns', 'addOns']);
                  if (!val) return undefined;
                  try { return typeof val === 'object' ? val : JSON.parse(String(val)); } catch { return undefined; }
                })(),
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
          })(),
          addOns: (() => {
            const val = getProp(item, ['AddOns', 'addOns', 'ADDONS', 'add_ons', 'Add-Ons', 'Add-ons']);
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
          logoUrl: String(getProp(item, ['AppLogoURL', 'App Logo URL', 'LogoURL', 'Logo URL', 'logoUrl']) || ''),
          faviconUrl: String(getProp(item, ['AppFaviconURL', 'App Favicon URL', 'FaviconURL', 'Favicon URL', 'faviconUrl', 'Favicon', 'favicon']) || ''),
          companyTagline: String(getProp(item, ['CompanyTagline', 'Company Tagline', 'companyTagline', 'Tagline', 'tagline']) || ''),
          companyAddress: String(getProp(item, ['CompanyAddress', 'Company Address', 'companyAddress', 'Address', 'address']) || ''),
          taxId: String(getProp(item, ['TaxTINID', 'Tax TIN ID', 'TaxId', 'Tax ID', 'taxId', 'TIN', 'tinNumber', 'tin']) || '')
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
          customAddOnPrices: (() => {
            const val = getProp(item, ['CustomAddOnPrices', 'customAddOnPrices', 'Custom Add-On Prices', 'Add-On Pricing', 'AddOnPricing', 'Add-on Pricing']);
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
              for (const [pId, aObj] of Object.entries(parsedObj)) {
                if (aObj && typeof aObj === 'object') {
                  const inner: Record<string, number> = {};
                  for (const [aKey, aVal] of Object.entries(aObj)) {
                    const num = Number(aVal);
                    if (!isNaN(num)) inner[aKey] = num;
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
   * Fetch all notifications from Google Sheets.
   */
  async fetchNotifications(url: string): Promise<AppNotification[] | null> {
    if (!url) return null;
    const cleanedUrl = url.trim();
    try {
      const response = await fetch(`${cleanedUrl}?action=getNotifications`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['NotificationID', 'id', 'Notification ID', 'NotificationId']) || `notif-${Date.now()}`),
          recipientType: (getProp(item, ['RecipientType', 'recipientType', 'Recipient Type']) || 'admin') as any,
          companyName: getProp(item, ['CompanyName', 'companyName', 'Company Name']) ? String(getProp(item, ['CompanyName', 'companyName', 'Company Name'])) : undefined,
          title: String(getProp(item, ['Title', 'title']) || 'Notification'),
          message: String(getProp(item, ['Message', 'message']) || ''),
          timestamp: String(getProp(item, ['Timestamp', 'timestamp']) || new Date().toISOString()),
          read: String(getProp(item, ['Read', 'read'])).toLowerCase() === 'true' || getProp(item, ['Read', 'read']) === true,
          orderId: getProp(item, ['OrderID', 'orderId', 'Order ID']) ? String(getProp(item, ['OrderID', 'orderId', 'Order ID'])) : undefined,
          orderNumber: getProp(item, ['OrderNumber', 'orderNumber', 'Order Number']) ? String(getProp(item, ['OrderNumber', 'orderNumber', 'Order Number'])) : undefined,
          type: (getProp(item, ['Type', 'type']) || 'new_storefront_order') as any,
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchNotifications):', error);
      return null;
    }
  },

  /**
   * Save a single notification to Google Sheets.
   */
  async saveNotification(url: string, notification: AppNotification): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveNotification', notification })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveNotification):', error);
      return false;
    }
  },

  /**
   * Save multiple notifications to Google Sheets.
   */
  async saveNotifications(url: string, notifications: AppNotification[]): Promise<boolean> {
    if (!url || !notifications || notifications.length === 0) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveNotifications', notifications })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveNotifications):', error);
      return false;
    }
  },

  /**
   * Mark a notification as read in Google Sheets.
   */
  async markNotificationRead(url: string, notifId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markNotificationRead', notifId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (markNotificationRead):', error);
      return false;
    }
  },

  /**
   * Clear all notifications in Google Sheets.
   */
  async clearNotifications(url: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = url.trim();
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearNotifications' })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (clearNotifications):', error);
      return false;
    }
  },

  /**
   * Fetch all Jobs from Google Sheets.
   */
  async fetchJobs(url: string): Promise<Job[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getJobs`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['JobID', 'jobId', 'id', 'Job ID']) || ''),
          companyId: getProp(item, ['CompanyID', 'companyId', 'Company ID']) ? String(getProp(item, ['CompanyID', 'companyId', 'Company ID'])) : undefined,
          companyName: String(getProp(item, ['CompanyName', 'companyName', 'Company Name']) || ''),
          orderId: getProp(item, ['OrderID', 'orderId', 'Order ID']) ? String(getProp(item, ['OrderID', 'orderId', 'Order ID'])) : undefined,
          orderNumber: getProp(item, ['OrderNumber', 'orderNumber', 'Order Number']) ? String(getProp(item, ['OrderNumber', 'orderNumber', 'Order Number'])) : undefined,
          source: (getProp(item, ['Source', 'source']) || 'Manual') as any,
          status: (getProp(item, ['Status', 'status']) || 'Pending') as any,
          position: Number(getProp(item, ['Position', 'position']) || 0),
          values: parseObjectProp(getProp(item, ['ValuesJSON', 'values', 'Values', 'valuesJSON'])) || {},
          items: parseJobItems(getProp(item, ['ItemsJSON', 'items', 'Items'])),
          activities: parseJobActivities(getProp(item, ['ActivitiesJSON', 'activities', 'Activities'])),
          comments: parseJobComments(getProp(item, ['CommentsJSON', 'comments', 'Comments', 'Comments JSON', 'commentsJSON'])),
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created Date', 'CreatedDate']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated Date', 'UpdatedDate']) || new Date().toISOString()),
          createdBy: getProp(item, ['CreatedBy', 'createdBy', 'Created By']) ? String(getProp(item, ['CreatedBy', 'createdBy', 'Created By'])) : 'Admin'
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchJobs):', error);
      return null;
    }
  },

  /**
   * Fetch Job Comments from Google Sheets.
   */
  async fetchJobComments(url: string, jobId?: string): Promise<JobComment[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const q = jobId ? `&jobId=${encodeURIComponent(jobId)}` : '';
      const response = await fetch(`${cleanedUrl}?action=getJobComments${q}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return parseJobComments(rawData);
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchJobComments):', error);
      return null;
    }
  },

  /**
   * Save a single Job Comment to Google Sheets.
   */
  async saveJobComment(url: string, comment: JobComment): Promise<boolean> {
    if (!url || !comment) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobComment', comment })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobComment):', error);
      return false;
    }
  },

  /**
   * Batch save Job Comments to Google Sheets.
   */
  async saveJobCommentsBatch(url: string, comments: JobComment[]): Promise<boolean> {
    if (!url || !Array.isArray(comments)) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobCommentsBatch', comments })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobCommentsBatch):', error);
      return false;
    }
  },

  /**
   * Delete a Job Comment from Google Sheets.
   */
  async deleteJobComment(url: string, commentId: string): Promise<boolean> {
    if (!url || !commentId) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteJobComment', commentId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteJobComment):', error);
      return false;
    }
  },

  /**
   * Save a Job to Google Sheets.
   */
  async saveJob(url: string, job: Job): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJob', job })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJob):', error);
      return false;
    }
  },

  /**
   * Batch save multiple Jobs to Google Sheets.
   */
  async saveJobsBatch(url: string, jobs: Job[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobsBatch', jobs })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobsBatch):', error);
      return false;
    }
  },

  /**
   * Delete a Job from Google Sheets.
   */
  async deleteJob(url: string, jobId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteJob', jobId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteJob):', error);
      return false;
    }
  },

  /**
   * Update Job Status in Google Sheets.
   */
  async updateJobStatus(url: string, jobId: string, status: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateJobStatus', jobId, status })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (updateJobStatus):', error);
      return false;
    }
  },

  /**
   * Fetch Job Columns from Google Sheets.
   */
  async fetchJobColumns(url: string): Promise<JobColumn[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getJobColumns`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        const mapped = rawData.map(item => ({
          id: String(getProp(item, ['ColumnID', 'columnId', 'id', 'Column ID']) || ''),
          name: String(getProp(item, ['Name', 'name', 'Column Name', 'ColumnName']) || ''),
          type: (getProp(item, ['Type', 'type', 'Field Type', 'FieldType']) || 'text') as any,
          position: Number(getProp(item, ['Position', 'position']) || 0),
          required: String(getProp(item, ['Required', 'required'])).toLowerCase() === 'true' || getProp(item, ['Required', 'required']) === true,
          isSystemField: String(getProp(item, ['IsSystemField', 'isSystemField', 'Is System Field'])).toLowerCase() === 'true' || getProp(item, ['IsSystemField', 'isSystemField']) === true,
          isHidden: String(getProp(item, ['IsHidden', 'isHidden', 'Is Hidden'])).toLowerCase() === 'true' || getProp(item, ['IsHidden', 'isHidden']) === true,
          options: parseArrayProp(getProp(item, ['Options', 'options', 'OptionsJSON'])),
          createdDate: String(getProp(item, ['CreatedDate', 'createdDate', 'Created Date']) || new Date().toISOString())
        })).filter(col => Boolean(col.id));

        // Deduplicate keeping latest occurrence per unique Column ID
        const uniqueMap = new Map<string, JobColumn>();
        for (const col of mapped) {
          uniqueMap.set(col.id, col);
        }
        return Array.from(uniqueMap.values());
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchJobColumns):', error);
      return null;
    }
  },

  /**
   * Save Job Columns to Google Sheets.
   */
  async saveJobColumns(url: string, columns: JobColumn[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      // Deduplicate before sending
      const uniqueMap = new Map<string, JobColumn>();
      for (const col of (columns || [])) {
        if (col && col.id) {
          uniqueMap.set(col.id, col);
        }
      }
      const deduped = Array.from(uniqueMap.values());

      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobColumns', columns: deduped })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobColumns):', error);
      return false;
    }
  },

  /**
   * Fetch Job Item Columns from Google Sheets.
   */
  async fetchJobItemColumns(url: string): Promise<JobItemColumn[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getJobItemColumns`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        const mapped = rawData.map(item => ({
          id: String(getProp(item, ['ColumnID', 'columnId', 'id', 'Column ID']) || ''),
          name: String(getProp(item, ['Name', 'name', 'Column Name', 'ColumnName']) || ''),
          type: (getProp(item, ['Type', 'type', 'Field Type', 'FieldType']) || 'text') as any,
          position: Number(getProp(item, ['Position', 'position']) || 0),
          required: String(getProp(item, ['Required', 'required'])).toLowerCase() === 'true' || getProp(item, ['Required', 'required']) === true,
          isSystemField: String(getProp(item, ['IsSystemField', 'isSystemField', 'Is System Field'])).toLowerCase() === 'true' || getProp(item, ['IsSystemField', 'isSystemField']) === true,
          isHidden: String(getProp(item, ['IsHidden', 'isHidden', 'Is Hidden'])).toLowerCase() === 'true' || getProp(item, ['IsHidden', 'isHidden']) === true,
          calculation: getProp(item, ['Calculation', 'calculation']) ? String(getProp(item, ['Calculation', 'calculation'])) : undefined,
          options: parseArrayProp(getProp(item, ['Options', 'options', 'OptionsJSON']))
        })).filter(col => Boolean(col.id));

        // Deduplicate keeping latest occurrence per unique Column ID
        const uniqueMap = new Map<string, JobItemColumn>();
        for (const col of mapped) {
          uniqueMap.set(col.id, col);
        }
        return Array.from(uniqueMap.values());
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchJobItemColumns):', error);
      return null;
    }
  },

  /**
   * Save Job Item Columns to Google Sheets.
   */
  async saveJobItemColumns(url: string, columns: JobItemColumn[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      // Deduplicate before sending
      const uniqueMap = new Map<string, JobItemColumn>();
      for (const col of (columns || [])) {
        if (col && col.id) {
          uniqueMap.set(col.id, col);
        }
      }
      const deduped = Array.from(uniqueMap.values());

      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobItemColumns', columns: deduped })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobItemColumns):', error);
      return false;
    }
  },

  /**
   * One-time cleanup of historical duplicate column rows in Google Sheets.
   */
  async cleanDuplicateColumns(url: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanDuplicateColumns' })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (cleanDuplicateColumns):', error);
      return false;
    }
  },

  /**
   * Fetch Job Items from Google Sheets.
   */
  async fetchJobItems(url: string): Promise<JobItem[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getJobItems`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['ItemID', 'itemId', 'id', 'Item ID']) || ''),
          jobId: String(getProp(item, ['JobID', 'jobId', 'Job ID']) || ''),
          position: Number(getProp(item, ['Position', 'position']) || 0),
          values: parseObjectProp(getProp(item, ['ValuesJSON', 'values', 'Values', 'valuesJSON'])) || {},
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created Date']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated Date']) || new Date().toISOString())
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchJobItems):', error);
      return null;
    }
  },

  /**
   * Save Job Item to Google Sheets.
   */
  async saveJobItem(url: string, item: JobItem): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobItem', item })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobItem):', error);
      return false;
    }
  },

  /**
   * Batch save Job Items to Google Sheets.
   */
  async saveJobItemsBatch(url: string, items: JobItem[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobItemsBatch', items })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobItemsBatch):', error);
      return false;
    }
  },

  /**
   * Delete Job Item from Google Sheets.
   */
  async deleteJobItem(url: string, itemId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteJobItem', itemId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteJobItem):', error);
      return false;
    }
  },

  /**
   * Fetch Job Activities from Google Sheets.
   */
  async fetchJobActivities(url: string): Promise<JobActivity[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getJobActivities`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['ActivityID', 'activityId', 'id', 'Activity ID']) || ''),
          jobId: String(getProp(item, ['JobID', 'jobId', 'Job ID']) || ''),
          user: String(getProp(item, ['User', 'user', 'UserName', 'CreatedBy']) || 'Admin'),
          action: String(getProp(item, ['Action', 'action']) || ''),
          oldValue: getProp(item, ['OldValue', 'oldValue', 'Old Value']) ? String(getProp(item, ['OldValue', 'oldValue', 'Old Value'])) : undefined,
          newValue: getProp(item, ['NewValue', 'newValue', 'New Value']) ? String(getProp(item, ['NewValue', 'newValue', 'New Value'])) : undefined,
          timestamp: String(getProp(item, ['Timestamp', 'timestamp', 'Date']) || new Date().toISOString())
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchJobActivities):', error);
      return null;
    }
  },

  /**
   * Save Job Activity to Google Sheets.
   */
  async saveJobActivity(url: string, activity: JobActivity): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveJobActivity', activity })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveJobActivity):', error);
      return false;
    }
  },

  // ----------------------------------------------------
  // STAFF MANAGEMENT SYNC METHODS
  // ----------------------------------------------------

  /**
   * Fetch Staff members from Google Sheets.
   */
  async fetchStaff(url: string): Promise<StaffMember[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getStaff`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['StaffID', 'staffId', 'id', 'Staff ID']) || `STF-${Date.now()}`),
          fullName: String(getProp(item, ['FullName', 'fullName', 'Name', 'name', 'Full Name']) || ''),
          position: String(getProp(item, ['Position', 'position', 'Role', 'role']) || ''),
          department: String(getProp(item, ['Department', 'department', 'Dept']) || 'General'),
          employmentStatus: String(getProp(item, ['EmploymentStatus', 'employmentStatus', 'StatusType', 'Employment Status']) || 'Full-Time'),
          dateStarted: String(getProp(item, ['DateStarted', 'dateStarted', 'StartDate', 'Date Started']) || new Date().toISOString().split('T')[0]),
          salaryType: (getProp(item, ['SalaryType', 'salaryType', 'Salary Type', 'PayType']) || 'Monthly') as any,
          basicSalary: Number(getProp(item, ['BasicSalary', 'basicSalary', 'Basic Salary', 'Rate', 'Salary']) || 0),
          allowances: Number(getProp(item, ['Allowances', 'allowances', 'Allowance']) || 0),
          otherCompensation: Number(getProp(item, ['OtherCompensation', 'otherCompensation', 'Other Compensation', 'Bonuses']) || 0),
          notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
          status: (getProp(item, ['Status', 'status']) || 'Active') as any,
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchStaff):', error);
      return null;
    }
  },

  /**
   * Save a single Staff member to Google Sheets.
   */
  async saveStaff(url: string, staff: StaffMember): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveStaff', staff })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveStaff):', error);
      return false;
    }
  },

  /**
   * Save a batch of Staff members to Google Sheets.
   */
  async saveStaffBatch(url: string, staffMembers: StaffMember[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveStaffBatch', staffMembers })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveStaffBatch):', error);
      return false;
    }
  },

  /**
   * Delete a Staff member from Google Sheets.
   */
  async deleteStaff(url: string, staffId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteStaff', staffId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteStaff):', error);
      return false;
    }
  },

  // ----------------------------------------------------
  // STAFF ACCOUNTS / AUTH SYNC METHODS
  // ----------------------------------------------------

  /**
   * Fetch Staff Accounts from Google Sheets.
   */
  async fetchStaffAccounts(url: string): Promise<StaffAccount[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getStaffAccounts`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['AccountID', 'accountId', 'id', 'Account ID', 'SA_ID']) || `SA-${Date.now()}`),
          staffId: String(getProp(item, ['StaffID', 'staffId', 'Staff ID', 'STF_ID']) || ''),
          name: String(getProp(item, ['Name', 'name', 'FullName', 'fullName', 'StaffName']) || ''),
          username: String(getProp(item, ['Username', 'username', 'User', 'Email']) || '').trim().toLowerCase(),
          passcode: String(getProp(item, ['Passcode', 'passcode', 'Password', 'password', 'Pin']) || ''),
          role: (getProp(item, ['Role', 'role']) || 'Staff') as any,
          status: (getProp(item, ['Status', 'status']) || 'Active') as any,
          mustChangePassword: getProp(item, ['MustChangePassword', 'mustChangePassword', 'RequirePasswordChange', 'requirePasswordChange']) === true || String(getProp(item, ['MustChangePassword', 'mustChangePassword'])).toLowerCase() === 'true',
          temporaryPassword: getProp(item, ['TemporaryPassword', 'temporaryPassword']) ? String(getProp(item, ['TemporaryPassword', 'temporaryPassword'])) : undefined,
          email: getProp(item, ['Email', 'email']) ? String(getProp(item, ['Email', 'email'])) : undefined,
          phone: getProp(item, ['Phone', 'phone', 'ContactNumber']) ? String(getProp(item, ['Phone', 'phone', 'ContactNumber'])) : undefined,
          avatarUrl: getProp(item, ['AvatarURL', 'avatarUrl', 'ProfileImage']) ? String(getProp(item, ['AvatarURL', 'avatarUrl', 'ProfileImage'])) : undefined,
          lastLogin: getProp(item, ['LastLogin', 'lastLogin']) ? String(getProp(item, ['LastLogin', 'lastLogin'])) : undefined,
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchStaffAccounts):', error);
      return null;
    }
  },

  /**
   * Save a single Staff Account to Google Sheets.
   */
  async saveStaffAccount(url: string, account: StaffAccount): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveStaffAccount', account })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveStaffAccount):', error);
      return false;
    }
  },

  /**
   * Batch save Staff Accounts to Google Sheets.
   */
  async saveStaffAccountsBatch(url: string, accounts: StaffAccount[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveStaffAccountsBatch', accounts })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveStaffAccountsBatch):', error);
      return false;
    }
  },

  /**
   * Delete a Staff Account from Google Sheets.
   */
  async deleteStaffAccount(url: string, accountId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteStaffAccount', accountId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteStaffAccount):', error);
      return false;
    }
  },

  // ----------------------------------------------------
  // ATTENDANCE & TIME TRACKING SYNC METHODS
  // ----------------------------------------------------

  /**
   * Fetch Attendance records from Google Sheets.
   */
  async fetchAttendance(url: string): Promise<AttendanceRecord[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getAttendance`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => {
          const rawCreated = getProp(item, ['CreatedAt', 'createdAt', 'Created At']);
          const rawUpdated = getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']);
          const rawDate = getProp(item, ['Date', 'date', 'WorkDate', 'AttendanceDate']);
          const fallbackFromCreated = rawCreated ? normalizeAttendanceDate(rawCreated, '') : '';
          const normalizedDate = normalizeAttendanceDate(rawDate, fallbackFromCreated || undefined);
          const sId = String(getProp(item, ['StaffID', 'staffId', 'Staff ID']) || '').trim();
          const clockIn = cleanClockIn(getProp(item, ['ClockIn', 'clockIn', 'TimeIn', 'Clock In']));
          const clockOut = cleanClockOut(getProp(item, ['ClockOut', 'clockOut', 'TimeOut', 'Clock Out']));
          let totalHours = Number(getProp(item, ['TotalHours', 'totalHours', 'HoursWorked', 'Total Hours', 'Hours']) || 0);
          if ((!totalHours || totalHours <= 0) && clockIn && clockOut) {
            totalHours = calculateHoursWorked(clockIn, clockOut, normalizedDate);
          }

          return {
            id: String(getProp(item, ['AttendanceID', 'attendanceId', 'id', 'Attendance ID']) || (sId ? `ATT-${sId}-${normalizedDate}` : `ATT-${Date.now()}`)),
            staffId: sId,
            staffName: String(getProp(item, ['StaffName', 'staffName', 'Staff Name', 'Name']) || ''),
            date: normalizedDate,
            clockIn,
            clockOut,
            totalHours,
            status: (getProp(item, ['Status', 'status']) || 'Present') as any,
            notes: getProp(item, ['Notes', 'notes', 'Remarks']) ? String(getProp(item, ['Notes', 'notes', 'Remarks'])) : undefined,
            createdAt: rawCreated ? String(rawCreated) : undefined,
            updatedAt: rawUpdated ? String(rawUpdated) : (rawCreated ? String(rawCreated) : undefined)
          };
        });
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchAttendance):', error);
      return null;
    }
  },

  /**
   * Save a single Attendance record to Google Sheets.
   */
  async saveAttendance(url: string, record: AttendanceRecord): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveAttendance', record })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveAttendance):', error);
      return false;
    }
  },

  /**
   * Batch save Attendance records to Google Sheets.
   */
  async saveAttendanceBatch(url: string, records: AttendanceRecord[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveAttendanceBatch', records })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveAttendanceBatch):', error);
      return false;
    }
  },

  /**
   * Delete an Attendance record from Google Sheets.
   */
  async deleteAttendance(url: string, attendanceId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAttendance', attendanceId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteAttendance):', error);
      return false;
    }
  },

  // ----------------------------------------------------
  // PAYROLL SYNC METHODS
  // ----------------------------------------------------

  /**
   * Fetch Payroll records from Google Sheets.
   */
  async fetchPayroll(url: string): Promise<PayrollRecord[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getPayroll`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => {
          const itemizedDeductions = parseObjectProp(getProp(item, ['ItemizedDeductionsJSON', 'itemizedDeductions', 'Itemized Deductions JSON', 'Itemized Deductions']));
          return {
            id: String(getProp(item, ['PayrollID', 'payrollId', 'id', 'Payroll ID']) || `PR-${Date.now()}`),
            staffId: String(getProp(item, ['StaffID', 'staffId', 'Staff ID']) || ''),
            staffName: String(getProp(item, ['StaffName', 'staffName', 'Staff Name', 'EmployeeName']) || ''),
            position: getProp(item, ['Position', 'position']) ? String(getProp(item, ['Position', 'position'])) : undefined,
            department: getProp(item, ['Department', 'department']) ? String(getProp(item, ['Department', 'department'])) : undefined,
            payPeriodStart: String(getProp(item, ['PayPeriodStart', 'payPeriodStart', 'Pay Period Start', 'PeriodStart']) || ''),
            payPeriodEnd: String(getProp(item, ['PayPeriodEnd', 'payPeriodEnd', 'Pay Period End', 'PeriodEnd']) || ''),
            payDate: String(getProp(item, ['PayDate', 'payDate', 'Pay Date', 'Date']) || ''),
            salaryType: getProp(item, ['SalaryType', 'salaryType', 'Salary Type', 'PayType']) ? (getProp(item, ['SalaryType', 'salaryType', 'Salary Type', 'PayType']) as any) : undefined,
            rateSnapshot: getProp(item, ['RateSnapshot', 'rateSnapshot', 'Rate Snapshot', 'Rate']) !== undefined ? Number(getProp(item, ['RateSnapshot', 'rateSnapshot', 'Rate Snapshot', 'Rate'])) : undefined,
            daysWorked: getProp(item, ['DaysWorked', 'daysWorked', 'Days Worked', 'Days']) !== undefined ? Number(getProp(item, ['DaysWorked', 'daysWorked', 'Days Worked', 'Days'])) : undefined,
            hoursWorked: getProp(item, ['HoursWorked', 'hoursWorked', 'Hours Worked', 'Hours']) !== undefined ? Number(getProp(item, ['HoursWorked', 'hoursWorked', 'Hours Worked', 'Hours'])) : undefined,
            basicPay: Number(getProp(item, ['BasicPay', 'basicPay', 'Basic Pay', 'BasicSalary']) || 0),
            allowances: Number(getProp(item, ['Allowances', 'allowances', 'Allowance']) || 0),
            otherEarnings: Number(getProp(item, ['OtherEarnings', 'otherEarnings', 'Other Earnings', 'Bonuses', 'Overtime']) || 0),
            grossPay: Number(getProp(item, ['GrossPay', 'grossPay', 'Gross Pay']) || 0),
            deductions: Number(getProp(item, ['Deductions', 'deductions', 'Total Deductions', 'totalDeductions']) || 0),
            itemizedDeductions: Array.isArray(itemizedDeductions) ? itemizedDeductions : undefined,
            totalDeductions: Number(getProp(item, ['TotalDeductions', 'totalDeductions', 'Total Deductions', 'deductions']) || 0),
            netPay: Number(getProp(item, ['NetPay', 'netPay', 'Net Pay']) || 0),
            status: (getProp(item, ['Status', 'status']) || 'Draft') as any,
            notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
            createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
            updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
          };
        });
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchPayroll):', error);
      return null;
    }
  },

  /**
   * Save a single Payroll record to Google Sheets.
   */
  async savePayroll(url: string, record: PayrollRecord): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'savePayroll', record })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (savePayroll):', error);
      return false;
    }
  },

  /**
   * Batch save Payroll records to Google Sheets.
   */
  async savePayrollBatch(url: string, records: PayrollRecord[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'savePayrollBatch', records })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (savePayrollBatch):', error);
      return false;
    }
  },

  /**
   * Delete a Payroll record from Google Sheets.
   */
  async deletePayroll(url: string, payrollId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePayroll', payrollId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deletePayroll):', error);
      return false;
    }
  },

  // ----------------------------------------------------
  // EXPENSES & RECURRING EXPENSES SYNC METHODS
  // ----------------------------------------------------

  /**
   * Fetch Actual Expenses from Google Sheets.
   */
  async fetchExpenses(url: string): Promise<ExpenseRecord[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getExpenses`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['ExpenseID', 'expenseId', 'id', 'Expense ID']) || `EXP-${Date.now()}`),
          name: String(getProp(item, ['ExpenseName', 'expenseName', 'Name', 'name', 'Expense Name', 'Description']) || ''),
          category: String(getProp(item, ['Category', 'category']) || 'Miscellaneous'),
          type: (getProp(item, ['ExpenseType', 'expenseType', 'Type', 'type', 'Expense Type']) || 'Variable') as any,
          amount: Number(getProp(item, ['Amount', 'amount', 'Cost', 'Total']) || 0),
          date: String(getProp(item, ['ExpenseDate', 'expenseDate', 'Date', 'date', 'Expense Date']) || new Date().toISOString().split('T')[0]),
          status: (getProp(item, ['PaymentStatus', 'paymentStatus', 'Status', 'status', 'Payment Status']) || 'Pending') as any,
          paymentDate: getProp(item, ['PaymentDate', 'paymentDate', 'Payment Date']) ? String(getProp(item, ['PaymentDate', 'paymentDate', 'Payment Date'])) : undefined,
          vendor: getProp(item, ['Vendor', 'vendor', 'Payee', 'payee', 'Supplier']) ? String(getProp(item, ['Vendor', 'vendor', 'Payee', 'payee', 'Supplier'])) : undefined,
          referenceNumber: getProp(item, ['ReferenceNumber', 'referenceNumber', 'Ref #', 'Reference Number', 'ReceiptNo', 'InvoiceNo']) ? String(getProp(item, ['ReferenceNumber', 'referenceNumber', 'Ref #', 'Reference Number', 'ReceiptNo', 'InvoiceNo'])) : undefined,
          notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
          recurringExpenseId: getProp(item, ['RecurringExpenseID', 'recurringExpenseId', 'Recurring Expense ID']) ? String(getProp(item, ['RecurringExpenseID', 'recurringExpenseId', 'Recurring Expense ID'])) : undefined,
          payrollId: getProp(item, ['PayrollID', 'payrollId', 'Payroll ID']) ? String(getProp(item, ['PayrollID', 'payrollId', 'Payroll ID'])) : undefined,
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchExpenses):', error);
      return null;
    }
  },

  /**
   * Save a single Expense record to Google Sheets.
   */
  async saveExpense(url: string, expense: ExpenseRecord): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveExpense', expense })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveExpense):', error);
      return false;
    }
  },

  /**
   * Save batch of Expense records to Google Sheets.
   */
  async saveExpensesBatch(url: string, expenses: ExpenseRecord[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveExpensesBatch', expenses })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveExpensesBatch):', error);
      return false;
    }
  },

  /**
   * Delete an Expense record from Google Sheets.
   */
  async deleteExpense(url: string, expenseId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteExpense', expenseId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteExpense):', error);
      return false;
    }
  },

  /**
   * Fetch Expense Categories from Google Sheets.
   */
  async fetchExpenseCategories(url: string): Promise<ExpenseCategory[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getExpenseCategories`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => ({
          id: String(getProp(item, ['CategoryID', 'categoryId', 'id', 'Category ID']) || `cat-${Date.now()}`),
          name: String(getProp(item, ['Name', 'name', 'CategoryName', 'Category Name']) || ''),
          isSystem: String(getProp(item, ['IsSystem', 'isSystem', 'Is System'])).toLowerCase() === 'true' || getProp(item, ['IsSystem', 'isSystem']) === true,
          status: (getProp(item, ['Status', 'status']) || 'Active') as any
        }));
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchExpenseCategories):', error);
      return null;
    }
  },

  /**
   * Save Expense Categories to Google Sheets.
   */
  async saveExpenseCategories(url: string, categories: ExpenseCategory[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveExpenseCategories', categories })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveExpenseCategories):', error);
      return false;
    }
  },

  /**
   * Fetch Recurring Expense Rules from Google Sheets.
   */
  async fetchRecurringExpenses(url: string): Promise<RecurringExpenseRule[] | null> {
    if (!url) return null;
    const cleanedUrl = resolveUrl(url);
    try {
      const response = await fetch(`${cleanedUrl}?action=getRecurringExpenses`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) return null;
      const rawData = await response.json();
      if (Array.isArray(rawData)) {
        return rawData.map(item => {
          const rawMonths = getProp(item, ['SpecificMonthsJSON', 'specificMonths', 'Specific Months', 'MonthsJSON']);
          let specificMonths: number[] | undefined = undefined;
          if (Array.isArray(rawMonths)) {
            specificMonths = rawMonths.map(Number).filter(n => !isNaN(n));
          } else if (typeof rawMonths === 'string') {
            try {
              const parsed = JSON.parse(rawMonths);
              if (Array.isArray(parsed)) specificMonths = parsed.map(Number).filter(n => !isNaN(n));
            } catch {
              specificMonths = rawMonths.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
            }
          }

          return {
            id: String(getProp(item, ['RecurringExpenseID', 'recurringExpenseId', 'id', 'Recurring Expense ID']) || `REC-EXP-${Date.now()}`),
            name: String(getProp(item, ['ExpenseName', 'expenseName', 'Name', 'name', 'Expense Name', 'Description']) || ''),
            category: String(getProp(item, ['Category', 'category']) || 'Miscellaneous'),
            amount: Number(getProp(item, ['Amount', 'amount', 'Cost']) || 0),
            frequency: (getProp(item, ['Frequency', 'frequency']) || 'Monthly') as any,
            startDate: String(getProp(item, ['StartDate', 'startDate', 'Start Date']) || new Date().toISOString().split('T')[0]),
            endDate: getProp(item, ['EndDate', 'endDate', 'End Date']) ? String(getProp(item, ['EndDate', 'endDate', 'End Date'])) : undefined,
            paymentsPerYear: Number(getProp(item, ['PaymentsPerYear', 'paymentsPerYear', 'Payments Per Year']) || 12),
            specificMonths,
            status: (getProp(item, ['Status', 'status']) || 'Active') as any,
            notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
            createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
            updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
          };
        });
      }
      return null;
    } catch (error) {
      console.warn('Google Sheets sync notice (fetchRecurringExpenses):', error);
      return null;
    }
  },

  /**
   * Save a single Recurring Expense Rule to Google Sheets.
   */
  async saveRecurringExpense(url: string, rule: RecurringExpenseRule): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveRecurringExpense', rule })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveRecurringExpense):', error);
      return false;
    }
  },

  /**
   * Save batch of Recurring Expense Rules to Google Sheets.
   */
  async saveRecurringExpensesBatch(url: string, rules: RecurringExpenseRule[]): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveRecurringExpensesBatch', rules })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (saveRecurringExpensesBatch):', error);
      return false;
    }
  },

  /**
   * Delete a Recurring Expense Rule from Google Sheets.
   */
  async deleteRecurringExpense(url: string, ruleId: string): Promise<boolean> {
    if (!url) return false;
    const cleanedUrl = resolveUrl(url);
    try {
      await fetch(cleanedUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteRecurringExpense', ruleId })
      });
      return true;
    } catch (error) {
      console.warn('Google Sheets sync notice (deleteRecurringExpense):', error);
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
      const timeoutId = setTimeout(() => controller.abort(), 7000);

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
          frequentlyOrdered: true,
          addOns: (() => {
            const val = getProp(item, ['AddOns', 'addOns', 'ADDONS', 'add_ons', 'Add-Ons', 'Add-ons']);
            if (!val) return undefined;
            try { return typeof val === 'object' ? val : JSON.parse(String(val)); } catch { return undefined; }
          })()
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
          const rawStatus = getProp(item, ['Status', 'status', 'Statu']);
          const portalId = String(getProp(item, ['PortalID', 'Portal ID', 'portalId']) || '');
          const portalName = String(getProp(item, ['PortalName', 'Portal Name', 'portalName']) || '');
          const orderId = String(getProp(item, ['OrderID', 'Order ID', 'id']) || `ord-${Date.now()}`);
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
            contactPerson: String(getProp(item, ['ContactPerson', 'Contact Person', 'contactPerson', 'ContactPeron', 'CustomerName', 'Customer Name', "Customer's Name", 'Customers Name', 'Customer', 'Purchaser', 'Purchaser Name', 'Purchaser / Submitter', 'SubmitterName', 'Submitter Name', 'Submitter', 'Name', 'ShopperName', 'Shopper Name', 'Shopper', 'BuyerName', 'Buyer Name', 'Buyer', 'Ordering Customer', 'Ordering Person', 'Client Name', 'Client Contact']) || ''),
            contactNumber: String(getProp(item, ['ContactNumber', 'Contact Number', 'contactNumber', 'Contact', 'Phone', 'ContactPhone', 'CustomerPhone', 'Mobile', 'ShopperPhone', 'Shopper Phone', 'ContactNo', 'Contact No', 'Phone Number', 'Phone #', 'Mobile Number']) || ''),
            fbMessengerLink: String(getProp(item, ['FBMessengerLink', 'FB Messenger Link', 'fbMessengerLink', 'FacebookMessengerLink', 'FBMessenger', 'Messenger', 'Facebook Messenger Link', 'FB Messenger', 'MessengerLink', 'Messenger Link', 'Facebook Link', 'FB Link', 'Facebook', 'Messenger Profile', 'FB Messenger Profile', 'Customer Messenger', 'Customer FB Messenger', 'Facebook/Messenger Link', 'Messenger URL', 'FB Messenger URL']) || ''),
            deliveryAddress: String(getProp(item, ['DeliveryAddress', 'Delivery Address', 'deliveryAddress', 'DeliveryAddre', 'Customer Address', "Customer's Address", 'Customers Address', 'Address', 'Shipping Address', 'ShippingAddress', 'DeliveryDept', 'Department / Address', 'Address / Dept', 'StandardAddress', 'Standard Address', 'Delivery Address / Dept', 'Dept / Address', 'Location', 'Full Address', 'Destination Address']) || ''),
            poNumber: String(getProp(item, ['PONumber', 'PO Number', 'poNumber', 'PO / Cost Center', 'PO / Cost Center #', 'POCostCenter', 'PO', 'CostCenter', 'PO #', 'Cost Center']) || ''),
            totalAmount: Number(getProp(item, ['TotalAmount', 'Total Amount', 'totalAmount', 'Amount', 'Total']) || 0),
            status: status,
            createdAt: String(getProp(item, ['CreatedAt', 'Created At', 'createdAt', 'Date', 'SubmittedAt']) || new Date().toISOString()),
            notes: String(getProp(item, ['Notes', 'notes', 'SpecialNotes', 'OrderNotes', 'Special Notes', 'Purchaser Remarks & Notes', 'Remarks', 'Order Notes', 'Comments', 'Note', 'Order Remarks', 'Customer Notes', 'Purchaser Notes']) || ''),
            portalId: String(getProp(item, ['PortalID', 'Portal ID', 'portalId']) || ''),
            portalName: String(getProp(item, ['PortalName', 'Portal Name', 'portalName']) || ''),
            items: parseOrderItems(getProp(item, 'items') || getProp(item, 'Items') || getProp(item, 'OrderItems'))
          };
        });
      }

      // Extract admin settings
      let adminSettings: any | null = null;
      if (raw.adminSettings && typeof raw.adminSettings === 'object') {
        const item = raw.adminSettings;
        adminSettings = {
          hubName: getProp(item, ['HubName', 'Hub Name', 'hubName', 'Hub']),
          shortHubName: getProp(item, ['ShortHubName', 'Short Hub Name', 'shortHubName']),
          orderPrefix: getProp(item, ['OrderPrefix', 'Order Prefix', 'orderPrefix']),
          currencySymbol: getProp(item, ['CurrencySymbol', 'Currency Symbol', 'currencySymbol']),
          colorTheme: getProp(item, ['ColorTheme', 'Color Theme', 'colorTheme']),
          adminEmail: getProp(item, ['AdminEmail', 'Admin Email', 'adminEmail']),
          logoUrl: getProp(item, ['AppLogoURL', 'App Logo URL', 'LogoURL', 'Logo URL', 'logoUrl']),
          faviconUrl: getProp(item, ['AppFaviconURL', 'App Favicon URL', 'FaviconURL', 'Favicon URL', 'faviconUrl', 'Favicon', 'favicon']),
          adminUsername: getProp(item, ['AdminUsername', 'Admin Username', 'adminUsername']),
          adminPasscode: getProp(item, ['AdminPasscode', 'Admin Passcode', 'adminPasscode']),
          companyTagline: getProp(item, ['CompanyTagline', 'Company Tagline', 'companyTagline', 'Tagline', 'tagline']),
          companyAddress: getProp(item, ['CompanyAddress', 'Company Address', 'companyAddress', 'Address', 'address']),
          taxId: getProp(item, ['TaxTINID', 'Tax TIN ID', 'TaxId', 'Tax ID', 'taxId', 'TIN', 'tinNumber', 'tin'])
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

      // Extract notifications
      let notifications: AppNotification[] | null = null;
      if (Array.isArray(raw.notifications)) {
        notifications = raw.notifications.map((item: any) => ({
          id: String(getProp(item, ['NotificationID', 'id', 'Notification ID', 'NotificationId']) || `notif-${Date.now()}`),
          recipientType: (getProp(item, ['RecipientType', 'recipientType', 'Recipient Type']) || 'admin') as any,
          companyName: getProp(item, ['CompanyName', 'companyName', 'Company Name']) ? String(getProp(item, ['CompanyName', 'companyName', 'Company Name'])) : undefined,
          title: String(getProp(item, ['Title', 'title']) || 'Notification'),
          message: String(getProp(item, ['Message', 'message']) || ''),
          timestamp: String(getProp(item, ['Timestamp', 'timestamp']) || new Date().toISOString()),
          read: String(getProp(item, ['Read', 'read'])).toLowerCase() === 'true' || getProp(item, ['Read', 'read']) === true,
          orderId: getProp(item, ['OrderID', 'orderId', 'Order ID']) ? String(getProp(item, ['OrderID', 'orderId', 'Order ID'])) : undefined,
          orderNumber: getProp(item, ['OrderNumber', 'orderNumber', 'Order Number']) ? String(getProp(item, ['OrderNumber', 'orderNumber', 'Order Number'])) : undefined,
          type: (getProp(item, ['Type', 'type']) || 'new_storefront_order') as any
        }));
      }

      // Extract Jobs
      let jobs: Job[] | null = null;
      if (Array.isArray(raw.jobs)) {
        jobs = raw.jobs.map((item: any) => ({
          id: String(getProp(item, ['JobID', 'jobId', 'id', 'Job ID']) || `JOB-${Date.now()}`),
          companyId: getProp(item, ['CompanyID', 'companyId', 'Company ID']) ? String(getProp(item, ['CompanyID', 'companyId', 'Company ID'])) : undefined,
          companyName: String(getProp(item, ['CompanyName', 'companyName', 'Company Name']) || ''),
          orderId: getProp(item, ['OrderID', 'orderId', 'Order ID']) ? String(getProp(item, ['OrderID', 'orderId', 'Order ID'])) : undefined,
          orderNumber: getProp(item, ['OrderNumber', 'orderNumber', 'Order Number']) ? String(getProp(item, ['OrderNumber', 'orderNumber', 'Order Number'])) : undefined,
          source: (getProp(item, ['Source', 'source']) || 'Manual') as any,
          status: (getProp(item, ['Status', 'status']) || 'Pending') as any,
          position: Number(getProp(item, ['Position', 'position']) || 0),
          values: parseObjectProp(getProp(item, ['ValuesJSON', 'values', 'Values', 'valuesJSON'])) || {},
          items: parseJobItems(getProp(item, ['ItemsJSON', 'items', 'Items'])),
          activities: parseJobActivities(getProp(item, ['ActivitiesJSON', 'activities', 'Activities'])),
          comments: parseJobComments(getProp(item, ['CommentsJSON', 'comments', 'Comments', 'Comments JSON', 'commentsJSON'])),
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created Date', 'CreatedDate']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated Date', 'UpdatedDate']) || new Date().toISOString()),
          createdBy: getProp(item, ['CreatedBy', 'createdBy', 'Created By']) ? String(getProp(item, ['CreatedBy', 'createdBy', 'Created By'])) : 'Admin'
        }));
      }

      // Extract Job Columns
      let jobColumns: JobColumn[] | null = null;
      if (Array.isArray(raw.jobColumns)) {
        jobColumns = raw.jobColumns.map((item: any) => ({
          id: String(getProp(item, ['ColumnID', 'columnId', 'id', 'Column ID']) || ''),
          name: String(getProp(item, ['Name', 'name', 'Column Name', 'ColumnName']) || ''),
          type: (getProp(item, ['Type', 'type', 'Field Type', 'FieldType']) || 'text') as any,
          position: Number(getProp(item, ['Position', 'position']) || 0),
          required: String(getProp(item, ['Required', 'required'])).toLowerCase() === 'true' || getProp(item, ['Required', 'required']) === true,
          isSystemField: String(getProp(item, ['IsSystemField', 'isSystemField', 'Is System Field'])).toLowerCase() === 'true' || getProp(item, ['IsSystemField', 'isSystemField']) === true,
          isHidden: String(getProp(item, ['IsHidden', 'isHidden', 'Is Hidden'])).toLowerCase() === 'true' || getProp(item, ['IsHidden', 'isHidden']) === true,
          options: parseArrayProp(getProp(item, ['Options', 'options', 'OptionsJSON'])),
          createdDate: String(getProp(item, ['CreatedDate', 'createdDate', 'Created Date']) || new Date().toISOString())
        }));
      }

      // Extract Job Item Columns
      let jobItemColumns: JobItemColumn[] | null = null;
      if (Array.isArray(raw.jobItemColumns)) {
        jobItemColumns = raw.jobItemColumns.map((item: any) => ({
          id: String(getProp(item, ['ColumnID', 'columnId', 'id', 'Column ID']) || ''),
          name: String(getProp(item, ['Name', 'name', 'Column Name', 'ColumnName']) || ''),
          type: (getProp(item, ['Type', 'type', 'Field Type', 'FieldType']) || 'text') as any,
          position: Number(getProp(item, ['Position', 'position']) || 0),
          required: String(getProp(item, ['Required', 'required'])).toLowerCase() === 'true' || getProp(item, ['Required', 'required']) === true,
          isSystemField: String(getProp(item, ['IsSystemField', 'isSystemField', 'Is System Field'])).toLowerCase() === 'true' || getProp(item, ['IsSystemField', 'isSystemField']) === true,
          isHidden: String(getProp(item, ['IsHidden', 'isHidden', 'Is Hidden'])).toLowerCase() === 'true' || getProp(item, ['IsHidden', 'isHidden']) === true,
          calculation: getProp(item, ['Calculation', 'calculation']) ? String(getProp(item, ['Calculation', 'calculation'])) : undefined,
          options: parseArrayProp(getProp(item, ['Options', 'options', 'OptionsJSON']))
        }));
      }

      // Extract Job Items
      let jobItems: JobItem[] | null = null;
      if (Array.isArray(raw.jobItems)) {
        jobItems = raw.jobItems.map((item: any) => ({
          id: String(getProp(item, ['ItemID', 'itemId', 'id', 'Item ID']) || ''),
          jobId: String(getProp(item, ['JobID', 'jobId', 'Job ID']) || ''),
          position: Number(getProp(item, ['Position', 'position']) || 0),
          values: parseObjectProp(getProp(item, ['ValuesJSON', 'values', 'Values', 'valuesJSON'])) || {},
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created Date']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated Date']) || new Date().toISOString())
        }));
      }

      // Extract Job Activities
      let jobActivities: JobActivity[] | null = null;
      if (Array.isArray(raw.jobActivities)) {
        jobActivities = raw.jobActivities.map((item: any) => ({
          id: String(getProp(item, ['ActivityID', 'activityId', 'id', 'Activity ID']) || ''),
          jobId: String(getProp(item, ['JobID', 'jobId', 'Job ID']) || ''),
          user: String(getProp(item, ['User', 'user', 'UserName', 'CreatedBy']) || 'Admin'),
          action: String(getProp(item, ['Action', 'action']) || ''),
          oldValue: getProp(item, ['OldValue', 'oldValue', 'Old Value']) ? String(getProp(item, ['OldValue', 'oldValue', 'Old Value'])) : undefined,
          newValue: getProp(item, ['NewValue', 'newValue', 'New Value']) ? String(getProp(item, ['NewValue', 'newValue', 'New Value'])) : undefined,
          timestamp: String(getProp(item, ['Timestamp', 'timestamp', 'Date']) || new Date().toISOString())
        }));
      }

      // Extract Job Comments
      let jobComments: JobComment[] | null = null;
      if (Array.isArray(raw.jobComments) || Array.isArray(raw.JobComments)) {
        jobComments = parseJobComments(raw.jobComments || raw.JobComments);
        if (jobs && jobComments.length > 0) {
          const commentMapByJob = new Map<string, JobComment[]>();
          for (const c of jobComments) {
            if (!c.jobId) continue;
            const existing = commentMapByJob.get(c.jobId) || [];
            existing.push(c);
            commentMapByJob.set(c.jobId, existing);
          }
          jobs = jobs.map(j => {
            const fromJobSheet = j.comments || [];
            const fromDedicatedSheet = commentMapByJob.get(j.id) || [];
            const merged = [...fromJobSheet];
            const seenIds = new Set(fromJobSheet.map(c => c.id));
            for (const c of fromDedicatedSheet) {
              if (!seenIds.has(c.id)) {
                seenIds.add(c.id);
                merged.push(c);
              }
            }
            return {
              ...j,
              comments: merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            };
          });
        }
      }

      // Extract Staff
      let staff: StaffMember[] | null = null;
      if (Array.isArray(raw.staff)) {
        staff = raw.staff.map((item: any) => ({
          id: String(getProp(item, ['StaffID', 'staffId', 'id', 'Staff ID']) || `STF-${Date.now()}`),
          fullName: String(getProp(item, ['FullName', 'fullName', 'Name', 'name', 'Full Name']) || ''),
          position: String(getProp(item, ['Position', 'position', 'Role', 'role']) || ''),
          department: String(getProp(item, ['Department', 'department', 'Dept']) || 'General'),
          employmentStatus: String(getProp(item, ['EmploymentStatus', 'employmentStatus', 'StatusType', 'Employment Status']) || 'Full-Time'),
          dateStarted: String(getProp(item, ['DateStarted', 'dateStarted', 'StartDate', 'Date Started']) || new Date().toISOString().split('T')[0]),
          salaryType: (getProp(item, ['SalaryType', 'salaryType', 'Salary Type', 'PayType']) || 'Monthly') as any,
          basicSalary: Number(getProp(item, ['BasicSalary', 'basicSalary', 'Basic Salary', 'Rate', 'Salary']) || 0),
          allowances: Number(getProp(item, ['Allowances', 'allowances', 'Allowance']) || 0),
          otherCompensation: Number(getProp(item, ['OtherCompensation', 'otherCompensation', 'Other Compensation', 'Bonuses']) || 0),
          notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
          status: (getProp(item, ['Status', 'status']) || 'Active') as any,
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
        }));
      }

      // Extract Staff Accounts
      let staffAccounts: StaffAccount[] | null = null;
      if (Array.isArray(raw.staffAccounts)) {
        staffAccounts = raw.staffAccounts.map((item: any) => ({
          id: String(getProp(item, ['AccountID', 'accountId', 'id', 'Account ID', 'SA_ID']) || `SA-${Date.now()}`),
          staffId: String(getProp(item, ['StaffID', 'staffId', 'Staff ID', 'STF_ID']) || ''),
          name: String(getProp(item, ['Name', 'name', 'FullName', 'fullName', 'StaffName']) || ''),
          username: String(getProp(item, ['Username', 'username', 'User', 'Email']) || '').trim().toLowerCase(),
          passcode: String(getProp(item, ['Passcode', 'passcode', 'Password', 'password', 'Pin']) || ''),
          role: (getProp(item, ['Role', 'role']) || 'Staff') as any,
          status: (getProp(item, ['Status', 'status']) || 'Active') as any,
          email: getProp(item, ['Email', 'email']) ? String(getProp(item, ['Email', 'email'])) : undefined,
          phone: getProp(item, ['Phone', 'phone', 'ContactNumber']) ? String(getProp(item, ['Phone', 'phone', 'ContactNumber'])) : undefined,
          avatarUrl: getProp(item, ['AvatarURL', 'avatarUrl', 'ProfileImage']) ? String(getProp(item, ['AvatarURL', 'avatarUrl', 'ProfileImage'])) : undefined,
          lastLogin: getProp(item, ['LastLogin', 'lastLogin']) ? String(getProp(item, ['LastLogin', 'lastLogin'])) : undefined,
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
        }));
      }

      // Extract Attendance
      let attendance: AttendanceRecord[] | null = null;
      if (Array.isArray(raw.attendance)) {
        attendance = raw.attendance.map((item: any) => {
          const rawCreated = getProp(item, ['CreatedAt', 'createdAt', 'Created At']);
          const rawUpdated = getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']);
          const rawDate = getProp(item, ['Date', 'date', 'WorkDate', 'AttendanceDate']);
          const fallbackFromCreated = rawCreated ? normalizeAttendanceDate(rawCreated, '') : '';
          const normalizedDate = normalizeAttendanceDate(rawDate, fallbackFromCreated || undefined);
          const sId = String(getProp(item, ['StaffID', 'staffId', 'Staff ID']) || '').trim();
          const clockIn = cleanClockIn(getProp(item, ['ClockIn', 'clockIn', 'TimeIn', 'Clock In']));
          const clockOut = cleanClockOut(getProp(item, ['ClockOut', 'clockOut', 'TimeOut', 'Clock Out']));
          let totalHours = Number(getProp(item, ['TotalHours', 'totalHours', 'HoursWorked', 'Total Hours', 'Hours']) || 0);
          if ((!totalHours || totalHours <= 0) && clockIn && clockOut) {
            totalHours = calculateHoursWorked(clockIn, clockOut, normalizedDate);
          }

          return {
            id: String(getProp(item, ['AttendanceID', 'attendanceId', 'id', 'Attendance ID']) || (sId ? `ATT-${sId}-${normalizedDate}` : `ATT-${Date.now()}`)),
            staffId: sId,
            staffName: String(getProp(item, ['StaffName', 'staffName', 'Staff Name', 'Name']) || ''),
            date: normalizedDate,
            clockIn,
            clockOut,
            totalHours,
            status: (getProp(item, ['Status', 'status']) || 'Present') as any,
            notes: getProp(item, ['Notes', 'notes', 'Remarks']) ? String(getProp(item, ['Notes', 'notes', 'Remarks'])) : undefined,
            createdAt: rawCreated ? String(rawCreated) : undefined,
            updatedAt: rawUpdated ? String(rawUpdated) : (rawCreated ? String(rawCreated) : undefined)
          };
        });
      }

      // Extract Payroll
      let payroll: PayrollRecord[] | null = null;
      if (Array.isArray(raw.payroll)) {
        payroll = raw.payroll.map((item: any) => {
          const itemizedDeductions = parseObjectProp(getProp(item, ['ItemizedDeductionsJSON', 'itemizedDeductions', 'Itemized Deductions JSON', 'Itemized Deductions']));
          return {
            id: String(getProp(item, ['PayrollID', 'payrollId', 'id', 'Payroll ID']) || `PR-${Date.now()}`),
            staffId: String(getProp(item, ['StaffID', 'staffId', 'Staff ID']) || ''),
            staffName: String(getProp(item, ['StaffName', 'staffName', 'Staff Name', 'EmployeeName']) || ''),
            position: getProp(item, ['Position', 'position']) ? String(getProp(item, ['Position', 'position'])) : undefined,
            department: getProp(item, ['Department', 'department']) ? String(getProp(item, ['Department', 'department'])) : undefined,
            payPeriodStart: String(getProp(item, ['PayPeriodStart', 'payPeriodStart', 'Pay Period Start', 'PeriodStart']) || ''),
            payPeriodEnd: String(getProp(item, ['PayPeriodEnd', 'payPeriodEnd', 'Pay Period End', 'PeriodEnd']) || ''),
            payDate: String(getProp(item, ['PayDate', 'payDate', 'Pay Date', 'Date']) || ''),
            salaryType: getProp(item, ['SalaryType', 'salaryType', 'Salary Type', 'PayType']) ? (getProp(item, ['SalaryType', 'salaryType', 'Salary Type', 'PayType']) as any) : undefined,
            rateSnapshot: getProp(item, ['RateSnapshot', 'rateSnapshot', 'Rate Snapshot', 'Rate']) !== undefined ? Number(getProp(item, ['RateSnapshot', 'rateSnapshot', 'Rate Snapshot', 'Rate'])) : undefined,
            daysWorked: getProp(item, ['DaysWorked', 'daysWorked', 'Days Worked', 'Days']) !== undefined ? Number(getProp(item, ['DaysWorked', 'daysWorked', 'Days Worked', 'Days'])) : undefined,
            hoursWorked: getProp(item, ['HoursWorked', 'hoursWorked', 'Hours Worked', 'Hours']) !== undefined ? Number(getProp(item, ['HoursWorked', 'hoursWorked', 'Hours Worked', 'Hours'])) : undefined,
            basicPay: Number(getProp(item, ['BasicPay', 'basicPay', 'Basic Pay', 'BasicSalary']) || 0),
            allowances: Number(getProp(item, ['Allowances', 'allowances', 'Allowance']) || 0),
            otherEarnings: Number(getProp(item, ['OtherEarnings', 'otherEarnings', 'Other Earnings', 'Bonuses', 'Overtime']) || 0),
            grossPay: Number(getProp(item, ['GrossPay', 'grossPay', 'Gross Pay']) || 0),
            deductions: Number(getProp(item, ['Deductions', 'deductions', 'Total Deductions', 'totalDeductions']) || 0),
            itemizedDeductions: Array.isArray(itemizedDeductions) ? itemizedDeductions : undefined,
            totalDeductions: Number(getProp(item, ['TotalDeductions', 'totalDeductions', 'Total Deductions', 'deductions']) || 0),
            netPay: Number(getProp(item, ['NetPay', 'netPay', 'Net Pay']) || 0),
            status: (getProp(item, ['Status', 'status']) || 'Draft') as any,
            notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
            createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
            updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
          };
        });
      }

      // Extract Expenses
      let expenses: ExpenseRecord[] | null = null;
      if (Array.isArray(raw.expenses)) {
        expenses = raw.expenses.map((item: any) => ({
          id: String(getProp(item, ['ExpenseID', 'expenseId', 'id', 'Expense ID']) || `EXP-${Date.now()}`),
          name: String(getProp(item, ['ExpenseName', 'expenseName', 'Name', 'name', 'Expense Name', 'Description']) || ''),
          category: String(getProp(item, ['Category', 'category']) || 'Miscellaneous'),
          type: (getProp(item, ['ExpenseType', 'expenseType', 'Type', 'type', 'Expense Type']) || 'Variable') as any,
          amount: Number(getProp(item, ['Amount', 'amount', 'Cost', 'Total']) || 0),
          date: String(getProp(item, ['ExpenseDate', 'expenseDate', 'Date', 'date', 'Expense Date']) || new Date().toISOString().split('T')[0]),
          status: (getProp(item, ['PaymentStatus', 'paymentStatus', 'Status', 'status', 'Payment Status']) || 'Pending') as any,
          paymentDate: getProp(item, ['PaymentDate', 'paymentDate', 'Payment Date']) ? String(getProp(item, ['PaymentDate', 'paymentDate', 'Payment Date'])) : undefined,
          vendor: getProp(item, ['Vendor', 'vendor', 'Payee', 'payee', 'Supplier']) ? String(getProp(item, ['Vendor', 'vendor', 'Payee', 'payee', 'Supplier'])) : undefined,
          referenceNumber: getProp(item, ['ReferenceNumber', 'referenceNumber', 'Ref #', 'Reference Number', 'ReceiptNo', 'InvoiceNo']) ? String(getProp(item, ['ReferenceNumber', 'referenceNumber', 'Ref #', 'Reference Number', 'ReceiptNo', 'InvoiceNo'])) : undefined,
          notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
          recurringExpenseId: getProp(item, ['RecurringExpenseID', 'recurringExpenseId', 'Recurring Expense ID']) ? String(getProp(item, ['RecurringExpenseID', 'recurringExpenseId', 'Recurring Expense ID'])) : undefined,
          payrollId: getProp(item, ['PayrollID', 'payrollId', 'Payroll ID']) ? String(getProp(item, ['PayrollID', 'payrollId', 'Payroll ID'])) : undefined,
          createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
          updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
        }));
      }

      // Extract Expense Categories
      let expenseCategories: ExpenseCategory[] | null = null;
      if (Array.isArray(raw.expenseCategories)) {
        expenseCategories = raw.expenseCategories.map((item: any) => ({
          id: String(getProp(item, ['CategoryID', 'categoryId', 'id', 'Category ID']) || `cat-${Date.now()}`),
          name: String(getProp(item, ['Name', 'name', 'CategoryName', 'Category Name']) || ''),
          isSystem: String(getProp(item, ['IsSystem', 'isSystem', 'Is System'])).toLowerCase() === 'true' || getProp(item, ['IsSystem', 'isSystem']) === true,
          status: (getProp(item, ['Status', 'status']) || 'Active') as any
        }));
      }

      // Extract Recurring Expenses
      let recurringExpenses: RecurringExpenseRule[] | null = null;
      if (Array.isArray(raw.recurringExpenses)) {
        recurringExpenses = raw.recurringExpenses.map((item: any) => {
          const rawMonths = getProp(item, ['SpecificMonthsJSON', 'specificMonths', 'Specific Months', 'MonthsJSON']);
          let specificMonths: number[] | undefined = undefined;
          if (Array.isArray(rawMonths)) {
            specificMonths = rawMonths.map(Number).filter(n => !isNaN(n));
          } else if (typeof rawMonths === 'string') {
            try {
              const parsed = JSON.parse(rawMonths);
              if (Array.isArray(parsed)) specificMonths = parsed.map(Number).filter(n => !isNaN(n));
            } catch {
              specificMonths = rawMonths.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
            }
          }

          return {
            id: String(getProp(item, ['RecurringExpenseID', 'recurringExpenseId', 'id', 'Recurring Expense ID']) || `REC-EXP-${Date.now()}`),
            name: String(getProp(item, ['ExpenseName', 'expenseName', 'Name', 'name', 'Expense Name', 'Description']) || ''),
            category: String(getProp(item, ['Category', 'category']) || 'Miscellaneous'),
            amount: Number(getProp(item, ['Amount', 'amount', 'Cost']) || 0),
            frequency: (getProp(item, ['Frequency', 'frequency']) || 'Monthly') as any,
            startDate: String(getProp(item, ['StartDate', 'startDate', 'Start Date']) || new Date().toISOString().split('T')[0]),
            endDate: getProp(item, ['EndDate', 'endDate', 'End Date']) ? String(getProp(item, ['EndDate', 'endDate', 'End Date'])) : undefined,
            paymentsPerYear: Number(getProp(item, ['PaymentsPerYear', 'paymentsPerYear', 'Payments Per Year']) || 12),
            specificMonths,
            status: (getProp(item, ['Status', 'status']) || 'Active') as any,
            notes: String(getProp(item, ['Notes', 'notes', 'Remarks']) || ''),
            createdAt: String(getProp(item, ['CreatedAt', 'createdAt', 'Created At']) || new Date().toISOString()),
            updatedAt: String(getProp(item, ['UpdatedAt', 'updatedAt', 'Updated At']) || new Date().toISOString())
          };
        });
      }

      return {
        products,
        companies,
        orders,
        adminSettings,
        quoteEnquiries,
        catalogProducts,
        portals,
        notifications,
        jobs,
        jobColumns,
        jobItems,
        jobItemColumns,
        jobActivities,
        jobComments,
        staff,
        staffAccounts,
        attendance,
        payroll,
        expenses,
        expenseCategories,
        recurringExpenses
      };
    } catch (err) {
      console.warn('Google Sheets fetchAllData notice:', err);
      return null;
    }
  }
};
