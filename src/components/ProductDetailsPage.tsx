/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, Check, Plus, ArrowLeft, ShieldCheck, HelpCircle, Layers, Tag, Award, Edit, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Product } from '../types';

interface ProductDetailsPageProps {
  product: Product;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  editLabel?: string;
}

// Map color names to Tailwind CSS bg-classes or hex codes for realistic render
const getColorHex = (colorName: string): string => {
  const normalized = colorName.toLowerCase();
  if (normalized.includes('black')) return '#171717';
  if (normalized.includes('slate grey') || normalized.includes('graphite')) return '#52525b';
  if (normalized.includes('grey') || normalized.includes('gray')) return '#71717a';
  if (normalized.includes('white') || normalized.includes('natural')) return '#f5f5f4'; // Warm white
  if (normalized.includes('navy')) return '#1e3a8a';
  if (normalized.includes('blue')) return '#2563eb';
  if (normalized.includes('forest') || normalized.includes('green')) return '#14532d';
  if (normalized.includes('red')) return '#b91c1c';
  if (normalized.includes('yellow')) return '#eab308';
  return '#d4d4d4'; // default grey
};

export default function ProductDetailsPage({ product, onClose, onEdit, editLabel = 'Edit Specs' }: ProductDetailsPageProps) {
  // Calculate savings percentage
  const retailPrice = product.originalPrice || product.basePrice * 1.8;
  const savingsPercent = Math.round(((retailPrice - product.basePrice) / retailPrice) * 100);

  // Carousel Image Logic (max 15 images including color variants)
  const allImages = React.useMemo(() => {
    const base = product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls.filter(Boolean)
      : (product.imageUrl ? [product.imageUrl] : []);
    const colorImgs = product.colorImages ? Object.values(product.colorImages).filter(Boolean) : [];
    return Array.from(new Set([...base, ...colorImgs])).slice(0, 15);
  }, [product.imageUrl, product.imageUrls, product.colorImages]);

  const availableColors = React.useMemo(() => {
    if (product.colorOptions && product.colorOptions.length > 0) {
      return product.colorOptions;
    }
    if ((product as any).colors && (product as any).colors.length > 0) {
      return (product as any).colors.map((c: any) => typeof c === 'string' ? c : c.name);
    }
    return [];
  }, [product.colorOptions, (product as any).colors]);

  const [selectedColor, setSelectedColor] = React.useState<string | undefined>(
    availableColors.length > 0 ? availableColors[0] : undefined
  );

  const [currentImageIdx, setCurrentImageIdx] = React.useState(0);

  const handleSelectColor = (col: string) => {
    setSelectedColor(col);
    if (product.colorImages) {
      const keys = Object.keys(product.colorImages);
      const matchedKey = keys.find(k => k.toLowerCase().trim() === col.toLowerCase().trim());
      if (matchedKey && product.colorImages[matchedKey]) {
        const linkedUrl = product.colorImages[matchedKey];
        const foundIdx = allImages.findIndex(img => img === linkedUrl);
        if (foundIdx !== -1) {
          setCurrentImageIdx(foundIdx);
        }
      }
    }
  };

  const activeImg = allImages[currentImageIdx] || product.imageUrl;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-white flex flex-col overflow-hidden" id="product-details-fullscreen-page">
      {/* Top Navigation Bar */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-sans text-xs uppercase font-extrabold tracking-wider cursor-pointer"
          id="back-to-list-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </button>

        <div className="flex items-center gap-2.5">
          {onEdit && (
            <button
              onClick={() => onEdit(product)}
              className="px-3.5 py-1.5 bg-black border border-black text-white hover:bg-neutral-900 rounded-xl text-xs uppercase font-extrabold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              id="details-edit-specs-top-btn"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{editLabel}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-gray-200 hover:border-black flex items-center justify-center text-gray-500 hover:text-black transition-all cursor-pointer bg-white"
            aria-label="Close details"
            id="close-details-top-x-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto bg-[#fafafa] p-4 sm:p-6 md:p-12 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
        >
          {/* Left Side: Product Media Container */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#edf0f3] aspect-square rounded-[2rem] relative flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm group">
              {activeImg && activeImg.startsWith('http') ? (
                <img
                  src={activeImg}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-8xl select-none">{activeImg || product.imageUrl}</div>
              )}

              {product.frequentlyOrdered && (
                <span className="absolute top-4 left-4 bg-black text-white text-[9px] font-mono font-bold tracking-widest px-3 py-1 rounded-full uppercase z-10">
                  B2B Best-Seller
                </span>
              )}

              {/* Carousel Navigation Arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIdx(prev => (prev - 1 + allImages.length) % allImages.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-105 z-20"
                    id="carousel-prev-btn"
                    title="Previous Image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentImageIdx(prev => (prev + 1) % allImages.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-black shadow-md flex items-center justify-center cursor-pointer transition-all hover:scale-105 z-20"
                    id="carousel-next-btn"
                    title="Next Image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <span className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md text-white text-[9px] font-mono font-bold px-2.5 py-1 rounded-full uppercase z-10">
                    {currentImageIdx + 1} / {allImages.length}
                  </span>
                </>
              )}
            </div>

            {/* Thumbnail Gallery Bar (Max 5) */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {allImages.map((imgUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentImageIdx(index)}
                    className={`w-16 h-16 rounded-2xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer bg-gray-100 ${
                      currentImageIdx === index
                        ? 'border-black ring-2 ring-black/20 scale-105 shadow-xs'
                        : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400'
                    }`}
                    id={`carousel-thumb-${index}`}
                  >
                    {imgUrl.startsWith('http') ? (
                      <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">{imgUrl}</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Spec Highlights Card */}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 space-y-4">
              <h4 className="font-extrabold text-[10px] uppercase font-mono tracking-widest text-black border-b border-gray-100 pb-2.5 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-900" />
                Enterprise Fulfillment Grade
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold leading-none">B2B Standard</span>
                  <span className="font-bold text-black uppercase mt-1 block">Certified Logo Match</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold leading-none">Fulfillment</span>
                  <span className="font-bold text-black uppercase mt-1 block">Custom-on-Demand</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold leading-none">Min Order</span>
                  <span className="font-bold text-black uppercase mt-1 block">{product.minQuantity} {product.unit}</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold leading-none">Lead Time</span>
                  <span className="font-bold text-green-600 uppercase mt-1 block">{product.leadTime || '5-7 Business Days'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Product Details & Options */}
          <div className="lg:col-span-7 space-y-8 bg-white border border-gray-200 rounded-[2rem] p-6 md:p-8 lg:p-10 shadow-sm">
            {/* Title Block */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[9px] font-bold tracking-widest uppercase rounded font-mono">
                  {product.category}
                </span>
                <span className="px-2.5 py-0.5 bg-neutral-900 text-white text-[9px] font-bold tracking-widest uppercase rounded font-mono flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Pre-Approved Contract Spec
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black uppercase text-black tracking-tight leading-tight">
                {product.name}
              </h1>

              <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-sans">
                {product.description}
              </p>
            </div>

            {/* Price Table Component */}
            <div className="p-4 sm:p-5 bg-[#fafafa] border border-gray-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 font-mono items-center">
              <div>
                <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold">B2B Deal Price</span>
                <span className="text-xl font-black text-black block mt-0.5">Php {(Number(product.basePrice) || 0).toFixed(2)}</span>
                <span className="text-[9px] text-gray-400 block">per {product.unit}</span>
              </div>
              <div className="border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-4">
                <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold">MSRP Retail</span>
                <span className="text-sm font-bold text-gray-400 line-through block mt-1">Php {(Number(retailPrice) || 0).toFixed(2)}</span>
                <span className="text-[9px] text-red-500 font-bold block">Save {savingsPercent}%</span>
              </div>
            </div>

            {/* Shipping Logistics Fee Display */}
            <div className="flex items-center gap-2 p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-black">
              <span className="font-bold uppercase tracking-wider text-[9px] text-gray-400">Shipping Logistics Fee:</span>
              <span className="font-bold text-black">Php {product.shippingFee !== undefined ? (Number(product.shippingFee) || 0).toFixed(2) : '15.00'}</span>
              <span className="text-[10px] text-gray-500">(flat-rate logistics fee for this product line)</span>
            </div>

            {/* Sizes Section */}
            {(() => {
              const displaySizes = (product.sizeOptions && product.sizeOptions.length > 0)
                ? product.sizeOptions
                : ((product as any).sizes && (product as any).sizes.length > 0 ? (product as any).sizes : []);
              if (displaySizes.length === 0) return null;
              return (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] uppercase font-mono tracking-widest text-black font-extrabold flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-gray-400" />
                      Authorized Corporate Sizes
                    </h3>
                    <span className="text-[9px] text-gray-400 font-mono">Selectable on checkout</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {displaySizes.map((sz: string) => {
                      const vPrice = product.variantPrices?.[sz];
                      return (
                        <div
                          key={sz}
                          className="px-3.5 py-2 border-2 border-black text-black bg-[#fcfcfc] text-xs font-mono font-black rounded-xl select-none flex items-center gap-1.5"
                        >
                          <span>{sz}</span>
                          {vPrice !== undefined && (
                            <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded font-bold">
                              Php {(Number(vPrice) || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Colors Section */}
            {availableColors.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] uppercase font-mono tracking-widest text-black font-extrabold flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-gray-400" />
                    Available Corporate Color Palette
                  </h3>
                  <span className="text-[9px] text-gray-400 font-mono">Matched to brand standard</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availableColors.map((col) => {
                    const colorHex = getColorHex(col);
                    const isWhite = colorHex === '#ffffff' || colorHex === '#f5f5f4';
                    const isSelected = selectedColor === col;
                    const matchedKey = product.colorImages ? Object.keys(product.colorImages).find(k => k.toLowerCase().trim() === col.toLowerCase().trim()) : undefined;
                    const hasLinkedImg = matchedKey ? !!product.colorImages?.[matchedKey] : false;

                    return (
                      <button
                        type="button"
                        key={col}
                        onClick={() => handleSelectColor(col)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-black bg-black text-white shadow-sm ring-2 ring-black/20'
                            : 'border-gray-200 bg-white hover:border-gray-400 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`w-6 h-6 rounded-full block border shadow-xs shrink-0`}
                            style={{
                              backgroundColor: colorHex,
                              borderColor: isWhite ? '#d4d4d4' : colorHex
                            }}
                          />
                          <span className={`text-xs font-bold uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                            {col}
                          </span>
                        </div>
                        {hasLinkedImg && (
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                            Photo
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Add-Ons Section */}
            {product.addOns && product.addOns.length > 0 && (
              <div className="space-y-3.5 pt-4 border-t border-gray-100">
                <h3 className="text-[10px] uppercase font-mono tracking-widest text-black font-extrabold flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Available Item Add-Ons & Accessories
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {product.addOns.map((a, idx) => (
                    <div
                      key={a.id || idx}
                      className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {a.imageUrl && (
                          <img
                            src={a.imageUrl}
                            alt={a.name}
                            className="w-9 h-9 rounded-xl border border-emerald-200/80 object-cover shrink-0"
                          />
                        )}
                        <div>
                          <span className="font-extrabold text-black uppercase tracking-tight block">
                            {a.name}
                          </span>
                          {a.description && (
                            <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                              {a.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0 text-xs shadow-2xs">
                        +Php {Number(a.price || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Pre-Approved Variants Section */}
            {product.customFields && product.customFields.length > 0 && (
              <div className="space-y-3.5 pt-4 border-t border-gray-100">
                <h3 className="text-[10px] uppercase font-mono tracking-widest text-black font-extrabold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                  Pre-Configured Customization Specs
                </h3>
                <div className="space-y-3">
                  {product.customFields.map((field) => (
                    <div
                      key={field.name}
                      className="p-4 bg-gray-50/40 border border-gray-200 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-black uppercase tracking-tight block">
                          {field.label}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono uppercase block">
                          Field Type: {field.type} {field.required ? '• Required' : '• Optional'}
                        </span>
                      </div>
                      <div className="shrink-0">
                        {field.type === 'select' && field.options ? (
                          <div className="flex flex-wrap gap-1.5">
                            {field.options.map((opt) => (
                              <span
                                key={opt}
                                className="bg-white border border-gray-200 text-[10px] px-2.5 py-1 rounded-md font-mono font-bold text-gray-700"
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="bg-white border border-gray-200 text-[10px] px-3 py-1 rounded-md font-mono text-gray-500 italic">
                            {field.placeholder || 'Client personal input text'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>,
    document.body
  );
}
