/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { OrderPortal, Product, CompanyProfile, SystemSettings, Order, CartItem, getDisplayPurchaserName } from '../types';
import { getProductUnitPrice, getAddOnUnitPrice, makeCompositeId } from '../utils/pricing';
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
  ChevronDown,
  FileSpreadsheet,
  Printer,
  CheckSquare,
  Square,
  FileText,
  ShoppingBag,
  AlertCircle
} from 'lucide-react';

interface OrderPortalsProps {
  portals: OrderPortal[];
  activeCompany: CompanyProfile;
  availableProducts: Product[];
  allProducts?: Product[];
  systemSettings: SystemSettings;
  onCreatePortal: (portal: Omit<OrderPortal, 'id' | 'createdAt' | 'updatedAt' | 'shareToken'>) => void;
  onUpdatePortal: (portal: OrderPortal) => void;
  onDeletePortal: (portalId: string) => void;
  onViewPortal: (portal: OrderPortal) => void;
  appsScriptUrl?: string;
  orders?: Order[];
  onUpdateOrders?: (newOrders: Order[]) => Promise<void>;
  onUpdateOrderStatus?: (orderId: string, newStatus: Order['status']) => void;
  onAddToCartBulk?: (items: Omit<CartItem, 'id'>[]) => void;
  onOpenCart?: () => void;
}

