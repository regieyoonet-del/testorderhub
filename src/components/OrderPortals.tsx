/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OrderPortal, Product, CompanyProfile, SystemSettings, Order, OrderItem } from '../types';
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
  Layers,
  Globe,
  Share2,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Inbox,
  CheckSquare,
  Square,
  Send,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  XCircle,
  MessageSquare
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
  // Section Navigation Tab State
  const [activeSection, setActiveSection] = useState<'portals' | 'submissions'>('portals');

  // Filter portals belonging to active company
  const companyPortals = portals.filter(p => p.companyId === activeCompany.id);

  // Compute portal orders for active company
  const companyPortalOrders = orders.filter(o =>
    o.companyName.toLowerCase() === activeCompany.name.toLowerCase() &&
    (o.id.startsWith('ord-portal-') || Boolean(o.portalId) || Boolean(o.portalName) || o.status === 'Pending Approval')
  );

  const pendingPortalOrders = companyPortalOrders.filter(o => o.status === 'Pending Approval');

  // Submissions Tab Filter & Batch State
  const [submissionFilter, setSubmissionFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const filteredSubmissions = companyPortalOrders.filter(o => {
    if (submissionFilter === 'pending') return o.status === 'Pending Approval';
    if (submissionFilter === 'approved') return o.status !== 'Pending Approval';
    return true;
  });

  const handleSelectAllSubmissions = () => {
    if (selectedOrderIds.length === filteredSubmissions.length && filteredSubmissions.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredSubmissions.map(o => o.id));
    }
  };

  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBatchUpdateStatus = async (newStatus: Order['status']) => {
    if (selectedOrderIds.length === 0) return;
    setIsProcessingBatch(true);
    try {
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));

      if (newStatus === 'Approved' && selectedOrders.length > 1) {
        // Consolidate selected portal submissions into 1 single order card for Admin
        const primary = selectedOrders[0];

        // Combine items & sum quantities for identical items
        const consolidatedItems: OrderItem[] = [];
        selectedOrders.forEach(ord => {
          (ord.items || []).forEach(item => {
            const customStr = JSON.stringify(item.customDetails || {});
            const existing = consolidatedItems.find(i =>
              i.productId === item.productId &&
              (i.selectedSize || '') === (item.selectedSize || '') &&
              (i.selectedColor || '') === (item.selectedColor || '') &&
              JSON.stringify(i.customDetails || {}) === customStr
            );
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              consolidatedItems.push({ ...item });
            }
          });
        });

        const totalAmount = selectedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const orderSummaries = selectedOrders.map((o, idx) => {
          const itemSummary = (o.items || []).map(i => `${i.productName} (x${i.quantity})`).join(', ');
          return `${idx + 1}. ${o.orderNumber} (${o.contactPerson || o.contactEmail || 'Portal User'}): ${itemSummary}${o.notes ? ` [Notes: ${o.notes}]` : ''}`;
        }).join('\n');

        const combinedNotes = `📦 CONSOLIDATED BATCH ORDER (${selectedOrders.length} Portal Submissions Combined):\n${orderSummaries}`;

        const consolidatedOrder: Order = {
          id: `ord-batch-${Date.now()}`,
          orderNumber: `${primary.orderNumber}-BATCH`,
          companyName: primary.companyName,
          contactEmail: primary.contactEmail,
          contactPerson: primary.contactPerson || 'Company Representative',
          contactNumber: primary.contactNumber,
          fbMessengerLink: primary.fbMessengerLink,
          deliveryAddress: primary.deliveryAddress,
          poNumber: primary.poNumber,
          notes: combinedNotes,
          portalId: primary.portalId,
          portalName: primary.portalName,
          items: consolidatedItems,
          status: 'Approved',
          totalAmount: totalAmount,
          createdAt: new Date().toISOString()
        };

        // Remove individual selected portal orders and replace with the 1 consolidated order
        const remainingOrders = orders.filter(o => !selectedOrderIds.includes(o.id));
        const updatedOrders = [consolidatedOrder, ...remainingOrders];

        if (onUpdateOrders) {
          await onUpdateOrders(updatedOrders);
        }
      } else {
        const updatedOrders = orders.map(o =>
          selectedOrderIds.includes(o.id) ? { ...o, status: newStatus } : o
        );
        if (onUpdateOrders) {
          await onUpdateOrders(updatedOrders);
        } else if (onUpdateOrderStatus) {
          for (const id of selectedOrderIds) {
            onUpdateOrderStatus(id, newStatus);
          }
        }
      }
      setSelectedOrderIds([]);
    } catch (err) {
      console.error('Failed to batch update orders:', err);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleSingleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    setIsProcessingBatch(true);
    try {
      const updatedOrders = orders.map(o =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );
      if (onUpdateOrders) {
        await onUpdateOrders(updatedOrders);
      } else if (onUpdateOrderStatus) {
        onUpdateOrderStatus(orderId, newStatus);
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPortal, setEditingPortal] = useState<OrderPortal | null>(null);
  const [deletingPortal, setDeletingPortal] = useState<OrderPortal | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Paused' | 'Closed'>('Active');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // UI Toast Feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getPortalUrl = (portal: OrderPortal) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const shareParam = portal.shareToken || portal.id;
    let url = `${origin}${pathname}?portal=${shareParam}`;
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
    // Default to all available products
    setSelectedProductIds(availableProducts.map(p => p.id));
    setProductSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (portal: OrderPortal) => {
    setEditingPortal(portal);
    setName(portal.name);
    setDescription(portal.description || '');
    setStatus(portal.status);
    setSelectedProductIds([...portal.productIds]);
    setProductSearch('');
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
        updatedAt: new Date().toISOString()
      };
      onUpdatePortal(updated);
    } else {
      onCreatePortal({
        companyId: activeCompany.id,
        companyName: activeCompany.name,
        name: name.trim(),
        description: description.trim(),
        status,
        productIds: selectedProductIds
      });
    }

    setIsModalOpen(false);
  };

  const handleQuickStatusToggle = (portal: OrderPortal) => {
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

  const filteredModalProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const activeCount = companyPortals.filter(p => p.status === 'Active').length;
  const pausedCount = companyPortals.filter(p => p.status === 'Paused').length;
  const totalProductsShared = Array.from(new Set(companyPortals.flatMap(p => p.productIds))).length;

  if (isModalOpen) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        {/* Dedicated Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-2.5 rounded-2xl bg-gray-100 hover:bg-black hover:text-white text-gray-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Return to Order Portals List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-black text-white text-[9px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold">
                  {editingPortal ? 'Edit Mode' : 'New Storefront'}
                </span>
                <span className="text-xs text-gray-500 font-mono">{activeCompany.name}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight font-sans mt-0.5">
                {editingPortal ? `Edit Portal: ${editingPortal.name}` : 'Create Order Portal Page'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {editingPortal && (
              <button
                type="button"
                onClick={() => setDeletingPortal(editingPortal)}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Delete this Order Portal"
                id="editor-delete-portal-btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="bg-white border border-gray-300 text-gray-700 hover:text-black font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="portal-editor-form"
              className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl border border-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              id="save-portal-btn-page"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{editingPortal ? 'Save Changes' : 'Create Order Portal'}</span>
            </button>
          </div>
        </div>

        {/* Dedicated Page Editor Form */}
        <form id="portal-editor-form" onSubmit={handleSavePortal} className="space-y-6">
          {/* Section 1: Portal Name, Status & Description */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 space-y-5 shadow-xs">
            <h3 className="text-xs font-mono uppercase font-bold text-gray-400 tracking-wider pb-3 border-b border-gray-100 flex items-center gap-2">
              <Store className="w-4 h-4 text-black" />
              1. Storefront Identity &amp; Access Controls
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs uppercase font-mono font-extrabold text-black">
                  Portal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Staff Uniforms, Team Merchandise, Sales Rep Catalog"
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
                placeholder="e.g. Welcome! Please select your shirt size and embroidery position. Submit your request before Friday 5 PM."
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
                  2. Select Available Products ({selectedProductIds.length} / {availableProducts.length} Selected)
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Only checked items will be visible on this portal's shared ordering link.
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
                placeholder="Search products by name or category..."
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl pl-10 pr-4 py-2.5 text-xs text-black focus:outline-none font-sans"
              />
            </div>

            {/* Product Cards Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredModalProducts.map(prod => {
                const isSelected = selectedProductIds.includes(prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleToggleProduct(prod.id)}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-black bg-neutral-50 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                    id={`select-product-chip-${prod.id}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent div onClick
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
                          {prod.category} · {systemSettings.currencySymbol || 'Php'} {prod.basePrice.toFixed(2)} / {prod.unit}
                        </span>
                      </div>
                    </div>

                    {prod.minQuantity > 1 && (
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md shrink-0">
                        MOQ: {prod.minQuantity}
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredModalProducts.length === 0 && (
                <div className="col-span-2 text-center py-10 text-xs text-gray-400 font-mono bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No matching products found.
                </div>
              )}
            </div>
          </div>

          {/* Page Action Bar Footer */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
            <span className="text-xs font-mono text-gray-500">
              {selectedProductIds.length} product(s) enabled for this storefront link.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white border border-gray-300 text-gray-700 hover:text-black font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl border border-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{editingPortal ? 'Save Changes' : 'Create Order Portal'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

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

      {/* Sub-Navigation Tabs: Storefront Portals vs Portal Submissions */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSection('portals')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-sans text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
            activeSection === 'portals'
              ? 'bg-black text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:text-black hover:border-black'
          }`}
          id="tab-btn-portals-links"
        >
          <Globe className="w-4 h-4" />
          <span>Storefront Links</span>
          <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
            activeSection === 'portals' ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            {companyPortals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('submissions')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-sans text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
            activeSection === 'submissions'
              ? 'bg-black text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:text-black hover:border-black'
          }`}
          id="tab-btn-portals-submissions"
        >
          <Inbox className="w-4 h-4" />
          <span>Portal Submissions (Pending Confirmation)</span>
          {pendingPortalOrders.length > 0 ? (
            <span className="bg-amber-500 text-white text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
              {pendingPortalOrders.length} Pending
            </span>
          ) : (
            <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
              activeSection === 'submissions' ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-700'
            }`}>
              {companyPortalOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: STOREFRONT PORTALS LINKS */}
      {activeSection === 'portals' && (
        <div className="space-y-8">
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

      {/* Portal Cards Grid */}
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

            return (
              <div
                key={portal.id}
                className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-6"
                id={`portal-card-${portal.id}`}
              >
                {/* Header info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-black uppercase tracking-tight truncate">
                          {portal.name}
                        </h3>
                      </div>
                      {portal.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-sans">
                          {portal.description}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
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
                    </div>
                  </div>

                  {/* Products Preview Chips */}
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

                  {/* Share Link Box */}
                  <div className="space-y-1.5 pt-1">
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
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewPortal(portal)}
                      className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-3.5 rounded-xl border border-black transition-all cursor-pointer flex items-center gap-1.5"
                      id={`view-portal-btn-${portal.id}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Storefront</span>
                    </button>

                    <button
                      onClick={() => openEditModal(portal)}
                      className="bg-white hover:bg-gray-50 text-black border border-gray-300 font-bold text-xs uppercase tracking-wider py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      id={`edit-portal-btn-${portal.id}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickStatusToggle(portal)}
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
      </div>
      )}

      {/* SECTION 2: PORTAL ORDER SUBMISSIONS (PENDING CONFIRMATION BY COMPANY ADMIN) */}
      {activeSection === 'submissions' && (
        <div className="space-y-6 animate-fade-in">
          {/* Submissions Header Info */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-600 text-white text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                  Company Admin Confirmation Queue
                </span>
                <span className="text-xs font-mono font-bold text-amber-900">{activeCompany.name}</span>
              </div>
              <h3 className="text-lg font-black text-black uppercase tracking-tight">
                Portal Order Submissions
              </h3>
              <p className="text-xs text-amber-900/80 leading-relaxed max-w-2xl font-sans">
                Review and manage orders coming from your public storefront links. Confirm and batch-send them to the Print Hub Admin for official production &amp; fulfillment.
              </p>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-4 text-center shrink-0 min-w-[140px] shadow-2xs">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 block">Pending Review</span>
              <span className="text-3xl font-black text-amber-600 font-mono">{pendingPortalOrders.length}</span>
            </div>
          </div>

          {/* Filters & Batch Controls Bar */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Filter Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <button
                onClick={() => setSubmissionFilter('pending')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  submissionFilter === 'pending'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Confirmation ({pendingPortalOrders.length})</span>
              </button>

              <button
                onClick={() => setSubmissionFilter('approved')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  submissionFilter === 'approved'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sent to Admin ({companyPortalOrders.length - pendingPortalOrders.length})</span>
              </button>

              <button
                onClick={() => setSubmissionFilter('all')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  submissionFilter === 'all'
                    ? 'bg-black text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>All Submissions ({companyPortalOrders.length})</span>
              </button>
            </div>

            {/* Batch Action Bar */}
            {filteredSubmissions.length > 0 && (
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                <button
                  onClick={handleSelectAllSubmissions}
                  className="flex items-center gap-2 text-xs font-mono font-bold text-gray-700 hover:text-black cursor-pointer bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl transition-all"
                  id="select-all-portal-submissions-btn"
                >
                  {selectedOrderIds.length === filteredSubmissions.length && filteredSubmissions.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-black" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                  <span>
                    {selectedOrderIds.length === filteredSubmissions.length ? 'Deselect All' : `Select All (${filteredSubmissions.length})`}
                  </span>
                </button>

                {selectedOrderIds.length > 0 && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <button
                      onClick={() => handleBatchUpdateStatus('Approved')}
                      disabled={isProcessingBatch}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-3.5 rounded-xl border border-emerald-600 shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      id="batch-approve-btn"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {selectedOrderIds.length > 1
                          ? `Approve & Combine into 1 Order (${selectedOrderIds.length})`
                          : `Approve Selected (${selectedOrderIds.length})`}
                      </span>
                    </button>

                    <button
                      onClick={() => handleBatchUpdateStatus('Canceled')}
                      disabled={isProcessingBatch}
                      className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-3 rounded-xl border border-red-600 shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      id="batch-decline-btn"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-3xl p-12 text-center space-y-3">
              <Inbox className="w-12 h-12 text-gray-300 mx-auto" />
              <h4 className="text-base font-extrabold text-black uppercase tracking-tight">No Orders In This Queue</h4>
              <p className="text-xs text-gray-500 max-w-sm mx-auto font-sans leading-relaxed">
                {submissionFilter === 'pending'
                  ? 'There are currently no portal orders awaiting company confirmation.'
                  : 'No portal submissions match the selected filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSubmissions.map(ord => {
                const isSelected = selectedOrderIds.includes(ord.id);
                const isPending = ord.status === 'Pending Approval';

                return (
                  <div
                    key={ord.id}
                    className={`bg-white border rounded-3xl p-6 shadow-xs transition-all space-y-6 ${
                      isSelected ? 'border-black ring-2 ring-black/5 bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    id={`portal-order-card-${ord.id}`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleSelectOrder(ord.id)}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black cursor-pointer transition-colors"
                          aria-label="Select Order"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-black" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-black font-mono tracking-tight">{ord.id}</span>
                            <span className="text-xs font-mono text-gray-400">
                              • {new Date(ord.createdAt).toLocaleDateString()} at {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <Globe className="w-3 h-3 text-gray-500" />
                              <span>{ord.portalName || 'Public Storefront Portal'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        {isPending ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Awaiting Company Confirmation</span>
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{ord.status === 'Approved' || ord.status === 'Pending' ? 'Sent to Admin' : ord.status}</span>
                          </span>
                        )}

                        {isPending && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSingleUpdateStatus(ord.id, 'Approved')}
                              disabled={isProcessingBatch}
                              className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2 px-4 rounded-xl border border-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                              id={`approve-order-btn-${ord.id}`}
                            >
                              <Send className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Approve &amp; Send to Admin</span>
                            </button>

                            <button
                              onClick={() => handleSingleUpdateStatus(ord.id, 'Canceled')}
                              disabled={isProcessingBatch}
                              className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs uppercase tracking-wider py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                              id={`decline-order-btn-${ord.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-sans">
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block mb-0.5">Purchaser / Contact Person</span>
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
                      <span className="text-[10px] font-mono uppercase font-bold text-gray-400 block">Requested Items</span>
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
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Order Value</span>
                      <span className="text-xl font-black text-black">
                        {systemSettings.currencySymbol || 'Php'} {ord.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
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
