/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile, Product, CatalogProduct, QuoteEnquiry } from '../types';
import { DEFAULT_QUOTE_NOTES } from '../constants/quoteDefaults';
import { printElement } from '../utils/printUtils';
import {
  Calculator,
  Printer,
  Plus,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Percent,
  Clock,
  Sparkles,
  Download,
  Package,
  Layers,
  Save,
  CheckCircle2,
  FileDown,
  Info
} from 'lucide-react';

export interface StandaloneQuoteLineItem {
  id: string;
  name: string;
  specifications?: string;
  quantity: number;
  unitPrice: number;
}

export interface SavedGuestQuote {
  id: string;
  quoteNumber: string;
  dateIssued: string;
  validUntil: string;
  clientType: 'company' | 'individual' | 'guest';
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  deliveryAddress: string;
  projectTitle: string;
  items: StandaloneQuoteLineItem[];
  taxRate: number;
  shippingFee: number;
  discountAmount: number;
  leadTime: string;
  termsAndNotes: string;
  preparedBy: string;
  status: 'Draft' | 'Quoted' | 'Approved' | 'Sent';
  savedAt: string;
}

export interface QuoteBuilderProps {
  companies: CompanyProfile[];
  products: Product[];
  catalogProducts?: CatalogProduct[];
  quoteEnquiries?: QuoteEnquiry[];
  hubName: string;
  currencySymbol: string;
  appLogoUrl?: string;
  adminEmail?: string;
  companyTagline?: string;
  companyAddress?: string;
  taxId?: string;
  onSaveQuoteEnquiry?: (updatedEnquiry: QuoteEnquiry) => void;
  onAddQuoteEnquiry?: (enquiry: QuoteEnquiry) => void;
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({
  companies = [],
  products = [],
  catalogProducts = [],
  quoteEnquiries = [],
  hubName = 'ARH PRINT HUB',
  currencySymbol = 'Php',
  appLogoUrl,
  adminEmail,
  companyTagline,
  companyAddress,
  taxId,
  onSaveQuoteEnquiry,
  onAddQuoteEnquiry
}) => {
  // Quote Document Identity
  const [quoteTitle, setQuoteTitle] = useState<string>('OFFICIAL PRICE QUOTATION');
  const [quoteNumber, setQuoteNumber] = useState<string>(
    () => `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [dateIssued, setDateIssued] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [leadTime, setLeadTime] = useState<string>('');
  const [quoteStatus, setQuoteStatus] = useState<'Draft' | 'Quoted' | 'Approved' | 'Sent'>('Quoted');

  // Business / Vendor Header Info (Populated from Admin Settings)
  const isHeaderDirtyRef = useRef(false);
  const [businessName, setBusinessName] = useState<string>(hubName || 'ARH PRINT HUB');
  const [businessSub, setBusinessSub] = useState<string>(companyTagline ?? '');
  const [businessAddress, setBusinessAddress] = useState<string>(companyAddress ?? '');
  const [businessContact, setBusinessContact] = useState<string>(
    adminEmail ? `${adminEmail} | +63 912 345 6789` : 'support@arhprinthub.com | +63 912 345 6789'
  );
  const [tinNumber, setTinNumber] = useState<string>(taxId ?? '');
  const [preparedBy, setPreparedBy] = useState<string>('');
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

  // Client / Prospect Information (Unregistered company or individual)
  const [clientType, setClientType] = useState<'company' | 'individual' | 'guest'>('company');
  const [companyName, setCompanyName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [projectTitle, setProjectTitle] = useState<string>('');

  // Line items (Empty by default)
  const [items, setItems] = useState<StandaloneQuoteLineItem[]>([]);

  // Financials & Adjustments
  const [taxRate, setTaxRate] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [termsAndNotes, setTermsAndNotes] = useState<string>('');

  // Selection / Pre-fill Selectors
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>('');
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState<string>('');

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showEnquiriesModal, setShowEnquiriesModal] = useState<boolean>(false);

  const printableRef = useRef<HTMLDivElement>(null);

  // Update businessName if hubName prop changes
  useEffect(() => {
    if (hubName && businessName === 'ARH PRINT HUB') {
      setBusinessName(hubName);
    }
  }, [hubName]);

  // Save quote directly to Google Sheets via QuoteEnquiry pipeline
  const handleSaveQuoteToSheets = () => {
    const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
    const mainProdName = projectTitle || (items.length > 0 ? items.map(i => i.name).filter(Boolean).join(', ') : 'Custom Quotation');

    const enquiryRecord: QuoteEnquiry = {
      id: selectedEnquiryId || `quote-${Date.now()}`,
      enquiryNumber: quoteNumber.replace(/^QT-/, '') || `${Math.floor(1000 + Math.random() * 9000)}`,
      productId: selectedCatalogProductId || 'custom-quotation',
      productName: mainProdName,
      productCategory: 'Custom Quotation',
      companyId: selectedCompanyId || undefined,
      companyName: companyName.trim() || 'Direct Client / Guest',
      contactPerson: contactPerson.trim() || 'N/A',
      contactEmail: contactEmail.trim() || 'quotes@arhprinthub.com',
      contactPhone: contactPhone.trim() || '',
      notes: deliveryAddress.trim() ? `Delivery Address: ${deliveryAddress.trim()}` : undefined,
      quantity: totalQty || 1,
      quoteNotes: termsAndNotes || DEFAULT_QUOTE_NOTES,
      quotedValidUntil: validUntil,
      status: quoteStatus === 'Draft' ? 'In Review' : 'Quoted',
      quotedTotalPrice: grandTotal,
      quotedUnitPrice: totalQty > 0 ? (grandTotal / totalQty) : grandTotal,
      quotedTax: taxAmount,
      quotedShipping: shippingFee,
      quotedAt: new Date().toISOString(),
      quotedLineItems: items.map((it, idx) => ({
        id: it.id || `line-${idx}`,
        description: it.name + (it.specifications ? ` (${it.specifications})` : ''),
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.quantity * it.unitPrice
      })),
      createdAt: dateIssued ? `${dateIssued}T00:00:00.000Z` : new Date().toISOString()
    };

    if (selectedEnquiryId && onSaveQuoteEnquiry) {
      onSaveQuoteEnquiry(enquiryRecord);
    } else if (onAddQuoteEnquiry) {
      onAddQuoteEnquiry(enquiryRecord);
    } else if (onSaveQuoteEnquiry) {
      onSaveQuoteEnquiry(enquiryRecord);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Pre-fill from existing company profile
  const handleSelectCompany = (compId: string) => {
    setSelectedCompanyId(compId);
    if (!compId) return;
    const co = companies.find(c => c.id === compId);
    if (co) {
      setClientType('company');
      setCompanyName(co.name);
      setContactPerson(co.contactPerson || co.name);
      setContactEmail(co.contactEmail || '');
      setContactPhone(co.contactPhone || '');
      if (co.address) {
        setDeliveryAddress(co.address);
      }
    }
  };

  // Pre-fill from quote enquiry
  const handleSelectQuoteEnquiry = (enquiryId: string) => {
    setSelectedEnquiryId(enquiryId);
    if (!enquiryId) return;
    const enq = quoteEnquiries.find(e => e.id === enquiryId);
    if (enq) {
      setQuoteNumber(`QT-${enq.enquiryNumber.replace(/[^a-zA-Z0-9-]/g, '')}`);
      setCompanyName(enq.companyName || 'Corporate Client');
      setContactPerson(enq.contactPerson || 'Purchasing Officer');
      setContactEmail(enq.contactEmail || '');
      setContactPhone(enq.contactPhone || '');
      setProjectTitle(`Custom Quoted Job: ${enq.productName}`);

      if (enq.quotedLineItems && enq.quotedLineItems.length > 0) {
        setItems(
          enq.quotedLineItems.map((li, idx) => ({
            id: `enq-item-${idx}`,
            name: li.description || enq.productName,
            specifications: `Preferred Specs from Request #${enq.enquiryNumber}`,
            quantity: li.quantity || 1,
            unitPrice: li.unitPrice || 0
          }))
        );
      } else {
        const specParts: string[] = [];
        if (enq.preferredBrandingMethod) specParts.push(`Branding: ${enq.preferredBrandingMethod}`);
        if (enq.preferredColor) specParts.push(`Color: ${enq.preferredColor}`);
        if (enq.preferredSize) specParts.push(`Size: ${enq.preferredSize}`);
        if (enq.notes) specParts.push(`Notes: ${enq.notes}`);

        setItems([
          {
            id: `enq-item-1`,
            name: enq.productName,
            specifications: specParts.join(' | ') || 'Custom merchandise',
            quantity: enq.quantity || 50,
            unitPrice: enq.quotedUnitPrice || 250.0
          }
        ]);
      }

      if (enq.quoteNotes) {
        setTermsAndNotes(enq.quoteNotes);
      }
    }
  };

  // Quick add product from master catalog or ARH catalog
  const handleQuickAddProduct = (prodId: string) => {
    setSelectedCatalogProductId(prodId);
    if (!prodId) return;

    // Check catalog products first, then store products
    const catProd = catalogProducts.find(p => p.id === prodId);
    const storeProd = products.find(p => p.id === prodId);

    const target = catProd || storeProd;
    if (target) {
      const defaultPrice = (target as any).basePrice ?? target.price ?? 200;
      const defaultDesc = (target as any).category
        ? `Category: ${(target as any).category} | Standard Branding & Packaging`
        : 'Standard Custom Specification';

      setItems(prev => [
        ...prev,
        {
          id: `item-${Date.now()}`,
          name: target.name,
          specifications: defaultDesc,
          quantity: (target as any).moq || 50,
          unitPrice: Number(defaultPrice) || 0
        }
      ]);
      setSelectedCatalogProductId('');
    }
  };

  // Item Management Handlers
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        specifications: '',
        quantity: 1,
        unitPrice: 0
      }
    ]);
  };

  const handleDuplicateItem = (itemToDup: StandaloneQuoteLineItem) => {
    setItems(prev => [
      ...prev,
      {
        ...itemToDup,
        id: `item-${Date.now()}`,
        name: itemToDup.name ? `${itemToDup.name} (Copy)` : ''
      }
    ]);
  };

  const handleUpdateItem = (id: string, key: keyof StandaloneQuoteLineItem, value: any) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, [key]: value };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleResetForm = () => {
    setQuoteNumber(`QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setDateIssued(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setValidUntil(d.toISOString().split('T')[0]);
    setClientType('company');
    setCompanyName('');
    setContactPerson('');
    setContactEmail('');
    setContactPhone('');
    setDeliveryAddress('');
    setProjectTitle('');
    setLeadTime('');
    setPreparedBy('');
    setSelectedCompanyId('');
    setSelectedEnquiryId('');
    setSelectedCatalogProductId('');
    setShippingFee(0);
    setDiscountAmount(0);
    setTaxRate(0);
    setTermsAndNotes('');
    setItems([]);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = Math.max(0, subtotal + shippingFee + taxAmount - discountAmount);

  // Trigger Print / PDF download
  const handlePrint = () => {
    printElement(printableRef.current, `Quotation_${quoteNumber}_${(companyName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_')}`);
  };

  // Copy plain text quote for WhatsApp / Viber / Email
  const handleCopyQuoteText = () => {
    let text = `========================================\n`;
    text += `${businessName.toUpperCase()} - ${quoteTitle}\n`;
    text += `========================================\n`;
    text += `Quote Ref: ${quoteNumber}\n`;
    text += `Date Issued: ${dateIssued}\n`;
    text += `Valid Until: ${validUntil}\n`;
    text += `Status: ${quoteStatus.toUpperCase()}\n\n`;
    text += `CLIENT DETAILS:\n`;
    text += `Company / Client: ${companyName || 'Valued Customer'}\n`;
    if (contactPerson) text += `Attention: ${contactPerson}\n`;
    if (contactEmail) text += `Email: ${contactEmail}\n`;
    if (contactPhone) text += `Phone: ${contactPhone}\n`;
    if (deliveryAddress) text += `Delivery Address: ${deliveryAddress}\n`;
    if (projectTitle) text += `Project Title: ${projectTitle}\n`;
    text += `\n----------------------------------------\n`;
    text += `LINE ITEMS & PRICING BREAKDOWN:\n`;
    text += `----------------------------------------\n`;

    items.forEach((it, idx) => {
      text += `${idx + 1}. ${it.name}\n`;
      if (it.specifications) text += `   Specs: ${it.specifications}\n`;
      text += `   Qty: ${it.quantity} pcs @ ${currencySymbol} ${it.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} = ${currencySymbol} ${(it.quantity * it.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n`;
    });

    text += `----------------------------------------\n`;
    text += `Subtotal: ${currencySymbol} ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    if (taxRate > 0) {
      text += `VAT (${taxRate}%): ${currencySymbol} ${taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    }
    if (shippingFee > 0) {
      text += `Shipping / Delivery: ${currencySymbol} ${shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    }
    if (discountAmount > 0) {
      text += `Discount: -${currencySymbol} ${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    }
    text += `GRAND TOTAL: ${currencySymbol} ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`;
    text += `----------------------------------------\n\n`;
    text += `LEAD TIME: ${leadTime}\n\n`;
    text += `TERMS & CONDITIONS:\n${termsAndNotes}\n\n`;
    text += `Prepared by: ${preparedBy}\n`;
    text += `${businessName} • ${businessContact}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download Quote as plain text file (.txt)
  const handleDownloadTextFile = () => {
    let text = `========================================\n`;
    text += `${businessName.toUpperCase()} - ${quoteTitle}\n`;
    text += `========================================\n`;
    text += `Quote Ref: ${quoteNumber}\n`;
    text += `Date Issued: ${dateIssued}\n`;
    text += `Valid Until: ${validUntil}\n`;
    text += `\nCLIENT: ${companyName || 'Valued Customer'}\n`;
    if (contactPerson) text += `Attention: ${contactPerson}\n`;
    if (contactEmail) text += `Email: ${contactEmail}\n`;
    if (contactPhone) text += `Phone: ${contactPhone}\n`;
    if (deliveryAddress) text += `Address: ${deliveryAddress}\n\n`;

    text += `ITEMS:\n`;
    items.forEach((it, idx) => {
      text += `${idx + 1}. ${it.name} | ${it.quantity} pcs @ ${currencySymbol} ${it.unitPrice.toFixed(2)} = ${currencySymbol} ${(it.quantity * it.unitPrice).toFixed(2)}\n`;
      if (it.specifications) text += `   ${it.specifications}\n`;
    });

    text += `\nSubtotal: ${currencySymbol} ${subtotal.toFixed(2)}\n`;
    if (taxRate > 0) text += `VAT (${taxRate}%): ${currencySymbol} ${taxAmount.toFixed(2)}\n`;
    if (shippingFee > 0) text += `Shipping: ${currencySymbol} ${shippingFee.toFixed(2)}\n`;
    if (discountAmount > 0) text += `Discount: -${currencySymbol} ${discountAmount.toFixed(2)}\n`;
    text += `GRAND TOTAL: ${currencySymbol} ${grandTotal.toFixed(2)}\n\n`;
    text += `TERMS:\n${termsAndNotes}\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quotation_${quoteNumber}_${(companyName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="quote-builder-tab">
      {/* Top Header & Fast Quote Action Bar */}
      <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-black text-white px-2.5 py-0.5 rounded-md">
                B2B &amp; Guest Estimations
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-bold uppercase">
                Offline &amp; Walk-in Jobs
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-tight text-black flex items-center gap-2 mt-1">
              <Calculator className="w-6 h-6 text-black" />
              Quote Builder Studio
            </h2>
            <p className="text-xs text-gray-600 mt-1 max-w-3xl">
              Create and issue formal price quotations for prospects, walk-in individuals, or non-registered companies with line items, custom branding specs, and live printing/PDF export.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl border border-black transition-all cursor-pointer shadow-md"
              id="btn-print-quote-top"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleCopyQuoteText}
              className="flex items-center justify-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-gray-200"
              title="Copy formatted quote text to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleSaveQuoteToSheets}
              className="flex items-center justify-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs uppercase px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
              title="Save quote directly to Google Sheets Quote Enquiries"
            >
              <Save className="w-4 h-4 text-amber-700" />
              <span>{savedSuccess ? 'Saved to Sheets!' : 'Save to Sheets'}</span>
            </button>

            {quoteEnquiries.length > 0 && (
              <button
                onClick={() => setShowEnquiriesModal(true)}
                className="flex items-center justify-center space-x-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold text-xs uppercase px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                title="View quotes from Google Sheets"
              >
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-mono text-[11px]">({quoteEnquiries.length}) From Sheets</span>
              </button>
            )}

            <button
              onClick={handleResetForm}
              className="flex items-center justify-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase px-3 py-2.5 rounded-xl transition-all cursor-pointer"
              title="Start New Blank Quote"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Quote</span>
            </button>
          </div>
        </div>

        {/* Quick Pre-fill / Load Helpers Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
          {/* Helper 1: Load Existing Company */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-mono font-bold text-gray-600 flex items-center gap-1">
              <Building className="w-3 h-3 text-gray-500" />
              Load From Registered Client (Optional)
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => handleSelectCompany(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none cursor-pointer"
            >
              <option value="">-- Guest / Unregistered Client --</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.contactPerson || 'No contact person'})
                </option>
              ))}
            </select>
          </div>

          {/* Helper 2: Load From Pending Quote Request */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-mono font-bold text-gray-600 flex items-center gap-1">
              <FileText className="w-3 h-3 text-gray-500" />
              Load From Quote Request (Optional)
            </label>
            <select
              value={selectedEnquiryId}
              onChange={(e) => handleSelectQuoteEnquiry(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none cursor-pointer"
            >
              <option value="">-- Start from scratch --</option>
              {quoteEnquiries.map((q) => (
                <option key={q.id} value={q.id}>
                  [#{q.enquiryNumber}] {q.companyName} - {q.productName} ({q.quantity} pcs)
                </option>
              ))}
            </select>
          </div>

          {/* Helper 3: Quick Add Catalog Item */}
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-mono font-bold text-gray-600 flex items-center gap-1">
              <Layers className="w-3 h-3 text-gray-500" />
              + Quick Add Product from ARH Catalog
            </label>
            <select
              value={selectedCatalogProductId}
              onChange={(e) => handleQuickAddProduct(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none cursor-pointer"
            >
              <option value="">-- Select Product to Add as Line Item --</option>
              {catalogProducts.map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {cp.name} ({cp.category}) - {currencySymbol} {cp.basePrice || 0}
                </option>
              ))}
              {products.map((p) => (
                <option key={`prod-${p.id}`} value={p.id}>
                  {p.name} - {currencySymbol} {p.price || 0}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Form Controls (Left) vs Live Printable Quote Document (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Quote Customizer Controls (5 cols on xl, 6 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">
          {/* SECTION 1: Quote Header & Business Specs */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-black" />
                1. Quotation Document &amp; Vendor Info
              </span>
              <span className="text-[10px] text-gray-400 font-mono">ARH Header</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Document Heading Title
                </label>
                <select
                  value={quoteTitle}
                  onChange={(e) => setQuoteTitle(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                >
                  <option value="OFFICIAL PRICE QUOTATION">OFFICIAL PRICE QUOTATION</option>
                  <option value="FORMAL B2B JOB ESTIMATE">FORMAL B2B JOB ESTIMATE</option>
                  <option value="PROJECT COST PROPOSAL">PROJECT COST PROPOSAL</option>
                  <option value="PROFORMA INVOICE &amp; QUOTE">PROFORMA INVOICE &amp; QUOTE</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Business / Company Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessName(e.target.value);
                  }}
                  placeholder="e.g. ARH PRINT HUB"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Tagline / Sub-header
                </label>
                <input
                  type="text"
                  value={businessSub}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessSub(e.target.value);
                  }}
                  placeholder="e.g. Corporate Apparel & Custom Merchandise Solutions"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Address / City
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessAddress(e.target.value);
                  }}
                  placeholder="e.g. Manila, Philippines"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Tax / TIN ID
                </label>
                <input
                  type="text"
                  value={tinNumber}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setTinNumber(e.target.value);
                  }}
                  placeholder="e.g. TIN: 009-876-543-000"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Contact / Email / Phone
                </label>
                <input
                  type="text"
                  value={businessContact}
                  onChange={(e) => {
                    isHeaderDirtyRef.current = true;
                    setBusinessContact(e.target.value);
                  }}
                  placeholder="e.g. support@domain.com | +63 912 345 6789"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Quote Reference #
                </label>
                <input
                  type="text"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Quote Status
                </label>
                <select
                  value={quoteStatus}
                  onChange={(e) => setQuoteStatus(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                >
                  <option value="Quoted">Quoted (Official)</option>
                  <option value="Draft">Draft (Internal)</option>
                  <option value="Approved">Approved / Confirmed</option>
                  <option value="Sent">Sent to Client</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Date Issued
                </label>
                <input
                  type="date"
                  value={dateIssued}
                  onChange={(e) => setDateIssued(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Production Lead Time
                </label>
                <input
                  type="text"
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  placeholder="e.g. 7-10 Business Days upon deposit"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Prepared By / Sales Rep
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 pt-2 flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-bold text-black cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLogo}
                    onChange={(e) => setShowLogo(e.target.checked)}
                    className="rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span>Display Brand Logo on Printed Quotation</span>
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 2: Client & Attention Details (Guest, Walk-in, or Corporate) */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-black" />
                2. Client &amp; Prospect Details
              </h3>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setClientType('company')}
                  className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold rounded ${
                    clientType === 'company' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Company
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('individual')}
                  className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold rounded ${
                    clientType === 'individual' ? 'bg-black text-white' : 'text-gray-600 hover:text-black'
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  {clientType === 'company' ? 'Company / Organization Name' : 'Client / Individual Full Name'} *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={clientType === 'company' ? 'e.g. Acme Corporation / St. Jude School' : 'e.g. Juan Dela Cruz'}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-black focus:border-black focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Contact Person / Attention To
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Maria Santos (Purchasing Officer)"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Contact Phone / Mobile
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +63 917 123 4567"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Contact Email Address
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. purchasing@company.com"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Project Title / Job Scope (Optional)
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Q3 Sales Summit Custom Uniforms & Merchandise"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Delivery / Billing Address
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Building 4, 32nd St, BGC, Taguig City"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-black focus:border-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Line Items & Specifications */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-black" />
                3. Quote Line Items ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-[10px] font-mono font-extrabold uppercase bg-black hover:bg-neutral-800 text-white px-3 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center space-y-2">
                  <Package className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs text-gray-500 font-mono">No line items in this quotation yet.</p>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Product Item</span>
                  </button>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5 relative group hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-1.5">
                      <span className="text-[10px] font-mono font-bold text-gray-500 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span>Product #{idx + 1}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(item)}
                          className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase text-gray-600 hover:text-black hover:bg-gray-200 rounded transition-colors cursor-pointer"
                          title="Duplicate item"
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <label className="block text-[9px] uppercase font-mono font-bold text-gray-500 mb-0.5">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="e.g. Premium Cotton Crewneck Tee"
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-black focus:border-black focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[9px] uppercase font-mono font-bold text-gray-500 mb-0.5">
                          Quantity (pcs)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-black text-center focus:border-black focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[9px] uppercase font-mono font-bold text-gray-500 mb-0.5">
                          Unit Price ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-black text-right focus:border-black focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-mono font-bold text-gray-500 mb-0.5">
                        Item Specifications / Custom Options (Color, Size, Branding, Placement)
                      </label>
                      <input
                        type="text"
                        value={item.specifications || ''}
                        onChange={(e) => handleUpdateItem(item.id, 'specifications', e.target.value)}
                        placeholder="e.g. Color: Royal Blue | Silk Screen Front Print 2-Colors | S to 3XL"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-mono text-gray-700 focus:border-black focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-gray-500 border-t border-gray-200/50">
                      <span>Line item subtotal:</span>
                      <span className="font-bold text-black">
                        {currencySymbol} {(item.quantity * item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 4: Financial Adjustments (Tax, Shipping, Discount) */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-black" />
                4. Financial Adjustments &amp; Taxes
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Totals Calculation</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  VAT / Tax Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                  />
                  <Percent className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Shipping / Delivery ({currencySymbol})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Discount Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-700 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Live Summary Widget */}
            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-1 font-mono text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Subtotal:</span>
                <span className="font-bold text-black">
                  {currencySymbol} {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>VAT ({taxRate}%):</span>
                  <span>{currencySymbol} {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {shippingFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Shipping:</span>
                  <span>{currencySymbol} {shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount:</span>
                  <span>-{currencySymbol} {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-1.5 mt-1 flex justify-between font-black text-sm text-black">
                <span>QUOTED GRAND TOTAL:</span>
                <span className="text-black">
                  {currencySymbol} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: Terms, Conditions & Footnotes */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4 shadow-2xs">
            <h3 className="text-xs uppercase font-extrabold font-mono text-black tracking-wider flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-black" />
                5. Commercial Terms &amp; Conditions
              </span>
              <button
                type="button"
                onClick={() => setTermsAndNotes(DEFAULT_QUOTE_NOTES)}
                className="text-[9px] font-mono text-gray-500 hover:text-black underline cursor-pointer"
              >
                Insert Standard Terms
              </button>
            </h3>

            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                Payment Schedule, Validity &amp; Production Terms
              </label>
              <textarea
                rows={4}
                value={termsAndNotes}
                onChange={(e) => setTermsAndNotes(e.target.value)}
                placeholder="e.g. 50% deposit upon PO confirmation; 50% prior to dispatch. Quotation valid for 14 business days."
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-mono text-gray-800 leading-relaxed focus:border-black focus:outline-none custom-scrollbar"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Official Quotation Document Preview (7 cols on xl, 6 cols on lg) */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs no-print">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-xs font-mono font-extrabold uppercase text-black block">
                  Official Quotation Document Preview
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  Live real-time rendering formatted for print and PDF archiving.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadTextFile}
                className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold font-mono px-3 py-2 rounded-xl transition-all cursor-pointer border border-gray-200"
                title="Download text summary"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Text</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-extrabold uppercase font-mono px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                id="btn-print-quote-live"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Quote</span>
              </button>
            </div>
          </div>

          {/* THE PRINTABLE QUOTATION DOCUMENT CANVAS */}
          <div
            ref={printableRef}
            className="printable-area bg-white border-2 border-black rounded-3xl p-8 md:p-10 shadow-xl space-y-7 text-black font-sans relative overflow-hidden"
            id="quote-printable-canvas"
          >
            {/* Document Header Section */}
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
                  {businessSub && <p className="text-xs text-gray-600 font-medium">{businessSub}</p>}
                  {(businessAddress || businessContact) && (
                    <p className="text-[11px] text-gray-500 font-mono">
                      {[businessAddress, businessContact].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {tinNumber && (
                    <p className="text-[10px] text-gray-400 font-mono font-bold">{tinNumber}</p>
                  )}
                </div>

                {/* Quotation Title & Ref Badge */}
                <div className="text-left sm:text-right space-y-1">
                  <span className="inline-block px-3.5 py-1 bg-black text-white text-xs font-mono font-black uppercase tracking-widest rounded-md">
                    {quoteTitle}
                  </span>
                  <div className="text-xs font-mono text-gray-800 space-y-0.5 pt-1.5">
                    <p>
                      <strong>Quote Ref #:</strong> {quoteNumber}
                    </p>
                    <p>
                      <strong>Date Issued:</strong> {dateIssued}
                    </p>
                    <p>
                      <strong>Valid Until:</strong>{' '}
                      <span className="text-black font-bold">{validUntil || '14 Days'}</span>
                    </p>
                    {leadTime && (
                      <p className="text-[10px] text-gray-500">
                        <strong>Lead Time:</strong> {leadTime}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Client & Vendor Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-mono border-b border-gray-200 pb-6">
              {/* Prepared For (Client) */}
              <div className="space-y-1 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black block mb-1">
                  PREPARED FOR / CLIENT:
                </span>
                <p className="text-sm font-black text-black uppercase">
                  {companyName || 'Valued Client'}
                </p>
                {contactPerson && (
                  <p className="text-gray-800 font-bold">Attn: {contactPerson}</p>
                )}
                {contactPhone && <p className="text-gray-600">Phone: {contactPhone}</p>}
                {contactEmail && <p className="text-gray-600">Email: {contactEmail}</p>}
                {projectTitle && (
                  <p className="text-black font-bold pt-1 mt-1 border-t border-gray-200">
                    Project: {projectTitle}
                  </p>
                )}
                {deliveryAddress && (
                  <p className="text-gray-700 pt-0.5 leading-snug">
                    <strong>Address:</strong> {deliveryAddress}
                  </p>
                )}
              </div>

              {/* Prepared By (Vendor) */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-black block mb-1">
                    ISSUED &amp; PREPARED BY:
                  </span>
                  <p className="text-sm font-black text-black uppercase">{businessName}</p>
                  <p className="text-gray-700 font-medium">{preparedBy}</p>
                  <p className="text-gray-500 font-mono text-[11px] mt-1">{businessContact}</p>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-gray-600 font-bold uppercase text-[10px]">Quote Status:</span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md border ${
                      quoteStatus === 'Approved'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : quoteStatus === 'Quoted'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : quoteStatus === 'Sent'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-gray-100 text-gray-800 border-gray-300'
                    }`}
                  >
                    {quoteStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-gray-400 block">
                LINE ITEMS &amp; SPECIFICATIONS
              </span>
              <div className="border border-black rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black text-white font-mono text-[10px] uppercase font-bold">
                      <th className="p-3 text-center w-10">#</th>
                      <th className="p-3">Item Description &amp; Custom Specs</th>
                      <th className="p-3 text-center w-20">Qty</th>
                      <th className="p-3 text-right w-32">Unit Price ({currencySymbol})</th>
                      <th className="p-3 text-right w-32">Total ({currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-400 font-mono">
                          No line items listed.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50/80">
                          <td className="p-3 font-mono text-center text-gray-400 text-[11px] align-top">
                            {idx + 1}
                          </td>
                          <td className="p-3 align-top space-y-0.5">
                            <p className="font-bold text-black">{item.name}</p>
                            {item.specifications && (
                              <p className="text-[11px] font-mono text-gray-600 leading-snug">
                                {item.specifications}
                              </p>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-center text-black align-top">
                            {item.quantity.toLocaleString()} pcs
                          </td>
                          <td className="p-3 font-mono text-right text-gray-800 align-top">
                            {item.unitPrice.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </td>
                          <td className="p-3 font-mono font-black text-right text-black align-top">
                            {(item.quantity * item.unitPrice).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms & Financial Breakdown Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-2">
              {/* Terms & Notes (Left - 7 cols) */}
              <div className="sm:col-span-7 space-y-2">
                <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-gray-400 block">
                  COMMERCIAL TERMS &amp; CONDITIONS
                </span>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 font-mono text-[11px] text-gray-700 whitespace-pre-line leading-relaxed">
                  {termsAndNotes || '—'}
                </div>
              </div>

              {/* Totals Breakdown (Right - 5 cols) */}
              <div className="sm:col-span-5 bg-gray-50 p-4 rounded-2xl border border-gray-200 font-mono text-xs space-y-2 h-fit">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-bold text-black">
                    {currencySymbol} {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {taxRate > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>VAT ({taxRate}%):</span>
                    <span>
                      {currencySymbol} {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {shippingFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping / Logistics:</span>
                    <span>
                      {currencySymbol} {shippingFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount:</span>
                    <span>
                      -{currencySymbol} {discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="border-t-2 border-black pt-2 flex justify-between font-black text-sm text-black">
                  <span>GRAND TOTAL:</span>
                  <span className="text-black">
                    {currencySymbol} {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Google Sheets Quote Enquiries */}
      {showEnquiriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white border-2 border-black max-w-2xl w-full p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-black" />
                <h3 className="font-extrabold text-sm uppercase font-mono text-black">
                  Quotes &amp; Enquiries from Google Sheets ({quoteEnquiries.length})
                </h3>
              </div>
              <button
                onClick={() => setShowEnquiriesModal(false)}
                className="text-gray-400 hover:text-black font-mono text-xs cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
              {quoteEnquiries.map((q) => (
                <div
                  key={q.id}
                  onClick={() => {
                    handleSelectQuoteEnquiry(q.id);
                    setShowEnquiriesModal(false);
                  }}
                  className="p-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-black rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-black">#{q.enquiryNumber}</span>
                      <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-bold">
                        {q.companyName || 'Guest'}
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                        {q.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      Product: {q.productName} (Qty: {q.quantity}) • Date: {q.createdAt?.split('T')[0] || 'N/A'}
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xs font-black text-black">
                      {currencySymbol} {(q.quotedTotalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteBuilder;
