/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { OrderPortal, Product, CompanyProfile, SystemSettings, Order } from '../types';
import {
  Store,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  Power,
  X,
  Search,
  Package,
  Globe,
  Clock,
  ArrowLeft,
  Inbox,
  CheckCircle2,
  User,
  Mail,
  Phone,
  MapPin,
  Sliders,
  ChevronDown
} from 'lucide-react';

interface OrderPortalsProps {
  portals: OrderPortal[];
  activeCompany: CompanyProfile;
  availableProducts: Product[];
  systemSettings: SystemSettings;
  onCreatePortal: (portal: Omit<OrderPortal, 'id' | 'createdAt' | 'updatedAt' | 'shareToken'>) => void;
  onUpdatePortal: (portal: OrderPortal) => void;
  onDeletePortal: (portalId: string) => void;
  onViewPortal: (portal: OrderPortal) => void;
  appsScriptUrl?: string;
  orders?: Order[];
  onUpdateOrders?: (newOrders: Order[]) => Promise<void>;
  onUpdateOrderStatus?: (orderId: string, newStatus: Order['status']) => void;
}

export default function OrderPortals({
  portals,
  activeCompany,
  availableProducts,
  systemSettings,
  onCreatePortal,
  onUpdatePortal,
  onDeletePortal,
  onViewPortal,
  appsScriptUrl,
  orders = [],
  onUpdateOrders,
  onUpdateOrderStatus
}: OrderPortalsProps) {
  // Filter portals belonging to active company
  const companyPortals = portals.filter(p => p.companyId === activeCompany.id);

  // Modal / Dedicated Page View State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<OrderPortal | null>(null);
  const [deletingPortal, setDeletingPortal] = useState<OrderPortal | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Paused' | 'Closed'>('Active');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [customVariantPrices, setCustomVariantPrices] = useState<Record<string, Record<string, number>>>({});

  // Portal Orders Filter & Sorting State (used when viewing a portal detail page)
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSort, setOrderSort] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'az' | 'za'>('newest');

  // UI Toast Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPortalUrl = (portal: OrderPortal) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const shareParam = portal.shareToken || portal.id;
    let url = `${origin}${pathname}?portal=${shareParam}`;
    if (portal.customPrices && Object.keys(portal.customPrices).length > 0) {
      try {
        url += `&cp=${encodeURIComponent(JSON.stringify(portal.customPrices))}`;
      } catch (e) {}
    }
    if (portal.customVariantPrices && Object.keys(portal.customVariantPrices).length > 0) {
      try {
        url += `&cvp=${encodeURIComponent(JSON.stringify(portal.customVariantPrices))}`;
      } catch (e) {}
    }
    if (appsScriptUrl && appsScriptUrl.trim()) {
      url += `&script=${encodeURIComponent(appsScriptUrl.trim())}`;
    }
    return url;
  };

  const handleCopyLink = (portal: OrderPortal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getPortalUrl(portal);
    navigator.clipboard.writeText(url);
    setCopiedId(portal.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const openCreateModal = () => {
    setEditingPortal(null);
    setName('');
    setDescription('');
    setStatus('Active');
    setSelectedProductIds(availableProducts.map(p => p.id));
    setCustomPrices({});
    setCustomVariantPrices({});
    setProductSearch('');
    setOrderSearch('');
    setOrderStatusFilter('all');
    setOrderSort('newest');
    setIsModalOpen(true);
  };

  const openEditModal = (portal: OrderPortal) => {
    setEditingPortal(portal);
    setName(portal.name);
    setDescription(portal.description || '');
    setStatus(portal.status);
    setSelectedProductIds([...portal.productIds]);
    setCustomPrices(portal.customPrices || {});
    setCustomVariantPrices(portal.customVariantPrices || {});
    setProductSearch('');
    setOrderSearch('');
    setOrderStatusFilter('all');
    setOrderSort('newest');
    setIsModalOpen(true);
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === availableProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(availableProducts.map(p => p.id));
    }
  };

  const handleSavePortal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please provide a name for your Order Portal.');
      return;
    }
    if (selectedProductIds.length === 0) {
      alert('Please select at least one product for this Order Portal.');
      return;
    }

    if (editingPortal) {
      const updated: OrderPortal = {
        ...editingPortal,
        name: name.trim(),
        description: description.trim(),
        status,
        productIds: selectedProductIds,
        customPrices,
        customVariantPrices,
        updatedAt: new Date().toISOString()
      };
      onUpdatePortal(updated);
      setEditingPortal(updated);
      alert('Storefront portal details saved successfully!');
    } else {
      onCreatePortal({
        companyId: activeCompany.id,
        companyName: activeCompany.name,
        name: name.trim(),
        description: description.trim(),
        status,
        productIds: selectedProductIds,
        customPrices,
        customVariantPrices
      });
      setIsModalOpen(false);
    }
  };

  const handleQuickStatusToggle = (portal: OrderPortal, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let nextStatus: 'Active' | 'Paused' | 'Closed' = 'Active';
    if (portal.status === 'Active') nextStatus = 'Paused';
    else if (portal.status === 'Paused') nextStatus = 'Active';
    else if (portal.status === 'Closed') nextStatus = 'Active';

    onUpdatePortal({
      ...portal,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    });
  };

  // Compute orders belonging specifically to the currently selected portal
  const editingPortalOrders = useMemo(() => {
    if (!editingPortal) return [];
    const pId = (editingPortal.id || '').trim().toLowerCase();
    const pToken = (editingPortal.shareToken || '').trim().toLowerCase();
    const pName = (editingPortal.name || '').trim().toLowerCase();
    const pCompName = (editingPortal.companyName || activeCompany?.name || '').trim().toLowerCase();

    return orders.filter(o => {
      const oPortalId = (o.portalId || '').trim().toLowerCase();
      const oPortalName = (o.portalName || '').trim().toLowerCase();
      const oNotes = (o.notes || '').toLowerCase();

      // 1. Match portal ID or shareToken
      if (oPortalId && (oPortalId === pId || (pToken && oPortalId === pToken))) {
        return true;
      }

      // 2. Match portal name (case-insensitive)
      if (oPortalName && pName && oPortalName === pName) {
        return true;
      }

      // 3. Notes contains "[order portal: <name>]"
      if (pName && oNotes.includes(`[order portal: ${pName}`)) {
        return true;
      }

      // 4. Fallback for portal orders belonging to the active company
      const isPortalOrder = o.id.startsWith('ord-portal-') || o.status === 'Pending Approval' || Boolean(o.portalId) || Boolean(o.portalName) || oNotes.includes('[order portal:');
      if (isPortalOrder) {
        const oComp = (o.companyName || '').trim().toLowerCase();
        if (oComp && pCompName && oComp === pCompName) {
          return true;
        }
      }

      return false;
    });
  }, [orders, editingPortal, activeCompany]);

  const filteredAndSortedPortalOrders = useMemo(() => {
    const list = editingPortalOrders.filter(o => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        const matchesNum = (o.orderNumber || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q);
        const matchesPO = (o.poNumber || '').toLowerCase().includes(q);
        const matchesPerson = (o.contactPerson || '').toLowerCase().includes(q);
        const matchesEmail = (o.contactEmail || '').toLowerCase().includes(q);
        return matchesNum || matchesPO || matchesPerson || matchesEmail;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (orderSort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (orderSort === 'amount_high') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      }
      if (orderSort === 'amount_low') {
        return (a.totalAmount || 0) - (b.totalAmount || 0);
      }
      if (orderSort === 'az') {
        return (a.orderNumber || '').localeCompare(b.orderNumber || '');
      }
      if (orderSort === 'za') {
        return (b.orderNumber || '').localeCompare(a.orderNumber || '');
      }
      // Default: newest first (Newer - Older)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [editingPortalOrders, orderStatusFilter, orderSearch, orderSort]);

  const filteredModalProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const activeCount = companyPortals.filter(p => p.status === 'Active').length;
  const pausedCount = companyPortals.filter(p => p.status === 'Paused').length;
  const totalProductsShared = Array.from(new Set(companyPortals.flatMap(p => p.productIds))).length;

  // -----------------------------------------------------------------------------------
  // DEDICATED STOREFRONT DETAIL & EDIT PAGE VIEW
  // -----------------------------------------------------------------------------------
  if (isModalOpen) {
    return (
      <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs">
          <div className="flex items-start sm:items-center gap-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-3 rounded-2xl bg-gray-100 hover:bg-black hover:text-white text-gray-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Return to Storefront Links"
              id="back-to-portals-btn"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-black text-white text-[9px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full font-extrabold">
                  {editingPortal ? 'Storefront Portal Page' : 'New Storefront Setup'}
                </span>
                <span className="text-xs text-gray-400 font-mono">{activeCompany.name}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-black uppercase tracking-tight font-sans">
                {editingPortal ? editingPortal.name : 'Create New Order Portal'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            {editingPortal && (
              <>
                <button
                  type="button"
                  onClick={() => onViewPortal(editingPortal)}
                  className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl border border-black shadow-xs transition-all cursor-pointer flex items-center gap-2"
                  id="view-live-storefront-btn-page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Live Storefront</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeletingPortal(editingPortal)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  id="editor-delete-portal-btn"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Shareable Link Highlight Box (If editing an existing portal) */}
        {editingPortal && (
          <div className="bg-gradient-to-r from-neutral-900 via-black to-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-gray-400">Shareable Storefront Link</span>
              </div>
              <p className="text-xs text-gray-300 font-sans">
                Share this unique link with your team, customers, or partners to collect orders directly.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-neutral-800/80 border border-neutral-700 rounded-2xl p-2 w-full md:max-w-md">
              <input
                type="text"
                readOnly
                value={getPortalUrl(editingPortal)}
                className="bg-transparent text-xs font-mono text-gray-200 w-full focus:outline-none px-2 select-all truncate"
              />
              <button
                type="button"
                onClick={(e) => handleCopyLink(editingPortal, e)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  copiedId === editingPortal.id
                    ? 'bg-emerald-600 text-white border border-emerald-600'
                    : 'bg-white text-black hover:bg-gray-100 border border-white'
                }`}
                id="copy-portal-link-detail-page"
              >
                {copiedId === editingPortal.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STOREFRONT EDIT FORM */}
        <form onSubmit={handleSavePortal} className="space-y-8">
          {/* Section 1: Identity & Controls */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-xs">
            <h3 className="text-xs font-mono uppercase font-bold text-gray-400 tracking-wider pb-3 border-b border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Store className="w-4 h-4 text-black" />
                1. Storefront Identity &amp; Access Controls
              </span>
              <span className="text-[10px] font-normal text-gray-400">Configuration</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs uppercase font-mono font-extrabold text-black">
                  Storefront Portal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Staff Uniforms, Sales Rep Apparel, Event Merch"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl px-4 py-3 text-xs font-semibold text-black focus:outline-none"
                  id="portal-name-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase font-mono font-extrabold text-black">Portal Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl px-3.5 py-3 text-xs font-bold text-black focus:outline-none cursor-pointer font-mono"
                  id="portal-status-select"
                >
                  <option value="Active">Active (Open for Orders)</option>
                  <option value="Paused">Paused (Temp Suspended)</option>
                  <option value="Closed">Closed (Disabled)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs uppercase font-mono font-extrabold text-black">
                Instructions / Description for Shoppers
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="e.g. Welcome! Please select your item, size, and color preferences. Orders will be consolidated for production."
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3.5 text-xs text-black focus:outline-none resize-none leading-relaxed font-sans"
                id="portal-description-input"
              />
            </div>
          </div>

          {/* Section 2: Included Products Selection */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-mono uppercase font-bold text-gray-400 tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-black" />
                  2. Storefront Products ({selectedProductIds.length} / {availableProducts.length} Selected)
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Select which items from your company catalog are enabled on this storefront link.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSelectAllProducts}
                className="text-xs font-mono uppercase font-extrabold text-black hover:underline cursor-pointer bg-gray-100 hover:bg-black hover:text-white px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
              >
                {selectedProductIds.length === availableProducts.length ? 'Deselect All' : 'Select All Products'}
              </button>
            </div>

            {/* Product Filter Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search catalog products..."
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl pl-10 pr-4 py-2.5 text-xs text-black focus:outline-none font-sans"
              />
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredModalProducts.map(prod => {
                const isSelected = selectedProductIds.includes(prod.id);
                const customPrice = customPrices[prod.id] !== undefined ? customPrices[prod.id] : prod.basePrice;
                const hasSizes = prod.sizeOptions && prod.sizeOptions.length > 0;
                const prodVariantPrices = customVariantPrices[prod.id] || {};

                return (
                  <div
                    key={prod.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-black bg-neutral-50 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => handleToggleProduct(prod.id)}>
                      <div className="flex items-center gap-3.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black cursor-pointer shrink-0"
                        />
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-black uppercase tracking-tight truncate">{prod.name}</h4>
                          <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                            Base: {systemSettings.currencySymbol || 'Php'} {prod.basePrice.toFixed(2)} / {prod.unit}
                          </span>
                        </div>
                      </div>

                      {prod.minQuantity > 1 && (
                        <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md shrink-0">
                          MOQ: {prod.minQuantity}
                        </span>
                      )}
                    </div>

                    {/* Custom Portal Pricing Overrides */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-mono font-bold text-gray-700 uppercase tracking-wider">
                            Storefront Display Price:
                          </label>
                          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-2 py-1 w-32 focus-within:border-black">
                            <span className="text-[10px] font-mono text-gray-400">{systemSettings.currencySymbol || 'Php'}</span>
                            <input
                              type="number"
                              step="0.01"
                              value={customPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCustomPrices(prev => ({ ...prev, [prod.id]: val }));
                              }}
                              className="w-full text-xs font-mono font-bold text-black focus:outline-none"
                            />
                          </div>
                        </div>

                        {hasSizes && (
                          <div className="mt-2 bg-white border border-gray-200 rounded-xl p-2.5 space-y-1.5">
                            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider block">
                              Variant Size Pricing:
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {prod.sizeOptions?.map(sz => {
                                const vPrice = prodVariantPrices[sz] !== undefined ? prodVariantPrices[sz] : (prod.variantPrices?.[sz] ?? customPrice);
                                return (
                                  <div key={sz} className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md p-1">
                                    <span className="text-[9px] font-mono font-bold text-black w-7 truncate">{sz}:</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={vPrice}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        setCustomVariantPrices(prev => ({
                                          ...prev,
                                          [prod.id]: {
                                            ...(prev[prod.id] || {}),
                                            [sz]: val
                                          }
                                        }));
                                      }}
                                      className="w-full text-[10px] font-mono text-black bg-transparent focus:outline-none font-bold"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredModalProducts.length === 0 && (
                <div className="col-span-2 text-center py-10 text-xs text-gray-400 font-mono bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No matching catalog products found.
                </div>
              )}
            </div>
          </div>

          {/* Save Button Bar */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <span className="text-xs font-mono text-gray-500">
              {selectedProductIds.length} product(s) active on this storefront.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white border border-gray-300 text-gray-700 hover:text-black font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all cursor-pointer"
              >
                Back to Links
              </button>
              <button
                type="submit"
                className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl border border-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                id="save-portal-details-btn"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{editingPortal ? 'Save Storefront Details' : 'Create Storefront Portal'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* SECTION 3: ALL ORDERS PLACED THROUGH THIS STOREFRONT LINK */}
        {editingPortal && (
          <div className="space-y-6 pt-4 border-t border-gray-200">
            {/* Orders Header Banner */}
            <div className="bg-neutral-900 border border-neutral-800 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-black text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                    Storefront Orders Log
                  </span>
                  <span className="text-xs font-mono text-gray-300">{editingPortal.name}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
                  Orders Received via this Link
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Complete order history placed by shoppers through this custom storefront link.
                </p>
              </div>

              <div className="flex items-center gap-4 self-start md:self-auto">
                <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 text-center min-w-[130px]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Total Orders
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {editingPortalOrders.length}
                  </span>
                </div>
                <div className="bg-neutral-800 border border-neutral-700 rounded-2xl p-4 text-center min-w-[150px]">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                    Storefront Value
                  </span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {systemSettings.currencySymbol || 'Php'} {editingPortalOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter, Search & Sort Bar */}
            <div className="bg-white border border-gray-200 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search orders by Order #, Submitter Name, Email, PO #..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-sans text-black focus:outline-none focus:border-black focus:bg-white transition-all"
                  id="portal-link-orders-search-input"
                />
                {orderSearch && (
                  <button
                    onClick={() => setOrderSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black text-xs font-mono font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter & Sort Dropdown */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 shrink-0">Status:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:border-black focus:outline-none cursor-pointer shadow-2xs font-mono"
                    id="portal-link-orders-status-filter"
                  >
                    <option value="all">All Statuses ({editingPortalOrders.length})</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="To Order">To Order</option>
                    <option value="Ordered">Ordered</option>
                    <option value="Admin Received">Admin Received</option>
                    <option value="Customer Claimed">Customer Claimed</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Picked Up">Picked Up</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Approved">Approved</option>
                    <option value="In Production">In Production</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Completed">Completed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </div>

                {/* Order Sorting Dropdown */}
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 shrink-0">Sort:</span>
                  <select
                    value={orderSort}
                    onChange={(e) => setOrderSort(e.target.value as any)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:border-black focus:outline-none cursor-pointer shadow-2xs font-sans"
                    id="portal-link-orders-sort-select"
                  >
                    <option value="newest">Newer - Older</option>
                    <option value="oldest">Older - Newer</option>
                    <option value="amount_high">Price: High to Low</option>
                    <option value="amount_low">Price: Low to High</option>
                    <option value="az">Order #: A - Z</option>
                    <option value="za">Order #: Z - A</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders Cards List */}
            {filteredAndSortedPortalOrders.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-12 text-center space-y-3">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto" />
                <h4 className="text-base font-extrabold text-black uppercase tracking-tight">No Storefront Orders</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto font-sans leading-relaxed">
                  {editingPortalOrders.length === 0
                    ? 'No orders have been submitted through this storefront link yet.'
                    : 'No portal orders match your current search and filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredAndSortedPortalOrders.map(ord => (
                  <div
                    key={ord.id}
                    className="bg-white border border-gray-200 hover:border-gray-300 rounded-3xl p-6 shadow-xs transition-all space-y-6"
                    id={`storefront-order-card-${ord.id}`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-black font-mono tracking-tight">{ord.orderNumber || ord.id}</span>
                          <span className="text-xs font-mono text-gray-400">
                            • {new Date(ord.createdAt).toLocaleDateString()} at {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="bg-gray-100 text-gray-700 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Globe className="w-3 h-3 text-gray-500" />
                            <span>{ord.portalName || editingPortal.name}</span>
                          </span>
                        </div>
                      </div>

                      {/* Status Badge & Status Selector */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1.5 ${
                            ord.status === 'Reviewed'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : ord.status === 'To Order'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : ord.status === 'Ordered'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : ord.status === 'Admin Received'
                              ? 'bg-teal-100 text-teal-900 border border-teal-300'
                              : ord.status === 'Customer Claimed'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : ord.status === 'Delivered'
                              ? 'bg-green-100 text-green-900 border border-green-300'
                              : ord.status === 'Picked Up'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                              : ord.status === 'Pending Approval' || ord.status === 'Pending'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : ord.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : ord.status === 'Canceled'
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : 'bg-gray-100 text-gray-900 border border-gray-300'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{ord.status}</span>
                          </span>

                          {(onUpdateOrderStatus || onUpdateOrders) && (
                            <select
                              value={ord.status}
                              onChange={(e) => {
                                const newStatus = e.target.value as Order['status'];
                                if (onUpdateOrderStatus) {
                                  onUpdateOrderStatus(ord.id, newStatus);
                                } else if (onUpdateOrders) {
                                  onUpdateOrders(orders.map(o => o.id === ord.id ? { ...o, status: newStatus } : o));
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-black text-[11px] font-mono font-bold rounded-xl px-2.5 py-1 focus:outline-none focus:border-black cursor-pointer shadow-2xs"
                              id={`storefront-order-status-select-${ord.id}`}
                            >
                              <option value="Reviewed">Reviewed</option>
                              <option value="To Order">To Order</option>
                              <option value="Ordered">Ordered</option>
                              <option value="Admin Received">Admin Received</option>
                              <option value="Customer Claimed">Customer Claimed</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Picked Up">Picked Up</option>
                              <option value="Pending Approval">Pending Approval</option>
                              <option value="Approved">Approved</option>
                              <option value="In Production">In Production</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Completed">Completed</option>
                              <option value="Canceled">Canceled</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Customer / Submitter Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-sans">
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-0.5">Purchaser / Submitter</span>
                        <div className="font-extrabold text-black flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{ord.contactPerson || 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-0.5">Email / Phone</span>
                        <div className="font-medium text-gray-800 space-y-0.5">
                          {ord.contactEmail && (
                            <div className="flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span>{ord.contactEmail}</span>
                            </div>
                          )}
                          {ord.contactNumber && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span>{ord.contactNumber}</span>
                            </div>
                          )}
                          {!ord.contactEmail && !ord.contactNumber && <span className="text-gray-400">N/A</span>}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-0.5">Delivery Address / Dept</span>
                        <div className="font-medium text-gray-800 flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{ord.deliveryAddress || 'Standard Corporate Delivery'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-0.5">PO Number &amp; Notes</span>
                        <div className="font-mono text-gray-800 space-y-0.5">
                          {ord.poNumber && <div className="font-bold text-black">PO: {ord.poNumber}</div>}
                          {ord.notes && <div className="text-[11px] italic text-gray-600 line-clamp-2">"{ord.notes}"</div>}
                          {!ord.poNumber && !ord.notes && <span className="text-gray-400">None provided</span>}
                        </div>
                      </div>
                    </div>

                    {/* Order Items Table */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Ordered Items Details</span>
                      <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-xl bg-gray-100 text-black font-mono font-extrabold flex items-center justify-center shrink-0">
                                {it.quantity}x
                              </span>
                              <div>
                                <span className="font-extrabold text-black uppercase tracking-tight block">{it.productName || (it as any).name}</span>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-gray-500 font-mono">
                                  {it.selectedSize && <span className="bg-gray-100 px-2 py-0.5 rounded">Size: {it.selectedSize}</span>}
                                  {it.selectedColor && <span className="bg-gray-100 px-2 py-0.5 rounded">Color: {it.selectedColor}</span>}
                                  {it.customDetails && Object.entries(it.customDetails).map(([k, v]) => (
                                    <span key={k} className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-bold">
                                      {k}: {String(v)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="text-right font-mono self-end sm:self-auto">
                              <span className="text-xs text-gray-500">
                                {systemSettings.currencySymbol || 'Php'} {it.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} / ea
                              </span>
                              <div className="font-extrabold text-black text-sm">
                                {systemSettings.currencySymbol || 'Php'} {(it.price * it.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total Amount Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 font-mono">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Order Amount</span>
                      <span className="text-xl font-black text-black">
                        {systemSettings.currencySymbol || 'Php'} {ord.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Delete Portal Custom Confirmation Modal */}
        {deletingPortal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3 text-red-600">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-black uppercase tracking-tight">Delete Order Portal?</h3>
                    <p className="text-xs text-gray-500 font-mono">This action cannot be undone</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingPortal(null)}
                  className="text-gray-400 hover:text-black p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-600 font-sans leading-relaxed">
                Are you sure you want to delete <strong className="text-black font-bold">"{deletingPortal.name}"</strong>? The shareable storefront link will be deactivated immediately and shoppers will no longer be able to place orders through it.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeletingPortal(null)}
                  className="bg-white border border-gray-300 text-gray-700 hover:text-black font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePortal(deletingPortal.id);
                    if (editingPortal?.id === deletingPortal.id) {
                      setIsModalOpen(false);
                      setEditingPortal(null);
                    }
                    setDeletingPortal(null);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl border border-red-600 shadow-md transition-all cursor-pointer flex items-center gap-2"
                  id="confirm-delete-portal-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Yes, Delete Portal</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------------------
  // MAIN STOREFRONT PORTALS LIST VIEW
  // -----------------------------------------------------------------------------------
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1 max-w-2xl">
          <h2 className="text-2xl font-black text-black uppercase tracking-tight font-sans">
            Custom Order Portals
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed font-sans">
            Create tailored ordering links for your employees, sales teams, departments, or resellers.
            Shoppers select sizes and options directly without logging into your corporate account.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl border border-black shadow-md transition-all cursor-pointer flex items-center gap-2 shrink-0"
          id="create-order-portal-btn"
        >
          <Plus className="w-4 h-4 stroke-[3px]" />
          <span>Create Order Portal</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block mb-1">Total Portals</span>
          <span className="text-2xl font-black text-black font-mono">{companyPortals.length}</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block mb-1">Active Links</span>
          <span className="text-2xl font-black text-emerald-600 font-mono">{activeCount}</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block mb-1">Paused / Closed</span>
          <span className="text-2xl font-black text-amber-600 font-mono">{pausedCount}</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-gray-400 block mb-1">Products Shared</span>
          <span className="text-2xl font-black text-black font-mono">{totalProductsShared}</span>
        </div>
      </div>

      {/* Storefront Link Cards Grid */}
      {companyPortals.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
            <Store className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-black uppercase tracking-tight">No Order Portals Yet</h3>
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              Build your first ordering portal to let staff or resellers order specific products with personalized options.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-black text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl border border-black hover:bg-neutral-800 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Portal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {companyPortals.map((portal) => {
            const portalSet = new Set((portal.productIds || []).map(id => String(id).trim()));
            const portalProducts = portalSet.size > 0
              ? availableProducts.filter(p => portalSet.has(String(p.id).trim()))
              : availableProducts;
            const portalUrl = getPortalUrl(portal);

            // Calculate total orders for this portal card
            const portalOrderCount = orders.filter(o =>
              o.portalId === portal.id ||
              o.portalName === portal.name ||
              (portal.shareToken && o.portalId === portal.shareToken)
            ).length;

            return (
              <div
                key={portal.id}
                onClick={() => openEditModal(portal)}
                className="bg-white border border-gray-200 hover:border-black rounded-3xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-6 group"
                id={`portal-card-${portal.id}`}
              >
                {/* Card Header & Metadata */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-black uppercase tracking-tight truncate group-hover:text-amber-600 transition-colors">
                          {portal.name}
                        </h3>
                      </div>
                      {portal.description ? (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-sans">
                          {portal.description}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 italic font-sans">
                          Click card to manage storefront details &amp; view orders
                        </p>
                      )}
                    </div>

                    {/* Status & Orders Badge */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {portal.status === 'Active' && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      )}
                      {portal.status === 'Paused' && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Paused
                        </span>
                      )}
                      {portal.status === 'Closed' && (
                        <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                          <Power className="w-3 h-3 text-gray-400" />
                          Closed
                        </span>
                      )}

                      <span className="bg-gray-100 text-gray-700 text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md">
                        {portalOrderCount} Order{portalOrderCount === 1 ? '' : 's'} Recv.
                      </span>
                    </div>
                  </div>

                  {/* Products Included Chips */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold uppercase text-gray-400">
                      <span>Products Included ({portalProducts.length})</span>
                      <span className="text-[10px] font-normal text-gray-400">From Company Catalog</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                      {portalProducts.map(prod => (
                        <div
                          key={prod.id}
                          className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-[11px] font-sans font-semibold text-black flex items-center gap-1.5"
                        >
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-4 h-4 rounded-md object-cover" />
                          ) : (
                            <Package className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className="truncate max-w-[140px]">{prod.name}</span>
                        </div>
                      ))}
                      {portalProducts.length === 0 && (
                        <span className="text-xs text-amber-600 font-mono italic">No active products selected</span>
                      )}
                    </div>
                  </div>

                  {/* Shareable Link Box */}
                  <div className="space-y-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-400">Shareable Storefront Link</label>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2">
                      <input
                        type="text"
                        readOnly
                        value={portalUrl}
                        className="bg-transparent text-xs font-mono text-gray-700 w-full focus:outline-none px-2 select-all truncate"
                      />
                      <button
                        onClick={(e) => handleCopyLink(portal, e)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                          copiedId === portal.id
                            ? 'bg-emerald-600 text-white border border-emerald-600'
                            : 'bg-black text-white hover:bg-neutral-800 border border-black'
                        }`}
                        id={`copy-portal-link-${portal.id}`}
                      >
                        {copiedId === portal.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onViewPortal(portal)}
                      className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-3.5 rounded-xl border border-black transition-all cursor-pointer flex items-center gap-1.5"
                      id={`view-portal-btn-${portal.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Storefront</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(portal)}
                      className="bg-white hover:bg-gray-50 text-black border border-gray-300 font-bold text-xs uppercase tracking-wider py-2 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      id={`edit-portal-btn-${portal.id}`}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-black" />
                      <span>Edit &amp; View Orders</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleQuickStatusToggle(portal, e)}
                      className={`text-xs font-mono font-bold uppercase tracking-wider py-2 px-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                        portal.status === 'Active'
                          ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                      title="Toggle Portal Status"
                      id={`toggle-status-btn-${portal.id}`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{portal.status === 'Active' ? 'Pause' : 'Activate'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingPortal(portal);
                      }}
                      className="text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete Portal"
                      id={`delete-portal-btn-${portal.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Portal Custom Confirmation Modal */}
      {deletingPortal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-black uppercase tracking-tight">Delete Order Portal?</h3>
                  <p className="text-xs text-gray-500 font-mono">This action cannot be undone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingPortal(null)}
                className="text-gray-400 hover:text-black p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 font-sans leading-relaxed">
              Are you sure you want to delete <strong className="text-black font-bold">"{deletingPortal.name}"</strong>? The shareable storefront link will be deactivated immediately and shoppers will no longer be able to place orders through it.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeletingPortal(null)}
                className="bg-white border border-gray-300 text-gray-700 hover:text-black font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePortal(deletingPortal.id);
                  setDeletingPortal(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl border border-red-600 shadow-md transition-all cursor-pointer flex items-center gap-2"
                id="confirm-delete-portal-btn"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Portal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
