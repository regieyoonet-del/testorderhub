/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { OrderPortal, Product, CompanyProfile, Order, OrderItem, SystemSettings, ProductAddOn, getDisplayPurchaserName } from '../types';
import { getProductUnitPrice, getAddOnUnitPrice } from '../utils/pricing';
import { getItemColorImage } from '../utils/colorUtils';
import ProductImageCarousel from './ProductImageCarousel';
import {
  ShoppingBag,
  CheckCircle,
  Plus,
  Minus,
  X,
  Send,
  Printer,
  ArrowLeft,
  ArrowRight,
  Store,
  Clock,
  Truck,
  ShieldCheck,
  Building,
  Info,
  Check,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface PublicOrderPortalProps {
  portal: OrderPortal;
  company: CompanyProfile;
  products: Product[];
  systemSettings: SystemSettings;
  onSubmitOrder: (orderData: {
    contactPerson: string;
    contactNumber?: string;
    fbMessengerLink?: string;
    contactEmail: string;
    deliveryAddress: string;
    poNumber?: string;
    notes?: string;
    items: {
      product: Product;
      quantity: number;
      selectedSize?: string;
      selectedColor?: string;
      customDetails?: Record<string, string>;
    }[];
  }) => Promise<Order>;
  onClosePublicView?: () => void;
  isLoggedIn?: boolean;
}

export default function PublicOrderPortal({
  portal,
  company,
  products,
  systemSettings,
  onSubmitOrder,
  onClosePublicView,
  isLoggedIn = false
}: PublicOrderPortalProps) {
  // Filter products strictly assigned to this portal / company profile
  const portalProducts = useMemo(() => {
    const hasExplicitCompanyList = Array.isArray(company?.enabledProductIds);
    const cSet = new Set((company?.enabledProductIds || []).map(id => String(id).trim()));

    const hasExplicitPortalList = Array.isArray(portal.productIds) && portal.productIds.length > 0;
    const pSet = new Set((portal.productIds || []).map(id => String(id).trim()));

    const customProducts = (company && Array.isArray(company.customProducts)) ? company.customProducts : [];

    const matched: Product[] = [];

    // Filter products provided from props
    products.forEach(p => {
      const pid = String(p.id).trim();
      // If company has explicit approved catalog list, product MUST be checked (in cSet)
      if (hasExplicitCompanyList && !cSet.has(pid)) {
        return;
      }
      // If portal has explicit product list, product MUST be in pSet
      if (hasExplicitPortalList && !pSet.has(pid)) {
        return;
      }
      matched.push(p);
    });

    // Custom products for this company
    if (customProducts.length > 0) {
      const existingIds = new Set(matched.map(m => m.id));
      customProducts.forEach(cp => {
        if (cp && cp.id && !existingIds.has(cp.id)) {
          const cpid = String(cp.id).trim();
          if (!hasExplicitPortalList || pSet.has(cpid)) {
            matched.push(cp);
          }
        }
      });
    }

    return matched;
  }, [portal.productIds, company?.enabledProductIds, company?.customProducts, products]);

  // Storefront Order Cart State
  const [cartItems, setCartItems] = useState<{
    id: string;
    product: Product;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
    selectedAddOns?: ProductAddOn[];
    customDetails: Record<string, string>;
    unitPrice?: number;
  }[]>([]);

  // Option states per Product ID
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [customs, setCustoms] = useState<Record<string, Record<string, string>>>({});
  const [selectedAddOnsMap, setSelectedAddOnsMap] = useState<Record<string, ProductAddOn[]>>({});
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  // Form inputs
  const [shopperName, setShopperName] = useState('');
  const [shopperPhone, setShopperPhone] = useState('');
  const [fbMessengerLink, setFbMessengerLink] = useState('');
  const [shopperEmail, setShopperEmail] = useState('');
  const [deliveryDept, setDeliveryDept] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Handle option changes (Min quantity lock removed for portal orders)
  const getQty = (p: Product) => qtys[p.id] || 1;
  const getSize = (p: Product) => sizes[p.id] || (p.sizeOptions && p.sizeOptions.length > 0 ? p.sizeOptions[0] : undefined);
  const getColor = (p: Product) => colors[p.id] || (p.colorOptions && p.colorOptions.length > 0 ? p.colorOptions[0] : undefined);
  const getCustoms = (p: Product) => customs[p.id] || {};

  const handleAddToCart = (product: Product) => {
    const qty = getQty(product);
    const selectedSize = getSize(product);
    const selectedColor = getColor(product);
    const customDetails = getCustoms(product);
    const selectedAddOns = (selectedAddOnsMap[product.id] || []).map(a => ({
      ...a,
      price: getAddOnUnitPrice(product, a, portal)
    }));
    const addOnsCost = selectedAddOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const baseUnitPrice = getProductUnitPrice(product, selectedSize, selectedColor, portal);
    const unitPrice = baseUnitPrice + addOnsCost;

    const compositeId = `${product.id}_${selectedSize || ''}_${selectedColor || ''}_${JSON.stringify(customDetails)}_${JSON.stringify(selectedAddOns)}`;

    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.id === compositeId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        updated[existingIdx].unitPrice = unitPrice;
        return updated;
      }
      return [
        ...prev,
        {
          id: compositeId,
          product,
          quantity: qty,
          selectedSize,
          selectedColor,
          selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
          customDetails,
          unitPrice
        }
      ];
    });

    setAddedToast(`Added ${qty}x ${product.name} to your order.`);
    setTimeout(() => setAddedToast(null), 3000);
  };

  const handleRemoveFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateCartQty = (id: string, newQty: number) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const bounded = Math.max(1, newQty);
          return { ...item, quantity: bounded };
        }
        return item;
      })
    );
  };

  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + (item.unitPrice ?? getProductUnitPrice(item.product, item.selectedSize, item.selectedColor, portal)) * item.quantity,
    0
  );

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopperName.trim() || !shopperPhone.trim() || !shopperEmail.trim() || !deliveryDept.trim()) {
      alert('Please fill out all required order details (Name, Contact Number, Email, and Address).');
      return;
    }
    if (cartItems.length === 0) {
      alert('Your order cart is empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createdOrder = await onSubmitOrder({
        contactPerson: shopperName.trim(),
        contactNumber: shopperPhone.trim(),
        fbMessengerLink: fbMessengerLink.trim() || undefined,
        contactEmail: shopperEmail.trim(),
        deliveryAddress: deliveryDept.trim(),
        poNumber: poNumber.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: cartItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          selectedAddOns: item.selectedAddOns,
          customDetails: item.customDetails,
          unitPrice: item.unitPrice ?? getProductUnitPrice(item.product, item.selectedSize, item.selectedColor, portal)
        })) as any
      });

      setSubmittedOrder(createdOrder);
      setCartItems([]);
      setIsCheckoutOpen(false);
    } catch (err) {
      console.error('Portal order submit error:', err);
      alert('Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status check for Paused or Closed portal
  if (portal.status !== 'Active') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-black uppercase tracking-tight">Portal Inactive</h2>
            <p className="text-xs text-gray-500 font-sans">
              "{portal.name}" is currently <strong>{portal.status}</strong>.
            </p>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed font-sans">
            Please contact <strong>{company.name}</strong> at {company.contactEmail || 'your corporate administrator'} to request an active ordering link.
          </p>

          {onClosePublicView && (
            <button
              onClick={onClosePublicView}
              className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition-all cursor-pointer mt-4"
            >
              Return to Portal Login
            </button>
          )}
        </div>
      </div>
    );
  }

  // Submitted Order Success View
  if (submittedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-8 font-sans">
        <div className="max-w-2xl mx-auto bg-white border border-black rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 animate-fade-in printable-area">
          {/* Header */}
          <div className="text-center space-y-3 border-b border-gray-100 pb-6">
            <div className="w-16 h-16 bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 stroke-[2.5px]" />
            </div>
            <h2 className="text-2xl font-black text-black uppercase tracking-tight">Order Received!</h2>
            <p className="text-xs text-gray-500 font-mono">
              Submitted via {portal.name} · {company.name}
            </p>
          </div>

          {/* Details Grid */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3 text-xs font-mono">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Order Reference #:</span>
              <span className="font-extrabold text-black">{submittedOrder.orderNumber}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Customer / Shopper Name:</span>
              <span className="font-bold text-black">{getDisplayPurchaserName(submittedOrder)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Email:</span>
              <span className="font-bold text-black">{submittedOrder.contactEmail || 'N/A'}</span>
            </div>
            {submittedOrder.contactNumber && (
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500">Phone:</span>
                <span className="font-bold text-black">{submittedOrder.contactNumber}</span>
              </div>
            )}
            {submittedOrder.fbMessengerLink && (
              <div className="flex justify-between border-b border-gray-200 pb-2 items-center">
                <span className="text-gray-500">FB Messenger:</span>
                <a
                  href={submittedOrder.fbMessengerLink.startsWith('http') ? submittedOrder.fbMessengerLink : `https://${submittedOrder.fbMessengerLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <span>💬 Profile Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Address / Dept:</span>
              <span className="font-bold text-black">{submittedOrder.deliveryAddress || 'No address specified'}</span>
            </div>
            {submittedOrder.notes && (
              <div className="border-b border-gray-200 pb-2">
                <span className="text-gray-500 block mb-0.5">Notes / Special Instructions:</span>
                <span className="font-sans italic text-gray-800 bg-white p-2 rounded border border-gray-200 block text-[11px]">
                  "{submittedOrder.notes}"
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-gray-500">Total Order Value:</span>
              <span className="font-extrabold text-black text-sm">
                {systemSettings.currencySymbol || 'Php'} {(Number(submittedOrder.totalAmount) || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Ordered Line Items */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase text-gray-400">Order Items</h3>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl p-3">
              {submittedOrder.items.map((it, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-black">{it.quantity}x {it.productName}</span>
                    <span className="block text-[10px] text-gray-500 font-mono">
                      {[it.selectedSize && `Size: ${it.selectedSize}`, it.selectedColor && `Color: ${it.selectedColor}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-black">
                    {systemSettings.currencySymbol || 'Php'} {((Number(it.price ?? it.unitPrice) || 0) * (Number(it.quantity) || 0)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 no-print">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto bg-white border border-gray-300 text-black font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Confirmation</span>
            </button>

            <button
              onClick={() => {
                setSubmittedOrder(null);
                setCartItems([]);
              }}
              className="w-full sm:w-auto bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-xl border border-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Another Order</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Single Product Detail Page
  if (selectedDetailProduct) {
    const product = selectedDetailProduct;
    const currentQty = getQty(product);
    const currentSize = getSize(product);
    const currentColor = getColor(product);
    const currentCustoms = getCustoms(product);

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-black selection:bg-black selection:text-white pb-24">
        {/* Header bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedDetailProduct(null)}
            className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-black bg-gray-100 hover:bg-gray-200 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            id="back-to-catalog-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Catalog</span>
          </button>

          {/* Header Cart Button Removed as requested */}
        </header>

        {/* Product Detail Page View */}
        <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 w-full flex-1">
          <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Image & Badges */}
            <div className="space-y-4">
              <div className="relative border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <ProductImageCarousel
                  product={product}
                  selectedColor={currentColor}
                  showFavoriteButton={false}
                  aspectClass="aspect-square"
                  className="w-full"
                  imageFit="contain"
                />
                <span className="absolute top-4 left-4 z-20 bg-black/90 text-white text-[10px] font-mono uppercase font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                  {product.category}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg">
                  Unit: {product.unit}
                </span>
                {product.leadTime && (
                  <span className="bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-lg">
                    Lead Time: {product.leadTime}
                  </span>
                )}
              </div>
            </div>

            {/* Product Configuration */}
            <div className="space-y-6">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-gray-400 tracking-wider block mb-1">
                  Item Specifications
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-black uppercase tracking-tight leading-tight">
                  {product.name}
                </h1>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-black font-mono">
                    {systemSettings.currencySymbol || 'Php'} {getProductUnitPrice(product, getSize(product), getColor(product), portal).toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">/ {product.unit}</span>
                </div>
              </div>

              {product.description && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed font-sans">
                  {product.description}
                </div>
              )}

              {/* Options */}
              <div className="space-y-4 border-t border-gray-100 pt-5">
                {/* Sizes */}
                {product.sizeOptions && product.sizeOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs uppercase font-mono font-bold text-gray-500">
                      Select Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.sizeOptions.map(s => (
                        <button
                          key={s}
                          onClick={() => setSizes(prev => ({ ...prev, [product.id]: s }))}
                          className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                            currentSize === s
                              ? 'bg-black text-white border-black ring-2 ring-black/20'
                              : 'bg-white text-gray-800 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {product.colorOptions && product.colorOptions.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs uppercase font-mono font-bold text-gray-500">
                      Select Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.colorOptions.map(c => (
                        <button
                          key={c}
                          onClick={() => setColors(prev => ({ ...prev, [product.id]: c }))}
                          className={`px-3.5 py-1.5 text-xs font-sans font-semibold rounded-xl border transition-all cursor-pointer ${
                            currentColor === c
                              ? 'bg-black text-white border-black ring-2 ring-black/20'
                              : 'bg-white text-gray-800 border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Fields */}
                {product.customFields && product.customFields.map(cf => (
                  <div key={cf.name} className="space-y-1.5">
                    <label className="block text-xs uppercase font-mono font-bold text-gray-500">
                      {cf.label} {cf.required && <span className="text-red-500">*</span>}
                    </label>
                    {cf.type === 'select' && cf.options ? (
                      <select
                        value={currentCustoms[cf.name] || cf.options[0]}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustoms(prev => ({
                            ...prev,
                            [product.id]: { ...(prev[product.id] || {}), [cf.name]: val }
                          }));
                        }}
                        className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-3 text-xs font-sans text-black focus:outline-none"
                      >
                        {cf.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={cf.placeholder || `Enter ${cf.label}`}
                        value={currentCustoms[cf.name] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustoms(prev => ({
                            ...prev,
                            [product.id]: { ...(prev[product.id] || {}), [cf.name]: val }
                          }));
                        }}
                        className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-3 text-xs font-sans text-black focus:outline-none"
                      />
                    )}
                  </div>
                ))}

                {/* Add-Ons Options */}
                {product.addOns && product.addOns.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <label className="block text-xs uppercase font-mono font-bold text-gray-500">
                      Optional Add-Ons
                    </label>
                    <div className="space-y-1.5 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      {product.addOns.map(addOn => {
                        const currentAddOns = selectedAddOnsMap[product.id] || [];
                        const isChecked = currentAddOns.some(a => a.id === addOn.id || a.name === addOn.name);
                        const effectivePrice = getAddOnUnitPrice(product, addOn, portal);
                        const addOnObj = { ...addOn, price: effectivePrice };
                        return (
                          <label
                            key={addOn.id || addOn.name}
                            className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                              isChecked ? 'bg-emerald-50 border border-emerald-300 shadow-2xs' : 'bg-white border border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedAddOnsMap(prev => {
                                  const list = prev[product.id] || [];
                                  if (checked) {
                                    return { ...prev, [product.id]: [...list, addOnObj] };
                                  } else {
                                    return { ...prev, [product.id]: list.filter(a => (a.id && a.id !== addOn.id) || a.name !== addOn.name) };
                                  }
                                });
                              }}
                              className="mt-0.5 w-4 h-4 accent-black cursor-pointer shrink-0"
                            />
                            {addOn.imageUrl && (
                              <img
                                src={addOn.imageUrl}
                                alt={addOn.name}
                                className="w-8 h-8 rounded-lg border border-gray-200 object-cover shrink-0 mt-0.5"
                              />
                            )}
                            <div className="flex-1 text-xs">
                              <div className="flex justify-between items-center font-bold text-black">
                                <span>{addOn.name}</span>
                                <span className="font-mono text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-gray-200 text-[11px]">
                                  +{(systemSettings.currencySymbol || 'Php')} {effectivePrice.toFixed(2)}
                                </span>
                              </div>
                              {addOn.description && (
                                <p className="text-[11px] text-gray-500 font-sans mt-0.5">{addOn.description}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity & Subtotal */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs uppercase font-mono font-bold text-gray-500">
                    Quantity & Subtotal
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-2xl p-3">
                    <div className="flex items-center border border-gray-300 rounded-xl bg-white overflow-hidden">
                      <button
                        onClick={() => {
                          const next = Math.max(1, currentQty - 1);
                          setQtys(prev => ({ ...prev, [product.id]: next }));
                        }}
                        className="px-3.5 py-2 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={currentQty}
                        onChange={(e) => {
                          const num = parseInt(e.target.value) || 1;
                          setQtys(prev => ({ ...prev, [product.id]: Math.max(1, num) }));
                        }}
                        className="w-14 text-center bg-transparent font-mono text-sm font-bold text-black focus:outline-none"
                      />
                      <button
                        onClick={() => setQtys(prev => ({ ...prev, [product.id]: currentQty + 1 }))}
                        className="px-3.5 py-2 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[10px] text-gray-400 block font-bold uppercase">Subtotal</span>
                      <span className="text-lg font-black text-black">
                        {systemSettings.currencySymbol || 'Php'} {(getProductUnitPrice(product, getSize(product), getColor(product), portal) * currentQty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      handleAddToCart(product);
                    }}
                    className="flex-1 bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl border border-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                    id={`detail-add-to-cart-btn-${product.id}`}
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" />
                    <span>Add to Order Cart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24">
      {/* Top Banner Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-10 h-10 object-contain shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-black text-white font-bold font-mono text-sm flex items-center justify-center shrink-0 uppercase">
                {company.name ? company.name.slice(0, 2) : 'CO'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black uppercase text-black tracking-tight leading-none">
                  {company.name}
                </h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                  Order Portal
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="relative bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl border border-black transition-all cursor-pointer flex items-center gap-2 shadow-xs"
              id="portal-cart-btn"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Order Cart</span>
              {cartItems.length > 0 && (
                <span className="bg-white text-black text-[10px] font-mono font-black w-5 h-5 rounded-full flex items-center justify-center border border-black">
                  {cartItems.reduce((acc, it) => acc + it.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Welcome Section */}
      <div className="bg-white border-b border-gray-200 py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight">
            {portal.name}
          </h2>
          {portal.description && (
            <p className="text-sm sm:text-base text-gray-600 font-medium whitespace-pre-line leading-relaxed max-w-3xl pt-1">
              {portal.description}
            </p>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {addedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-mono font-bold flex items-center gap-2 border border-neutral-700 animate-slide-up">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3px]" />
          <span>{addedToast}</span>
        </div>
      )}

      {/* Main Products Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">
            Available Products ({portalProducts.length})
          </h3>
          <span className="text-[11px] text-gray-500 font-sans">
            Prices in {systemSettings.currencySymbol || 'Php'}
          </span>
        </div>

        {portalProducts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3 shadow-xs">
            <Store className="w-10 h-10 text-gray-300 mx-auto" />
            <h4 className="text-base font-extrabold text-black uppercase tracking-tight">No Products Listed</h4>
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              There are currently no active product listings configured for this storefront portal. Please contact the company to add products.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portalProducts.map(product => {
            const currentQty = getQty(product);
            const currentSize = getSize(product);
            const currentColor = getColor(product);
            const currentCustoms = getCustoms(product);

            return (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                id={`portal-product-card-${product.id}`}
              >
                <div className="space-y-4">
                  {/* Product Image & Details Header Clickable */}
                  <div
                    onClick={() => setSelectedDetailProduct(product)}
                    className="cursor-pointer group/card"
                  >
                    <div className="relative aspect-4/3 border-b border-gray-100 overflow-hidden">
                      <ProductImageCarousel
                        product={product}
                        selectedColor={currentColor}
                        onImageClick={() => setSelectedDetailProduct(product)}
                        showFavoriteButton={false}
                        aspectClass="aspect-4/3"
                        imageFit="contain"
                      />
                      <span className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-xs text-black text-[9px] font-mono uppercase font-bold px-2.5 py-1 rounded-full border border-gray-200">
                        {product.category}
                      </span>
                      <span className="absolute bottom-3 right-3 z-20 bg-black/80 text-white text-[9px] font-mono uppercase font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1 group-hover/card:bg-black">
                        <span>View Details</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>

                    {/* Product Details */}
                    <div className="px-5 pt-3 space-y-2">
                      <div>
                        <h4 className="text-base font-extrabold text-black uppercase tracking-tight group-hover/card:text-blue-600 transition-colors">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 font-sans leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-gray-100 pt-2">
                        <span className="text-lg font-black text-black font-mono">
                          {systemSettings.currencySymbol || 'Php'} {getProductUnitPrice(product, getSize(product), getColor(product), portal).toFixed(2)}
                          <span className="text-[10px] text-gray-400 font-normal"> / {product.unit}</span>
                        </span>
                        {product.minQuantity > 1 ? (
                          <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Order Any Qty (Min: 1)
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                            Min: 1 unit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="px-5 space-y-3">

                    {/* Option Controls */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      {/* Sizes */}
                      {product.sizeOptions && product.sizeOptions.length > 0 && (
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">
                            Select Size
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {product.sizeOptions.map(s => (
                              <button
                                key={s}
                                onClick={() => setSizes(prev => ({ ...prev, [product.id]: s }))}
                                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                                  currentSize === s
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Colors */}
                      {product.colorOptions && product.colorOptions.length > 0 && (
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">
                            Select Color
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {product.colorOptions.map(c => (
                              <button
                                key={c}
                                onClick={() => setColors(prev => ({ ...prev, [product.id]: c }))}
                                className={`px-2.5 py-1 text-[11px] font-sans font-semibold rounded-lg border transition-all cursor-pointer ${
                                  currentColor === c
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Fields */}
                      {product.customFields && product.customFields.map(cf => (
                        <div key={cf.name} className="space-y-1">
                          <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">
                            {cf.label} {cf.required && <span className="text-red-500">*</span>}
                          </label>
                          {cf.type === 'select' && cf.options ? (
                            <select
                              value={currentCustoms[cf.name] || cf.options[0]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustoms(prev => ({
                                  ...prev,
                                  [product.id]: { ...(prev[product.id] || {}), [cf.name]: val }
                                }));
                              }}
                              className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-2 text-xs font-sans text-black focus:outline-none"
                            >
                              {cf.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder={cf.placeholder || `Enter ${cf.label}`}
                              value={currentCustoms[cf.name] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustoms(prev => ({
                                  ...prev,
                                  [product.id]: { ...(prev[product.id] || {}), [cf.name]: val }
                                }));
                              }}
                              className="w-full bg-white border border-gray-200 focus:border-black rounded-xl p-2 text-xs font-sans text-black focus:outline-none"
                            />
                          )}
                        </div>
                      ))}

                      {/* Add-Ons Options */}
                      {product.addOns && product.addOns.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-gray-100">
                          <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">
                            Optional Add-Ons
                          </label>
                          <div className="space-y-1 bg-gray-50 p-2 rounded-xl border border-gray-200">
                            {product.addOns.map(addOn => {
                              const currentAddOns = selectedAddOnsMap[product.id] || [];
                              const isChecked = currentAddOns.some(a => a.id === addOn.id || a.name === addOn.name);
                              const effectivePrice = getAddOnUnitPrice(product, addOn, portal);
                              const addOnObj = { ...addOn, price: effectivePrice };
                              return (
                                <label
                                  key={addOn.id || addOn.name}
                                  className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${
                                    isChecked ? 'bg-emerald-50 border border-emerald-300' : 'bg-white border border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setSelectedAddOnsMap(prev => {
                                        const list = prev[product.id] || [];
                                        if (checked) {
                                          return { ...prev, [product.id]: [...list, addOnObj] };
                                        } else {
                                          return { ...prev, [product.id]: list.filter(a => (a.id && a.id !== addOn.id) || a.name !== addOn.name) };
                                        }
                                      });
                                    }}
                                    className="mt-0.5 w-3.5 h-3.5 accent-black cursor-pointer shrink-0"
                                  />
                                  {addOn.imageUrl && (
                                    <img
                                      src={addOn.imageUrl}
                                      alt={addOn.name}
                                      className="w-7 h-7 rounded border border-gray-200 object-cover shrink-0 mt-0.5"
                                    />
                                  )}
                                  <div className="flex-1 text-[10px] leading-snug">
                                    <div className="flex justify-between items-center font-bold text-black font-mono">
                                      <span>{addOn.name}</span>
                                      <span className="text-emerald-700 bg-white px-1 py-0.2 rounded border border-gray-200 text-[9px]">
                                        +{(systemSettings.currencySymbol || 'Php')} {effectivePrice.toFixed(2)}
                                      </span>
                                    </div>
                                    {addOn.description && (
                                      <p className="text-[9px] text-gray-500 font-sans mt-0.5">{addOn.description}</p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quantity Input */}
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">
                          Quantity
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                            <button
                              onClick={() => {
                                const next = Math.max(1, currentQty - 1);
                                setQtys(prev => ({ ...prev, [product.id]: next }));
                              }}
                              className="px-3 py-1.5 text-gray-600 hover:text-black hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              value={currentQty}
                              onChange={(e) => {
                                const num = parseInt(e.target.value) || 1;
                                setQtys(prev => ({ ...prev, [product.id]: Math.max(1, num) }));
                              }}
                              className="w-12 text-center bg-transparent font-mono text-xs font-bold text-black focus:outline-none"
                            />
                            <button
                              onClick={() => setQtys(prev => ({ ...prev, [product.id]: currentQty + 1 }))}
                              className="px-3 py-1.5 text-gray-600 hover:text-black hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Total: {systemSettings.currencySymbol || 'Php'} {(getProductUnitPrice(product, getSize(product), getColor(product), portal) * currentQty).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add to Order Button */}
                <div className="p-5 pt-3">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-2xl border border-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    id={`add-to-cart-btn-${product.id}`}
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" />
                    <span>Add to Order</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </main>

      {/* Floating Bottom Bar if cart has items */}
      {cartItems.length > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[90%] bg-black text-white p-4 rounded-3xl shadow-2xl border border-neutral-800 flex items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold font-mono text-sm shrink-0">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
            <div>
              <span className="text-xs font-mono text-gray-400 block">Total Order Subtotal</span>
              <span className="text-base font-black font-mono text-white">
                {systemSettings.currencySymbol || 'Php'} {(Number(cartSubtotal) || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="bg-white text-black hover:bg-gray-100 font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-2xl transition-all cursor-pointer flex items-center gap-2 shrink-0"
            id="floating-checkout-btn"
          >
            <span>Complete Order</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Order Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 pb-4 shrink-0 bg-white">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-black uppercase tracking-tight">Complete Your Order</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {portal.name} · {company.name}
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-gray-400 hover:text-black p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* Cart Items Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400">Order Items ({cartItems.length})</h4>
                <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-2xl p-2.5 sm:p-3 space-y-2.5 custom-scrollbar">
                  {cartItems.map(item => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      {/* Product details header row */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        {getItemColorImage(item.product, item.selectedColor) ? (
                          <img
                            src={getItemColorImage(item.product, item.selectedColor)}
                            alt={item.product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 font-mono text-xs">
                            📦
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-black uppercase leading-snug truncate">{item.product.name}</h5>
                          <span className="text-[11px] text-gray-500 font-mono block mt-0.5 leading-tight">
                            {[
                              item.selectedSize && `Size: ${item.selectedSize}`,
                              item.selectedColor && `Color: ${item.selectedColor}`
                            ].filter(Boolean).join(' · ')}
                          </span>
                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
                              {item.selectedAddOns.map((addOn, idx) => (
                                <span key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                  +{addOn.name} (+{(systemSettings.currencySymbol || 'Php')} {Number(addOn.price || 0).toFixed(2)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Mobile remove button (top right) */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-gray-400 hover:text-red-600 p-1 sm:hidden shrink-0 cursor-pointer self-start"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quantity & Price row */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-gray-200/60 sm:border-t-0">
                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-black flex items-center justify-center font-mono font-bold text-xs cursor-pointer active:scale-95 transition-all"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-black w-6 text-center text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-black flex items-center justify-center font-mono font-bold text-xs cursor-pointer active:scale-95 transition-all"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono font-bold text-black text-xs min-w-[70px] text-right">
                          {systemSettings.currencySymbol || 'Php'} {((Number(item.unitPrice ?? getProductUnitPrice(item.product, item.selectedSize, item.selectedColor, portal)) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
                        </span>

                        {/* Desktop remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="text-gray-400 hover:text-red-600 p-1 hidden sm:block cursor-pointer shrink-0 ml-1"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {cartItems.length === 0 && (
                    <p className="text-center text-xs text-gray-400 font-mono py-4">Your order cart is empty.</p>
                  )}
                </div>

                <div className="flex justify-between items-center bg-black text-white p-3 rounded-xl font-mono text-xs font-bold">
                  <span>Subtotal Value:</span>
                  <span>{systemSettings.currencySymbol || 'Php'} {(Number(cartSubtotal) || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Shopper Details Form */}
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400">Customer Details</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={shopperName}
                      onChange={(e) => setShopperName(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-xl px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                      id="shopper-name-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +63 917 123 4567"
                      value={shopperPhone}
                      onChange={(e) => setShopperPhone(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-xl px-3 py-2 text-xs font-semibold text-black focus:outline-none font-mono"
                      id="shopper-phone-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                      Facebook Messenger Link
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://m.me/janedoe or fb.com/janedoe"
                      value={fbMessengerLink}
                      onChange={(e) => setFbMessengerLink(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-xl px-3 py-2 text-xs text-black focus:outline-none font-mono"
                      id="shopper-messenger-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane.doe@company.com"
                      value={shopperEmail}
                      onChange={(e) => setShopperEmail(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-xl px-3 py-2 text-xs font-semibold text-black focus:outline-none font-mono"
                      id="shopper-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marketing Dept, Floor 3, Building B"
                    value={deliveryDept}
                    onChange={(e) => setDeliveryDept(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-xl px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                    id="shopper-dept-input"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                      PO / Cost Center
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PO-90021"
                      value={poNumber}
                      onChange={(e) => setPoNumber(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-xl px-3 py-2 text-xs font-mono text-black focus:outline-none"
                      id="shopper-po-input"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent delivery required"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-xl px-3 py-2 text-xs text-black focus:outline-none font-sans"
                      id="shopper-notes-input"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(false)}
                    className="bg-white border border-gray-300 text-gray-600 hover:text-black font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || cartItems.length === 0}
                    className="bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-6 rounded-xl border border-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                    id="submit-portal-order-btn"
                  >
                    {isSubmitting ? (
                      <span>Submitting Order...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Corporate Order</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
