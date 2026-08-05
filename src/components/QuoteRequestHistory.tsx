/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { QuoteEnquiry, CompanyProfile } from '../types';
import { DEFAULT_QUOTE_NOTES } from '../constants/quoteDefaults';
import { printElement } from '../utils/printUtils';
import {
  FileText,
  Search,
  Building,
  Mail,
  Phone,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  Palette,
  Package,
  Layers,
  Sparkles,
  Info,
  Printer,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QuoteRequestHistoryProps {
  quoteEnquiries: QuoteEnquiry[];
  activeCompany: CompanyProfile;
  onSaveQuoteEnquiry?: (updatedEnquiry: QuoteEnquiry) => void;
}

export default function QuoteRequestHistory({
  quoteEnquiries,
  activeCompany,
  onSaveQuoteEnquiry
}: QuoteRequestHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<QuoteEnquiry | null>(null);
  const [selectedQuoteForAddition, setSelectedQuoteForAddition] = useState<QuoteEnquiry | null>(null);
  const [additionNotes, setAdditionNotes] = useState('');
  const clientSheetRef = useRef<HTMLDivElement>(null);

  // Filter quote enquiries to only those belonging to the active customer company
  const companyEnquiries = quoteEnquiries.filter(q => {
    const isCompanyMatch =
      (q.companyId && q.companyId === activeCompany.id) ||
      (q.companyName && q.companyName.toLowerCase().trim() === activeCompany.name.toLowerCase().trim()) ||
      (q.contactEmail && q.contactEmail.toLowerCase().trim() === activeCompany.contactEmail.toLowerCase().trim());
    return isCompanyMatch;
  });

  const filteredEnquiries = companyEnquiries.filter(q => {
    const matchesSearch =
      q.enquiryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.notes && q.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.preferredBrandingMethod && q.preferredBrandingMethod.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: QuoteEnquiry['status']) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-black text-white font-mono text-[11px] font-bold uppercase rounded-md shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>New - Received</span>
          </span>
        );
      case 'In Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold uppercase rounded-md">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>In Review</span>
          </span>
        );
      case 'Quoted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[11px] font-bold uppercase rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Quoted - Price Ready</span>
          </span>
        );
      case 'Product Requested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 font-mono text-[11px] font-bold uppercase rounded-md shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Product Addition Requested</span>
          </span>
        );
      case 'Product Added':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono text-[11px] font-bold uppercase rounded-md shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Product Added to Catalog</span>
          </span>
        );
      case 'Declined':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-900 border border-red-300 font-mono text-[11px] font-bold uppercase rounded-md">
            <span>Declined</span>
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 border border-gray-300 font-mono text-[11px] font-bold uppercase rounded-md">
            <span>Completed / Closed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-800 font-mono text-[11px] font-bold uppercase rounded-md">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border-2 border-black p-6 rounded-2xl shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-black">
              <FileText className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight text-black">
                Quote Request History
              </h2>
            </div>
            <p className="text-xs text-gray-600 font-mono">
              Track custom product quote requests submitted to ARH Print. Monitor evaluation status and quotation updates.
            </p>
          </div>

          <div className="bg-gray-50 border border-black px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-black flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Building className="w-4 h-4 text-gray-500" />
            <span>{activeCompany.name}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border-2 border-black p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search request #, product, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-sans border border-gray-300 focus:border-black focus:outline-none rounded-xl"
            id="quote-search-input"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-mono font-bold uppercase text-gray-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-mono font-bold border border-gray-300 focus:border-black focus:outline-none bg-white rounded-xl cursor-pointer"
            id="quote-status-filter"
          >
            <option value="All">All Requests ({companyEnquiries.length})</option>
            <option value="New">New</option>
            <option value="In Review">In Review</option>
            <option value="Quoted">Quoted</option>
            <option value="Product Requested">Product Addition Requested</option>
            <option value="Product Added">Product Added to Catalog</option>
            <option value="Declined">Declined</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Request List */}
      {filteredEnquiries.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-300 p-12 text-center rounded-2xl space-y-3">
          <FileText className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-extrabold uppercase text-black">No Quote Requests Found</h3>
          <p className="text-xs text-gray-500 font-mono max-w-md mx-auto">
            {companyEnquiries.length === 0
              ? 'You have not submitted any quote requests yet. Explore ARH Products to request bulk pricing and custom decoration.'
              : 'No quote requests match your current search query or status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEnquiries.map((enquiry) => (
            <motion.div
              key={enquiry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-2 border-black p-6 rounded-2xl shadow-sm space-y-5"
            >
              {/* Ticket Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-extrabold text-sm text-black bg-gray-100 border border-black px-3 py-1 rounded-lg">
                    {enquiry.enquiryNumber}
                  </span>
                  <div>
                    <h3 className="font-black text-base uppercase text-black">
                      {enquiry.productName}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-500">
                      Submitted on {new Date(enquiry.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} at {new Date(enquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div>
                  {getStatusBadge(enquiry.status)}
                </div>
              </div>

              {/* Ticket Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Product Specifications Requested */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2 font-mono text-[10px] font-extrabold uppercase text-gray-400">
                    <Package className="w-3.5 h-3.5 text-gray-500" />
                    <span>Requested Specifications</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Quantity Needed:</span>
                      <span className="font-extrabold text-black">{enquiry.quantity} units</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Category:</span>
                      <span className="font-bold text-black">{enquiry.productCategory || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Preferred Branding:</span>
                      <span className="font-bold text-black">{enquiry.preferredBrandingMethod || 'Standard'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Preferred Colour:</span>
                      <span className="font-bold text-black">{enquiry.preferredColor || 'As Sample'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Preferred Size / Variant:</span>
                      <span className="font-bold text-black">{enquiry.preferredSize || 'Standard / One Size'}</span>
                    </div>
                  </div>

                  {/* Notes / Special Instructions - ALWAYS SHOWN */}
                  <div className="border-t border-gray-200 pt-3">
                    <span className="text-gray-500 font-mono text-[10px] font-extrabold uppercase block mb-1">
                      Notes & Custom Instructions:
                    </span>
                    <div className="bg-white border border-gray-200 p-3 rounded-lg text-gray-800 font-sans text-xs italic">
                      {enquiry.notes && enquiry.notes.trim() !== '' ? (
                        <span>"{enquiry.notes}"</span>
                      ) : (
                        <span className="text-gray-400 font-mono not-italic">None specified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Client Contact & Account Details - ALWAYS SHOWN */}
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2 font-mono text-[10px] font-extrabold uppercase text-gray-400">
                    <Building className="w-3.5 h-3.5 text-gray-500" />
                    <span>Client Contact Details</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-gray-500 shrink-0" />
                      <div>
                        <span className="text-gray-500 font-mono text-[10px] block">Company:</span>
                        <span className="font-extrabold text-black">{enquiry.companyName || activeCompany.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500 shrink-0" />
                      <div>
                        <span className="text-gray-500 font-mono text-[10px] block">Contact Person:</span>
                        <span className="font-bold text-black">{enquiry.contactPerson || activeCompany.contactPerson}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500 shrink-0" />
                      <div>
                        <span className="text-gray-500 font-mono text-[10px] block">Contact Email:</span>
                        <span className="font-mono text-black font-medium">{enquiry.contactEmail || activeCompany.contactEmail}</span>
                      </div>
                    </div>

                    {enquiry.contactPhone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                        <div>
                          <span className="text-gray-500 font-mono text-[10px] block">Phone:</span>
                          <span className="font-mono text-black font-medium">{enquiry.contactPhone}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Official Quotation Banner for Client */}
              {enquiry.quotedTotalPrice !== undefined && (
                <div className="bg-emerald-50 border-2 border-emerald-400 p-4 sm:p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 font-sans shadow-xs">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2 font-extrabold uppercase text-emerald-950 text-[11px] font-mono">
                      <div className="flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Official B2B Quotation Received</span>
                      </div>
                      {enquiry.status === 'Product Added' ? (
                        <span className="bg-emerald-200 text-emerald-950 border border-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          Product Added to Catalog
                        </span>
                      ) : (enquiry.requestedProductAddition || enquiry.status === 'Product Requested') ? (
                        <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-purple-600" />
                          Product Addition Requested
                        </span>
                      ) : null}
                    </div>
                    <div className="text-base sm:text-lg font-black text-black font-mono">
                      Quoted Total: Php {enquiry.quotedTotalPrice.toLocaleString()}
                      {enquiry.quotedUnitPrice ? (
                        <span className="text-xs font-normal text-gray-600 font-mono"> (Php {enquiry.quotedUnitPrice.toLocaleString()} / unit)</span>
                      ) : ''}
                    </div>
                    {enquiry.quotedValidUntil && (
                      <div className="text-xs font-mono text-gray-600">
                        Valid Until: <strong className="text-black">{new Date(enquiry.quotedValidUntil).toLocaleDateString()}</strong>
                      </div>
                    )}
                    {enquiry.status === 'Product Added' ? (
                      <div className="text-[11px] font-mono text-emerald-950 font-bold bg-emerald-100/90 p-2.5 rounded-xl border border-emerald-300 mt-2">
                        ✓ This item has been added to your company product catalog! You can now browse and place orders for this item in ARH Products / My Catalog.
                      </div>
                    ) : (enquiry.requestedProductAddition || enquiry.status === 'Product Requested') ? (
                      <div className="text-[11px] font-mono text-purple-900 font-semibold bg-purple-50/80 p-2.5 rounded-xl border border-purple-200 mt-2">
                        ✓ Proceed requested{enquiry.requestedProductAdditionAt ? ` on ${new Date(enquiry.requestedProductAdditionAt).toLocaleDateString()} at ${new Date(enquiry.requestedProductAdditionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}. ARH Print Hub has been notified to add this item to your company catalog.
                        {enquiry.requestedProductNotes && (
                          <div className="text-[10px] text-purple-700 italic mt-0.5 font-sans">
                            Note: "{enquiry.requestedProductNotes}"
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
                    {enquiry.status === 'Product Added' ? (
                      <div className="bg-emerald-700 text-white px-4 py-2.5 text-xs font-mono font-extrabold uppercase rounded-xl flex items-center space-x-2 shadow-xs border border-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Product Added to Catalog</span>
                      </div>
                    ) : (enquiry.requestedProductAddition || enquiry.status === 'Product Requested') ? (
                      <div className="bg-purple-700 text-white px-4 py-2.5 text-xs font-mono font-extrabold uppercase rounded-xl flex items-center space-x-2 shadow-xs border border-purple-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Product Addition Requested</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuoteForAddition(enquiry);
                          setAdditionNotes('');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-mono font-extrabold uppercase rounded-xl cursor-pointer flex items-center space-x-2 shadow-md border border-emerald-700 transition-all hover:scale-[1.01]"
                        id={`request-add-product-btn-${enquiry.id}`}
                      >
                        <Plus className="w-4 h-4" />
                        <span>Request to Add Product</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedQuoteForView(enquiry)}
                      className="bg-black text-white px-4 py-2.5 text-xs font-mono font-bold uppercase rounded-xl hover:bg-gray-800 cursor-pointer flex items-center space-x-2 shrink-0 shadow-xs border border-black"
                    >
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>View Quote Sheet</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* REQUEST PRODUCT ADDITION CONFIRMATION MODAL */}
      <AnimatePresence>
        {selectedQuoteForAddition && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-black max-w-lg w-full rounded-2xl shadow-2xl p-6 space-y-5 my-8 relative"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center space-x-2.5 text-black">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base uppercase text-black font-mono">
                      Request Product Addition
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">Proceed with Quoted Item</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuoteForAddition(null)}
                  className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 uppercase font-bold text-[10px]">Product:</span>
                  <span className="font-extrabold text-black text-sm text-right">{selectedQuoteForAddition.productName}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                  <span className="text-gray-500 uppercase font-bold text-[10px]">Quoted Total:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    Php {selectedQuoteForAddition.quotedTotalPrice?.toLocaleString()}
                    {selectedQuoteForAddition.quotedUnitPrice ? ` (Php ${selectedQuoteForAddition.quotedUnitPrice.toLocaleString()} / unit)` : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                  <span className="text-gray-500 uppercase font-bold text-[10px]">Quantity & Branding:</span>
                  <span className="font-bold text-black">
                    {selectedQuoteForAddition.quantity} units • {selectedQuoteForAddition.preferredBrandingMethod || 'Standard'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 font-sans leading-relaxed">
                Confirming will notify ARH Print Hub that your company <strong className="text-black font-semibold">{activeCompany.name}</strong> wants to proceed with this quoted item and add it as an active product in your company catalog.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-extrabold uppercase text-black">
                  Additional Catalog Setup Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={additionNotes}
                  onChange={(e) => setAdditionNotes(e.target.value)}
                  placeholder="e.g. Please include both Navy and Black options in our catalog, or mention target delivery date..."
                  className="w-full bg-gray-50 border border-gray-300 focus:border-black focus:bg-white rounded-xl p-3 text-xs focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedQuoteForAddition(null)}
                  className="bg-white border border-gray-300 text-gray-700 hover:text-black font-mono font-bold text-xs uppercase px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedQuoteForAddition) return;
                    const updated: QuoteEnquiry = {
                      ...selectedQuoteForAddition,
                      requestedProductAddition: true,
                      requestedProductAdditionAt: new Date().toISOString(),
                      requestedProductNotes: additionNotes.trim() || undefined,
                      status: 'Product Requested'
                    };
                    onSaveQuoteEnquiry?.(updated);
                    setSelectedQuoteForAddition(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-extrabold text-xs uppercase px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center space-x-2"
                  id="confirm-request-add-product-btn"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Confirm & Send Request</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLIENT QUOTATION SHEET MODAL */}
      <AnimatePresence>
        {selectedQuoteForView && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-black w-full max-w-3xl my-auto shadow-2xl overflow-hidden rounded-2xl relative flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="bg-black text-white p-4 flex items-center justify-between border-b-2 border-black shrink-0">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base uppercase text-white font-mono">
                      Official Quotation #{selectedQuoteForView.enquiryNumber}
                    </h3>
                    <span className="text-[11px] font-mono text-gray-300">
                      Prepared for {selectedQuoteForView.companyName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => printElement(clientSheetRef.current, `Quotation_${selectedQuoteForView.enquiryNumber}`)}
                    className="bg-amber-400 text-black px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg hover:bg-amber-300 cursor-pointer flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedQuoteForView(null)}
                    className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quotation Sheet Body */}
              <div ref={clientSheetRef} className="p-6 overflow-y-auto custom-scrollbar space-y-6 font-sans text-xs text-black printable-area">
                <div className="flex justify-between items-start border-b-2 border-black pb-4">
                  <div>
                    <h2 className="text-xl font-black uppercase text-black">ARH PRINT HUB</h2>
                    <div className="text-xs text-gray-600 font-mono">Corporate Printing & Merchandise Solutions</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-lg border border-black inline-block">
                      QUOTE #{selectedQuoteForView.enquiryNumber}
                    </div>
                    {selectedQuoteForView.quotedAt && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        Issued: {new Date(selectedQuoteForView.quotedAt).toLocaleDateString()}
                      </div>
                    )}
                    {selectedQuoteForView.quotedValidUntil && (
                      <div className="text-[10px] text-gray-500">
                        Valid Until: <strong>{new Date(selectedQuoteForView.quotedValidUntil).toLocaleDateString()}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-black rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black text-white font-mono text-[10px] uppercase font-bold">
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 font-mono text-xs">
                      {selectedQuoteForView.quotedLineItems && selectedQuoteForView.quotedLineItems.length > 0 ? (
                        selectedQuoteForView.quotedLineItems.map((item) => (
                          <tr key={item.id}>
                            <td className="p-2.5 font-sans font-medium">{item.description}</td>
                            <td className="p-2.5 text-center font-bold">{item.quantity}</td>
                            <td className="p-2.5 text-right">Php {item.unitPrice.toLocaleString()}</td>
                            <td className="p-2.5 text-right font-bold">Php {item.total.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-2.5 font-sans font-medium">{selectedQuoteForView.productName}</td>
                          <td className="p-2.5 text-center font-bold">{selectedQuoteForView.quantity}</td>
                          <td className="p-2.5 text-right">Php {(selectedQuoteForView.quotedUnitPrice || 0).toLocaleString()}</td>
                          <td className="p-2.5 text-right font-bold">Php {(selectedQuoteForView.quotedTotalPrice || 0).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Notes & Totals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-gray-400 block mb-1">
                      Terms & Conditions:
                    </span>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 font-mono text-[11px] text-gray-700 whitespace-pre-line">
                      {(selectedQuoteForView.quoteNotes && selectedQuoteForView.quoteNotes.trim() !== '') ? selectedQuoteForView.quoteNotes : DEFAULT_QUOTE_NOTES}
                    </div>
                  </div>

                  <div className="bg-black text-white p-4 rounded-xl font-mono space-y-2 text-right">
                    <span className="text-[10px] text-gray-400 uppercase block font-bold">Quoted Grand Total</span>
                    <div className="text-2xl font-black text-amber-400">
                      Php {(selectedQuoteForView.quotedTotalPrice || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
