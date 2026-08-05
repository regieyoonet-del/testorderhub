/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { CatalogProduct, ColorOption, QuoteEnquiry, Product } from '../types';
import { sanitizeCatalogProduct } from '../data/initialCatalog';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Layers,
  FileText,
  Tag,
  Palette,
  PackageCheck,
  X,
  Check,
  AlertCircle,
  Copy,
  Mail,
  Phone,
  Building,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  Sparkles,
  ExternalLink,
  Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QuoteBuilderModal from './QuoteBuilderModal';

interface AdminProductCatalogProps {
  products: CatalogProduct[];
  quoteEnquiries: QuoteEnquiry[];
  onAddProduct: (product: CatalogProduct) => void;
  onUpdateProduct: (product: CatalogProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateQuoteEnquiryStatus: (enquiryId: string, status: QuoteEnquiry['status']) => void;
  onDeleteQuoteEnquiry?: (enquiryId: string) => void;
  onSaveQuoteEnquiry?: (updatedEnquiry: QuoteEnquiry) => void;
  onAddProductToCompanyCatalog?: (product: Product, companyIdentifier: string) => void;
  currencySymbol?: string;
}

const DEFAULT_CATEGORIES = [
  'Stationery & Pens',
  'Promo & Outdoor',
  'Headwear',
  'Executive Gifts',
  'Drinkware',
  'Apparel',
  'Bags',
  'Print Materials',
  'Tech Accessories'
];

const COMMON_BRANDING_METHODS = [
  'Laser Engraving',
  'Screen Printing',
  'Embroidery',
  'Pad Printing',
  'Digital Print',
  'Heat Transfer',
  'Hot Stamping',
  'Debossing',
  'Sublimation',
  '3D'
];

const PRESET_COLORS: ColorOption[] = [
  { name: 'Onyx Black', hex: '#111111' },
  { name: 'Pure White', hex: '#FFFFFF' },
  { name: 'Slate Grey', hex: '#64748B' },
  { name: 'Navy Blue', hex: '#0F172A' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Forest Green', hex: '#166534' },
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Canary Yellow', hex: '#EAB308' },
  { name: 'Sunset Orange', hex: '#F97316' },
  { name: 'Natural Bamboo', hex: '#D2B48C' },
  { name: 'Walnut Wood', hex: '#5C4033' }
];

export default function AdminProductCatalog({
  products,
  quoteEnquiries,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateQuoteEnquiryStatus,
  onDeleteQuoteEnquiry,
  onSaveQuoteEnquiry,
  onAddProductToCompanyCatalog,
  currencySymbol = 'Php'
}: AdminProductCatalogProps) {
  const [activeSection, setActiveSection] = useState<'catalog' | 'enquiries'>('catalog');

  // Quote Builder Modal State
  const [selectedQuoteForBuilder, setSelectedQuoteForBuilder] = useState<QuoteEnquiry | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Hidden'>('All');
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<string>('All');

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formMoq, setFormMoq] = useState<number>(50);
  const [formStatus, setFormStatus] = useState<'Active' | 'Hidden'>('Active');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formAdditionalImages, setFormAdditionalImages] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formSpecifications, setFormSpecifications] = useState('');
  const [formBranding, setFormBranding] = useState<string[]>([]);
  const [formColors, setFormColors] = useState<ColorOption[]>([]);
  const [formSizes, setFormSizes] = useState<string[]>([]);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [formVariantPrices, setFormVariantPrices] = useState<Record<string, number>>({});
  const [formColorImages, setFormColorImages] = useState<Record<string, string>>({});

  // Color Builder Temp Input
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');

  // Branding Custom Tag Input
  const [newBrandingInput, setNewBrandingInput] = useState('');

  // Source quote enquiry if modal was opened via "Add to Company Catalog"
  const [sourceQuoteForCatalog, setSourceQuoteForCatalog] = useState<QuoteEnquiry | null>(null);

  // Delete Confirmation Modal State
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'product' | 'quote';
    id: string;
    name: string;
  } | null>(null);

  // Stats
  const activeCount = useMemo(() => products.filter(p => p.status === 'Active').length, [products]);
  const hiddenCount = useMemo(() => products.filter(p => p.status === 'Hidden').length, [products]);
  const newEnquiriesCount = useMemo(() => quoteEnquiries.filter(q => q.status === 'New').length, [quoteEnquiries]);

  // Open modal for Add
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setSourceQuoteForCatalog(null);
    setFormName('');
    setFormCategory(DEFAULT_CATEGORIES[0]);
    setFormCustomCategory('');
    setFormMoq(50);
    setFormStatus('Active');
    setFormImageUrl('');
    setFormAdditionalImages('');
    setFormDescription('');
    setFormSpecifications('');
    setFormBranding(['Laser Engraving', 'Screen Printing']);
    setFormColors([PRESET_COLORS[0], PRESET_COLORS[1]]);
    setFormSizes([]);
    setFormVariantPrices({});
    setFormColorImages({});
    setShowProductModal(true);
  };

  const handleOpenAddModalWithQuote = (enquiry: QuoteEnquiry) => {
    setActiveSection('catalog');
    setEditingProduct(null);
    setSourceQuoteForCatalog(enquiry);
    setFormName(enquiry.productName);
    if (DEFAULT_CATEGORIES.includes(enquiry.productCategory)) {
      setFormCategory(enquiry.productCategory);
      setFormCustomCategory('');
    } else {
      setFormCategory('Other');
      setFormCustomCategory(enquiry.productCategory);
    }
    setFormMoq(enquiry.quantity || 50);
    setFormStatus('Active');
    setFormImageUrl('');
    setFormAdditionalImages('');
    setFormDescription(enquiry.notes ? `Quoted for ${enquiry.companyName}. Notes: ${enquiry.notes}` : `Quoted product for ${enquiry.companyName}`);
    setFormSpecifications(`Branding: ${enquiry.preferredBrandingMethod || 'Standard'}\nColour: ${enquiry.preferredColor || 'As Sample'}${enquiry.preferredSize ? `\nSize: ${enquiry.preferredSize}` : ''}`);
    setFormBranding(enquiry.preferredBrandingMethod ? [enquiry.preferredBrandingMethod] : ['Laser Engraving', 'Screen Printing']);
    setFormColors([PRESET_COLORS[0], PRESET_COLORS[1]]);
    setFormSizes(enquiry.preferredSize ? [enquiry.preferredSize] : []);
    setFormVariantPrices({});
    setFormColorImages({});
    setShowProductModal(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (product: CatalogProduct) => {
    const p = sanitizeCatalogProduct(product);
    setEditingProduct(p);
    setSourceQuoteForCatalog(null);
    setFormName(p.name);
    if (DEFAULT_CATEGORIES.includes(p.category)) {
      setFormCategory(p.category);
      setFormCustomCategory('');
    } else {
      setFormCategory('Other');
      setFormCustomCategory(p.category);
    }
    setFormMoq(p.moq);
    setFormStatus(p.status);
    setFormImageUrl(p.imageUrl || '');
    setFormAdditionalImages((p.imageUrls || []).filter(u => u !== p.imageUrl).join('\n'));
    setFormDescription(p.description || '');
    setFormSpecifications(p.specifications || '');
    setFormBranding(p.brandingMethods || []);
    setFormColors(p.colors || []);
    setFormSizes(p.sizes || []);
    setFormVariantPrices(p.variantPrices || {});
    setFormColorImages(p.colorImages || {});
    setShowProductModal(true);
  };

  // Save product (Add or Update)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const categoryFinal = formCategory === 'Other' && formCustomCategory.trim() ? formCustomCategory.trim() : formCategory;
    const additionalImgs = formAdditionalImages
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const imageUrlsAll = Array.from(new Set([formImageUrl.trim(), ...additionalImgs].filter(Boolean)));

    const payload: CatalogProduct = {
      id: editingProduct ? editingProduct.id : `cat-${Date.now().toString().slice(-6)}`,
      name: formName.trim(),
      category: categoryFinal,
      description: formDescription.trim(),
      specifications: formSpecifications.trim(),
      imageUrl: formImageUrl.trim(),
      imageUrls: imageUrlsAll,
      moq: Math.max(1, formMoq),
      brandingMethods: formBranding,
      colors: formColors,
      sizes: formSizes,
      variantPrices: formVariantPrices,
      colorImages: formColorImages,
      status: formStatus,
      createdAt: editingProduct?.createdAt || new Date().toISOString()
    };

    if (editingProduct) {
      onUpdateProduct(payload);
    } else if (sourceQuoteForCatalog) {
      // Create B2B product specifically for the company's catalog ("My Catalog")
      const newB2bProduct: Product = {
        id: `prod-${Date.now().toString().slice(-6)}`,
        name: formName.trim(),
        category: categoryFinal as any,
        description: formDescription.trim(),
        imageUrl: formImageUrl.trim() || 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800',
        basePrice: sourceQuoteForCatalog.quotedUnitPrice || 0,
        minQuantity: Math.max(1, formMoq),
        unit: 'pcs',
        leadTime: '7-10 Business Days',
        sizeOptions: formSizes,
        variantPrices: formVariantPrices,
        colorOptions: formColors.map(c => c.name),
        colorImages: formColorImages,
        imageUrls: imageUrlsAll,
        frequentlyOrdered: true
      };

      if (onAddProductToCompanyCatalog) {
        onAddProductToCompanyCatalog(newB2bProduct, sourceQuoteForCatalog.companyId || sourceQuoteForCatalog.companyName);
      }

      onUpdateQuoteEnquiryStatus(sourceQuoteForCatalog.id, 'Product Added');
      if (onSaveQuoteEnquiry) {
        onSaveQuoteEnquiry({
          ...sourceQuoteForCatalog,
          status: 'Product Added'
        });
      }
      setSourceQuoteForCatalog(null);
    } else {
      // Standard product added directly to ARH Products showcase catalog
      onAddProduct(payload);
    }

    setShowProductModal(false);
  };

  // Toggle active/hidden
  const handleToggleStatus = (product: CatalogProduct) => {
    const updated: CatalogProduct = {
      ...product,
      status: product.status === 'Active' ? 'Hidden' : 'Active'
    };
    onUpdateProduct(updated);
  };

  // Add custom branding tag
  const handleAddBrandingTag = () => {
    if (!newBrandingInput.trim()) return;
    if (!formBranding.includes(newBrandingInput.trim())) {
      setFormBranding([...formBranding, newBrandingInput.trim()]);
    }
    setNewBrandingInput('');
  };

  // Toggle common branding tag
  const handleToggleCommonBranding = (method: string) => {
    if (formBranding.includes(method)) {
      setFormBranding(formBranding.filter(b => b !== method));
    } else {
      setFormBranding([...formBranding, method]);
    }
  };

  // Add color option
  const handleAddColorOption = () => {
    if (!newColorName.trim()) return;
    setFormColors([...formColors, { name: newColorName.trim(), hex: newColorHex }]);
    setNewColorName('');
  };

  // Remove color option
  const handleRemoveColorOption = (index: number) => {
    const colToRemove = formColors[index];
    setFormColors(formColors.filter((_, i) => i !== index));
    if (colToRemove) {
      const updatedColorImgs = { ...formColorImages };
      delete updatedColorImgs[colToRemove.name];
      setFormColorImages(updatedColorImgs);
    }
  };

  // Size options helpers
  const handleAddSizeOption = () => {
    if (!newSizeInput.trim()) return;
    const sz = newSizeInput.trim().toUpperCase();
    if (!formSizes.includes(sz)) {
      setFormSizes([...formSizes, sz]);
    }
    setNewSizeInput('');
  };

  const handleRemoveSizeOption = (szToRemove: string) => {
    setFormSizes(formSizes.filter(s => s !== szToRemove));
    const updatedPrices = { ...formVariantPrices };
    delete updatedPrices[szToRemove];
    setFormVariantPrices(updatedPrices);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  // Filtered Quote Enquiries
  const filteredEnquiries = useMemo(() => {
    return quoteEnquiries.filter(q => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query ||
        q.productName.toLowerCase().includes(query) ||
        q.companyName.toLowerCase().includes(query) ||
        q.contactPerson.toLowerCase().includes(query) ||
        q.enquiryNumber.toLowerCase().includes(query);

      const matchesStatus = enquiryStatusFilter === 'All' || q.status === enquiryStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quoteEnquiries, searchQuery, enquiryStatusFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Stats */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-black font-sans">
            ARH Products
          </h2>
          <p className="text-xs text-gray-500 font-sans mt-1 leading-relaxed">
            Manage your full company promotional product range. Add new products, update specifications, and view quote requests submitted by customers.
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-center min-w-[110px]">
            <span className="block text-xl font-extrabold font-mono text-black leading-none">{products.length}</span>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Total Products</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-center min-w-[110px]">
            <span className="block text-xl font-extrabold font-mono text-black leading-none">{activeCount}</span>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Active in Catalog</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-center min-w-[110px]">
            <span className="block text-xl font-extrabold font-mono text-black leading-none">{newEnquiriesCount}</span>
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">New Quote Requests</span>
          </div>
        </div>
      </div>

      {/* Subtabs Switcher */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-2 border border-gray-200 max-w-fit">
        <button
          onClick={() => setActiveSection('catalog')}
          className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl font-mono text-xs uppercase font-extrabold tracking-wider cursor-pointer transition-all ${
            activeSection === 'catalog'
              ? 'bg-black text-white shadow-xs'
              : 'text-gray-600 hover:text-black hover:bg-white/60'
          }`}
          id="admin-tab-catalog-btn"
        >
          <Layers className="w-4 h-4" />
          <span>ARH Products ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('enquiries')}
          className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl font-mono text-xs uppercase font-extrabold tracking-wider cursor-pointer transition-all relative ${
            activeSection === 'enquiries'
              ? 'bg-black text-white shadow-xs'
              : 'text-gray-600 hover:text-black hover:bg-white/60'
          }`}
          id="admin-tab-enquiries-btn"
        >
          <FileText className="w-4 h-4" />
          <span>Quote Requests ({quoteEnquiries.length})</span>
          {newEnquiriesCount > 0 && (
            <span className="bg-amber-400 text-black text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full ml-1">
              {newEnquiriesCount} NEW
            </span>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* SECTION 1: MASTER PRODUCT CATALOG */}
      {activeSection === 'catalog' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white border border-gray-200 rounded-3xl p-4 md:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search catalog products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-gray-50/50"
                  id="admin-product-search-input"
                />
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-white cursor-pointer"
              >
                <option value="All">Category: All</option>
                {Array.from(new Set(products.map(p => p.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-white font-mono font-bold cursor-pointer"
              >
                <option value="All">Status: All</option>
                <option value="Active">Active Only</option>
                <option value="Hidden">Hidden Only</option>
              </select>
            </div>

            {/* Add Product Button */}
            <button
              onClick={handleOpenAddModal}
              className="bg-black text-white px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-2xl hover:bg-neutral-800 transition-colors flex items-center space-x-2 border border-black cursor-pointer shrink-0 shadow-xs"
              id="add-catalog-product-btn"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          {/* Catalog Products Table */}
          {filteredProducts.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-3xl p-12 text-center bg-white shadow-xs">
              <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-extrabold uppercase text-black tracking-tight">No Products Found</h3>
              <p className="text-xs text-gray-500 font-sans mt-1">Try clearing your search query or add a new catalog item.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-700 font-mono text-[11px] uppercase tracking-wider border-b border-gray-200">
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">MOQ</th>
                    <th className="p-3">Branding Methods</th>
                    <th className="p-3">Colours</th>
                    <th className="p-3">Sizes</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-12 h-12 object-cover border border-gray-200 rounded-xl shrink-0 bg-gray-100"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 border border-gray-200 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-lg">
                              📦
                            </div>
                          )}
                          <div>
                            <span className="font-extrabold text-xs uppercase text-black block line-clamp-1">{p.name}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-1 max-w-xs">{p.description}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <span className="bg-gray-100 text-black border border-gray-200 rounded-lg text-[10px] font-mono font-bold uppercase px-2 py-0.5">
                          {p.category}
                        </span>
                      </td>

                      {/* MOQ */}
                      <td className="p-3 font-mono font-bold text-black">
                        {p.moq} units
                      </td>

                      {/* Branding Methods */}
                      <td className="p-3">
                        {(() => {
                          const sanitizedP = sanitizeCatalogProduct(p);
                          const methods = sanitizedP.brandingMethods || [];
                          return (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {methods.slice(0, 3).map((b, idx) => (
                                <span key={idx} className="bg-gray-100 text-gray-800 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 border border-gray-200 rounded-md">
                                  {b}
                                </span>
                              ))}
                              {methods.length > 3 && (
                                <span className="text-[9px] font-mono text-gray-500 font-bold">
                                  +{methods.length - 3}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Colours */}
                      <td className="p-3">
                        {(() => {
                          const sanitizedP = sanitizeCatalogProduct(p);
                          const cols = sanitizedP.colors || [];
                          return (
                            <div className="flex flex-wrap gap-1 items-center max-w-xs">
                              {cols.slice(0, 5).map((col, idx) => (
                                <span
                                  key={idx}
                                  className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0 shadow-2xs"
                                  style={{ backgroundColor: col.hex || '#CCCCCC' }}
                                  title={`${col.name}${col.hex ? ` (${col.hex})` : ''}`}
                                />
                              ))}
                              {cols.length > 5 && (
                                <span className="text-[9px] font-mono text-gray-500 font-bold">
                                  +{cols.length - 5}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Sizes */}
                      <td className="p-3">
                        {(() => {
                          const sanitizedP = sanitizeCatalogProduct(p);
                          const szs = sanitizedP.sizes || (sanitizedP as any).sizeOptions || [];
                          if (szs.length === 0) return <span className="text-[10px] text-gray-400 font-mono italic">None</span>;
                          return (
                            <div className="flex flex-wrap gap-1 items-center max-w-xs">
                              {szs.map((sz: string, idx: number) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-800 text-[9px] font-mono font-bold rounded">
                                  {sz}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Active/Hidden Status Toggle */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 text-[10px] font-mono font-bold uppercase border rounded-xl cursor-pointer transition-colors ${
                            p.status === 'Active'
                              ? 'bg-black text-white border-black'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:text-black'
                          }`}
                          title="Click to toggle Active / Hidden in customer catalog"
                        >
                          {p.status === 'Active' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{p.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 border border-gray-200 rounded-lg text-gray-700 hover:text-black hover:border-black transition-colors cursor-pointer"
                            title="Edit product details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setItemToDelete({ type: 'product', id: p.id, name: p.name })}
                            className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-600 transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* SECTION 2: QUOTE ENQUIRIES */}
      {activeSection === 'enquiries' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-gray-200 rounded-3xl p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by company, product, or enquiry #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-gray-50/50"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-mono font-bold uppercase text-gray-500">Filter Status:</span>
              <select
                value={enquiryStatusFilter}
                onChange={(e) => setEnquiryStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-sans border border-gray-200 rounded-2xl focus:border-black focus:outline-none bg-white font-mono font-bold cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="New">New</option>
                <option value="In Review">In Review</option>
                <option value="Quoted">Quoted</option>
                <option value="Product Requested">Product Addition Requested</option>
                <option value="Product Added">Product Added to Catalog</option>
                <option value="Declined">Declined</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Quote Requests List */}
          {filteredEnquiries.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-3xl p-12 text-center bg-white shadow-xs">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <h3 className="text-sm font-extrabold uppercase text-black tracking-tight">No Quote Requests Found</h3>
              <p className="text-xs text-gray-500 font-sans mt-1">
                Customer quote requests submitted from the ARH Products catalog will appear here for follow-up.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEnquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-extrabold text-sm text-black bg-gray-100 border border-gray-200 rounded-xl px-3 py-1">
                        {enquiry.enquiryNumber}
                      </span>
                      <div>
                        <h4 className="font-extrabold text-sm uppercase text-black">
                          {enquiry.companyName}
                        </h4>
                        <span className="text-[10px] font-mono text-gray-500">
                          Submitted {new Date(enquiry.createdAt).toLocaleDateString()} at {new Date(enquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-gray-400">Status:</span>
                      <select
                        value={enquiry.status}
                        onChange={(e) => onUpdateQuoteEnquiryStatus(enquiry.id, e.target.value as any)}
                        className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border rounded-xl cursor-pointer focus:outline-none ${
                          enquiry.status === 'New' ? 'bg-black text-white border-black' :
                          enquiry.status === 'In Review' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          enquiry.status === 'Quoted' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                          enquiry.status === 'Product Requested' ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold' :
                          enquiry.status === 'Product Added' ? 'bg-emerald-700 text-white border-emerald-800 font-bold' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="New">New</option>
                        <option value="In Review">In Review</option>
                        <option value="Quoted">Quoted</option>
                        <option value="Product Requested">Product Addition Requested</option>
                        <option value="Product Added">Product Added to Catalog</option>
                        <option value="Declined">Declined</option>
                        <option value="Closed">Closed</option>
                      </select>

                      {onDeleteQuoteEnquiry && (
                        <button
                          onClick={() => setItemToDelete({ type: 'quote', id: enquiry.id, name: `${enquiry.enquiryNumber} - ${enquiry.companyName}` })}
                          className="p-1.5 border border-gray-200 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-600 cursor-pointer transition-colors"
                          title="Delete enquiry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Enquiry Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* Product & Spec Requested */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                      <div className="font-mono text-[10px] font-bold uppercase text-gray-400">
                        Product Specification Requested
                      </div>
                      <div className="font-bold text-sm text-black uppercase">
                        {enquiry.productName}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div><span className="text-gray-500">Quantity:</span> <span className="font-bold text-black">{enquiry.quantity} units</span></div>
                        <div><span className="text-gray-500">Category:</span> <span className="font-bold text-black">{enquiry.productCategory}</span></div>
                        <div><span className="text-gray-500">Branding:</span> <span className="font-bold text-black">{enquiry.preferredBrandingMethod || 'Standard'}</span></div>
                        <div><span className="text-gray-500">Colour:</span> <span className="font-bold text-black">{enquiry.preferredColor || 'As Sample'}</span></div>
                        <div><span className="text-gray-500">Size / Variant:</span> <span className="font-bold text-black">{enquiry.preferredSize || 'Standard / One Size'}</span></div>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <span className="text-gray-500 font-mono text-[10px] font-bold uppercase block mb-0.5">Notes & Customization Instructions:</span>
                        <div className="text-gray-800 font-sans text-xs italic bg-white p-2.5 border border-gray-200 rounded-xl">
                          {enquiry.notes && enquiry.notes.trim() !== '' ? `"${enquiry.notes}"` : <span className="text-gray-400 not-italic font-mono text-[11px]">None specified</span>}
                        </div>
                      </div>
                    </div>

                    {/* Customer Contact */}
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2">
                      <div className="font-mono text-[10px] font-bold uppercase text-gray-400">
                        Client Contact Information
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <Building className="w-3.5 h-3.5 text-gray-500" />
                          <span className="font-bold text-black">{enquiry.companyName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 font-mono text-[10px] w-12">Person:</span>
                          <span className="text-black font-semibold">{enquiry.contactPerson}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3.5 h-3.5 text-gray-500" />
                          <a href={`mailto:${enquiry.contactEmail}`} className="text-black font-mono underline hover:text-gray-600">
                            {enquiry.contactEmail}
                          </a>
                        </div>
                        {enquiry.contactPhone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3.5 h-3.5 text-gray-500" />
                            <span className="font-mono text-gray-800">{enquiry.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Client Requested Product Addition Alert OR Product Added Banner */}
                  {enquiry.status === 'Product Added' ? (
                    <div className="bg-emerald-50 border-2 border-emerald-400 p-3.5 rounded-xl space-y-1 font-sans shadow-xs">
                      <div className="flex items-center space-x-2 font-mono font-extrabold text-xs uppercase text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>✓ PRODUCT ADDED TO CATALOG</span>
                      </div>
                      <p className="text-xs text-emerald-900 font-medium">
                        This quoted product has been created and added to the company's active product catalog.
                      </p>
                    </div>
                  ) : (enquiry.requestedProductAddition || enquiry.status === 'Product Requested') ? (
                    <div className="bg-purple-50 border-2 border-purple-300 p-3.5 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 font-mono font-extrabold text-xs uppercase text-purple-950">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span>🔥 CLIENT REQUESTED TO ADD PRODUCT TO CATALOG</span>
                        </div>
                        {enquiry.requestedProductAdditionAt && (
                          <span className="text-[10px] font-mono text-purple-700 font-semibold">
                            Requested on {new Date(enquiry.requestedProductAdditionAt).toLocaleDateString()} at {new Date(enquiry.requestedProductAdditionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-900 font-sans">
                        The company confirmed they want to proceed with this quoted item and requested adding it as an active product in their catalog.
                      </p>
                      {enquiry.requestedProductNotes && (
                        <div className="bg-white border border-purple-200 p-2.5 rounded-lg text-xs font-sans text-gray-800 italic">
                          Client Note: "{enquiry.requestedProductNotes}"
                        </div>
                      )}
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenAddModalWithQuote(enquiry)}
                          className="bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-2 text-xs font-mono font-extrabold uppercase rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-sm border border-purple-800"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Company Catalog</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Issued Quotation Summary OR Build Quote Trigger Button */}
                  <div className="border-t border-gray-200 pt-3">
                    {enquiry.quotedTotalPrice !== undefined ? (
                      <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs text-emerald-950">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5 font-extrabold uppercase text-emerald-800 text-[10px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Official Quote Issued</span>
                            {enquiry.quotedAt && (
                              <span className="text-gray-500 font-normal">
                                • {new Date(enquiry.quotedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="text-sm sm:text-base font-black text-black">
                            Quoted Grand Total: {currencySymbol} {enquiry.quotedTotalPrice.toLocaleString()}
                            {enquiry.quotedUnitPrice ? (
                              <span className="text-xs font-normal text-gray-600"> ({currencySymbol} {enquiry.quotedUnitPrice.toLocaleString()} / unit)</span>
                            ) : ''}
                          </div>
                          {enquiry.quotedValidUntil && (
                            <div className="text-[10px] text-gray-600">
                              Valid Until: <strong>{new Date(enquiry.quotedValidUntil).toLocaleDateString()}</strong>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedQuoteForBuilder(enquiry)}
                          className="bg-black text-white px-4 py-2 text-xs font-mono font-bold uppercase rounded-xl hover:bg-gray-800 cursor-pointer flex items-center space-x-1.5 shrink-0 shadow-sm"
                        >
                          <Calculator className="w-4 h-4 text-amber-400" />
                          <span>View / Edit Quote</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 border border-dashed border-gray-300 p-3 rounded-xl">
                        <div className="text-xs font-mono text-gray-600">
                          <span className="font-bold text-black">No official quote generated yet.</span> Calculate pricing, line items, taxes, and validity for this request.
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedQuoteForBuilder(enquiry)}
                          className="bg-black text-white px-4 py-2 text-xs font-mono font-extrabold uppercase rounded-xl hover:bg-gray-800 cursor-pointer flex items-center space-x-2 shrink-0 shadow-md border border-black"
                        >
                          <Calculator className="w-4 h-4 text-amber-400" />
                          <span>Build Quote for Client</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUOTE BUILDER MODAL */}
      <QuoteBuilderModal
        enquiry={selectedQuoteForBuilder}
        currencySymbol={currencySymbol}
        isOpen={!!selectedQuoteForBuilder}
        onClose={() => setSelectedQuoteForBuilder(null)}
        onSaveQuote={(updatedEnquiry) => {
          if (onSaveQuoteEnquiry) {
            onSaveQuoteEnquiry(updatedEnquiry);
          } else {
            onUpdateQuoteEnquiryStatus(updatedEnquiry.id, updatedEnquiry.status);
          }
        }}
      />

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* ADD / EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-3xl max-w-3xl w-full my-8 overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="bg-black text-white p-5 flex items-center justify-between border-b border-black rounded-t-3xl">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    {editingProduct ? 'Edit Catalog Product' : 'Add New Catalog Product'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-white hover:text-gray-300 cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveProduct} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Basic Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Moso Bamboo Pen"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl font-sans text-xs focus:border-black focus:outline-none"
                      required
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-sans focus:border-black focus:outline-none bg-white cursor-pointer"
                    >
                      {DEFAULT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Other">Other / Custom Category</option>
                    </select>

                    {formCategory === 'Other' && (
                      <input
                        type="text"
                        placeholder="Enter custom category name..."
                        value={formCustomCategory}
                        onChange={(e) => setFormCustomCategory(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-xl text-xs font-sans focus:border-black focus:outline-none mt-2"
                        required
                      />
                    )}
                  </div>

                  {/* MOQ */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Minimum Order Quantity (MOQ) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formMoq}
                      onChange={(e) => setFormMoq(parseInt(e.target.value) || 1)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl font-mono text-xs focus:border-black focus:outline-none"
                      required
                    />
                  </div>

                  {/* Status Toggle (Active / Hidden) */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Visibility Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-black focus:outline-none bg-white cursor-pointer"
                    >
                      <option value="Active">Active (Visible in Customer Catalog)</option>
                      <option value="Hidden">Hidden (Hidden from Customers)</option>
                    </select>
                  </div>

                  {/* Primary Image URL */}
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Primary Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... (Leave empty if no image)"
                      value={formImageUrl}
                      onChange={(e) => setFormImageUrl(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Additional Gallery Images */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                    Additional Gallery Image URLs (One URL per line)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="https://image2.jpg&#10;https://image3.jpg"
                    value={formAdditionalImages}
                    onChange={(e) => setFormAdditionalImages(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:border-black focus:outline-none"
                  />
                </div>

                {/* Descriptions & Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Product Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Write customer-facing promotional description..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-sans focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black mb-1">
                      Technical Specifications
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Material, dimensions, mechanism, packaging..."
                      value={formSpecifications}
                      onChange={(e) => setFormSpecifications(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-sans focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                {/* Branding / Decoration Methods Manager */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <label className="block text-xs font-mono font-bold uppercase text-black">
                    Available Decoration / Branding Methods ({formBranding.length})
                  </label>

                  {/* Active Selected Branding Methods List */}
                  {formBranding.length > 0 ? (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                      <span className="block text-[10px] font-mono font-bold uppercase text-gray-500 mb-2">
                        Attached Decoration Methods:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {formBranding.map((method) => (
                          <span
                            key={method}
                            className="bg-black text-white text-[11px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg flex items-center space-x-1.5"
                          >
                            <span>{method}</span>
                            <button
                              type="button"
                              onClick={() => setFormBranding(formBranding.filter(b => b !== method))}
                              className="text-gray-300 hover:text-red-400 font-bold ml-1 cursor-pointer"
                              title="Remove decoration method"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-[11px] font-mono text-amber-800 rounded-xl">
                      No decoration methods attached yet. Pick from quick presets below or add custom methods.
                    </div>
                  )}

                  {/* Quick Presets Toggle Buttons */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-mono font-bold uppercase text-gray-500">
                      Quick Preset Options:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_BRANDING_METHODS.map(method => {
                        const isSelected = formBranding.includes(method);
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => handleToggleCommonBranding(method)}
                            className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 border cursor-pointer transition-colors rounded-lg ${
                              isSelected ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-700 border-gray-200 hover:border-black'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '} {method}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Custom Branding Input */}
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      placeholder="Add custom decoration method (e.g. Puff Embroidery, UV Printing)..."
                      value={newBrandingInput}
                      onChange={(e) => setNewBrandingInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddBrandingTag();
                        }
                      }}
                      className="p-2 border border-gray-200 text-xs font-mono focus:border-black focus:outline-none flex-1 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddBrandingTag();
                      }}
                      className="bg-black text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 cursor-pointer rounded-xl shrink-0"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>

                {/* Size Variants & Pricing Manager */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-black">
                        Size Variants & Specific Pricing ({formSizes.length})
                      </label>
                      <span className="block text-[10px] text-gray-400 font-mono">
                        Add size options (e.g. S, M, L, XL, 2XL) and set custom unit price per size if applicable
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-gray-50 p-3 border border-gray-200 rounded-2xl">
                    <input
                      type="text"
                      placeholder="Size (e.g. XL, 2XL, 100cm x 150cm)"
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSizeOption();
                        }
                      }}
                      className="p-2 border border-gray-200 rounded-xl text-xs font-mono uppercase font-bold focus:border-black focus:outline-none flex-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddSizeOption}
                      className="bg-black text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 cursor-pointer rounded-xl"
                    >
                      Add Size
                    </button>
                  </div>

                  {/* Active Sizes List & Pricing Inputs */}
                  {formSizes.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="block text-[10px] uppercase font-mono font-bold text-gray-500">
                        Unit Price per Size Variant (Leave blank or 0 if standard base price):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {formSizes.map((sz) => {
                          const currentPrice = formVariantPrices[sz] !== undefined ? formVariantPrices[sz] : '';
                          return (
                            <div key={sz} className="bg-white border border-gray-200 rounded-xl p-2.5 space-y-1 shadow-2xs">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-mono font-black text-black uppercase">{sz}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSizeOption(sz)}
                                  className="text-gray-400 hover:text-red-600 font-bold text-xs cursor-pointer"
                                  title="Remove size"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                <span className="text-[10px] font-mono text-gray-400 font-bold">{currencySymbol}</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Price..."
                                  value={currentPrice}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setFormVariantPrices(prev => ({
                                      ...prev,
                                      [sz]: isNaN(val) ? 0 : val
                                    }));
                                  }}
                                  className="w-full text-xs font-mono font-bold text-black focus:outline-none bg-transparent"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Colours & Color-Linked Images Manager */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-black">
                      Available Colours & Linked Image ({formColors.length})
                    </label>
                    <span className="block text-[10px] text-gray-400 font-mono">
                      Link specific uploaded photo to each color variant for dynamic switching
                    </span>
                  </div>

                  {/* Add Colour Inputs */}
                  <div className="flex items-center space-x-2 bg-gray-50 p-3 border border-gray-200 rounded-2xl">
                    <input
                      type="text"
                      placeholder="Colour Name (e.g. Navy Blue)"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColorOption();
                        }
                      }}
                      className="p-2 border border-gray-200 rounded-xl text-xs font-sans focus:border-black focus:outline-none flex-1 bg-white"
                    />
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      className="w-9 h-9 p-0.5 border border-gray-200 rounded-lg cursor-pointer shrink-0 bg-white"
                      title="Choose Color Hex"
                    />
                    <button
                      type="button"
                      onClick={handleAddColorOption}
                      className="bg-black text-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 cursor-pointer rounded-xl"
                    >
                      Add Colour
                    </button>
                  </div>

                  {/* Color Swatches Grid with Image Linker */}
                  {formColors.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {formColors.map((col, idx) => {
                        const linkedImg = formColorImages[col.name] || '';
                        const availableImages = Array.from(new Set([
                          formImageUrl.trim(),
                          ...formAdditionalImages.split('\n').map(s => s.trim())
                        ].filter(Boolean)));

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-xs font-mono">
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="w-4 h-4 rounded-full border border-gray-300 shadow-2xs" style={{ backgroundColor: col.hex }} />
                              <span className="font-bold text-black">{col.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveColorOption(idx)}
                                className="text-gray-400 hover:text-red-600 font-bold text-sm ml-1 cursor-pointer"
                                title="Remove color"
                              >
                                ×
                              </button>
                            </div>

                            {/* Linked Image Selector */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400 font-bold uppercase font-mono shrink-0">Linked Image:</span>
                              {availableImages.length > 0 ? (
                                <select
                                  value={linkedImg}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormColorImages(prev => ({
                                      ...prev,
                                      [col.name]: val
                                    }));
                                  }}
                                  className="p-1.5 border border-gray-200 rounded-xl text-[11px] font-mono bg-white focus:outline-none focus:border-black max-w-[210px] truncate"
                                >
                                  <option value="">-- Main Default Image --</option>
                                  {availableImages.map((img, i) => (
                                    <option key={i} value={img}>
                                      Image #{i + 1} ({img.substring(0, 24)}...)
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="url"
                                  placeholder="Paste image URL..."
                                  value={linkedImg}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormColorImages(prev => ({
                                      ...prev,
                                      [col.name]: val
                                    }));
                                  }}
                                  className="p-1.5 border border-gray-200 rounded-xl text-[11px] font-mono bg-white focus:outline-none focus:border-black w-48"
                                />
                              )}

                              {linkedImg && (
                                <img
                                  src={linkedImg}
                                  alt={col.name}
                                  className="w-7 h-7 rounded-lg object-cover border border-gray-300 shadow-2xs shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-black cursor-pointer rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-black text-white px-6 py-2.5 text-xs font-extrabold uppercase tracking-wider hover:bg-gray-800 transition-colors border border-black cursor-pointer rounded-2xl shadow-xs"
                  >
                    {editingProduct ? 'Update Product' : 'Save New Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-2 border-black max-w-md w-full p-6 rounded-2xl shadow-2xl relative space-y-4"
            >
              <div className="flex items-center space-x-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold uppercase text-black">
                    Confirm Deletion
                  </h3>
                  <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">
                    Action cannot be undone
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-700 font-sans leading-relaxed">
                Are you sure you want to delete <span className="font-extrabold text-black">"{itemToDelete.name}"</span>?
                {itemToDelete.type === 'product' && ' This will remove the product from ARH Products.'}
                {itemToDelete.type === 'quote' && ' This will permanently remove this quote request from the log.'}
              </p>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 border border-gray-300 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 cursor-pointer rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (itemToDelete.type === 'product') {
                      onDeleteProduct(itemToDelete.id);
                    } else if (itemToDelete.type === 'quote' && onDeleteQuoteEnquiry) {
                      onDeleteQuoteEnquiry(itemToDelete.id);
                    }
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 cursor-pointer rounded-lg border border-red-700 shadow-sm"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
