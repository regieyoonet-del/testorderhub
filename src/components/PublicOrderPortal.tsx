/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { OrderPortal, Product, CompanyProfile, Order, OrderItem, SystemSettings } from '../types';
import {
  ShoppingBag,
  CheckCircle,
  Plus,
  Minus,
  X,
  Send,
  Printer,
  ArrowLeft,
  Store,
  Clock,
  Truck,
  ShieldCheck,
  Building,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';

interface PublicOrderPortalProps {
  portal: OrderPortal;
  company: CompanyProfile;
  products: Product[];
  systemSettings: SystemSettings;
  onSubmitOrder: (orderData: {
    contactPerson: string;
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
}

export default function PublicOrderPortal({
  portal,
  company,
  products,
  systemSettings,
  onSubmitOrder,
  onClosePublicView
}: PublicOrderPortalProps) {
  // Filter products included in this portal
  const portalProducts = products.filter(p => portal.productIds.includes(p.id));

  // Storefront Order Cart State
  const [cartItems, setCartItems] = useState<{
    id: string;
    product: Product;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
    customDetails: Record<string, string>;
  }[]>([]);

  // Selected Option States per Product ID
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [customs, setCustoms] = useState<Record<string, Record<string, string>>>({});
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  // Form inputs
  const [shopperName, setShopperName] = useState('');
  const [shopperEmail, setShopperEmail] = useState('');
  const [deliveryDept, setDeliveryDept] = useState(company.deliveryAddress || '');
  const [poNumber, setPoNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  // Handle option changes
  const getQty = (p: Product) => qtys[p.id] || p.minQuantity || 1;
  const getSize = (p: Product) => sizes[p.id] || (p.sizeOptions && p.sizeOptions.length > 0 ? p.sizeOptions[0] : undefined);
  const getColor = (p: Product) => colors[p.id] || (p.colorOptions && p.colorOptions.length > 0 ? p.colorOptions[0] : undefined);
  const getCustoms = (p: Product) => customs[p.id] || {};

  const handleAddToCart = (product: Product) => {
    const qty = getQty(product);
    const selectedSize = getSize(product);
    const selectedColor = getColor(product);
    const customDetails = getCustoms(product);

    const compositeId = `${product.id}_${selectedSize || ''}_${selectedColor || ''}_${JSON.stringify(customDetails)}`;

    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.id === compositeId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
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
          customDetails
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
          const bounded = Math.max(item.product.minQuantity || 1, newQty);
          return { ...item, quantity: bounded };
        }
        return item;
      })
    );
  };

  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.basePrice * item.quantity,
    0
  );

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopperName.trim() || !shopperEmail.trim() || !deliveryDept.trim()) {
      alert('Please fill out all required order details.');
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
        contactEmail: shopperEmail.trim(),
        deliveryAddress: deliveryDept.trim(),
        poNumber: poNumber.trim() || undefined,
        notes: `[Order Portal: ${portal.name}] ${orderNotes.trim()}`.trim(),
        items: cartItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          customDetails: item.customDetails
        }))
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
        <div className="max-w-2xl mx-auto bg-white border border-black rounded-3xl p-6 sm:p-10 shadow-xl space-y-8 animate-fade-in">
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
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4 text-xs font-mono">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Order Reference #:</span>
              <span className="font-extrabold text-black">{submittedOrder.orderNumber}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Shopper Name:</span>
              <span className="font-bold text-black">{submittedOrder.contactPerson}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Email:</span>
              <span className="font-bold text-black">{submittedOrder.contactEmail}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">Delivery Office/Dept:</span>
              <span className="font-bold text-black">{submittedOrder.deliveryAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Order Value:</span>
              <span className="font-extrabold text-black">
                {systemSettings.currencySymbol || 'Php'} {submittedOrder.totalAmount.toFixed(2)}
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
                    {systemSettings.currencySymbol || 'Php'} {(it.price * it.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
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
                className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
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
              <span className="text-xs font-semibold text-gray-500 block mt-0.5">{portal.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onClosePublicView && (
              <button
                onClick={onClosePublicView}
                className="text-xs font-mono text-gray-500 hover:text-black hover:underline transition-colors hidden sm:inline"
              >
                Back to Dashboard
              </button>
            )}

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
      <div className="bg-white border-b border-gray-200 py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
            <Store className="w-3.5 h-3.5 text-black" />
            <span>Authorized Corporate Storefront</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight">
            {portal.name}
          </h2>
          {portal.description && (
            <p className="text-xs sm:text-sm text-gray-600 max-w-3xl leading-relaxed font-sans">
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
                  {/* Product Image */}
                  <div className="relative aspect-4/3 bg-gray-100 border-b border-gray-100 overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Store className="w-12 h-12" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-black text-[9px] font-mono uppercase font-bold px-2.5 py-1 rounded-full border border-gray-200">
                      {product.category}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="px-5 space-y-3">
                    <div>
                      <h4 className="text-base font-extrabold text-black uppercase tracking-tight">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 font-sans leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-baseline justify-between border-t border-gray-100 pt-2">
                      <span className="text-lg font-black text-black font-mono">
                        {systemSettings.currencySymbol || 'Php'} {product.basePrice.toFixed(2)}
                        <span className="text-[10px] text-gray-400 font-normal"> / {product.unit}</span>
                      </span>
                      {product.minQuantity > 1 && (
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          MOQ: {product.minQuantity}
                        </span>
                      )}
                    </div>

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

                      {/* Quantity Input */}
                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">
                          Quantity
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                            <button
                              onClick={() => {
                                const next = Math.max(product.minQuantity || 1, currentQty - 1);
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
                                const num = parseInt(e.target.value) || product.minQuantity || 1;
                                setQtys(prev => ({ ...prev, [product.id]: Math.max(product.minQuantity || 1, num) }));
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
                            Total: {systemSettings.currencySymbol || 'Php'} {(product.basePrice * currentQty).toFixed(2)}
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
                {systemSettings.currencySymbol || 'Php'} {cartSubtotal.toFixed(2)}
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-black uppercase tracking-tight">Complete Your Order</h3>
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

            {/* Cart Items Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-gray-400">Order Items ({cartItems.length})</h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-2xl p-3 space-y-2 custom-scrollbar">
                {cartItems.map(item => (
                  <div key={item.id} className="p-2.5 bg-gray-50 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <h5 className="font-bold text-black uppercase truncate">{item.product.name}</h5>
                      <span className="text-[10px] text-gray-500 font-mono block">
                        {[
                          item.selectedSize && `Size: ${item.selectedSize}`,
                          item.selectedColor && `Color: ${item.selectedColor}`
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                          className="w-5 h-5 rounded bg-gray-200 text-black flex items-center justify-center font-mono font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-black w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
                          className="w-5 h-5 rounded bg-gray-200 text-black flex items-center justify-center font-mono font-bold"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-mono font-bold text-black">
                        {systemSettings.currencySymbol || 'Php'} {(item.product.basePrice * item.quantity).toFixed(2)}
                      </span>

                      <button
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
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
                <span>{systemSettings.currencySymbol || 'Php'} {cartSubtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Shopper Details Form */}
            <form onSubmit={handleCheckoutSubmit} className="space-y-4 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-mono font-bold uppercase text-gray-400">Shopper & Delivery Details</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-700">
                    Your Full Name <span className="text-red-500">*</span>
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
                    Corporate Email <span className="text-red-500">*</span>
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
                  Department / Delivery Address <span className="text-red-500">*</span>
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
                    PO / Cost Center # (Optional)
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
                    Special Notes
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
      )}
    </div>
  );
}
