/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CartItem, CompanyProfile, Order } from '../types';
import { getProductUnitPrice } from '../utils/pricing';
import { getItemColorImage } from '../utils/colorUtils';
import { X, Trash2, ShoppingBag, Plus, Minus, AlertCircle, Send, Check } from 'lucide-react';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  activeCompany: CompanyProfile;
  onSubmitOrder: (orderData: { poNumber: string; notes: string; deliveryAddress: string; contactPerson: string; contactEmail: string; contactNumber?: string; fbMessengerLink?: string; shippingCost?: number }, checkedItems?: CartItem[]) => Promise<void>;
  isSubmitting: boolean;
}

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  activeCompany,
  onSubmitOrder,
  isSubmitting
}: CartProps) {
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [customAddress, setCustomAddress] = useState(activeCompany?.deliveryAddress || '');
  const [customContact, setCustomContact] = useState(activeCompany?.contactPerson || '');
  const [customEmail, setCustomEmail] = useState(activeCompany?.contactEmail || '');
  const [customPhone, setCustomPhone] = useState(activeCompany?.contactPhone || '');
  const [customMessenger, setCustomMessenger] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [uncheckedItemIds, setUncheckedItemIds] = useState<string[]>([]);
  // Sync state if company changes
  React.useEffect(() => {
    setCustomAddress(activeCompany?.deliveryAddress || '');
    setCustomContact(activeCompany?.contactPerson || '');
    setCustomEmail(activeCompany?.contactEmail || '');
    setCustomPhone(activeCompany?.contactPhone || '');
    setCustomMessenger('');
    setPoNumber('');
    setNotes('');
    setUncheckedItemIds([]);
  }, [activeCompany?.id]);

  if (!isOpen) return null;

  const checkedItems = cartItems.filter(item => !uncheckedItemIds.includes(item.id));
  const subtotal = checkedItems.reduce((acc, item) => {
    const uPrice = item.unitPrice ?? getProductUnitPrice(item.product, item.selectedSize, item.selectedColor);
    return acc + (uPrice * Number(item.quantity));
  }, 0);
  const shippingThreshold = 500;
  
  // Calculate shipping cost: free if subtotal >= 500, otherwise max delivery charge of checked items (or 15.00 default)
  let shippingCost = 0;
  if (subtotal > 0 && subtotal < shippingThreshold) {
    const explicitFees = checkedItems.map(item => Number(item.product.shippingFee !== undefined ? item.product.shippingFee : 15.00));
    const maxFee = explicitFees.length > 0 ? Math.max(...explicitFees) : 15.00;
    shippingCost = maxFee > 0 ? maxFee : 15.00;
  }
  
  const total = subtotal + shippingCost;

  // Dynamic Turnaround Lead-Time logic
  const hasApparel = checkedItems.some(item => item.product.category === 'Uniforms');
  const hasIDAccessories = checkedItems.some(item => item.product.category === 'IDs & Accessories');
  const turnaroundDays = hasApparel ? '7-10 Business Days (Embroidery Queue)' : hasIDAccessories ? '3-5 Business Days' : '2-3 Business Days';

  const isPoMissing = activeCompany?.poRequired && !poNumber.trim();
  const canSubmit = checkedItems.length > 0 && !isPoMissing && customAddress.trim() && customContact.trim();

  const handleCheckoutClick = () => {
    if (activeCompany?.poRequired && !poNumber.trim()) {
      alert(`Acme Corp accounts require a Purchase Order (PO) Number to proceed with B2B billing.`);
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    await onSubmitOrder({
      poNumber: poNumber.trim(),
      notes: notes.trim(),
      deliveryAddress: customAddress.trim(),
      contactPerson: customContact.trim(),
      contactEmail: customEmail.trim(),
      contactNumber: customPhone.trim(),
      fbMessengerLink: customMessenger.trim(),
      shippingCost: shippingCost
    }, checkedItems);
    setShowConfirm(false);
  };

  const toggleCheckItem = (id: string) => {
    setUncheckedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const renderProductImage = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return (
        <img
          src={imageUrl}
          alt="Product"
          className="w-8 h-8 object-cover rounded-lg shrink-0 border border-gray-100"
          referrerPolicy="no-referrer"
        />
      );
    }
    if (imageUrl.length <= 4) {
      return (
        <span className="text-sm p-1 bg-gray-50 border border-gray-100 w-8 h-8 flex items-center justify-center select-none shrink-0 rounded-lg font-sans">
          {imageUrl}
        </span>
      );
    }
    return (
      <div className="w-8 h-8 bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 rounded-lg">
        <ShoppingBag className="w-4 h-4 text-gray-400" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-lg bg-white border-l-2 border-black flex flex-col h-full relative">
          
          {/* Cart Header */}
          <div className="p-4 sm:p-6 border-b border-black flex items-center justify-between bg-black text-white">
            <div className="flex items-center space-x-2.5">
              <ShoppingBag className="w-5 h-5" />
              <h3 className="text-sm font-bold uppercase tracking-widest font-mono">My Cart</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 focus:outline-none transition-colors"
              aria-label="Close panel"
              id="close-cart-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
            {cartItems.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="text-4xl">🛒</div>
                <h4 className="font-bold uppercase tracking-wide text-xs text-black">Your Order Cart is Empty</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Browse our printable products and uniforms catalog to add repeatable corporate items.
                </p>
                <button
                  onClick={onClose}
                  className="bg-black text-white text-xs uppercase font-bold tracking-wider px-4 py-2 border border-black hover:bg-white hover:text-black transition-all cursor-pointer"
                  id="cart-browse-btn"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Active Client Badge */}
                <div className="bg-gray-50 border border-black p-3.5 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[9px] uppercase text-gray-400 block font-bold">Billing Account</span>
                    <span className="text-black font-extrabold">{activeCompany?.name || 'N/A'}</span>
                  </div>
                  {activeCompany?.poRequired && (
                    <span className="text-[8px] bg-black text-white uppercase font-bold tracking-widest px-1.5 py-0.5 border border-black">
                      PO Obligated
                    </span>
                  )}
                </div>

                {/* List of Cart Items */}
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono">Cart Items</h4>
                  <div className="divide-y divide-gray-100 border-y divide-dashed border-gray-200">
                    {cartItems.map((item) => {
                      const isChecked = !uncheckedItemIds.includes(item.id);
                      const itemUnitPrice = Number(item.unitPrice ?? getProductUnitPrice(item.product, item.selectedSize, item.selectedColor)) || 0;
                      const itemLineTotal = itemUnitPrice * (Number(item.quantity) || 0);
                      return (
                        <div key={item.id} className={`py-4 space-y-2 transition-opacity duration-200 ${isChecked ? '' : 'opacity-50'}`} id={`cart-row-${item.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center space-x-3">
                              {/* Checkbox beside each item */}
                              <label className="relative flex items-center justify-center cursor-pointer p-0.5 shrink-0 select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCheckItem(item.id)}
                                  className="sr-only peer"
                                  id={`cart-item-check-${item.id}`}
                                />
                                <div className="w-4 h-4 border border-black rounded-none flex items-center justify-center bg-white peer-checked:bg-black peer-checked:border-black transition-all">
                                  {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                                </div>
                              </label>

                              {/* Product Thumbnail (safe from overlaps) */}
                              {renderProductImage(getItemColorImage(item.product, item.selectedColor))}

                              <div>
                                <h5 className="font-bold text-xs text-black uppercase tracking-tight">
                                  {item.product.name}
                                </h5>
                                <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                                  Php {itemUnitPrice.toFixed(2)} per {item.product.unit}
                                </span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="text-gray-400 hover:text-black transition-colors"
                              aria-label="Remove item"
                              id={`remove-cart-item-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Config Details */}
                          <div className="pl-14 flex flex-wrap gap-x-3.5 gap-y-1 text-[10px] font-mono text-gray-500 bg-gray-50/50 p-2 border border-gray-100">
                            {item.selectedSize && (
                              <span className="bg-white px-1.5 py-0.5 border border-gray-200">
                                Size: <strong>{item.selectedSize}</strong>
                              </span>
                            )}
                            {item.selectedColor && (
                              <span className="bg-white px-1.5 py-0.5 border border-gray-200">
                                Color: <strong>{item.selectedColor}</strong>
                              </span>
                            )}
                            {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                              <div className="w-full flex flex-wrap gap-1 mt-0.5">
                                {item.selectedAddOns.map((addOn, aIdx) => (
                                  <span key={aIdx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold">
                                    +{addOn.name} (+Php {Number(addOn.price || 0).toFixed(2)})
                                  </span>
                                ))}
                              </div>
                            )}
                            {Object.entries(item.customDetails).map(([key, value]) => (
                              value ? (
                                <span key={key} className="block w-full text-[9px] text-gray-600">
                                  <strong>{key}:</strong> {value}
                                </span>
                              ) : null
                            ))}
                          </div>

                          {/* Quantity controls & Line total */}
                          <div className="pl-14 flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= item.product.minQuantity}
                                className="bg-white border border-gray-200 text-black px-1.5 py-0.5 text-xs hover:border-black disabled:opacity-30 disabled:hover:border-gray-200 focus:outline-none cursor-pointer"
                                id={`cart-qty-minus-${item.id}`}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                className="bg-white border border-gray-200 text-black px-1.5 py-0.5 text-xs hover:border-black focus:outline-none cursor-pointer"
                                id={`cart-qty-plus-${item.id}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            
                            <div className="font-mono text-xs text-right">
                              <span className="text-gray-400">Total: </span>
                              <span className="font-bold text-black">Php {itemLineTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* B2B Logistics and Delivery Form */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono">B2B Order Configurations</h4>
                  
                  <div className="space-y-3.5">
                    {/* PO Number */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono">
                          Purchase Order (PO) Number:
                        </label>
                        {activeCompany?.poRequired && (
                          <span className="text-[8px] uppercase tracking-widest font-bold text-red-500 font-mono">
                            Mandatory Field
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="e.g. PO-99120"
                        className={`w-full bg-white border text-xs px-2.5 py-1.5 text-black font-mono focus:outline-none ${
                          isPoMissing ? 'border-red-500 focus:border-red-500 bg-red-50/20' : 'border-black focus:border-2 focus:border-black'
                        }`}
                        id="checkout-po-number-input"
                      />
                      {isPoMissing && (
                        <p className="text-[9px] text-red-500 mt-1 font-mono">
                          ✕ A valid Purchase Order number is required for accounts billed to {activeCompany?.name || 'N/A'}.
                        </p>
                      )}
                    </div>

                    {/* Contact Person */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                        Name:
                      </label>
                      <input
                        type="text"
                        value={customContact}
                        onChange={(e) => setCustomContact(e.target.value)}
                        className="w-full bg-white border border-black text-xs px-2.5 py-1.5 text-black focus:outline-none font-mono"
                        id="checkout-contact-person-input"
                      />
                    </div>

                    {/* Contact Email */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                        Email:
                      </label>
                      <input
                        type="email"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="w-full bg-white border border-black text-xs px-2.5 py-1.5 text-black focus:outline-none font-mono"
                        id="checkout-contact-email-input"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                        Phone Number:
                      </label>
                      <input
                        type="tel"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="e.g. +63 917 123 4567"
                        className="w-full bg-white border border-black text-xs px-2.5 py-1.5 text-black focus:outline-none font-mono"
                        id="checkout-contact-phone-input"
                      />
                    </div>

                    {/* Facebook Messenger Link */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                        Facebook Messenger Link:
                      </label>
                      <input
                        type="text"
                        value={customMessenger}
                        onChange={(e) => setCustomMessenger(e.target.value)}
                        placeholder="e.g. https://m.me/username or fb.com/username"
                        className="w-full bg-white border border-black text-xs px-2.5 py-1.5 text-black focus:outline-none font-mono"
                        id="checkout-fb-messenger-input"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                        Address:
                      </label>
                      <textarea
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        rows={2}
                        className="w-full bg-white border border-black text-xs p-2 text-black focus:outline-none font-mono resize-none leading-normal"
                        id="checkout-delivery-address-textarea"
                      />
                    </div>

                    {/* Delivery Notes */}
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                        Notes:
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Leave with building security. Navy embroidery thread must match Pantone 293C."
                        rows={2}
                        className="w-full bg-white border border-black text-xs p-2 text-black focus:outline-none font-mono resize-none leading-normal"
                        id="checkout-delivery-notes-textarea"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Checkout Totals Summary & Submit */}
          {cartItems.length > 0 && (
            <div className="border-t border-black bg-gray-50 p-4 sm:p-6 space-y-4">
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Cart Subtotal</span>
                  <span>Php {(Number(subtotal) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 py-1">
                  <span>Shipping &amp; Logistics</span>
                  <span className="font-bold text-black">Php {(Number(shippingCost) || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-black text-sm font-extrabold border-t border-gray-200 pt-2">
                  <span>ESTIMATED BILLING</span>
                  <span>Php {(Number(total) || 0).toFixed(2)}</span>
                </div>
              </div>

              {!showConfirm ? (
                <div className="space-y-2">
                  <button
                    onClick={handleCheckoutClick}
                    disabled={!canSubmit}
                    className="w-full bg-black text-white py-3.5 text-xs uppercase font-extrabold tracking-widest border border-black hover:bg-white hover:text-black transition-all focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:bg-black disabled:hover:text-white"
                    id="checkout-proceed-btn"
                  >
                    <Send className="w-4 h-4" />
                    <span>Place Order</span>
                  </button>
                  {!canSubmit && (
                    <p className="text-[10px] text-red-500 font-mono text-center leading-normal">
                      {!checkedItems.length ? "✕ Please check at least one item to order." :
                       isPoMissing ? "✕ A Purchase Order (PO) Number is required." :
                       !customContact.trim() ? "✕ Authorized Buyer Name is required." :
                       !customAddress.trim() ? "✕ Address is required." : ""}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 animate-slide-up">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-mono text-center font-bold">
                    ⚠️ Double Check details. Confirm submission?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 bg-white border border-gray-300 text-gray-500 py-2.5 text-xs uppercase font-bold tracking-wider hover:text-black hover:border-black transition-colors focus:outline-none cursor-pointer text-center"
                      id="confirm-checkout-cancel-btn"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                      className="flex-1 bg-black text-white border border-black py-2.5 text-xs uppercase font-bold tracking-wider hover:bg-white hover:text-black transition-all focus:outline-none cursor-pointer text-center disabled:opacity-40"
                      id="confirm-checkout-submit-btn"
                    >
                      {isSubmitting ? 'Syncing...' : 'Yes, Place Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
