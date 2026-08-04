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
  customDetails: Record<string, string>;
  unitPrice?: number; // Price calculated from variant or portal custom pricing
}

export interface AppsScriptConfig {
  webAppUrl: string;
  isConnected: boolean;
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
  adminUsername?: string;
  adminPasscode?: string;
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
}

