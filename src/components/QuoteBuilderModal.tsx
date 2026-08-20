/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QuoteEnquiry, QuoteLineItem } from '../types';
import { DEFAULT_QUOTE_NOTES } from '../constants/quoteDefaults';
import { printElement } from '../utils/printUtils';
import {
  X,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
  Copy,
  Check,
  Building,
  Mail,
  Phone,
  FileText,
  Clock,
  Sparkles,
  Percent,
  Calendar,
  Send,
  Eye,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuoteBuilderModalProps {
  enquiry: QuoteEnquiry | null;
  currencySymbol?: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveQuote: (updatedEnquiry: QuoteEnquiry) => void;
  hubName?: string;
  appLogoUrl?: string;
  adminEmail?: string;
  companyTagline?: string;
  companyAddress?: string;
  taxId?: string;
}

export default function QuoteBuilderModal({
  enquiry,
  currencySymbol = 'Php',
  isOpen,
  onClose,
  onSaveQuote,
  hubName = 'ARH PRINT HUB',
  appLogoUrl,
  adminEmail,
  companyTagline,
  companyAddress,
  taxId
}: QuoteBuilderModalProps) {
  if (!isOpen || !enquiry) return null;

  // View Mode: 'edit' or 'preview'
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [copied, setCopied] = useState(false);

  // Line Items State
  const buildItemDesc = (enq: QuoteEnquiry) => {
    let desc = enq.productName;
    const parts: string[] = [];
    if (enq.preferredBrandingMethod) parts.push(`Branding: ${enq.preferredBrandingMethod}`);
    if (enq.preferredColor) parts.push(`Color: ${enq.preferredColor}`);
    if (enq.preferredSize) parts.push(`Size: ${enq.preferredSize}`);
    if (parts.length > 0) desc += ` (${parts.join(' • ')})`;
    return desc;
  };

  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(() => {
    if (enquiry.quotedLineItems && enquiry.quotedLineItems.length > 0) {
      return enquiry.quotedLineItems;
    }
    const initialUnitPrice = enquiry.quotedUnitPrice || 0;
    const initialQty = enquiry.quantity || 1;
    return [
      {
        id: 'main-item',
        description: buildItemDesc(enquiry),
        quantity: initialQty,
        unitPrice: initialUnitPrice,
        total: initialQty * initialUnitPrice
      }
    ];
  });

  // Additional Fields
  const [taxRatePercent, setTaxRatePercent] = useState<number>(() => {
    if (enquiry.quotedTax && enquiry.quotedTotalPrice) {
      // Estimate tax %
      const sub = enquiry.quotedTotalPrice - enquiry.quotedTax - (enquiry.quotedShipping || 0);
      if (sub > 0) return Math.round((enquiry.quotedTax / sub) * 100);
    }
    return 0;
  });

  const [shippingFee, setShippingFee] = useState<number>(enquiry.quotedShipping || 0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Default expiration date = 14 days from today or saved validUntil
  const [validUntil, setValidUntil] = useState<string>(() => {
    if (enquiry.quotedValidUntil) return enquiry.quotedValidUntil;
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const [quoteNotes, setQuoteNotes] = useState<string>(() => {
    if (enquiry.quoteNotes && enquiry.quoteNotes.trim() !== '') return enquiry.quoteNotes;
    return DEFAULT_QUOTE_NOTES;
  });

  const [quoteStatus, setQuoteStatus] = useState<QuoteEnquiry['status']>(enquiry.status === 'New' ? 'Quoted' : enquiry.status);
  const printableRef = useRef<HTMLDivElement>(null);

  // Reset or Sync when enquiry changes
  useEffect(() => {
    if (enquiry) {
      if (enquiry.quotedLineItems && enquiry.quotedLineItems.length > 0) {
        setLineItems(enquiry.quotedLineItems);
      } else {
        const uPrice = enquiry.quotedUnitPrice || 0;
        const qQty = enquiry.quantity || 1;
        setLineItems([
          {
            id: 'main-item',
            description: buildItemDesc(enquiry),
            quantity: qQty,
            unitPrice: uPrice,
            total: qQty * uPrice
          }
        ]);
      }
      setShippingFee(enquiry.quotedShipping || 0);
      setValidUntil(enquiry.quotedValidUntil || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
      setQuoteNotes((enquiry.quoteNotes && enquiry.quoteNotes.trim() !== '') ? enquiry.quoteNotes : DEFAULT_QUOTE_NOTES);
      setQuoteStatus(enquiry.status === 'New' ? 'Quoted' : enquiry.status);
    }
  }, [enquiry?.id]);

  // Calculations
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (item.total || 0), 0);
  }, [lineItems]);

  const taxAmount = useMemo(() => {
    return Math.round(subtotal * (taxRatePercent / 100));
  }, [subtotal, taxRatePercent]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + taxAmount + shippingFee - discountAmount);
  }, [subtotal, taxAmount, shippingFee, discountAmount]);

  // Main Item Unit Price derived
  const mainUnitPrice = lineItems[0]?.unitPrice || 0;

  // Handlers for Line Items
  const handleUpdateLineItem = (id: string, field: keyof QuoteLineItem, value: any) => {
    setLineItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
            const price = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
            updated.total = qty * price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleAddLineItem = () => {
    const newItem: QuoteLineItem = {
      id: `item-${Date.now()}`,
      description: 'Logo Setup / Plate Fee',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return; // Keep at least one item
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  // Submit Handler
  const handleSaveAndIssueQuote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedEnquiry: QuoteEnquiry = {
      ...enquiry,
      status: quoteStatus,
      quotedUnitPrice: mainUnitPrice,
      quotedTotalPrice: grandTotal,
      quotedTax: taxAmount,
      quotedShipping: shippingFee,
      quoteNotes: quoteNotes.trim(),
      quotedValidUntil: validUntil,
      quotedAt: new Date().toISOString(),
      quotedLineItems: lineItems
    };

    onSaveQuote(updatedEnquiry);
    onClose();
  };

  // Copy Quotation Summary text to clipboard
  const handleCopyQuotationText = () => {
    const text = `=========================================
OFFICIAL B2B QUOTATION - ARH PRINT HUB
=========================================
Quote Ref: ${enquiry.enquiryNumber}
Date: ${new Date().toLocaleDateString()}
Valid Until: ${validUntil ? new Date(validUntil).toLocaleDateString() : 'N/A'}

CLIENT DETAILS:
Company: ${enquiry.companyName}
Contact Person: ${enquiry.contactPerson}
Email: ${enquiry.contactEmail}
Phone: ${enquiry.contactPhone || 'N/A'}

ITEMIZED BREAKDOWN:
${lineItems.map(it => `- ${it.description}: ${it.quantity} x ${currencySymbol} ${it.unitPrice.toLocaleString()} = ${currencySymbol} ${it.total.toLocaleString()}`).join('\n')}

Subtotal: ${currencySymbol} ${subtotal.toLocaleString()}
${taxRatePercent > 0 ? `VAT (${taxRatePercent}%): ${currencySymbol} ${taxAmount.toLocaleString()}\n` : ''}${shippingFee > 0 ? `Shipping / Freight: ${currencySymbol} ${shippingFee.toLocaleString()}\n` : ''}${discountAmount > 0 ? `Discount: -${currencySymbol} ${discountAmount.toLocaleString()}\n` : ''}GRAND TOTAL: ${currencySymbol} ${grandTotal.toLocaleString()}

TERMS & NOTES:
${quoteNotes}
=========================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintQuotation = () => {
    printElement(printableRef.current, `Quotation_${enquiry.enquiryNumber}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border-2 border-black w-full max-w-4xl my-auto shadow-2xl overflow-hidden rounded-2xl relative flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="bg-black text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-black shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                <Calculator className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white">
                    Quote Builder & Calculator
                  </h3>
                  <span className="bg-amber-400 text-black text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md uppercase">
                    {enquiry.enquiryNumber}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-gray-300 block">
                  Generating formal quotation for <strong className="text-white">{enquiry.companyName}</strong>
                </span>
              </div>
            </div>

            {/* View Mode Switcher + Close */}
            <div className="flex items-center space-x-2">
              <div className="bg-gray-800 p-1 rounded-lg flex items-center space-x-1 border border-gray-700">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded-md cursor-pointer transition-colors flex items-center space-x-1 ${
                    viewMode === 'edit'
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Build</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded-md cursor-pointer transition-colors flex items-center space-x-1 ${
                    viewMode === 'preview'
                      ? 'bg-amber-400 text-black shadow-xs'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Quote</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
            {/* Customer Request Summary Bar */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-gray-400 block mb-1">Client Contact</span>
                <div className="font-bold text-black text-sm">{enquiry.companyName}</div>
                <div className="text-gray-600">{enquiry.contactPerson} ({enquiry.contactEmail})</div>
                {enquiry.contactPhone && <div className="text-gray-500 font-mono text-[11px]">{enquiry.contactPhone}</div>}
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-gray-400 block mb-1">Requested Product</span>
                <div className="font-bold text-black">{enquiry.productName}</div>
                <div className="font-mono text-[11px] text-gray-600">
                  Qty: <strong className="text-black">{enquiry.quantity} pcs</strong> | Category: {enquiry.productCategory}
                </div>
                {(enquiry.preferredBrandingMethod || enquiry.preferredColor || enquiry.preferredSize) && (
                  <div className="font-mono text-[11px] text-gray-500 mt-0.5">
                    {[
                      enquiry.preferredBrandingMethod ? `Branding: ${enquiry.preferredBrandingMethod}` : null,
                      enquiry.preferredColor ? `Color: ${enquiry.preferredColor}` : null,
                      enquiry.preferredSize ? `Size: ${enquiry.preferredSize}` : null
                    ].filter(Boolean).join(' • ')}
                  </div>
                )}
              </div>

              <div>
                <span className="font-mono text-[10px] font-bold uppercase text-gray-400 block mb-1">Customer Notes</span>
                <div className="text-gray-700 italic bg-white p-2 rounded-lg border border-gray-200 text-[11px] max-h-16 overflow-y-auto">
                  {enquiry.notes && enquiry.notes.trim() !== '' ? `"${enquiry.notes}"` : <span className="text-gray-400 not-italic font-mono">No special notes</span>}
                </div>
              </div>
            </div>

            {/* BUILD / EDIT MODE */}
            {viewMode === 'edit' && (
              <form onSubmit={handleSaveAndIssueQuote} className="space-y-6">
                {/* Line Items Editor Section */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-gray-100 p-3.5 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-black" />
                      <h4 className="font-mono font-extrabold text-xs uppercase tracking-wider text-black">
                        Quote Line Items & Pricing Breakdown
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="bg-black text-white px-3 py-1.5 text-[11px] font-mono font-bold uppercase rounded-lg hover:bg-gray-800 cursor-pointer flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Extra Line Item</span>
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="hidden sm:grid sm:grid-cols-12 gap-3 text-[10px] font-mono font-extrabold uppercase text-gray-400 px-2">
                      <div className="sm:col-span-6">Item Description</div>
                      <div className="sm:col-span-2 text-center">Qty</div>
                      <div className="sm:col-span-2 text-right">Unit Price ({currencySymbol})</div>
                      <div className="sm:col-span-2 text-right">Line Total ({currencySymbol})</div>
                    </div>

                    {lineItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 p-3 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                      >
                        {/* Description */}
                        <div className="sm:col-span-6">
                          <label className="sm:hidden text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                            placeholder="Line item description..."
                            className="w-full p-2 border border-gray-300 text-xs font-sans rounded-lg focus:border-black focus:outline-none bg-white"
                            required
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="sm:hidden text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => handleUpdateLineItem(item.id, 'quantity', e.target.value)}
                            className="w-full p-2 border border-gray-300 text-xs font-mono font-bold text-center rounded-lg focus:border-black focus:outline-none bg-white"
                            required
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="sm:col-span-2">
                          <label className="sm:hidden text-[10px] font-mono font-bold uppercase text-gray-500 block mb-1">
                            Unit Price ({currencySymbol})
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">
                              {currencySymbol}
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', e.target.value)}
                              className="w-full pl-8 pr-2 py-2 border border-gray-300 text-xs font-mono font-bold text-right rounded-lg focus:border-black focus:outline-none bg-white"
                              required
                            />
                          </div>
                        </div>

                        {/* Total + Delete */}
                        <div className="sm:col-span-2 flex items-center justify-end space-x-2">
                          <div className="text-right font-mono font-extrabold text-xs text-black">
                            {currencySymbol} {item.total.toLocaleString()}
                          </div>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Pricing Adjustments (Tax, Shipping, Discount) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Taxes, Shipping, Dates */}
                  <div className="space-y-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                    <h5 className="font-mono text-xs font-extrabold uppercase text-gray-700 flex items-center space-x-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      <span>Adjustments & Validity</span>
                    </h5>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Tax Rate % */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">
                          Tax Rate (% VAT)
                        </label>
                        <select
                          value={taxRatePercent}
                          onChange={(e) => setTaxRatePercent(Number(e.target.value))}
                          className="w-full p-2 border border-gray-300 text-xs font-mono rounded-lg focus:border-black focus:outline-none bg-white"
                        >
                          <option value={0}>0% (Tax Exempt / Net)</option>
                          <option value={12}>12% VAT</option>
                          <option value={5}>5% Custom Tax</option>
                          <option value={10}>10% Tax</option>
                        </select>
                      </div>

                      {/* Shipping Fee */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">
                          Freight / Shipping ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={shippingFee}
                          onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                          className="w-full p-2 border border-gray-300 text-xs font-mono font-bold rounded-lg focus:border-black focus:outline-none bg-white"
                        />
                      </div>

                      {/* Overall Discount */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">
                          Discount ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                          className="w-full p-2 border border-gray-300 text-xs font-mono font-bold rounded-lg focus:border-black focus:outline-none bg-white"
                        />
                      </div>

                      {/* Valid Until Date */}
                      <div>
                        <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">
                          Valid Until Date
                        </label>
                        <input
                          type="date"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                          className="w-full p-2 border border-gray-300 text-xs font-mono rounded-lg focus:border-black focus:outline-none bg-white"
                        />
                      </div>
                    </div>

                    {/* Status Picker */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-1">
                        Quote Status
                      </label>
                      <select
                        value={quoteStatus}
                        onChange={(e) => setQuoteStatus(e.target.value as any)}
                        className="w-full p-2 border border-gray-300 text-xs font-mono font-bold uppercase rounded-lg focus:border-black focus:outline-none bg-white"
                      >
                        <option value="Quoted">Quoted (Official Quote Issued)</option>
                        <option value="In Review">In Review (Drafting / Under Evaluation)</option>
                        <option value="Closed">Closed / Order Approved</option>
                        <option value="Declined">Declined</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Column: Financial Summary Card */}
                  <div className="bg-black text-white p-5 rounded-xl space-y-4 flex flex-col justify-between shadow-md">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                        <span className="font-mono text-xs text-gray-400 uppercase font-bold">Calculation Summary</span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Real-Time</span>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Subtotal:</span>
                          <span className="font-bold text-white">{currencySymbol} {subtotal.toLocaleString()}</span>
                        </div>

                        {taxRatePercent > 0 && (
                          <div className="flex items-center justify-between text-gray-300">
                            <span>Tax / VAT ({taxRatePercent}%):</span>
                            <span>+ {currencySymbol} {taxAmount.toLocaleString()}</span>
                          </div>
                        )}

                        {shippingFee > 0 && (
                          <div className="flex items-center justify-between text-gray-300">
                            <span>Freight / Shipping:</span>
                            <span>+ {currencySymbol} {shippingFee.toLocaleString()}</span>
                          </div>
                        )}

                        {discountAmount > 0 && (
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>Discount:</span>
                            <span>- {currencySymbol} {discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Grand Total Highlight */}
                    <div className="border-t border-gray-800 pt-3">
                      <span className="text-[10px] font-mono uppercase text-gray-400 block font-bold">
                        Quoted Grand Total
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                        {currencySymbol} {grandTotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Terms & Conditions Notes */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono font-bold uppercase text-black">
                    Official Quotation Terms & Admin Notes
                  </label>
                  <textarea
                    rows={3}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Enter payment terms, delivery timelines, validity details..."
                    className="w-full p-3 border border-gray-300 text-xs font-mono rounded-xl focus:border-black focus:outline-none bg-white"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleCopyQuotationText}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-mono font-bold uppercase rounded-xl border border-gray-300 cursor-pointer flex items-center justify-center space-x-1.5 w-full sm:w-auto"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy Quote Text'}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 text-xs font-mono font-bold uppercase text-gray-600 hover:text-black cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-black text-white px-6 py-2.5 text-xs font-mono font-extrabold uppercase tracking-wider hover:bg-gray-800 cursor-pointer rounded-xl shadow-md border border-black flex items-center justify-center space-x-2 w-full sm:w-auto"
                    >
                      <Send className="w-4 h-4 text-amber-400" />
                      <span>Save & Sync Quote</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* PREVIEW FORMAL QUOTATION DOCUMENT MODE */}
            {viewMode === 'preview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Print Control Bar */}
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <span className="text-xs font-mono text-amber-900 font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Official B2B Quotation Document Ready</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleCopyQuotationText}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-xs font-mono font-bold uppercase rounded-lg hover:bg-gray-100 cursor-pointer flex items-center space-x-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrintQuotation}
                      className="px-3.5 py-1.5 bg-black text-white text-xs font-mono font-bold uppercase rounded-lg hover:bg-gray-800 cursor-pointer flex items-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Print Quote</span>
                    </button>
                  </div>
                </div>

                {/* Print Sheet Container */}
                <div ref={printableRef} className="bg-white border-2 border-black p-8 rounded-2xl shadow-lg space-y-6 font-sans text-xs text-black printable-area">
                  {/* Document Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-black pb-6 gap-4">
                    <div>
                      {appLogoUrl && (
                        <img
                          src={appLogoUrl}
                          alt={hubName}
                          className="h-8 w-auto object-contain mb-2 max-w-[160px]"
                        />
                      )}
                      <h1 className="text-xl font-black uppercase tracking-tight text-black">
                        {hubName || 'ARH PRINT HUB'}
                      </h1>
                      {companyTagline && (
                        <div className="text-xs text-gray-600 font-mono">
                          {companyTagline}
                        </div>
                      )}
                      {(companyAddress || adminEmail) && (
                        <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {[adminEmail ? `Email: ${adminEmail}` : '', companyAddress].filter(Boolean).join(' | ')}
                        </div>
                      )}
                      {taxId && (
                        <div className="text-[10px] text-gray-400 font-mono font-bold mt-0.5">
                          {taxId}
                        </div>
                      )}
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-extrabold uppercase text-black bg-gray-100 px-3 py-1 rounded-lg border border-black inline-block">
                        QUOTATION #{enquiry.enquiryNumber}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-2">
                        Date Issued: {new Date().toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Valid Until: <strong className="text-black">{validUntil ? new Date(validUntil).toLocaleDateString() : '14 Days'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Client & Vendor Grid */}
                  <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-gray-400 block mb-1">
                        PREPARED FOR:
                      </span>
                      <div className="font-bold text-sm text-black uppercase">{enquiry.companyName}</div>
                      <div>Attn: {enquiry.contactPerson}</div>
                      <div className="font-mono text-gray-600">{enquiry.contactEmail}</div>
                      {enquiry.contactPhone && <div className="font-mono text-gray-600">{enquiry.contactPhone}</div>}
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-[10px] font-bold uppercase text-gray-400 block mb-1">
                        PREPARED BY:
                      </span>
                      <div className="font-bold text-sm text-black">ARH PRINT HUB SALES</div>
                      <div className="font-mono text-gray-600">Official Accounts Team</div>
                      <div className="font-mono text-emerald-700 font-bold mt-1 uppercase">Status: {quoteStatus}</div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="border border-black rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black text-white font-mono text-[10px] uppercase font-bold">
                          <th className="p-3">#</th>
                          <th className="p-3">Item Description</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-right">Unit Price ({currencySymbol})</th>
                          <th className="p-3 text-right">Total ({currencySymbol})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 font-sans text-xs">
                        {lineItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-3 font-medium text-black">{item.description}</td>
                            <td className="p-3 font-mono font-bold text-center">{item.quantity}</td>
                            <td className="p-3 font-mono text-right">{currencySymbol} {item.unitPrice.toLocaleString()}</td>
                            <td className="p-3 font-mono font-bold text-right">{currencySymbol} {item.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-gray-200 pt-4">
                    <div className="space-y-2 flex-1">
                      <span className="font-mono text-[10px] font-bold uppercase text-gray-400 block">
                        Terms & Conditions
                      </span>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-[11px] text-gray-700 whitespace-pre-line leading-relaxed">
                        {quoteNotes}
                      </div>
                    </div>

                    <div className="w-full sm:w-72 bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-xs space-y-2">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="font-bold text-black">{currencySymbol} {subtotal.toLocaleString()}</span>
                      </div>
                      {taxRatePercent > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>VAT ({taxRatePercent}%):</span>
                          <span>{currencySymbol} {taxAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {shippingFee > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Shipping:</span>
                          <span>{currencySymbol} {shippingFee.toLocaleString()}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-bold">
                          <span>Discount:</span>
                          <span>-{currencySymbol} {discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t border-black pt-2 flex justify-between font-extrabold text-sm text-black">
                        <span>GRAND TOTAL:</span>
                        <span className="text-black">{currencySymbol} {grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('edit')}
                    className="px-4 py-2 border border-gray-300 text-xs font-mono font-bold uppercase rounded-xl hover:bg-gray-100 cursor-pointer"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveAndIssueQuote()}
                    className="bg-black text-white px-6 py-2 text-xs font-mono font-extrabold uppercase rounded-xl hover:bg-gray-800 cursor-pointer shadow-md flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>Save & Sync Quote</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
