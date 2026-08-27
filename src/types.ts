/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CustomField {
  name: string;
  type: 'text' | 'select' | 'textarea';
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface ProductAddOn {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'Uniforms' | 'IDs & Accessories' | 'Print Materials' | 'Promo Items';
  description: string;
  imageUrl: string;
  basePrice: number;
  originalPrice?: number; // Retail or original price before B2B negotiation
  saleCount?: number;     // e.g. 9 for "9/10 Sale"
  saleLimit?: number;     // e.g. 10 for "9/10 Sale"
  minQuantity: number;
  unit: string;
  sizeOptions?: string[];
  colorOptions?: string[];
  customFields?: CustomField[];
  addOns?: ProductAddOn[];
  frequentlyOrdered?: boolean;
  shippingFee?: number;
  leadTime?: string;
  imageUrls?: string[];
  variantPrices?: Record<string, number>; // Specific prices for variants (e.g. { "2XL": 20.00, "Red": 16.00 })
  colorImages?: Record<string, string>;   // Mapping of color name -> image URL
}

export interface OrderItem {
  productId: string;
  productName: string;
  imageUrl: string;
  quantity: number;
  price: number;
  selectedSize?: string;
  selectedColor?: string;
  selectedAddOns?: ProductAddOn[];
  customDetails?: Record<string, string>;
  unitPrice?: number;
  submitterName?: string;
  submitterEmail?: string;
  submitterPhone?: string;
  originalOrderNumber?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  companyName: string;
  contactEmail: string;
  items: OrderItem[];
  status:
    | 'Reviewed'
    | 'To Order'
    | 'Ordered'
    | 'Admin Received'
    | 'Customer Claimed'
    | 'Delivered'
    | 'Picked Up'
    | 'Pending Approval'
    | 'Pending'
    | 'Approved'
    | 'Processing'
    | 'In Production'
    | 'Shipped'
    | 'Completed'
    | 'Canceled';
  totalAmount: number;
  createdAt: string;
  deliveryAddress: string;
  contactPerson: string;
  contactNumber?: string;
  fbMessengerLink?: string;
  poNumber?: string;
  notes?: string;
  portalId?: string;
  portalName?: string;
  jobId?: string;
}

export type JobStatus = 'Pending' | 'Approved' | 'In Production' | 'Shipped' | 'Completed' | 'Canceled';

export type JobSource = 'Company Order' | 'Manual';

export type JobFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'currency'
  | 'dropdown'
  | 'status'
  | 'date'
  | 'person'
  | 'company'
  | 'link'
  | 'checkbox';

export interface JobColumn {
  id: string;
  name: string;
  type: JobFieldType;
  position: number;
  required?: boolean;
  isSystemField?: boolean;
  isHidden?: boolean;
  options?: string[];
  createdDate?: string;
}

export interface JobItemColumn {
  id: string;
  name: string;
  type: JobFieldType;
  position: number;
  required?: boolean;
  isSystemField?: boolean;
  isHidden?: boolean;
  calculation?: 'total_qty' | 'total_amount' | string;
  options?: string[];
}

export interface JobItem {
  id: string;
  jobId: string;
  position: number;
  values: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobActivity {
  id: string;
  jobId: string;
  user: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface Job {
  id: string; // e.g. 'JOB-10452'
  companyId?: string;
  companyName?: string;
  orderId?: string;
  orderNumber?: string;
  source: JobSource;
  status: JobStatus;
  position: number;
  values: Record<string, any>;
  items?: JobItem[];
  activities?: JobActivity[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  logoUrl?: string;
  deliveryAddress: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  poRequired: boolean;
  username?: string;         // Portal login username
  passcode?: string;         // Portal login passcode
  enabledProductIds?: string[]; // IDs of products available to this client. If undefined/empty, all are available.
  customProducts?: Product[]; // Company-specific products
}

export interface CartItem {
  id: string; // Composite key to differentiate items with different configurations
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  selectedAddOns?: ProductAddOn[];
  customDetails: Record<string, string>;
  unitPrice?: number; // Price calculated from variant or portal custom pricing
}

export interface AppsScriptConfig {
  webAppUrl: string;
  isConnected: boolean;
  isCustomUrl?: boolean;
  lastSyncTime?: string;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface CatalogProduct {
  id: string;
  sku?: string;
  name: string;
  category: string;
  description: string;
  specifications?: string;
  imageUrl: string;
  imageUrls?: string[];
  moq: number;
  leadTime?: string;
  brandingMethods: string[];
  colors: ColorOption[];
  sizes?: string[];
  sizeOptions?: string[];
  addOns?: ProductAddOn[];
  status: 'Active' | 'Hidden';
  createdAt?: string;
  variantPrices?: Record<string, number>;
  colorImages?: Record<string, string>;
}

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuoteEnquiry {
  id: string;
  enquiryNumber: string;
  productId: string;
  productName: string;
  productCategory: string;
  companyId?: string;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  quantity: number;
  preferredBrandingMethod?: string;
  preferredColor?: string;
  preferredSize?: string;
  notes?: string;
  status: 'New' | 'In Review' | 'Quoted' | 'Declined' | 'Closed' | 'Product Requested' | 'Product Added';
  createdAt: string;
  // Quote Builder generated fields
  quotedUnitPrice?: number;
  quotedTotalPrice?: number;
  quotedTax?: number;
  quotedShipping?: number;
  quoteNotes?: string;
  quotedValidUntil?: string;
  quotedAt?: string;
  quotedLineItems?: QuoteLineItem[];
  // Client confirmation to proceed & add product
  requestedProductAddition?: boolean;
  requestedProductAdditionAt?: string;
  requestedProductNotes?: string;
}

export interface SystemSettings {
  hubName: string;
  shortHubName: string;
  orderPrefix: string;
  currencySymbol: string;
  colorTheme?: string;
  adminEmail?: string;
  logoUrl?: string;
  faviconUrl?: string;
  adminUsername?: string;
  adminPasscode?: string;
  companyTagline?: string;
  companyAddress?: string;
  taxId?: string;
}

export interface OrderPortal {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  description?: string;
  status: 'Active' | 'Paused' | 'Closed';
  productIds: string[];
  createdAt: string;
  updatedAt: string;
  shareToken: string;
  customPrices?: Record<string, number>; // Map of productId -> custom portal base price set by Company Admin
  customVariantPrices?: Record<string, Record<string, number>>; // Map of productId -> (variantKey -> custom price)
  customAddOnPrices?: Record<string, Record<string, number>>; // Map of productId -> (addOnKey -> custom price)
}

export interface AppNotification {
  id: string;
  recipientType: 'admin' | 'company' | 'staff';
  companyName?: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  orderNumber?: string;
  type: 'new_storefront_order' | 'order_status_change' | 'new_company_order' | 'quote_request' | 'quote_status_change';
}

export function getDisplayPurchaserName(
  order: {
    contactPerson?: string;
    contactEmail?: string;
    items?: Array<{ submitterName?: string }>;
  },
  fallbackCompanyContact?: string
): string {
  const isGeneric = (str?: string) => {
    if (!str) return true;
    const s = str.trim().toLowerCase();
    return (
      !s ||
      s === 'n/a' ||
      s === 'storefront customer' ||
      s === 'storefront purchaser' ||
      s === 'guest user' ||
      s === 'company representative' ||
      s === 'customer'
    );
  };

  const rawPerson = order?.contactPerson?.trim();
  if (rawPerson && !isGeneric(rawPerson)) {
    return rawPerson;
  }

  if (Array.isArray(order?.items)) {
    const itemSubmitter = order.items.find(
      i => i?.submitterName && !isGeneric(i.submitterName)
    )?.submitterName?.trim();
    if (itemSubmitter) {
      return itemSubmitter;
    }
  }

  const companyContact = fallbackCompanyContact?.trim();
  if (companyContact && !isGeneric(companyContact)) {
    return companyContact;
  }

  if (rawPerson && rawPerson.length > 0 && rawPerson.toLowerCase() !== 'n/a') {
    return rawPerson;
  }

  if (order?.contactEmail && order.contactEmail.includes('@')) {
    const parts = order.contactEmail.split('@')[0].trim();
    if (parts && parts.length > 0) {
      const formatted = parts.charAt(0).toUpperCase() + parts.slice(1);
      return formatted;
    }
  }

  return 'Storefront Customer';
}

// ----------------------------------------------------
// STAFF, ATTENDANCE & PAYROLL DATA MODELS
// ----------------------------------------------------
export type SalaryType = 'Monthly' | 'Daily' | 'Hourly';
export type EmploymentStatus = 'Full-Time' | 'Part-Time' | 'Contract' | 'Probationary' | 'Intern' | 'Seasonal' | string;
export type StaffStatus = 'Active' | 'Inactive';

export interface StaffMember {
  id: string; // e.g. 'STF-101'
  fullName: string;
  position: string;
  department: string;
  employmentStatus: EmploymentStatus;
  dateStarted: string; // YYYY-MM-DD
  salaryType: SalaryType;
  basicSalary: number; // Rate per month / day / hour
  allowances: number;
  otherCompensation: number;
  notes?: string;
  status: StaffStatus;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StaffAccountStatus = 'Active' | 'Inactive' | 'Suspended';

export interface StaffAccount {
  id: string; // e.g. 'SA-101'
  staffId: string; // Linked StaffMember.id (e.g. 'STF-101')
  name: string;
  username: string; // Unique username or email (case-insensitive login)
  passcode: string; // Password / PIN credential
  role: 'Staff' | 'Admin';
  status: StaffAccountStatus;
  mustChangePassword?: boolean;
  temporaryPassword?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AttendanceStatus = 'Present' | 'Late' | 'Missing Clock Out' | 'Absent' | 'Leave';

export interface AttendanceRecord {
  id: string; // e.g. 'ATT-2026-001'
  staffId: string; // Linked StaffMember.id
  staffName: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // e.g. '07:02 AM' or '07:02:00'
  clockOut?: string; // e.g. '04:01 PM' or undefined if clocked in
  totalHours: number; // calculated decimal hours (e.g. 8.98)
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PayrollStatus = 'Draft' | 'Reviewed' | 'Finalized' | 'Paid' | 'Voided';

export interface PayrollDeductionItem {
  id: string;
  name: string;
  amount: number;
}

export interface PayrollRecord {
  id: string; // e.g. 'PR-2026-001'
  staffId: string;
  staffName: string;
  position?: string;
  department?: string;
  payPeriodStart: string; // YYYY-MM-DD
  payPeriodEnd: string;   // YYYY-MM-DD
  payDate: string;        // YYYY-MM-DD
  salaryType?: SalaryType; // Snapshot: 'Monthly' | 'Daily' | 'Hourly'
  rateSnapshot?: number;   // Snapshot of basic salary rate at the time of payroll (e.g. 700)
  daysWorked?: number;     // Snapshot of days worked (for Daily pay)
  hoursWorked?: number;    // Snapshot of hours worked (for Hourly pay)
  basicPay: number;
  allowances: number;
  otherEarnings: number;
  grossPay: number;       // basicPay + allowances + otherEarnings
  deductions: number;     // Total deductions numeric value
  itemizedDeductions?: PayrollDeductionItem[];
  totalDeductions: number;
  netPay: number;         // grossPay - totalDeductions
  status: PayrollStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ----------------------------------------------------
// EXPENSE MANAGEMENT & RECURRING PLANNER DATA MODELS
// ----------------------------------------------------
export type ExpenseType = 'Fixed / Recurring' | 'Variable' | 'One-Time' | 'Fixed';
export type ExpensePaymentStatus = 'Pending' | 'Paid' | 'Voided';
export type PaymentStatus = ExpensePaymentStatus;

export interface ExpenseCategory {
  id: string;
  name: string;
  isSystem?: boolean;
  status?: 'Active' | 'Inactive';
  description?: string;
  defaultType?: ExpenseType;
  isActive?: boolean;
}

export interface ExpenseRecord {
  id: string; // e.g. 'EXP-001'
  name: string;
  category: string;
  type?: ExpenseType;
  amount: number;
  date?: string; // YYYY-MM-DD
  status?: ExpensePaymentStatus;
  paymentDate?: string; // YYYY-MM-DD
  vendor?: string;
  referenceNumber?: string;
  notes?: string;
  recurringExpenseId?: string;
  payrollId?: string; // Links to payroll record if created/integrated
  createdAt?: string;
  updatedAt?: string;
  // Aliases for convenience/compatibility
  expenseDate?: string;
  expenseType?: ExpenseType;
  paymentStatus?: ExpensePaymentStatus;
}

export type RecurringFrequency = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Yearly' | 'Custom / Specific Months' | 'Custom';

export interface RecurringExpenseRule {
  id: string; // e.g. 'REC-EXP-001'
  name: string;
  category: string;
  amount: number;
  frequency: RecurringFrequency;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD (optional)
  paymentsPerYear: number; // e.g., 12, 4, 2, 1
  specificMonths?: number[]; // [1, 2... 12] where 1 is January
  status: 'Active' | 'Inactive';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type RecurringExpense = RecurringExpenseRule;

export type UserRole = 'admin' | 'client' | 'staff';

export interface AuthUser {
  role: UserRole;
  companyId?: string;
  staffId?: string;
  accountId?: string;
  name?: string;
  username?: string;
  email?: string;
}

