/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, CartItem, ProductAddOn } from '../types';
import { getProductUnitPrice } from '../utils/pricing';
import { Check, Plus, AlertCircle, Sparkles, SlidersHorizontal, Heart, Clock, Truck, Edit3, X, Save } from 'lucide-react';
import ProductDetailsPage from './ProductDetailsPage';
import ProductImageCarousel from './ProductImageCarousel';
import { sheetsService } from '../lib/sheetsService';

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (item: Omit<CartItem, 'id'>) => void;
  onUpdateProduct?: (product: Product) => void;
  appsScriptUrl?: string;
  userRole?: 'admin' | 'client';
}

export default function ProductCatalog({ products, onAddToCart, onUpdateProduct, appsScriptUrl, userRole = 'client' }: ProductCatalogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);

  // Quick Card Fulfillment Editor State
  const [editingCardProduct, setEditingCardProduct] = useState<Product | null>(null);
  const [editLeadTime, setEditLeadTime] = useState<string>('');
  const [editDeliveryCharge, setEditDeliveryCharge] = useState<number>(0);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSavingCard, setIsSavingCard] = useState<boolean>(false);
  const [cardColors, setCardColors] = useState<Record<string, string>>({});

  const handleSaveCardEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCardProduct) return;
    setIsSavingCard(true);

    const updatedProduct: Product = {
      ...editingCardProduct,
      leadTime: editLeadTime,
      shippingFee: editDeliveryCharge
    };

    if (onUpdateProduct) {
      onUpdateProduct(updatedProduct);
    }

    if (appsScriptUrl) {
      try {
        await sheetsService.saveProduct(appsScriptUrl, updatedProduct);
      } catch (err) {
        console.error('Error saving product to sheets:', err);
      }
    }

    setIsSavingCard(false);
    setSaveSuccessMsg(`Updated fulfillment details for "${updatedProduct.name}". Recorded to Google Sheets.`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
    setEditingCardProduct(null);
  };

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const cached = localStorage.getItem('rp_product_favorites');
    return cached ? JSON.parse(cached) : {};
  });

  useEffect(() => {
    localStorage.setItem('rp_product_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Configuration States (keyed by product ID for simple state handling)
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [customDetails, setCustomDetails] = useState<Record<string, Record<string, string>>>({});
  const [selectedAddOnsMap, setSelectedAddOnsMap] = useState<Record<string, ProductAddOn[]>>({});
  const [addedNotification, setAddedNotification] = useState<string | null>(null);

  const categories = ['All', 'Uniforms', 'IDs & Accessories', 'Print Materials', 'Promo Items'];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const handleStartConfigure = (product: Product) => {
    setConfiguringId(product.id);
    // Initialize default values if not already set
    if (!qtys[product.id]) {
      setQtys(prev => ({ ...prev, [product.id]: product.minQuantity }));
    }
    if (product.sizeOptions && !sizes[product.id]) {
      setSizes(prev => ({ ...prev, [product.id]: product.sizeOptions![0] }));
    }
    if (product.colorOptions && !colors[product.id]) {
      setColors(prev => ({ ...prev, [product.id]: product.colorOptions![0] }));
    }
    if (product.customFields) {
      const defaults: Record<string, string> = {};
      product.customFields.forEach(field => {
        if (field.type === 'select' && field.options) {
          defaults[field.label] = field.options[0];
        } else {
          defaults[field.label] = '';
        }
      });
      setCustomDetails(prev => ({ ...prev, [product.id]: defaults }));
    }
  };

  const handleCustomFieldChange = (productId: string, label: string, value: string) => {
    setCustomDetails(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [label]: value
      }
    }));
  };

  const handleAdd = (product: Product) => {
    const qty = qtys[product.id] || product.minQuantity;
    if (qty < product.minQuantity) {
      alert(`Minimum order quantity for this item is ${product.minQuantity} ${product.unit}.`);
      return;
    }

    const selectedSize = product.sizeOptions ? (sizes[product.id] || product.sizeOptions[0]) : undefined;
    const selectedColor = product.colorOptions ? (colors[product.id] || product.colorOptions[0]) : undefined;
    const selectedAddOns = selectedAddOnsMap[product.id] || [];
    const addOnsCost = selectedAddOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const baseUnitPrice = getProductUnitPrice(product, selectedSize, selectedColor);
    const finalUnitPrice = baseUnitPrice + addOnsCost;

    onAddToCart({
      product,
      quantity: qty,
      selectedSize,
      selectedColor,
      selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
      customDetails: customDetails[product.id] || {},
      unitPrice: finalUnitPrice
    });

    // Reset configuring and show toast
    setConfiguringId(null);
    setAddedNotification(product.name);
    setTimeout(() => {
      setAddedNotification(null);
    }, 2500);
  };

  return (
    <div className="space-y-8">
      {/* Category Header Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-black pb-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black">Product Catalog</h2>
          <p className="text-xs text-gray-500 font-mono">Select repeatable corporate products &amp; custom uniforms</p>
        </div>
        
        {/* Horizontal Category Scroll */}
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar pb-3 pt-1 w-full md:w-auto max-w-full">
          <SlidersHorizontal className="w-4 h-4 text-black mr-2 shrink-0 hidden md:inline" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-sans uppercase font-bold tracking-wider border rounded-xl transition-all whitespace-nowrap focus:outline-none cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-black hover:border-black'
              }`}
              id={`cat-filter-${cat.replace(/\s+/g, '-').toLowerCase()}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Adding Notification Banner */}
      {addedNotification && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-5 py-3.5 border border-white font-sans text-xs uppercase font-bold tracking-widest shadow-xl flex items-center space-x-3 z-50 animate-fade-in animate-bounce">
          <Check className="w-4 h-4 text-white shrink-0" />
          <span>Added "{addedNotification}" to order!</span>
        </div>
      )}

      {/* Save to Sheets Success Banner */}
      {saveSuccessMsg && (
        <div className="fixed bottom-6 left-6 bg-emerald-950 text-emerald-100 border border-emerald-500 px-5 py-3.5 font-sans text-xs font-bold tracking-wide shadow-2xl rounded-2xl flex items-center space-x-3 z-50 animate-fade-in">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Grid of Products */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 space-y-4 max-w-xl mx-auto shadow-sm animate-fade-in col-span-full my-6">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 mx-auto">
            <AlertCircle className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold uppercase text-sm text-black tracking-tight font-sans">
              No Products Allocated
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-sans">
              There are currently no products allocated or enabled for your company profile in the B2B catalog. Please contact your account manager to request brand-approved corporate specifications.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => {
          const isConfiguring = configuringId === product.id;
          const currentQty = qtys[product.id] || product.minQuantity;
          const isUnderMOQ = currentQty < product.minQuantity;

          return (
            <div
              key={product.id}
              className={`rounded-3xl overflow-hidden bg-white flex flex-col transition-all duration-300 relative border border-gray-100 group shadow-sm hover:shadow-lg ${
                isConfiguring ? 'ring-2 ring-black' : ''
              }`}
              id={`product-card-${product.id}`}
            >
              {/* Product Image Section with Solid Grey Background and Interactive Carousel */}
              <ProductImageCarousel
                product={product}
                selectedColor={cardColors[product.id] || colors[product.id]}
                onImageClick={() => setSelectedProductForDetails(product)}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                className="m-3.5"
              />

              {/* Product Info Section */}
              <div className="px-5 pb-5 pt-1.5 flex-1 flex flex-col justify-between space-y-4">
                <div onClick={() => setSelectedProductForDetails(product)} className="space-y-2 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold">
                      {product.category}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      MOQ: <strong className="text-black">{product.minQuantity} {product.unit}</strong>
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-gray-800 line-clamp-2 min-h-[40px] leading-snug tracking-tight group-hover:text-black transition-colors">
                    {product.name}
                  </h3>

                  {/* B2B Negotiated Price vs Original Retail Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-black tracking-tight">
                      Php {(Number(product.basePrice) || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-red-500/80 line-through font-mono font-bold">
                      Php {(Number(product.originalPrice || (product.basePrice || 0) * 1.8) || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono ml-auto">
                      /{product.unit}
                    </span>
                  </div>
                </div>

                {/* Lead Time & Delivery Charge Banner with Quick Edit */}
                <div className="bg-neutral-50 border border-gray-200/90 rounded-2xl p-2.5 space-y-1.5 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-gray-800">
                    <div className="flex items-center gap-1.5 font-bold truncate">
                      <Clock className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                      <span className="truncate">Lead: <strong className="text-black">{product.leadTime || '5-7 Business Days'}</strong></span>
                    </div>
                    {userRole === 'admin' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCardProduct(product);
                          setEditLeadTime(product.leadTime || '5-7 Business Days');
                          setEditDeliveryCharge(product.shippingFee !== undefined ? product.shippingFee : 15.00);
                        }}
                        className="p-1 px-2 bg-white hover:bg-black hover:text-white text-gray-700 border border-gray-300 hover:border-black rounded-lg transition-all cursor-pointer flex items-center gap-1 font-sans text-[9px] font-bold uppercase shrink-0 shadow-xs"
                        title="Edit Lead Time & Delivery Charge"
                        id={`edit-card-fulfillment-${product.id}`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200/60 pt-1.5 text-gray-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Truck className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                      <span>Delivery: <strong className="text-black">
                        {product.shippingFee !== undefined && product.shippingFee > 0
                          ? `Php ${(Number(product.shippingFee) || 0).toFixed(2)}`
                          : 'Free Delivery'}
                      </strong></span>
                    </div>
                  </div>
                </div>

                {/* Configuration Panel or Buy Trigger Button */}
                {isConfiguring ? (
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-4 animate-slide-up">
                    <div className="space-y-3.5">
                      {/* Size Selector */}
                      {product.sizeOptions && (
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                            Select Size:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {product.sizeOptions.map((sz) => (
                              <button
                                key={sz}
                                onClick={() => setSizes(prev => ({ ...prev, [product.id]: sz }))}
                                className={`px-2 py-1 text-[10px] font-mono font-bold border rounded-md transition-all ${
                                  sizes[product.id] === sz
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-black'
                                }`}
                                id={`size-opt-${product.id}-${sz}`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Color Selector */}
                      {product.colorOptions && (
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider text-black font-bold font-mono mb-1">
                            Color Accent:
                          </label>
                          <select
                            value={colors[product.id] || product.colorOptions[0]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setColors(prev => ({ ...prev, [product.id]: val }));
                              setCardColors(prev => ({ ...prev, [product.id]: val }));
                            }}
                            className="w-full bg-white border border-gray-200 text-xs px-2.5 py-1.5 rounded-md font-sans text-black focus:border-black focus:outline-none"
                            id={`color-select-${product.id}`}
                          >
                            {product.colorOptions.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Custom Fields Inputs */}
                      {product.customFields?.map((field) => (
                        <div key={field.name}>
                          <label className="block text-[9px] uppercase tracking-wider text-black font-bold font-mono mb-0.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'select' ? (
                            <select
                              value={customDetails[product.id]?.[field.label] || ''}
                              onChange={(e) => handleCustomFieldChange(product.id, field.label, e.target.value)}
                              className="w-full bg-white border border-gray-200 text-xs px-2.5 py-1.5 rounded-md text-black focus:border-black focus:outline-none"
                              id={`custom-select-${product.id}-${field.name}`}
                            >
                              {field.options?.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea
                              value={customDetails[product.id]?.[field.label] || ''}
                              onChange={(e) => handleCustomFieldChange(product.id, field.label, e.target.value)}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full bg-white border border-gray-200 text-xs p-2 rounded-md text-black focus:border-black focus:outline-none font-mono resize-none leading-normal"
                              id={`custom-textarea-${product.id}-${field.name}`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={customDetails[product.id]?.[field.label] || ''}
                              onChange={(e) => handleCustomFieldChange(product.id, field.label, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full bg-white border border-gray-200 text-xs px-2.5 py-1.5 rounded-md text-black focus:border-black focus:outline-none"
                              id={`custom-input-${product.id}-${field.name}`}
                            />
                          )}
                        </div>
                      ))}

                      {/* Quantity Selector with MOQ validation */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[9px] uppercase tracking-wider text-black font-bold font-mono">
                            Quantity ({product.unit}):
                          </label>
                          {isUnderMOQ && (
                            <span className="text-[9px] text-red-500 font-mono flex items-center gap-1 font-bold">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              Under MOQ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setQtys(prev => {
                              const val = Math.max(product.minQuantity, currentQty - 1);
                              return { ...prev, [product.id]: val };
                            })}
                            disabled={currentQty <= product.minQuantity}
                            className="bg-white border border-gray-200 rounded-md text-black px-2.5 py-1 text-xs font-bold font-mono hover:bg-black hover:text-white disabled:opacity-30 cursor-pointer"
                            id={`qty-minus-${product.id}`}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={currentQty}
                            min={product.minQuantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setQtys(prev => ({ ...prev, [product.id]: val }));
                            }}
                            className={`w-14 bg-white border rounded-md p-1 text-center font-mono font-bold text-xs focus:outline-none ${
                              isUnderMOQ ? 'border-red-500 text-red-500' : 'border-gray-200 focus:border-black'
                            }`}
                            id={`qty-input-${product.id}`}
                          />
                          <button
                            onClick={() => setQtys(prev => ({ ...prev, [product.id]: currentQty + 1 }))}
                            className="bg-white border border-gray-200 rounded-md text-black px-2.5 py-1 text-xs font-bold font-mono hover:bg-black hover:text-white cursor-pointer"
                            id={`qty-plus-${product.id}`}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Optional Add-Ons checklist */}
                      {product.addOns && product.addOns.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-gray-100">
                          <label className="block text-[9px] uppercase tracking-wider text-black font-bold font-mono">
                            Optional Item Add-Ons:
                          </label>
                          <div className="space-y-1 bg-gray-50/80 p-2 rounded-lg border border-gray-200">
                            {product.addOns.map((addOn) => {
                              const currentSelected = selectedAddOnsMap[product.id] || [];
                              const isChecked = currentSelected.some(a => a.id === addOn.id || a.name === addOn.name);
                              return (
                                <label
                                  key={addOn.id || addOn.name}
                                  className={`flex items-start gap-2 p-1.5 rounded-md cursor-pointer transition-colors ${
                                    isChecked ? 'bg-emerald-50/90 border border-emerald-300' : 'hover:bg-white border border-transparent'
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
                                          return { ...prev, [product.id]: [...list, addOn] };
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
                                  <div className="flex-1 text-[10px] leading-tight">
                                    <div className="flex justify-between items-center font-mono font-bold text-black">
                                      <span>{addOn.name}</span>
                                      <span className="text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[9px]">
                                        +Php {Number(addOn.price || 0).toFixed(2)}
                                      </span>
                                    </div>
                                    {addOn.description && (
                                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">{addOn.description}</p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setConfiguringId(null)}
                        className="flex-1 bg-white border border-gray-200 text-gray-500 rounded-lg py-2 text-xs uppercase font-bold tracking-wider hover:text-black hover:border-black transition-colors cursor-pointer text-center"
                        id={`cancel-config-${product.id}`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAdd(product)}
                        disabled={isUnderMOQ}
                        className="flex-1 bg-black text-white border border-black rounded-lg py-2 text-xs uppercase font-bold tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer text-center disabled:opacity-40"
                        id={`add-config-to-cart-${product.id}`}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleStartConfigure(product)}
                    className="w-full bg-white border border-black text-black rounded-xl py-2.5 px-4 text-xs uppercase font-extrabold tracking-wider hover:bg-black hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    id={`configure-btn-${product.id}`}
                  >
                    <span>Configure Order</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}
      {selectedProductForDetails && (
        <ProductDetailsPage
          product={selectedProductForDetails}
          onClose={() => setSelectedProductForDetails(null)}
          onEdit={(product) => {
            setSelectedProductForDetails(null);
            handleStartConfigure(product);
          }}
          editLabel="Configure Order"
        />
      )}

      {/* Quick Edit Modal for Product Card Lead Time & Delivery Charge */}
      {editingCardProduct && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setEditingCardProduct(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold block">
                  Quick Edit Product Fulfillment
                </span>
                <h3 className="font-extrabold text-base uppercase text-black line-clamp-1 mt-0.5">
                  {editingCardProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingCardProduct(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCardEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                  <span>Fulfillment Lead Time *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editLeadTime}
                  onChange={(e) => setEditLeadTime(e.target.value)}
                  placeholder="e.g. 5-7 Business Days"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                />
                <p className="text-[10px] text-gray-400 font-mono">
                  e.g., '3-5 Days', '5-7 Business Days', 'Rush 24 Hours'
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                  <span>Delivery Charge / Shipping Fee (PHP) *</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editDeliveryCharge}
                  onChange={(e) => setEditDeliveryCharge(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                />
                <p className="text-[10px] text-gray-400 font-mono">Enter 0 for Free Delivery.</p>
              </div>

              <div className="bg-neutral-50 p-3 rounded-xl border border-gray-200/80 text-[10px] font-mono text-gray-600 space-y-1">
                <p className="font-bold text-black flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Google Sheets Sync Active
                </p>
                <p>
                  Saving will immediately update this product card and record changes to your connected Google Sheet.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCardProduct(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 text-xs font-bold font-sans uppercase rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCard}
                  className="flex-1 px-4 py-3 bg-black text-white text-xs font-bold font-sans uppercase rounded-xl hover:bg-neutral-800 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  id="save-card-fulfillment-btn"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingCard ? 'Saving...' : 'Save & Sync Sheet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
