/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Order, CompanyProfile } from '../types';
import { printElement } from '../utils/printUtils';
import {
  Printer,
  Plus,
  Trash2,
  RotateCcw,
  Receipt,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  CheckCircle,
  FileText,
  DollarSign,
  Download,
  Info
} from 'lucide-react';

export interface ReceiptLineItem {
  id: string;
  name: string;
  details?: string;
  quantity: number;
  unitPrice: number;
}

export interface ReceiptGeneratorProps {
  orders: Order[];
  companies: CompanyProfile[];
  hubName: string;
  currencySymbol: string;
  appLogoUrl?: string;
  adminEmail?: string;
  companyTagline?: string;
  companyAddress?: string;
  taxId?: string;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  orders,
  companies,
  hubName,
  currencySymbol,
  appLogoUrl,
  adminEmail,
  companyTagline,
  companyAddress,
  taxId,
}) => {
  // Selected order to load from
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const receiptPrintableRef = useRef<HTMLDivElement>(null);

  // Receipt customization fields (Populated from Admin Settings)
  const isHeaderDirtyRef = useRef(false);
  const [receiptType, setReceiptType] = useState<string>('OFFICIAL RECEIPT');
  const [businessName, setBusinessName] = useState<string>(hubName || 'ARH PRINT HUB');
  const [businessSub, setBusinessSub] = useState<string>(companyTagline ?? '');
  const [businessAddress, setBusinessAddress] = useState<string>(companyAddress ?? '');
  const [businessContact, setBusinessContact] = useState<string>(adminEmail ? `${adminEmail} | +63 912 345 6789` : 'support@arhprinthub.com | +63 912 345 6789');
  const [tinNumber, setTinNumber] = useState<string>(taxId ?? '');
  const [showLogo, setShowLogo] = useState<boolean>(true);

  // Sync with Admin Settings on external update only if not modified locally
  const prevSettingsRef = useRef({ hubName, companyTagline, companyAddress, taxId, adminEmail });
  useEffect(() => {
    const prev = prevSettingsRef.current;
    if (!isHeaderDirtyRef.current) {
      if (hubName !== undefined && hubName !== '' && hubName !== prev.hubName) setBusinessName(hubName);
      if (companyTagline !== undefined && companyTagline !== prev.companyTagline) setBusinessSub(companyTagline);
      if (companyAddress !== undefined && companyAddress !== prev.companyAddress) setBusinessAddress(companyAddress);
      if (taxId !== undefined && taxId !== prev.taxId) setTinNumber(taxId);
      if (adminEmail !== undefined && adminEmail !== '' && adminEmail !== prev.adminEmail) setBusinessContact(`${adminEmail} | +63 912 345 6789`);
    }
    prevSettingsRef.current = { hubName, companyTagline, companyAddress, taxId, adminEmail };
  }, [hubName, companyTagline, companyAddress, taxId, adminEmail]);

  // Receipt Reference
  const [receiptNumber, setReceiptNumber] = useState<string>(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [receiptDate, setReceiptDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [poReference, setPoReference] = useState<string>('');
  
  // Client & Customer Info
  const [companyName, setCompanyName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');

  // Payment Details
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer / GCash');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIALLY PAID' | 'PENDING' | 'UNPAID'>('PAID');

  // Line items
  const [items, setItems] = useState<ReceiptLineItem[]>([]);

  // Adjustments
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0); // e.g. 12%

  // Footer & Signatures
  const [notes, setNotes] = useState<string>('');
  const [signatoryName, setSignatoryName] = useState<string>('');
  const [showSignatureLine, setShowSignatureLine] = useState<boolean>(true);

  // Update businessName if hubName prop changes initially
  useEffect(() => {
    if (hubName && businessName === 'ARH PRINT HUB') {
      setBusinessName(hubName);
    }
  }, [hubName]);

  // Auto-populate when selecting an order from dropdown
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    if (!orderId) return;

    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    setReceiptNumber(`REC-${ord.orderNumber.replace(/[^a-zA-Z0-9-]/g, '')}`);
    setReceiptDate(new Date(ord.createdAt).toISOString().split('T')[0]);
    setPoReference(ord.poNumber || '');
    setCompanyName(ord.companyName || 'Corporate Client');
    setCustomerName((ord as any).purchaserName || ord.contactPerson || ord.companyName || 'Valued Customer');
    setCustomerPhone(ord.contactNumber || (ord as any).purchaserPhone || '');
    setCustomerEmail(ord.contactEmail || (ord as any).purchaserEmail || '');
    setDeliveryAddress(ord.deliveryAddress || '');
    setPaymentMethod(ord.poNumber ? 'Purchase Order' : 'Bank Transfer / GCash');
    setPaymentStatus(ord.status === 'Completed' || ord.status === 'Shipped' ? 'PAID' : 'PENDING');
    setNotes(ord.notes ? `Order Notes: "${ord.notes}" — Thank you for your order!` : 'Thank you for choosing ARH Print Hub!');

    if (ord.items && ord.items.length > 0) {
      const mappedItems: ReceiptLineItem[] = ord.items.map((it: any, idx) => {
        const specParts: string[] = [];

        const size = it.selectedSize || it.size || it.SelectedSize;
        if (size) specParts.push(`Size: ${size}`);

        const color = it.selectedColor || it.color || it.SelectedColor;
        if (color) specParts.push(`Color: ${color}`);

        const addOns = it.selectedAddOns || it.addOns || it.SelectedAddOns;
        if (addOns) {
          if (Array.isArray(addOns) && addOns.length > 0) {
            const addOnNames = addOns
              .map((a: any) => {
                if (typeof a === 'string') return a;
                return a.name || a.title || '';
              })
              .filter(Boolean);
            if (addOnNames.length > 0) {
              specParts.push(`Add-ons: ${addOnNames.join(', ')}`);
            }
          } else if (typeof addOns === 'string' && addOns.trim()) {
            specParts.push(`Add-ons: ${addOns}`);
          }
        }

        const customObj = it.customDetails || it.customOptions;
        if (customObj && typeof customObj === 'object') {
          Object.entries(customObj).forEach(([k, v]) => {
            if (v) specParts.push(`${k}: ${v}`);
          });
        }

        if (it.submitterName) {
          let submitter = `Submitted by: ${it.submitterName}`;
          if (it.submitterEmail) submitter += ` (${it.submitterEmail})`;
          specParts.push(submitter);
        }

        if (it.originalOrderNumber) {
          specParts.push(`Ref PO: ${it.originalOrderNumber}`);
        }

        return {
          id: `ord-item-${idx}`,
          name: it.productName || it.name || 'Custom Item',
          details: specParts.join(' | '),
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unitPrice ?? it.price) || 0
        };
      });
      setItems(mappedItems);
    }
  };

  // Item helpers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        details: '',
        quantity: 1,
        unitPrice: 0
      }
    ]);
  };

  const handleUpdateItem = (id: string, key: keyof ReceiptLineItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [key]: value };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetForm = () => {
    setSelectedOrderId('');
    setReceiptType('OFFICIAL RECEIPT');
    setReceiptNumber(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setReceiptDate(new Date().toISOString().split('T')[0]);
    setPoReference('');
    setCompanyName('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setDeliveryAddress('');
    setPaymentMethod('Bank Transfer / GCash');
    setPaymentStatus('PAID');
    setNotes('');
    setSignatoryName('');
    setShippingFee(0);
    setDiscountAmount(0);
    setTaxRate(0);
    setItems([]);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = (subtotal * (taxRate / 100));
  const grandTotal = Math.max(0, subtotal + shippingFee + taxAmount - discountAmount);

  // Trigger print
  const handlePrint = () => {
    printElement(receiptPrintableRef.current, `Receipt_${receiptNumber}_${(customerName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}`);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="receipt-generator-tab">
      
      {/* Top Header & Order Selector Banner */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block">
              B2B Document Studio
            </span>
            <h2 className="text-xl font-extrabold uppercase tracking-tight text-black flex items-center gap-2">
              <Receipt className="w-5 h-5 text-black" />
              Customizable Receipt &amp; Invoice Generator
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Customize line items, business details, logo, and payment status, then print or download a clean receipt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl border border-black transition-all cursor-pointer shadow-md"
              id="btn-print-receipt-top"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF Receipt</span>
            </button>
            <button
              onClick={handleResetForm}
              className="flex items-center justify-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase px-3 py-2.5 rounded-xl transition-all cursor-pointer"
              title="Reset Receipt Fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Load from existing order dropdown */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-black shrink-0" />
            <div>
              <span className="text-xs font-bold text-black uppercase font-mono block">Pre-fill from Existing Order</span>
              <span className="text-[10px] text-gray-500">Pick any order from database to populate customer info &amp; items instantly.</span>
            </div>
          </div>

          <select
            value={selectedOrderId}
            onChange={(e) => handleSelectOrder(e.target.value)}
            className="w-full sm:w-80 bg-white border-2 border-black rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none cursor-pointer"
            id="receipt-order-selector"
          >
            <option value="">-- Select an Order to Load --</option>
            {orders.map((ord) => (
              <option key={ord.id} value={ord.id}>
                [{ord.orderNumber}] {ord.companyName} ({currencySymbol} {(Number(ord.totalAmount) || 0).toFixed(2)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Form Customizer (Left) vs Receipt Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Customizer Controls (7 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">
          
          {/* Section 1: Receipt Header & Business Info */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Building className="w-4 h-4 text-black" />
              1. Business &amp; Header Info
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Document Title</label>
                <select
                  value={receiptType}
                  onChange={(e) => setReceiptType(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                >
                  <option value="OFFICIAL RECEIPT">OFFICIAL RECEIPT</option>
                  <option value="SALES INVOICE">SALES INVOICE</option>
                  <option value="ACKNOWLEDGEMENT RECEIPT">ACKNOWLEDGEMENT RECEIPT</option>
                  <option value="COLLECTION RECEIPT">COLLECTION RECEIPT</option>
                  <option value="BILLING STATEMENT">BILLING STATEMENT</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Business / Hub Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessName(e.target.value);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Tagline / Sub-header</label>
                <input
                  type="text"
                  value={businessSub}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessSub(e.target.value);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Address / City</label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessAddress(e.target.value);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Tax / TIN ID</label>
                <input
                  type="text"
                  value={tinNumber}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setTinNumber(e.target.value);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Contact / Email / Phone</label>
                <input
                  type="text"
                  value={businessContact}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessContact(e.target.value);
                  }}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1 sm:col-span-2">
                <input
                  type="checkbox"
                  id="chk-show-logo"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  className="w-4 h-4 accent-black cursor-pointer rounded"
                />
                <label htmlFor="chk-show-logo" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Display Header Logo in Printed Receipt
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Reference & Customer Details */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <User className="w-4 h-4 text-black" />
              2. Receipt Ref &amp; Client Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Receipt No.</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Date</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">PO Ref # (Optional)</label>
                <input
                  type="text"
                  value={poReference}
                  onChange={(e) => setPoReference(e.target.value)}
                  placeholder="e.g. PO-88492"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                >
                  <option value="PAID">PAID</option>
                  <option value="PARTIALLY PAID">PARTIALLY PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="UNPAID">UNPAID</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Company / B2B Client</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ACME CORPORATION"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none uppercase"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Contact / Purchaser Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +63 917 123 4567"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Email</label>
                <input
                  type="text"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. johndoe@acme.com"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Delivery Address</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. 123 Corporate Tower, Taguig"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Payment Method</label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. Bank Transfer / GCash / Cash"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-black" />
                3. Line Items Summary
              </h3>
              <button
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-[10px] font-mono font-extrabold uppercase bg-black hover:bg-neutral-800 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center space-y-2">
                  <p className="text-xs text-gray-500 font-mono">No line items added to receipt.</p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:text-neutral-700 cursor-pointer underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-gray-400">Line Item #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                        placeholder="Merchandise Item Name"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-black focus:border-black focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Qty"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-black text-center focus:border-black focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="Price"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-black text-right focus:border-black focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={item.details || ''}
                      onChange={(e) => handleUpdateItem(item.id, 'details', e.target.value)}
                      placeholder="Size, Color, Custom Specs (optional)"
                      className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-gray-600 focus:border-black focus:outline-none"
                    />
                  </div>
                </div>
              ))
            )}
            </div>
          </div>

          {/* Section 4: Totals & Footer Customizer */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <DollarSign className="w-4 h-4 text-black" />
              4. Shipping, Tax &amp; Terms
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Shipping Fee</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={shippingFee}
                  onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Discount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Footer Terms &amp; Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Signatory Title / Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-4 sm:col-span-1">
                <input
                  type="checkbox"
                  id="chk-signature-line"
                  checked={showSignatureLine}
                  onChange={(e) => setShowSignatureLine(e.target.checked)}
                  className="w-4 h-4 accent-black cursor-pointer rounded"
                />
                <label htmlFor="chk-signature-line" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Show Signature Line
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Printable Receipt Preview (6 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-black" />
              Live Receipt Document Preview
            </span>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-extrabold uppercase font-mono px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              id="btn-print-receipt-live"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt Now</span>
            </button>
          </div>

          {/* The Printable Area Container */}
          <div ref={receiptPrintableRef} className="printable-area bg-white border-2 border-black rounded-3xl p-8 md:p-10 shadow-xl space-y-8 text-black font-sans relative overflow-hidden" id="receipt-printable-canvas">
            
            {/* Top Header Section */}
            <div className="border-b-2 border-black pb-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                
                {/* Brand / Logo */}
                <div className="space-y-1 max-w-md">
                  {showLogo && appLogoUrl && (
                    <img
                      src={appLogoUrl}
                      alt={businessName}
                      className="h-10 w-auto object-contain mb-2 max-w-[180px]"
                    />
                  )}
                  <h1 className="text-2xl font-black uppercase tracking-tight text-black leading-tight">
                    {businessName}
                  </h1>
                  {businessSub && (
                    <p className="text-xs text-gray-600 font-medium">
                      {businessSub}
                    </p>
                  )}
                  {(businessAddress || businessContact) && (
                    <p className="text-[11px] text-gray-500 font-mono">
                      {[businessAddress, businessContact].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {tinNumber && (
                    <p className="text-[10px] text-gray-400 font-mono font-bold">
                      {tinNumber}
                    </p>
                  )}
                </div>

                {/* Receipt Title Badge */}
                <div className="text-left sm:text-right space-y-1">
                  <span className="inline-block px-3 py-1 bg-black text-white text-xs font-mono font-black uppercase tracking-widest rounded-md">
                    {receiptType}
                  </span>
                  <div className="text-xs font-mono text-gray-800 space-y-0.5 pt-1">
                    <p><strong>Ref #:</strong> {receiptNumber}</p>
                    <p><strong>Date:</strong> {receiptDate}</p>
                    {poReference && <p><strong>PO #:</strong> {poReference}</p>}
                  </div>
                </div>

              </div>
            </div>

            {/* Client & Payment Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono border-b border-gray-200 pb-6">
              
              {/* Billed To */}
              <div className="space-y-1 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black block">
                  CUSTOMER &amp; COMPANY DETAILS
                </span>
                <p className="text-sm font-black text-black uppercase">{companyName || '—'}</p>
                <p className="text-gray-800 font-bold">Customer: {customerName || '—'}</p>
                {customerPhone && <p className="text-gray-600">Phone: {customerPhone}</p>}
                {customerEmail && <p className="text-gray-600">Email: {customerEmail}</p>}
                {deliveryAddress && (
                  <p className="text-gray-700 pt-1 leading-snug border-t border-gray-200 mt-1">
                    <strong>Address:</strong> {deliveryAddress}
                  </p>
                )}
              </div>

              {/* Payment Summary */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black block">
                    PAYMENT &amp; TRANSACTION SUMMARY
                  </span>
                  <p className="text-gray-800 mt-1">
                    <strong>Payment Method:</strong> {paymentMethod}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-gray-600 font-bold uppercase text-[10px]">Payment Status:</span>
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-md border ${
                    paymentStatus === 'PAID' ? 'bg-green-100 text-green-800 border-green-300' :
                    paymentStatus === 'PARTIALLY PAID' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    'bg-red-100 text-red-800 border-red-300'
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>

            </div>

            {/* Itemized Table */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-gray-500 block">
                PURCHASED LINE ITEMS
              </span>
              
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="border-b-2 border-black font-mono text-[10px] uppercase font-black tracking-wider text-black">
                    <th className="py-2 pr-2">Item Description</th>
                    <th className="py-2 px-2 text-center w-16">Qty</th>
                    <th className="py-2 px-2 text-right w-24">Unit Price</th>
                    <th className="py-2 pl-2 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-mono text-xs">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400 font-sans italic text-xs">
                        No line items added yet. Click "+ Add Item" above or select an order to pre-fill.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <tr key={it.id} className="align-top">
                        <td className="py-3 pr-2">
                          <p className="font-extrabold text-black uppercase">{it.name}</p>
                          {it.details && (
                            <p className="text-[10px] text-gray-600 font-sans italic mt-0.5">{it.details}</p>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-gray-800">
                          {it.quantity}
                        </td>
                        <td className="py-3 px-2 text-right text-gray-800">
                          {currencySymbol} {(Number(it.unitPrice) || 0).toFixed(2)}
                        </td>
                        <td className="py-3 pl-2 text-right font-extrabold text-black">
                          {currencySymbol} {((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-4 border-t-2 border-black flex flex-col sm:flex-row justify-between items-start gap-6 font-mono text-xs">
              
              {/* Notes block */}
              <div className="sm:max-w-xs space-y-2 text-gray-600 text-[11px] leading-relaxed">
                <span className="font-bold text-black uppercase text-[10px] block">Receipt Notes &amp; Terms:</span>
                <p className="bg-gray-50 p-3 rounded-xl border border-gray-200 italic">
                  "{notes}"
                </p>
              </div>

              {/* Numerical breakdown */}
              <div className="w-full sm:w-64 space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-black">{currencySymbol} {subtotal.toFixed(2)}</span>
                </div>

                {shippingFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Fee:</span>
                    <span className="font-bold text-black">{currencySymbol} {shippingFee.toFixed(2)}</span>
                  </div>
                )}

                {taxRate > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax / VAT ({taxRate}%):</span>
                    <span className="font-bold text-black">{currencySymbol} {taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount:</span>
                    <span>-{currencySymbol} {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t-2 border-black flex justify-between items-baseline text-sm font-black text-black">
                  <span>TOTAL AMOUNT:</span>
                  <span className="text-base text-black">{currencySymbol} {grandTotal.toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Signatures & Footer Acknowledgement */}
            <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-end justify-between gap-6 text-[10px] font-mono">
              <div className="space-y-1 text-gray-500">
                <p>Official document generated via {businessName}.</p>
                <p>For inquiries, please email {businessContact}.</p>
              </div>

              {showSignatureLine && (
                <div className="text-center w-48 space-y-1 shrink-0">
                  <div className="border-b border-black w-full pb-1"></div>
                  <p className="font-extrabold uppercase text-black">{signatoryName}</p>
                  <p className="text-gray-400 text-[9px]">Authorized Signature</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ReceiptGenerator;
