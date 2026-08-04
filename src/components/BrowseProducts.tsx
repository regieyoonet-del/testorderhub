/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CatalogProduct, CompanyProfile, QuoteEnquiry } from '../types';
import { sanitizeCatalogProduct } from '../data/initialCatalog';
import ProductImageCarousel from './ProductImageCarousel';
import {
  Search,
  Filter,
  Layers,
  Tag,
  Palette,
  PackageCheck,
  ChevronRight,
  X,
  Send,
  CheckCircle,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Info,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BrowseProductsProps {
  products: CatalogProduct[];
  selectedCompany?: CompanyProfile;
  activeCompany?: CompanyProfile;
  onRequestQuote?: (quoteData: Omit<QuoteEnquiry, 'id' | 'enquiryNumber' | 'createdAt' | 'status'>) => void;
  onAddQuoteEnquiry?: (enquiry: QuoteEnquiry) => void;
}

export default function BrowseProducts({
  products,
  selectedCompany,
  activeCompany,
  onRequestQuote,
  onAddQuoteEnquiry
}: BrowseProductsProps) {
  const currentCompany = selectedCompany || activeCompany;
  // Only show active products to customers
  const activeProducts = useMemo(() => {
    return products.filter(p => p.status === 'Active').map(sanitizeCatalogProduct);
  }, [products]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBranding, setSelectedBranding] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'a-z' | 'z-a' | 'moq-asc' | 'moq-desc'>('a-z');
  const [cardColors, setCardColors] = useState<Record<string, string>>({});

  // Modal States
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Favorites State
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    const cached = localStorage.getItem('rp_arh_favorites');
    return cached ? JSON.parse(cached) : {};
  });

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const updated = { ...prev, [productId]: !prev[productId] };
      localStorage.setItem('rp_arh_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  // Quote Form State
  const [quoteQuantity, setQuoteQuantity] = useState<number>(100);
  const [quoteBranding, setQuoteBranding] = useState<string>('');
  const [quoteColor, setQuoteColor] = useState<string>('');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>(currentCompany?.contactPerson || '');
  const [contactEmail, setContactEmail] = useState<string>(currentCompany?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState<string>(currentCompany?.contactPhone || '');
  const [companyName, setCompanyName] = useState<string>(currentCompany?.name || '');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Extract unique categories, branding methods, and colors for filter dropdowns
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set).sort()];
  }, [activeProducts]);

  const brandingMethods = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach(p => {
      (p.brandingMethods || []).forEach(b => set.add(b));
    });
    return ['All', ...Array.from(set).sort()];
  }, [activeProducts]);

  const colorList = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach(p => {
      (p.colors || []).forEach(c => set.add(c.name));
    });
    return ['All', ...Array.from(set).sort()];
  }, [activeProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return activeProducts
      .filter(p => {
        // Search
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q || (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.specifications || '').toLowerCase().includes(q)
        );

        // Category
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

        // Branding
        const matchesBranding = selectedBranding === 'All' || (p.brandingMethods || []).includes(selectedBranding);

        // Color
        const matchesColor = selectedColor === 'All' || (p.colors || []).some(c => c.name === selectedColor);

        return matchesSearch && matchesCategory && matchesBranding && matchesColor;
      })
      .sort((a, b) => {
        if (sortBy === 'a-z') return a.name.localeCompare(b.name);
        if (sortBy === 'z-a') return b.name.localeCompare(a.name);
        if (sortBy === 'moq-asc') return a.moq - b.moq;
        if (sortBy === 'moq-desc') return b.moq - a.moq;
        return 0;
      });
  }, [activeProducts, searchQuery, selectedCategory, selectedBranding, selectedColor, sortBy]);

  // Reset filter controls
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedBranding('All');
    setSelectedColor('All');
    setSortBy('a-z');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'All' || selectedBranding !== 'All' || selectedColor !== 'All' || sortBy !== 'a-z';

  // Open product detail
  const handleOpenProduct = (product: CatalogProduct) => {
    setSelectedProduct(product);
    setActiveImageIdx(0);
    // Initialize quote defaults
    setQuoteQuantity(product.moq);
    setQuoteBranding(product.brandingMethods && product.brandingMethods.length > 0 ? product.brandingMethods[0] : '');
    setQuoteColor(product.colors && product.colors.length > 0 ? product.colors[0].name : '');
    setQuoteNotes('');
    setCompanyName(currentCompany?.name || '');
    setContactPerson(currentCompany?.contactPerson || '');
    setContactEmail(currentCompany?.contactEmail || '');
    setContactPhone(currentCompany?.contactPhone || '');
    setIsSubmitted(false);
  };

  // Open quote modal from detail page
  const handleOpenQuoteModal = () => {
    setShowQuoteModal(true);
    setIsSubmitted(false);
  };

  // Submit Quote Request
  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const quoteData = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productCategory: selectedProduct.category,
      companyId: currentCompany?.id || 'guest',
      companyName: companyName || currentCompany?.name || 'Client',
      contactPerson,
      contactEmail,
      contactPhone,
      quantity: Number(quoteQuantity) || selectedProduct.moq,
      preferredBrandingMethod: quoteBranding,
      preferredColor: quoteColor,
      notes: quoteNotes
    };

    if (onRequestQuote) {
      onRequestQuote(quoteData);
    }

    if (onAddQuoteEnquiry) {
      const serial = Math.floor(1000 + Math.random() * 9000);
      const enquiry: QuoteEnquiry = {
        id: `enq-${Date.now()}`,
        enquiryNumber: `Q-${serial}`,
        ...quoteData,
        status: 'New',
        createdAt: new Date().toISOString()
      };
      onAddQuoteEnquiry(enquiry);
    }

    setIsSubmitted(true);
  };

  // Get gallery images for selected product
  const productGallery = useMemo(() => {
    if (!selectedProduct) return [];
    const set = new Set<string>();
    if (selectedProduct.imageUrl) set.add(selectedProduct.imageUrl);
    if (selectedProduct.imageUrls) {
      selectedProduct.imageUrls.forEach(url => { if (url) set.add(url); });
    }
    return Array.from(set);
  }, [selectedProduct]);

  // Get related products (same category or active)
  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    return activeProducts
      .filter(p => p.id !== selectedProduct.id && (p.category === selectedProduct.category || activeProducts.length <= 4))
      .slice(0, 3);
  }, [activeProducts, selectedProduct]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Banner / Header Title */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black font-sans">
            ARH Products
          </h2>
          <p className="text-xs text-gray-500 font-sans mt-1 leading-relaxed max-w-2xl">
            Explore our complete promotional merchandise and custom product range. Looking for something new for your next campaign or event? Request a tailored quote below.
          </p>
        </div>

        {/* Stats Badges matching Admin View */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-center min-w-[110px]">
            <span className="block text-xl font-extrabold font-mono text-black leading-none">{activeProducts.length}</span>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Total Products</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-center min-w-[110px]">
            <span className="block text-xl font-extrabold font-mono text-black leading-none">{categories.length > 0 ? categories.length - 1 : 0}</span>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Categories</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white border border-gray-200 rounded-3xl p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-black" />
            <span className="text-xs font-extrabold uppercase tracking-wider font-mono text-black">
              Catalog Filters
            </span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-mono font-bold text-gray-600 hover:text-black flex items-center space-x-1 cursor-pointer transition-colors px-3 py-1 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200"
              id="clear-catalog-filters-btn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-gray-50/50 placeholder-gray-400"
              id="catalog-search-input"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-white cursor-pointer"
              id="catalog-category-select"
            >
              <option value="All">Category: All</option>
              {categories.filter(c => c !== 'All').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Branding Method */}
          <div>
            <select
              value={selectedBranding}
              onChange={(e) => setSelectedBranding(e.target.value)}
              className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-white cursor-pointer"
              id="catalog-branding-select"
            >
              <option value="All">Branding: All Methods</option>
              {brandingMethods.filter(b => b !== 'All').map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>

          {/* Colour */}
          <div>
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-white cursor-pointer"
              id="catalog-color-select"
            >
              <option value="All">Colour: All Colours</option>
              {colorList.filter(c => c !== 'All').map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-white font-mono font-bold cursor-pointer"
              id="catalog-sort-select"
            >
              <option value="a-z">Sort: Name (A-Z)</option>
              <option value="z-a">Sort: Name (Z-A)</option>
              <option value="moq-asc">Sort: MOQ (Low to High)</option>
              <option value="moq-desc">Sort: MOQ (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* PRODUCT GRID */}
      {filteredProducts.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-3xl p-12 text-center bg-white shadow-xs my-8">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-extrabold uppercase tracking-tight text-black">No Products Found</h3>
          <p className="text-xs text-gray-500 font-sans mt-1">
            No products match your filter criteria. Try adjusting search query or clearing filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 inline-flex items-center space-x-1.5 bg-black text-white px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-2xl hover:bg-neutral-800 transition-colors cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-3xl overflow-hidden bg-white flex flex-col justify-between transition-all duration-300 relative border border-gray-100 group shadow-sm hover:shadow-lg hover:-translate-y-0.5"
              id={`catalog-card-${product.id}`}
            >
              <div>
                {/* Product Image Section with Solid Grey Background and Interactive Carousel */}
                <ProductImageCarousel
                  product={product}
                  selectedColor={cardColors[product.id]}
                  onImageClick={() => handleOpenProduct(product)}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  className="m-3.5"
                />

                {/* Product Info Section */}
                <div className="px-5 pb-5 pt-1.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold">
                      {product.category}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      MOQ: <strong className="text-black">{product.moq} pcs</strong>
                    </span>
                  </div>

                  <h3
                    onClick={() => handleOpenProduct(product)}
                    className="font-bold text-sm text-gray-800 line-clamp-2 min-h-[40px] leading-snug tracking-tight group-hover:text-black transition-colors cursor-pointer"
                    title={product.name}
                  >
                    {product.name}
                  </h3>

                  {/* Spec Info Badge Box */}
                  <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-2.5 space-y-2 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>Lead: <strong className="text-black font-sans">{product.leadTime || '7-10 Business Days'}</strong></span>
                    </div>

                    {/* Available Colours Swatches */}
                    {product.colors && product.colors.length > 0 && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/60">
                        <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">Colours ({product.colors.length})</span>
                        <div className="flex items-center gap-1">
                          {product.colors.slice(0, 6).map((col, idx) => (
                            <button
                              type="button"
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCardColors(prev => ({ ...prev, [product.id]: col.name }));
                              }}
                              className={`w-3.5 h-3.5 rounded-full border shrink-0 transition-transform hover:scale-125 cursor-pointer ${
                                cardColors[product.id] === col.name ? 'ring-2 ring-black border-black scale-110' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: col.hex || '#CCCCCC' }}
                              title={`View ${col.name} photo`}
                            />
                          ))}
                          {product.colors.length > 6 && (
                            <span className="text-[9px] text-gray-500 font-mono font-bold">+{product.colors.length - 6}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Available Branding Methods */}
                    {product.brandingMethods && product.brandingMethods.length > 0 && (
                      <div className="pt-1.5 border-t border-gray-200/60 space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase font-mono block">Branding</span>
                        <div className="flex flex-wrap gap-1">
                          {product.brandingMethods.map((method, idx) => (
                            <span
                              key={idx}
                              className="bg-white text-gray-700 border border-gray-200 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded"
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* View Details / Action Button */}
              <div className="px-5 pb-5 pt-0">
                <button
                  onClick={() => handleOpenProduct(product)}
                  className="w-full bg-white text-black border border-black hover:bg-black hover:text-white transition-all duration-200 py-3 px-4 rounded-full font-bold uppercase text-xs tracking-wider flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs hover:shadow-md active:scale-[0.98]"
                  id={`view-details-btn-${product.id}`}
                >
                  <span>VIEW DETAILS</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* PRODUCT DETAILS FULL PAGE VIEW */}
      {selectedProduct && createPortal(
        <div className="fixed inset-0 z-[120] bg-white flex flex-col overflow-hidden" id="arh-product-details-fullscreen-page">
          {/* Top Navigation Bar */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0 shadow-2xs">
            <button
              onClick={() => setSelectedProduct(null)}
              className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors font-sans text-xs uppercase font-extrabold tracking-wider cursor-pointer"
              id="back-to-arh-products-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to ARH Products</span>
            </button>

            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-extrabold hidden sm:inline">
              Corporate Product Spec Sheet
            </span>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full border border-black hover:bg-black hover:text-white flex items-center justify-center text-black transition-all cursor-pointer bg-white"
                aria-label="Close product detail page"
                id="close-arh-details-top-x-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto bg-[#fafafa] p-6 md:p-12 lg:p-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="max-w-6xl mx-auto space-y-12"
            >
              {/* Top Section: Gallery & Primary Details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                {/* Image Gallery */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="aspect-square border border-gray-200 bg-white rounded-3xl overflow-hidden relative shadow-sm flex items-center justify-center">
                    {productGallery.length > 0 ? (
                      <img
                        src={productGallery[activeImageIdx] || productGallery[0]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-6xl text-gray-300 select-none">📦</div>
                    )}
                    <span className="absolute top-4 left-4 bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-xl">
                      {selectedProduct.category}
                    </span>
                  </div>

                  {/* Gallery Thumbnails */}
                  {productGallery.length > 1 && (
                    <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                      {productGallery.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIdx(idx)}
                          className={`w-16 h-16 rounded-2xl border-2 shrink-0 overflow-hidden cursor-pointer transition-all ${
                            activeImageIdx === idx ? 'border-black ring-2 ring-black' : 'border-gray-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details Info */}
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="inline-block bg-gray-100 text-gray-800 border border-gray-200 text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-xl mb-2">
                      Category: {selectedProduct.category}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-black uppercase tracking-tight leading-tight font-sans">
                      {selectedProduct.name}
                    </h1>
                  </div>

                  {/* MOQ Highlight */}
                  <div className="inline-flex items-center space-x-2 bg-black text-white px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-xl shadow-xs">
                    <PackageCheck className="w-4 h-4" />
                    <span>Minimum Order Quantity: {selectedProduct.moq} units</span>
                  </div>

                  {/* Description */}
                  <div className="text-sm text-gray-700 leading-relaxed font-sans border-t border-gray-200 pt-4 space-y-1">
                    <h4 className="font-bold text-black uppercase text-xs font-mono">Product Description</h4>
                    <p>{selectedProduct.description}</p>
                  </div>

                  {/* Technical Specifications */}
                  {selectedProduct.specifications && (
                    <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-2xs space-y-1">
                      <h4 className="font-mono font-bold text-black uppercase text-xs">
                        Technical Specifications
                      </h4>
                      <p className="text-gray-800 font-sans text-xs leading-relaxed">
                        {selectedProduct.specifications}
                      </p>
                    </div>
                  )}

                  {/* Available Branding Methods */}
                  {selectedProduct.brandingMethods && selectedProduct.brandingMethods.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-mono font-bold uppercase text-black">Available Branding Methods</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.brandingMethods.map((method, idx) => (
                          <span
                            key={idx}
                            className="bg-black text-white text-[11px] font-mono font-bold uppercase px-3 py-1.5 rounded-xl flex items-center space-x-1.5"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>{method}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Colours */}
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-mono font-bold uppercase text-black">Available Colours ({selectedProduct.colors.length})</h4>
                      <div className="flex flex-wrap gap-2 items-center">
                        {selectedProduct.colors.map((col, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-mono shadow-2xs"
                          >
                            <span
                              className="w-4 h-4 rounded-full border border-gray-300 shrink-0"
                              style={{ backgroundColor: col.hex || '#CCCCCC' }}
                            />
                            <span className="text-xs text-black font-semibold">{col.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request a Quote Action */}
                  <div className="border-t border-gray-200 pt-6 space-y-2">
                    <button
                      onClick={handleOpenQuoteModal}
                      className="w-full bg-black text-white py-4 px-6 text-xs font-extrabold uppercase tracking-wider hover:bg-neutral-800 transition-all flex items-center justify-center space-x-2 border border-black cursor-pointer shadow-xs rounded-2xl"
                      id="open-quote-request-btn"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Request a Quote</span>
                    </button>
                    <p className="text-[11px] text-gray-500 font-mono text-center">
                      * Requesting a quote does not place an order. Our team will review your specifications and contact you with custom pricing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Related Products Section */}
              {relatedProducts.length > 0 && (
                <div className="border-t border-gray-200 pt-8 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-tight text-black font-mono">
                    Related Products You Might Like
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {relatedProducts.map(rel => (
                      <div
                        key={rel.id}
                        onClick={() => handleOpenProduct(rel)}
                        className="border border-gray-200 p-4 bg-white rounded-2xl hover:border-black hover:shadow-md transition-all cursor-pointer flex items-center space-x-4 group"
                      >
                        <img
                          src={rel.imageUrl}
                          alt={rel.name}
                          className="w-16 h-16 object-cover rounded-xl border border-gray-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-xs uppercase text-black line-clamp-1 group-hover:underline">
                            {rel.name}
                          </h4>
                          <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                            MOQ: {rel.moq} units
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>,
        document.body
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* REQUEST A QUOTE MODAL */}
      {showQuoteModal && selectedProduct && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              key="quote-request-modal-window"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-gray-200 max-w-xl w-full my-8 overflow-hidden shadow-2xl relative rounded-3xl"
            >
              {/* Header */}
              <div className="bg-black text-white p-5 flex items-center justify-between border-b border-black rounded-t-3xl">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    Request a Quote
                  </h3>
                </div>
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="text-white hover:text-gray-300 cursor-pointer p-1"
                  id="close-quote-modal-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isSubmitted ? (
                /* SUCCESS STATE */
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight text-black">
                    Quote Request Received!
                  </h3>
                  <p className="text-xs text-gray-600 font-sans max-w-md mx-auto leading-relaxed">
                    Thank you, <span className="font-bold text-black">{contactPerson}</span>. We have logged your quote request for <span className="font-bold text-black">{selectedProduct.name}</span> ({quoteQuantity} units). Our sales team will reach out to <span className="font-bold text-black">{contactEmail}</span> shortly.
                  </p>

                  <div className="bg-gray-50 border border-gray-200 p-4 text-left font-mono text-xs space-y-1.5 my-4 rounded-2xl">
                    <div className="text-[10px] text-gray-400 font-bold uppercase border-b border-gray-200 pb-1">Quote Ticket Summary</div>
                    <div><span className="text-gray-500">Product:</span> <span className="font-bold text-black">{selectedProduct.name}</span></div>
                    <div><span className="text-gray-500">Quantity:</span> <span className="font-bold text-black">{quoteQuantity} units</span></div>
                    {quoteBranding && <div><span className="text-gray-500">Branding:</span> <span className="font-bold text-black">{quoteBranding}</span></div>}
                    {quoteColor && <div><span className="text-gray-500">Colour:</span> <span className="font-bold text-black">{quoteColor}</span></div>}
                    <div><span className="text-gray-500">Company:</span> <span className="font-bold text-black">{companyName}</span></div>
                    <div><span className="text-gray-500">Contact Person:</span> <span className="font-bold text-black">{contactPerson}</span></div>
                    <div><span className="text-gray-500">Contact Email:</span> <span className="font-bold text-black">{contactEmail}</span></div>
                    {contactPhone && <div><span className="text-gray-500">Contact Phone:</span> <span className="font-bold text-black">{contactPhone}</span></div>}
                    <div><span className="text-gray-500">Notes / Instructions:</span> <span className="font-bold text-black">{quoteNotes && quoteNotes.trim() !== '' ? quoteNotes : 'None specified'}</span></div>
                  </div>

                  <button
                    onClick={() => {
                      setShowQuoteModal(false);
                      setSelectedProduct(null);
                    }}
                    className="bg-black text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 cursor-pointer border border-black rounded-xl"
                  >
                    Continue Browsing
                  </button>
                </div>
              ) : (
                /* FORM STATE */
                <form onSubmit={handleSubmitQuote} className="p-6 space-y-5">
                  {/* Selected Product Summary Box */}
                  <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 p-3 rounded-2xl">
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-12 h-12 object-cover border border-gray-200 rounded-xl shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-xs uppercase text-black">
                        {selectedProduct.name}
                      </h4>
                      <span className="text-[10px] font-mono text-gray-500">
                        Category: {selectedProduct.category} | MOQ: {selectedProduct.moq} units
                      </span>
                    </div>
                  </div>

                  {/* Quantity & Branding Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                        Quantity Needed *
                      </label>
                      <input
                        type="number"
                        min={selectedProduct.moq}
                        value={quoteQuantity}
                        onChange={(e) => setQuoteQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full p-2.5 border border-gray-200 font-mono text-xs focus:border-black focus:outline-none rounded-xl"
                        required
                        id="quote-quantity-input"
                      />
                      <span className="text-[10px] text-gray-500 font-mono block mt-1">
                        Minimum required: {selectedProduct.moq} units
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                        Preferred Branding Method
                      </label>
                      <select
                        value={quoteBranding}
                        onChange={(e) => setQuoteBranding(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 text-xs font-sans focus:border-black focus:outline-none bg-white rounded-xl cursor-pointer"
                        id="quote-branding-select"
                      >
                        <option value="">-- Select Branding --</option>
                        {(selectedProduct.brandingMethods || []).map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Colour Selection */}
                  {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                        Preferred Colour
                      </label>
                      <select
                        value={quoteColor}
                        onChange={(e) => setQuoteColor(e.target.value)}
                        className="w-full p-2.5 border border-gray-200 text-xs font-sans focus:border-black focus:outline-none bg-white rounded-xl cursor-pointer"
                        id="quote-color-select"
                      >
                        <option value="">-- Select Colour --</option>
                        {selectedProduct.colors.map(col => (
                          <option key={col.name} value={col.name}>{col.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Notes / Special Instructions */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Customization & Project Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Specify preferred logo positions, target delivery date, event details, packaging preferences, etc."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 text-xs font-sans focus:border-black focus:outline-none rounded-xl"
                      id="quote-notes-textarea"
                    />
                  </div>

                  {/* Contact Info Header */}
                  <div className="border-t border-gray-200 pt-3">
                    <h5 className="font-mono font-bold text-xs uppercase text-black mb-2">
                      Your Contact Details
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-gray-500 uppercase mb-0.5">Company Name</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full p-2 border border-gray-200 text-xs focus:border-black focus:outline-none rounded-xl"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-gray-500 uppercase mb-0.5">Contact Person *</label>
                        <input
                          type="text"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          className="w-full p-2 border border-gray-200 text-xs focus:border-black focus:outline-none rounded-xl"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-gray-500 uppercase mb-0.5">Contact Email *</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full p-2 border border-gray-200 text-xs focus:border-black focus:outline-none rounded-xl"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-gray-500 uppercase mb-0.5">Phone Number</label>
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full p-2 border border-gray-200 text-xs focus:border-black focus:outline-none rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowQuoteModal(false)}
                      className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-black cursor-pointer rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-black text-white px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider hover:bg-neutral-800 transition-colors flex items-center space-x-2 border border-black cursor-pointer rounded-2xl shadow-xs"
                      id="submit-quote-request-btn"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Quote Request</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
