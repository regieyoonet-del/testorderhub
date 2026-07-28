/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, CartItem } from '../types';
import { Check, ShoppingCart, Info, AlertTriangle, ArrowRight } from 'lucide-react';

interface QuickReorderProps {
  products: Product[];
  onAddToCart: (items: Omit<CartItem, 'id'>[]) => void;
}

export default function QuickReorder({ products, onAddToCart }: QuickReorderProps) {
  const frequentItems = products.filter(p => p.frequentlyOrdered);

  // Maintain bulk selection, quantities, and quick configurations
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [showBulkSuccess, setShowBulkSuccess] = useState(false);

  // Initialize values
  useEffect(() => {
    const initialSelected: Record<string, boolean> = {};
    const initialQtys: Record<string, number> = {};
    const initialSizes: Record<string, string> = {};
    const initialColors: Record<string, string> = {};

    frequentItems.forEach(p => {
      initialSelected[p.id] = true; // Default to selected for quick speed
      initialQtys[p.id] = p.minQuantity;
      if (p.sizeOptions) {
        initialSizes[p.id] = p.sizeOptions[0];
      }
      if (p.colorOptions) {
        initialColors[p.id] = p.colorOptions[0];
      }
    });

    setSelectedIds(initialSelected);
    setQuantities(initialQtys);
    setSelectedSizes(initialSizes);
    setSelectedColors(initialColors);
  }, [products]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQtyChange = (id: string, val: number, min: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(min, val) }));
  };

  const handleBulkAdd = () => {
    const itemsToAdd: Omit<CartItem, 'id'>[] = [];
    
    frequentItems.forEach(p => {
      if (selectedIds[p.id]) {
        const qty = quantities[p.id] || p.minQuantity;
        const size = selectedSizes[p.id];
        const color = selectedColors[p.id];
        
        // Form standard B2B default personalization for fast checkout
        const defaultCustoms: Record<string, string> = {};
        if (p.customFields) {
          p.customFields.forEach(field => {
            if (field.type === 'select' && field.options) {
              defaultCustoms[field.label] = field.options[0];
            } else if (field.label.toLowerCase().includes('details') || field.label.toLowerCase().includes('name')) {
              defaultCustoms[field.label] = 'Standard repeating layout (as per company files)';
            } else {
              defaultCustoms[field.label] = '';
            }
          });
        }

        itemsToAdd.push({
          product: p,
          quantity: qty,
          selectedSize: size,
          selectedColor: color,
          customDetails: defaultCustoms
        });
      }
    });

    if (itemsToAdd.length === 0) {
      alert('Please check at least one repeating item to order.');
      return;
    }

    onAddToCart(itemsToAdd);
    setShowBulkSuccess(true);
    setTimeout(() => {
      setShowBulkSuccess(false);
    }, 3000);
  };

  const totalSelectedCount = Object.values(selectedIds).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-black pb-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black">Repeating Items Portal</h2>
          <p className="text-xs text-gray-500 font-mono">1-Click bulk reordering for authorized staff &amp; recurring supplies</p>
        </div>

        {totalSelectedCount > 0 && (
          <button
            onClick={handleBulkAdd}
            className="bg-black text-white text-xs uppercase font-extrabold tracking-widest px-5 py-3 border-2 border-black hover:bg-white hover:text-black transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            id="bulk-add-reorders-btn"
          >
            <span>Add Selected to Cart ({totalSelectedCount})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {showBulkSuccess && (
        <div className="bg-black text-white p-4 text-xs font-mono tracking-wider uppercase border border-white text-center animate-fade-in">
          ✓ successfully loaded repeating items into active checkout cart!
        </div>
      )}

      {/* Responsive Bulk List */}
      <div className="bg-white border border-black overflow-hidden rounded-none">
        {/* Table Header (Hidden on Mobile) */}
        <div className="hidden md:grid grid-cols-12 gap-4 bg-gray-50 border-b border-black p-4 text-[10px] uppercase font-bold tracking-wider font-mono text-gray-500">
          <div className="col-span-1 text-center">Include</div>
          <div className="col-span-4">Repeating Item</div>
          <div className="col-span-2 text-center">Size Option</div>
          <div className="col-span-2 text-center">Color Accent</div>
          <div className="col-span-2 text-center">Quantity</div>
          <div className="col-span-1 text-right">Price</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-200">
          {frequentItems.map((product) => {
            const isChecked = !!selectedIds[product.id];
            const currentQty = quantities[product.id] || product.minQuantity;

            return (
              <div
                key={product.id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 transition-colors ${
                  isChecked ? 'bg-white' : 'bg-gray-50/50 opacity-60'
                }`}
                id={`reorder-row-${product.id}`}
              >
                {/* Checkbox (Select) */}
                <div className="col-span-1 flex justify-center md:text-center">
                  <label className="relative flex items-center justify-center cursor-pointer p-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(product.id)}
                      className="sr-only peer"
                      id={`reorder-check-${product.id}`}
                    />
                    <div className="w-5 h-5 border border-black rounded-none flex items-center justify-center bg-white peer-checked:bg-black peer-checked:border-black transition-all">
                      {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                    </div>
                  </label>
                </div>

                {/* Info */}
                <div className="col-span-1 md:col-span-4 flex items-center space-x-3.5">
                  <div className="bg-gray-50 border border-gray-100 p-1 w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden">
                    {product.imageUrl && product.imageUrl.startsWith('http') ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-xl select-none">
                        {product.imageUrl && product.imageUrl.length <= 4 ? product.imageUrl : '📦'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-black uppercase tracking-tight leading-tight">
                      {product.name}
                    </h4>
                    <span className="text-[9px] uppercase font-mono text-gray-400 block mt-0.5">
                      {product.category} · MOQ: {product.minQuantity} {product.unit}
                    </span>
                  </div>
                </div>

                {/* Size */}
                <div className="col-span-1 md:col-span-2 md:text-center">
                  {product.sizeOptions ? (
                    <div className="flex items-center justify-between md:justify-center">
                      <span className="text-[10px] text-gray-400 uppercase font-mono md:hidden">Size:</span>
                      <select
                        value={selectedSizes[product.id] || product.sizeOptions[0]}
                        onChange={(e) => setSelectedSizes(prev => ({ ...prev, [product.id]: e.target.value }))}
                        disabled={!isChecked}
                        className="bg-white border border-gray-300 text-xs px-2 py-1 font-mono focus:border-black focus:outline-none"
                        id={`reorder-size-${product.id}`}
                      >
                        {product.sizeOptions.map(sz => (
                          <option key={sz} value={sz}>{sz}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono text-center block">—</span>
                  )}
                </div>

                {/* Color */}
                <div className="col-span-1 md:col-span-2 md:text-center">
                  {product.colorOptions ? (
                    <div className="flex items-center justify-between md:justify-center">
                      <span className="text-[10px] text-gray-400 uppercase font-mono md:hidden">Color:</span>
                      <select
                        value={selectedColors[product.id] || product.colorOptions[0]}
                        onChange={(e) => setSelectedColors(prev => ({ ...prev, [product.id]: e.target.value }))}
                        disabled={!isChecked}
                        className="bg-white border border-gray-300 text-xs px-2 py-1 font-mono focus:border-black focus:outline-none max-w-[120px]"
                        id={`reorder-color-${product.id}`}
                      >
                        {product.colorOptions.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono text-center block">—</span>
                  )}
                </div>

                {/* Quantity */}
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between md:justify-center space-x-1">
                    <span className="text-[10px] text-gray-400 uppercase font-mono md:hidden">Qty:</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleQtyChange(product.id, currentQty - 1, product.minQuantity)}
                        disabled={!isChecked || currentQty <= product.minQuantity}
                        className="bg-white border border-gray-300 text-black px-2 py-0.5 text-xs font-mono hover:bg-black hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-black focus:outline-none cursor-pointer"
                        id={`reorder-qty-minus-${product.id}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={currentQty}
                        min={product.minQuantity}
                        disabled={!isChecked}
                        onChange={(e) => handleQtyChange(product.id, parseInt(e.target.value) || 0, product.minQuantity)}
                        className="w-12 bg-white border border-gray-300 p-0.5 text-center font-mono font-bold text-xs"
                        id={`reorder-qty-input-${product.id}`}
                      />
                      <button
                        onClick={() => handleQtyChange(product.id, currentQty + 1, product.minQuantity)}
                        disabled={!isChecked}
                        className="bg-white border border-gray-300 text-black px-2 py-0.5 text-xs font-mono hover:bg-black hover:text-white focus:outline-none cursor-pointer"
                        id={`reorder-qty-plus-${product.id}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cost */}
                <div className="col-span-1 md:col-span-1 text-right flex justify-between md:block">
                  <span className="text-[10px] text-gray-400 uppercase font-mono md:hidden">Item Cost:</span>
                  <div className="font-mono text-xs">
                    <span className="text-black font-bold">Php {(product.basePrice * currentQty).toFixed(2)}</span>
                    <span className="text-[9px] text-gray-400 block">Php {product.basePrice.toFixed(2)}/u</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gray-50 border border-black p-4 text-xs text-gray-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-black uppercase tracking-wider mb-1">Standard Personalization Preset Enabled</p>
          <p className="leading-normal">
            For rapid ordering, the Portal submits quick reorder configurations with pre-arranged corporate design assets, layout files, and sizing templates on file for your company account. To submit specific individual names or custom text instructions for newly hired employees, please use the **My Catalog** tab and configure each product dynamically.
          </p>
        </div>
      </div>
    </div>
  );
}