export default function OrderPortals({
  portals,
  activeCompany,
  availableProducts,
  allProducts,
  systemSettings,
  onCreatePortal,
  onUpdatePortal,
  onDeletePortal,
  onViewPortal,
  appsScriptUrl,
  orders = [],
  onUpdateOrders,
  onUpdateOrderStatus,
  onAddToCartBulk,
  onOpenCart
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
  const [customAddOnPrices, setCustomAddOnPrices] = useState<Record<string, Record<string, number>>>({});

  // Portal Orders Filter & Sorting State (used when viewing a portal detail page)
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSort, setOrderSort] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'az' | 'za'>('newest');

  // Storefront Orders Batch Selection & Export State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isPrintPdfModalOpen, setIsPrintPdfModalOpen] = useState<boolean>(false);

  // Cart Feedback Banner State
  const [cartFeedback, setCartFeedback] = useState<{
    success: boolean;
    title: string;
    message: string;
    skippedItems?: string[];
  } | null>(null);

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
    if (portal.customAddOnPrices && Object.keys(portal.customAddOnPrices).length > 0) {
      try {
        url += `&caop=${encodeURIComponent(JSON.stringify(portal.customAddOnPrices))}`;
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
    setCustomAddOnPrices({});
    setProductSearch('');
    setOrderSearch('');
    setOrderStatusFilter('all');
    setOrderSort('newest');
    setSelectedOrderIds([]);
    setIsPrintPdfModalOpen(false);
    setCartFeedback(null);
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
    setCustomAddOnPrices(portal.customAddOnPrices || {});
    setProductSearch('');
    setOrderSearch('');
    setOrderStatusFilter('all');
    setOrderSort('newest');
    setSelectedOrderIds([]);
    setIsPrintPdfModalOpen(false);
    setCartFeedback(null);
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
        customAddOnPrices,
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
        customVariantPrices,
        customAddOnPrices
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

  // Helper to determine if an order belongs specifically to a given portal link
  const isOrderForPortal = useCallback((order: Order, portal: OrderPortal) => {
    if (!portal) return false;

    const pId = (portal.id || '').trim().toLowerCase();
    const pToken = (portal.shareToken || '').trim().toLowerCase();
    const pName = (portal.name || '').trim().toLowerCase();
    const pCompName = (portal.companyName || activeCompany?.name || '').trim().toLowerCase();

    const oPortalId = (order.portalId || '').trim().toLowerCase();
    const oPortalName = (order.portalName || '').trim().toLowerCase();
    const oNotes = (order.notes || '').toLowerCase();
    const oComp = (order.companyName || '').trim().toLowerCase();

    // 1. Explicit portal ID / shareToken match
    if (oPortalId) {
      return oPortalId === pId || (Boolean(pToken) && oPortalId === pToken);
    }

    // 2. Explicit portal name match
    if (oPortalName) {
      return Boolean(pName) && oPortalName === pName;
    }

    // 3. Notes contains "[order portal: <name>]"
    if (pName && oNotes.includes(`[order portal: ${pName}`)) {
      return true;
    }

    // If order notes explicitly tags a DIFFERENT portal name, do not match
    if (oNotes.includes('[order portal:')) {
      return false;
    }

    // 4. Fallback ONLY if order has NO explicit portalId, portalName, or note tag
    // AND the company has only ONE storefront portal link
    const isPortalOrderType = order.id.startsWith('ord-portal-') || order.status === 'Pending Approval';
    if (isPortalOrderType && companyPortals.length === 1) {
      if (oComp && pCompName && oComp === pCompName) {
        return true;
      }
    }

    return false;
  }, [activeCompany, companyPortals.length]);

  // Compute orders belonging specifically to the currently selected portal
  const editingPortalOrders = useMemo(() => {
    if (!editingPortal) return [];
    return orders.filter(o => isOrderForPortal(o, editingPortal));
  }, [orders, editingPortal, isOrderForPortal]);

  const filteredAndSortedPortalOrders = useMemo(() => {
    const list = editingPortalOrders.filter(o => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        const matchesNum = (o.orderNumber || '').toLowerCase().includes(q) || (o.id || '').toLowerCase().includes(q);
        const matchesPO = (o.poNumber || '').toLowerCase().includes(q);
        const matchesPerson = (o.contactPerson || '').toLowerCase().includes(q) || o.items.some(i => (i.submitterName || '').toLowerCase().includes(q));
        const matchesEmail = (o.contactEmail || '').toLowerCase().includes(q);
        const matchesAddr = (o.deliveryAddress || '').toLowerCase().includes(q);
        const matchesNotes = (o.notes || '').toLowerCase().includes(q);
        return matchesNum || matchesPO || matchesPerson || matchesEmail || matchesAddr || matchesNotes;
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

  // Handle batch selection toggle
  const handleToggleSelectAllOrders = () => {
    if (filteredAndSortedPortalOrders.length === 0) return;
    const visibleIds = filteredAndSortedPortalOrders.map(o => o.id);
    const isAllSelected = visibleIds.every(id => selectedOrderIds.includes(id));
    if (isAllSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedOrderIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Handle adding items from selected historical orders into the shopping cart
  const handleAddSelectedToCart = () => {
    const selectedOrders = editingPortalOrders.filter(o => selectedOrderIds.includes(o.id));
    if (selectedOrders.length === 0) {
      alert('Please select at least one order to add to cart.');
      return;
    }

    const addedItemsMap = new Map<string, Omit<CartItem, 'id'>>();
    const skippedDiscontinued: string[] = [];
    const skippedInvalidQty: string[] = [];
    let totalItemsAddedCount = 0;
    let totalQuantityAdded = 0;

    const findCatalogProduct = (productId: string, productName?: string): Product | null => {
      // 1. Check in availableProducts (which includes scoped company products)
      let match = availableProducts.find(p => p.id === productId);
      if (match) return match;

      // 2. Check in allProducts if provided
      if (allProducts) {
        match = allProducts.find(p => p.id === productId);
        if (match) return match;
      }

      // 3. Check in activeCompany.customProducts
      if (activeCompany.customProducts) {
        match = activeCompany.customProducts.find(p => p.id === productId);
        if (match) return match;
      }

      // 4. Fallback check by product name if product ID was adjusted
      if (productName) {
        const pNameLower = productName.trim().toLowerCase();
        match = availableProducts.find(p => p.name.trim().toLowerCase() === pNameLower);
        if (match) return match;
        if (allProducts) {
          match = allProducts.find(p => p.name.trim().toLowerCase() === pNameLower);
          if (match) return match;
        }
      }

      return null;
    };

    selectedOrders.forEach(order => {
      const orderRef = order.orderNumber || order.id;
      (order.items || []).forEach(item => {
        // 1. Validate Quantity (Do not silently convert invalid quantities to 1)
        const rawQty = item.quantity;
        const numQty = typeof rawQty === 'number' ? rawQty : Number(rawQty);
        if (isNaN(numQty) || numQty <= 0 || !Number.isFinite(numQty)) {
          const itemDesc = item.productName || item.productId || 'Unknown Product';
          skippedInvalidQty.push(`${itemDesc} from Order ${orderRef} (Invalid quantity: ${rawQty ?? 'missing'})`);
          return;
        }

        // 2. Match to current Catalog Product using productId
        const catalogProduct = findCatalogProduct(item.productId, item.productName);
        if (!catalogProduct) {
          const itemDesc = item.productName ? `"${item.productName}"` : `Product ID: ${item.productId}`;
          skippedDiscontinued.push(`${itemDesc} from Order ${orderRef} (Product no longer in catalog)`);
          return;
        }

        // 3. Resolve authoritative CURRENT BASE PRICE (portal = null)
        // Explicitly ignores historical order price and portal custom price
        const baseProductPrice = getProductUnitPrice(
          catalogProduct,
          item.selectedSize,
          item.selectedColor,
          null
        );

        // Resolve add-on pricing with portal = null
        const baseAddOnsTotal = (item.selectedAddOns || []).reduce((sum, ao) => {
          return sum + getAddOnUnitPrice(catalogProduct, ao, null);
        }, 0);

        const authoritativeUnitPrice = baseProductPrice + baseAddOnsTotal;

        // 4. Composite Key for Deduplication & Aggregation
        const customs = item.customDetails || {};
        const compositeKey = makeCompositeId(
          catalogProduct.id,
          item.selectedSize,
          item.selectedColor,
          customs
        );

        // 5. Aggregate quantities for identical product/variant/custom configurations
        if (addedItemsMap.has(compositeKey)) {
          const existing = addedItemsMap.get(compositeKey)!;
          existing.quantity += numQty;
        } else {
          addedItemsMap.set(compositeKey, {
            product: catalogProduct,
            quantity: numQty,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            selectedAddOns: item.selectedAddOns,
            customDetails: customs,
            unitPrice: authoritativeUnitPrice
          });
        }

        totalQuantityAdded += numQty;
        totalItemsAddedCount += 1;
      });
    });

    const itemsToAdd = Array.from(addedItemsMap.values());

    // Ingest into active cart
    if (itemsToAdd.length > 0 && onAddToCartBulk) {
      onAddToCartBulk(itemsToAdd);
    }

    // Open existing cart drawer
    if (itemsToAdd.length > 0 && onOpenCart) {
      onOpenCart();
    }

    // Set interactive feedback banner summarizing added & skipped items
    const hasAdded = itemsToAdd.length > 0;
    const allSkipped = [...skippedDiscontinued, ...skippedInvalidQty];

    setCartFeedback({
      success: hasAdded,
      title: hasAdded ? 'Added to Cart' : 'Could Not Add to Cart',
      message: hasAdded
        ? `Successfully added ${itemsToAdd.length} item line${itemsToAdd.length > 1 ? 's' : ''} (${totalQuantityAdded} total units) to cart at current base prices.`
        : 'None of the items from the selected orders could be added to your cart.',
      skippedItems: allSkipped.length > 0 ? allSkipped : undefined
    });
  };

  // Export selected storefront orders to Excel (.xlsx) file
  const handleExportToExcel = () => {
    const selectedOrders = editingPortalOrders.filter(o => selectedOrderIds.includes(o.id));
    if (selectedOrders.length === 0) {
      alert('Please select at least one order to export.');
      return;
    }

    const portalName = editingPortal?.name || 'Storefront';

    // Itemized sheet rows (all order details, sizes, colors, add-ons, etc.)
    const itemRows: any[] = [];
    selectedOrders.forEach((ord) => {
      ord.items.forEach((it: any) => {
        const addOnsStr = it.selectedAddOns
          ? Array.isArray(it.selectedAddOns)
            ? it.selectedAddOns.map((a: any) => (typeof a === 'string' ? a : a.name)).join(', ')
            : String(it.selectedAddOns)
          : '';

        const customStr = it.customDetails
          ? Object.entries(it.customDetails).map(([k, v]) => `${k}: ${v}`).join(' | ')
          : '';

        const qty = Number(it.quantity) || 1;
        const unitPrice = Number(it.unitPrice ?? it.price) || 0;
        const lineTotal = qty * unitPrice;

        itemRows.push({
          'Order #': ord.orderNumber || ord.id,
          'Order Date': new Date(ord.createdAt).toLocaleDateString(),
          'Order Time': new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          'Storefront Portal': ord.portalName || portalName,
          'Order Status': ord.status,
          'Company Name': ord.companyName || activeCompany.name,
          'Purchaser / Submitter': getDisplayPurchaserName(ord),
          'Contact Email': ord.contactEmail || '',
          'Contact Phone': ord.contactNumber || '',
          'Delivery Address': ord.deliveryAddress || '',
          'PO Number': ord.poNumber || '',
          'Product Name': it.productName || it.name || 'Custom Product',
          'Size': it.selectedSize || it.size || '',
          'Color': it.selectedColor || it.color || '',
          'Add-Ons': addOnsStr,
          'Custom Options': customStr,
          'Item Submitter': it.submitterName ? `${it.submitterName} (${it.submitterEmail || ''})` : '',
          'Quantity': qty,
          'Unit Price': unitPrice,
          'Line Subtotal': lineTotal,
          'Order Total Amount': Number(ord.totalAmount) || 0,
          'Notes': ord.notes || ''
        });
      });
    });

    // Orders summary sheet
    const summaryRows = selectedOrders.map(ord => ({
      'Order #': ord.orderNumber || ord.id,
      'Order Date': new Date(ord.createdAt).toLocaleDateString(),
      'Storefront Portal': ord.portalName || portalName,
      'Status': ord.status,
      'Company': ord.companyName || activeCompany.name,
      'Purchaser Name': getDisplayPurchaserName(ord),
      'Contact Email': ord.contactEmail || '',
      'Contact Phone': ord.contactNumber || '',
      'PO Number': ord.poNumber || '',
      'Total Items Count': ord.items.reduce((sum, i: any) => sum + (Number(i.quantity) || 1), 0),
      'Order Total Amount': Number(ord.totalAmount) || 0,
      'Delivery Address': ord.deliveryAddress || '',
      'Notes': ord.notes || ''
    }));

    const wb = XLSX.utils.book_new();
    const wsItemized = XLSX.utils.json_to_sheet(itemRows);
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

    XLSX.utils.book_append_sheet(wb, wsItemized, "Itemized Details");
    XLSX.utils.book_append_sheet(wb, wsSummary, "Orders Summary");

    const cleanPortalName = portalName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanPortalName}_Storefront_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

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
                            Base: {systemSettings.currencySymbol || 'Php'} {(Number(prod.basePrice) || 0).toFixed(2)} / {prod.unit}
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
                          <div className="mt-2 bg-white border border-gray-200 rounded-xl p-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
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

                        {prod.addOns && prod.addOns.length > 0 && (
                          <div className="mt-2 bg-white border border-gray-200 rounded-xl p-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-wider block">
                              Add-On Pricing:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {prod.addOns.map(addOn => {
                                const addOnKey = addOn.id || addOn.name;
                                const prodAddOnPrices = customAddOnPrices[prod.id] || {};
                                const curPrice = prodAddOnPrices[addOnKey] !== undefined
                                  ? prodAddOnPrices[addOnKey]
                                  : Number(addOn.price || 0);

                                return (
                                  <div key={addOnKey} className="flex items-center justify-between gap-1.5 bg-gray-50 border border-gray-200 rounded-lg p-2">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      {addOn.imageUrl && (
                                        <img
                                          src={addOn.imageUrl}
                                          alt={addOn.name}
                                          className="w-5 h-5 rounded object-cover border border-gray-200 shrink-0"
                                        />
                                      )}
                                      <span className="text-[10px] font-mono font-bold text-black truncate" title={addOn.name}>
                                        {addOn.name}:
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 w-24 shrink-0 bg-white border border-gray-300 rounded px-1.5 py-0.5 focus-within:border-black">
                                      <span className="text-[9px] font-mono text-gray-400">{systemSettings.currencySymbol || 'Php'}</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={curPrice}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          setCustomAddOnPrices(prev => ({
                                            ...prev,
                                            [prod.id]: {
                                              ...(prev[prod.id] || {}),
                                              [addOnKey]: val
                                            }
                                          }));
                                        }}
                                        className="w-full text-[10px] font-mono text-black bg-transparent focus:outline-none font-bold"
                                      />
                                    </div>
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

            {/* Feedback Banner for Add Selected to Cart / Operations */}
            {cartFeedback && (
              <div
                className={`rounded-2xl p-4 border flex items-start justify-between gap-3 shadow-xs animate-fade-in ${
                  cartFeedback.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
                id="portal-cart-feedback-banner"
              >
                <div className="flex items-start gap-3">
                  {cartFeedback.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider font-mono">
                      {cartFeedback.title}
                    </h4>
                    <p className="text-xs leading-relaxed font-sans">{cartFeedback.message}</p>
                    {cartFeedback.skippedItems && cartFeedback.skippedItems.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] font-sans space-y-1 text-amber-800">
                        <div className="font-bold font-mono uppercase text-[10px] tracking-wider text-amber-900">
                          Items not added ({cartFeedback.skippedItems.length}):
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 pl-1">
                          {cartFeedback.skippedItems.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setCartFeedback(null)}
                  className="text-gray-400 hover:text-black p-1 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Batch Selection & Export Actions Bar */}
            {filteredAndSortedPortalOrders.length > 0 && (
              <div className="bg-neutral-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer font-mono text-xs font-bold text-white hover:text-amber-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={
                        filteredAndSortedPortalOrders.length > 0 &&
                        filteredAndSortedPortalOrders.every(o => selectedOrderIds.includes(o.id))
                      }
                      onChange={handleToggleSelectAllOrders}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <span>
                      Select All Visible ({filteredAndSortedPortalOrders.length})
                    </span>
                  </label>

                  {selectedOrderIds.length > 0 && (
                    <span className="bg-amber-400 text-black text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full">
                      {selectedOrderIds.length} Selected
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  {selectedOrderIds.length > 0 && (
                    <button
                      onClick={() => setSelectedOrderIds([])}
                      className="text-xs text-neutral-400 hover:text-white font-mono underline cursor-pointer mr-2"
                    >
                      Clear Selection
                    </button>
                  )}

                  {/* Add Selected to Cart */}
                  <button
                    onClick={handleAddSelectedToCart}
                    disabled={selectedOrderIds.length === 0}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                      selectedOrderIds.length > 0
                        ? 'bg-amber-400 hover:bg-amber-300 text-black'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                    }`}
                    title={selectedOrderIds.length === 0 ? 'Select at least 1 order to add to cart' : 'Add items from selected orders to shopping cart'}
                    id="portal-add-selected-to-cart-btn"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add Selected to Cart</span>
                  </button>

                  <button
                    onClick={handleExportToExcel}
                    disabled={selectedOrderIds.length === 0}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                      selectedOrderIds.length > 0
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                    }`}
                    title={selectedOrderIds.length === 0 ? 'Select at least 1 order to export' : 'Export selected orders to Excel / Google Sheets'}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export to Excel / Sheets ({selectedOrderIds.length})</span>
                  </button>

                  <button
                    onClick={() => setIsPrintPdfModalOpen(true)}
                    disabled={selectedOrderIds.length === 0}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                      selectedOrderIds.length > 0
                        ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
                    }`}
                    title={selectedOrderIds.length === 0 ? 'Select at least 1 order to print / save as PDF' : 'Print or save compiled orders as PDF'}
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save as PDF ({selectedOrderIds.length})</span>
                  </button>
                </div>
              </div>
            )}

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
                {filteredAndSortedPortalOrders.map(ord => {
                  const isSelected = selectedOrderIds.includes(ord.id);
                  return (
                    <div
                      key={ord.id}
                      className={`bg-white border rounded-3xl p-6 shadow-xs transition-all space-y-6 ${
                        isSelected
                          ? 'border-black ring-2 ring-black/10 bg-amber-50/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      id={`storefront-order-card-${ord.id}`}
                    >
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          {/* Order Card Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(prev => [...prev, ord.id]);
                              } else {
                                setSelectedOrderIds(prev => prev.filter(id => id !== ord.id));
                              }
                            }}
                            className="w-5 h-5 accent-black rounded cursor-pointer shrink-0"
                            id={`select-order-checkbox-${ord.id}`}
                          />

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50/80 border border-gray-200 rounded-2xl p-4 text-xs font-sans">
                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">Customer / Submitter Name</span>
                        <div className="font-extrabold text-black text-sm flex items-center gap-1.5">
                          <User className="w-4 h-4 text-gray-500 shrink-0" />
                          <span>{getDisplayPurchaserName(ord)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">Email / Phone / Messenger</span>
                        <div className="font-medium text-gray-800 space-y-1">
                          {ord.contactEmail && (
                            <div className="flex items-center gap-1.5 text-xs truncate">
                              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{ord.contactEmail}</span>
                            </div>
                          )}
                          {ord.contactNumber && (
                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-900">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{ord.contactNumber}</span>
                            </div>
                          )}
                          {ord.fbMessengerLink ? (
                            <div className="pt-0.5">
                              <a
                                href={ord.fbMessengerLink.startsWith('http') ? ord.fbMessengerLink : `https://${ord.fbMessengerLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>💬 FB Messenger Link</span>
                                <ExternalLink className="w-3 h-3 text-blue-500" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[10px] block">FB Messenger: Not provided</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">Address / Dept</span>
                        <div className="font-medium text-black flex items-start gap-1.5 bg-white border border-gray-200 rounded-xl p-2.5">
                          <MapPin className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                          <span className="leading-snug font-semibold text-xs">{ord.deliveryAddress || 'No address specified'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-500 block mb-1">PO Number &amp; Notes</span>
                        <div className="space-y-1.5 font-mono">
                          {ord.poNumber && (
                            <div className="font-bold text-black text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded inline-block">
                              PO: {ord.poNumber}
                            </div>
                          )}
                          {ord.notes ? (
                            <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-xs text-amber-950 font-sans italic font-medium leading-relaxed">
                              <strong className="font-mono text-[9px] uppercase font-extrabold text-amber-800 not-italic block mb-0.5">Notes:</strong>
                              "{ord.notes}"
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[10px] block">Notes: None provided</span>
                          )}
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
                );
              })}
              </div>
            )}
          </div>
        )}

        {/* Print / Save as PDF Compilation Modal */}
        {isPrintPdfModalOpen && editingPortal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
              {/* Non-printable modal controls header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 shrink-0 no-print">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-900 text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full">
                      PDF / Print Compilation
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      ({selectedOrderIds.length} Orders Selected)
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-black uppercase tracking-tight mt-1">
                    Storefront Orders Summary Report
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Portal: {editingPortal.name} • {activeCompany.name}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleExportToExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Save as Excel / Sheets</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save as PDF</span>
                  </button>

                  <button
                    onClick={() => setIsPrintPdfModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div className="overflow-y-auto pr-2 space-y-8 flex-1" id="print-compiled-orders-area">
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden !important;
                    }
                    #print-compiled-orders-area, #print-compiled-orders-area * {
                      visibility: visible !important;
                    }
                    #print-compiled-orders-area {
                      position: absolute !important;
                      left: 0 !important;
                      top: 0 !important;
                      width: 100% !important;
                      padding: 20px !important;
                      background: white !important;
                      color: black !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                    .page-break {
                      page-break-after: always;
                    }
                  }
                `}</style>

                {/* Header Summary Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-black uppercase tracking-tight">
                      STOREFRONT ORDERS COMPILATION
                    </h2>
                    <p className="text-xs font-mono text-gray-700">
                      Company: <strong className="text-black">{activeCompany.name}</strong> • Storefront: <strong className="text-black">{editingPortal.name}</strong>
                    </p>
                    <p className="text-xs font-mono text-gray-500">
                      Report Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4 text-right space-y-1 font-mono shrink-0">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Selected Orders</span>
                    <span className="text-xl font-black text-black">{selectedOrderIds.length} Orders</span>
                    <div className="pt-1 border-t border-gray-100">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Combined Total Amount</span>
                      <span className="text-lg font-black text-emerald-700">
                        {systemSettings.currencySymbol || 'Php'}{' '}
                        {editingPortalOrders
                          .filter(o => selectedOrderIds.includes(o.id))
                          .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selected Orders Cards List */}
                <div className="space-y-6">
                  {editingPortalOrders
                    .filter(o => selectedOrderIds.includes(o.id))
                    .map((ord, idx) => (
                      <div
                        key={ord.id}
                        className="bg-white border border-gray-300 rounded-2xl p-6 space-y-4 shadow-2xs page-break"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-black text-white font-mono text-xs font-black flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <div>
                              <span className="text-base font-black text-black font-mono">
                                {ord.orderNumber || ord.id}
                              </span>
                              <span className="text-xs font-mono text-gray-500 block">
                                Date: {new Date(ord.createdAt).toLocaleDateString()} at {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="bg-gray-100 border border-gray-200 text-black text-xs font-mono font-bold px-3 py-1 rounded-full uppercase">
                              Status: {ord.status}
                            </span>
                          </div>
                        </div>

                        {/* Customer / Submitter Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Purchaser / Submitter</span>
                            <span className="font-extrabold text-black">{getDisplayPurchaserName(ord)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">Contact Info</span>
                            <span className="font-semibold text-gray-800">{ord.contactEmail || 'No Email'} • {ord.contactNumber || 'No Phone'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-bold uppercase block">PO # &amp; Delivery Address</span>
                            <span className="font-semibold text-gray-800">
                              {ord.poNumber ? `PO: ${ord.poNumber} | ` : ''} {ord.deliveryAddress || 'No Address'}
                            </span>
                          </div>
                        </div>

                        {/* Items Table */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 border-b border-gray-200 font-mono text-[10px] font-bold text-gray-600 uppercase">
                              <tr>
                                <th className="p-2.5">Qty</th>
                                <th className="p-2.5">Product Description &amp; Details</th>
                                <th className="p-2.5 text-right">Unit Price</th>
                                <th className="p-2.5 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                              {ord.items.map((it, i) => (
                                <tr key={i} className="align-top">
                                  <td className="p-2.5 font-bold text-black">{it.quantity}x</td>
                                  <td className="p-2.5">
                                    <span className="font-extrabold text-black block">{it.productName || (it as any).name}</span>
                                    <div className="text-[11px] text-gray-600 font-sans mt-0.5 space-x-2">
                                      {it.selectedSize && <span>Size: <strong>{it.selectedSize}</strong></span>}
                                      {it.selectedColor && <span>Color: <strong>{it.selectedColor}</strong></span>}
                                      {it.customDetails && Object.entries(it.customDetails).map(([k, v]) => (
                                        <span key={k}>| {k}: <strong>{String(v)}</strong></span>
                                      ))}
                                      {it.selectedAddOns && it.selectedAddOns.length > 0 && (
                                        <div>Add-ons: <strong>{it.selectedAddOns.map((a: any) => typeof a === 'string' ? a : a.name).join(', ')}</strong></div>
                                      )}
                                      {it.submitterName && (
                                        <div className="text-[10px] text-gray-500 italic mt-0.5">Submitted by: {it.submitterName}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-right text-gray-700">
                                    {systemSettings.currencySymbol || 'Php'} {it.price.toFixed(2)}
                                  </td>
                                  <td className="p-2.5 text-right font-bold text-black">
                                    {systemSettings.currencySymbol || 'Php'} {(it.price * it.quantity).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Order Total */}
                        <div className="flex justify-between items-center font-mono pt-1 text-xs">
                          <span className="text-gray-500 font-bold uppercase">Order Total:</span>
                          <span className="text-sm font-black text-black">
                            {systemSettings.currencySymbol || 'Php'} {ord.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
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
            const portalOrderCount = orders.filter(o => isOrderForPortal(o, portal)).length;

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
