/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { CompanyProfile, Order, Product } from '../types';
import ProductDetailsPage from './ProductDetailsPage';
import ProductImageCarousel from './ProductImageCarousel';
import {
  X,
  Building2,
  DollarSign,
  ClipboardList,
  Grid,
  LayoutGrid,
  Search,
  Key,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Package,
  ChevronDown,
  ChevronUp,
  Tag,
  Plus,
  Check,
  Edit2,
  Trash2,
  Paperclip
} from 'lucide-react';

interface ClientDashboardModalProps {
  company: CompanyProfile;
  orders: Order[];
  products: Product[];
  masterProducts: Product[];
  onClose: () => void;
  onUpdateCompany: (co: CompanyProfile) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onSimulateClient: (companyId: string) => void;
}

// Component to handle option typing with comma retention
function DropdownOptionsInput({
  options,
  onChange
}: {
  options?: string[];
  onChange: (opts: string[]) => void;
}) {
  const [val, setVal] = useState(() => (options ? options.join(', ') : ''));

  const optionsKey = useMemo(() => (options ? options.join('|||') : ''), [options]);

  React.useEffect(() => {
    const parsed = val.split(',').map(s => s.trim()).filter(Boolean);
    if (parsed.join('|||') !== optionsKey) {
      setVal(options ? options.join(', ') : '');
    }
  }, [optionsKey]);

  return (
    <input
      type="text"
      required
      value={val}
      onChange={(e) => {
        const raw = e.target.value;
        setVal(raw);
        const arr = raw.split(',').map(s => s.trim()).filter(Boolean);
        onChange(arr);
      }}
      placeholder="Left Chest, Right Chest, Sleeve, Back Collar"
      className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-lg p-2 text-xs focus:outline-none font-semibold text-black"
    />
  );
}

export default function ClientDashboardModal({
  company,
  orders,
  products,
  masterProducts,
  onClose,
  onUpdateCompany,
  onUpdateProducts,
  onUpdateOrderStatus,
  onSimulateClient
}: ClientDashboardModalProps) {
  // Modal internal active tabs
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'products' | 'orders'>('overview');
  const [productViewMode, setProductViewMode] = useState<'carousel' | 'compact'>('carousel');
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  
  // Searches
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderDetailsId, setSelectedOrderDetailsId] = useState<string | null>(null);

  // Product add/edit states
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [newSizeInput, setNewSizeInput] = useState('');
  const [newColorInput, setNewColorInput] = useState('');
  const [newImgUrlInput, setNewImgUrlInput] = useState('');

  const [productForm, setProductForm] = useState<Omit<Product, 'id'>>({
    name: '',
    category: 'Uniforms',
    description: '',
    imageUrl: '',
    imageUrls: [],
    basePrice: 12.00,
    originalPrice: 25.00,
    shippingFee: 0.00,
    leadTime: '5-7 Business Days',
    minQuantity: 10,
    unit: 'pcs',
    saleCount: 5,
    saleLimit: 10,
    frequentlyOrdered: false,
    sizeOptions: [],
    colorOptions: [],
    customFields: []
  });

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: 'Uniforms',
      description: '',
      imageUrl: '',
      imageUrls: [],
      basePrice: 12.00,
      originalPrice: 25.00,
      shippingFee: 0.00,
      leadTime: '5-7 Business Days',
      minQuantity: 10,
      unit: 'pcs',
      saleCount: 5,
      saleLimit: 10,
      frequentlyOrdered: false,
      sizeOptions: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
      colorOptions: ['Midnight Black', 'Slate Grey', 'Bright White', 'Navy Blue', 'Forest Green'],
      customFields: [
        { name: 'logo_position', type: 'select', label: 'Logo Position', options: ['Left Chest', 'Right Chest', 'Sleeve', 'Back Collar'], required: true },
        { name: 'personalization', type: 'textarea', label: 'Sizes & Name Personalization (Optional)', placeholder: 'e.g. John - L - Logo only', required: false }
      ]
    });
    setNewSizeInput('');
    setNewColorInput('');
    setNewImgUrlInput('');
    setShowProductForm(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    const existingImages = prod.imageUrls && prod.imageUrls.length > 0
      ? prod.imageUrls
      : (prod.imageUrl ? [prod.imageUrl] : []);

    setProductForm({
      name: prod.name,
      category: prod.category,
      description: prod.description,
      imageUrl: prod.imageUrl,
      imageUrls: existingImages,
      basePrice: prod.basePrice,
      originalPrice: prod.originalPrice || prod.basePrice * 1.8,
      shippingFee: prod.shippingFee || 0.00,
      leadTime: prod.leadTime || '5-7 Business Days',
      minQuantity: prod.minQuantity,
      unit: prod.unit,
      saleCount: prod.saleCount || 5,
      saleLimit: prod.saleLimit || 10,
      frequentlyOrdered: !!prod.frequentlyOrdered,
      sizeOptions: prod.sizeOptions || [],
      colorOptions: prod.colorOptions || [],
      customFields: prod.customFields || []
    });
    setNewSizeInput('');
    setNewColorInput('');
    setNewImgUrlInput('');
    setShowProductForm(true);
  };

  const handleAddSize = (e: React.MouseEvent) => {
    e.preventDefault();
    const clean = newSizeInput.trim().toUpperCase();
    if (clean) {
      const currentSizes = productForm.sizeOptions || [];
      if (!currentSizes.includes(clean)) {
        setProductForm(prev => ({
          ...prev,
          sizeOptions: [...currentSizes, clean]
        }));
      }
      setNewSizeInput('');
    }
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const currentSizes = productForm.sizeOptions || [];
    setProductForm(prev => ({
      ...prev,
      sizeOptions: currentSizes.filter(s => s !== sizeToRemove)
    }));
  };

  const handleAddColor = (e: React.MouseEvent) => {
    e.preventDefault();
    const clean = newColorInput.trim();
    if (clean) {
      const currentColors = productForm.colorOptions || [];
      const normalizedClean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!currentColors.includes(normalizedClean)) {
        setProductForm(prev => ({
          ...prev,
          colorOptions: [...currentColors, normalizedClean]
        }));
      }
      setNewColorInput('');
    }
  };

  const handleRemoveColor = (colorToRemove: string) => {
    const currentColors = productForm.colorOptions || [];
    setProductForm(prev => ({
      ...prev,
      colorOptions: currentColors.filter(c => c !== colorToRemove)
    }));
  };

  const handleAddCustomField = (e: React.MouseEvent) => {
    e.preventDefault();
    const currentFields = productForm.customFields || [];
    const newFieldIdx = currentFields.length + 1;
    setProductForm(prev => ({
      ...prev,
      customFields: [
        ...currentFields,
        {
          name: `custom_field_${Date.now()}`,
          type: 'text',
          label: `New Custom Spec ${newFieldIdx}`,
          placeholder: 'Client input placeholder text',
          required: false
        }
      ]
    }));
  };

  const handleUpdateCustomField = (index: number, updatedField: any) => {
    const currentFields = [...(productForm.customFields || [])];
    currentFields[index] = updatedField;
    setProductForm(prev => ({
      ...prev,
      customFields: currentFields
    }));
  };

  const handleRemoveCustomField = (index: number) => {
    const currentFields = productForm.customFields || [];
    setProductForm(prev => ({
      ...prev,
      customFields: currentFields.filter((_, idx) => idx !== index)
    }));
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.imageUrl) {
      alert('Please fill in Product Name and Image URL.');
      return;
    }

    const updatedCompany = { ...company };

    if (editingProduct) {
      // Check if editing a custom product of this company
      const isCustom = (company.customProducts || []).some(cp => cp.id === editingProduct.id);
      if (isCustom) {
        updatedCompany.customProducts = (company.customProducts || []).map(p =>
          p.id === editingProduct.id ? { ...editingProduct, ...productForm } : p
        );
      } else {
        // If it's a master product, update in master products
        const isMaster = masterProducts.some(p => p.id === editingProduct.id);
        if (isMaster) {
          const updatedMaster = masterProducts.map(p =>
            p.id === editingProduct.id ? { ...editingProduct, ...productForm } : p
          );
          onUpdateProducts(updatedMaster);
        }
      }
    } else {
      const newProd: Product = {
        ...productForm,
        id: `prod-${Date.now()}`
      };

      // Add to company.customProducts ONLY so it does not leak to other companies
      const currentCustoms = updatedCompany.customProducts || [];
      updatedCompany.customProducts = [...currentCustoms, newProd];

      // Enable this product for the current company
      const currentList = company.enabledProductIds
        ? [...company.enabledProductIds, newProd.id]
        : [...masterProducts.map(p => p.id), newProd.id];

      updatedCompany.enabledProductIds = currentList;
    }

    onUpdateCompany(updatedCompany);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleDeleteProduct = (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setProductToDelete(prod);
    }
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      const updatedCustoms = (company.customProducts || []).filter(p => p.id !== productToDelete.id);
      const updatedEnabled = (company.enabledProductIds || []).filter(id => id !== productToDelete.id);
      
      const updatedCompany = {
        ...company,
        customProducts: updatedCustoms,
        enabledProductIds: updatedEnabled
      };

      onUpdateCompany(updatedCompany);

      // Only delete from master products list if it was a master product
      const isMaster = masterProducts.some(p => p.id === productToDelete.id);
      if (isMaster) {
        const updatedMaster = masterProducts.filter(p => p.id !== productToDelete.id);
        onUpdateProducts(updatedMaster);
      }

      if (selectedProductForDetails?.id === productToDelete.id) {
        setSelectedProductForDetails(null);
      }
      setProductToDelete(null);
    }
  };

  // ----------------------------------------------------
  // Derived / Filtered States
  // ----------------------------------------------------
  
  // Orders strictly belonging to this company
  const companyOrders = useMemo(() => {
    return orders.filter(o => o.companyName.toLowerCase() === company.name.toLowerCase());
  }, [orders, company.name]);

  // Financial statistics
  const stats = useMemo(() => {
    const totalCount = companyOrders.length;
    const totalSpend = companyOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    
    const pendingCount = companyOrders.filter(
      o => o.status === 'Pending' || o.status === 'Approved' || o.status === 'In Production'
    ).length;
    
    const completedCount = companyOrders.filter(
      o => o.status === 'Completed' || o.status === 'Shipped'
    ).length;
    
    const avgOrderValue = totalCount > 0 ? totalSpend / totalCount : 0;

    return {
      totalSpend,
      totalCount,
      pendingCount,
      completedCount,
      avgOrderValue
    };
  }, [companyOrders]);

  // Products assigned/added to this company
  const clientProducts = useMemo(() => {
    const enabledIds = company.enabledProductIds;
    const hasExplicitEnabledList = Array.isArray(enabledIds);

    const productMap = new Map<string, Product>();

    // First pass: master products enabled for this company
    masterProducts.forEach(p => {
      if (!hasExplicitEnabledList || enabledIds.includes(p.id)) {
        productMap.set(p.id, p);
      }
    });

    // Second pass: company custom products
    if (company.customProducts && company.customProducts.length > 0) {
      company.customProducts.forEach(cp => {
        if (!hasExplicitEnabledList || enabledIds.includes(cp.id) || company.customProducts?.some(c => c.id === cp.id)) {
          productMap.set(cp.id, cp);
        }
      });
    }

    return Array.from(productMap.values()).map(p => ({
      ...p,
      isEnabled: true
    }));
  }, [masterProducts, company.customProducts, company.enabledProductIds]);

  const enabledProductsCount = useMemo(() => {
    return clientProducts.length;
  }, [clientProducts]);

  const filteredClientProducts = useMemo(() => {
    return clientProducts.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [clientProducts, productSearch]);

  const filteredCompanyOrders = useMemo(() => {
    if (!orderSearch) return companyOrders;
    return companyOrders.filter(o =>
      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.status.toLowerCase().includes(orderSearch.toLowerCase()) ||
      (o.poNumber && o.poNumber.toLowerCase().includes(orderSearch.toLowerCase()))
    );
  }, [companyOrders, orderSearch]);

  // Toggle single allocation directly within the dashboard
  const handleToggleAllocation = (productId: string) => {
    let currentList = company.enabledProductIds || masterProducts.map(p => p.id);
    if (currentList.includes(productId)) {
      currentList = currentList.filter(id => id !== productId);
    } else {
      currentList = [...currentList, productId];
    }
    onUpdateCompany({
      ...company,
      enabledProductIds: currentList
    });
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden" id="client-dashboard-page">
        {/* Page card container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="bg-white w-full h-full flex flex-col overflow-hidden"
        >
        {/* Header Block */}
        <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-[#fafafa]">
          <div className="flex items-center space-x-4">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-16 h-16 rounded-[1.25rem] object-cover border-2 border-black shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-[1.25rem] bg-black text-white border-2 border-black flex items-center justify-center font-bold font-mono text-xl shadow-sm">
                {company.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-xl md:text-2xl font-black uppercase text-black tracking-tight leading-none">
                {company.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 font-mono">
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-gray-300">
                  <Key className="w-3 h-3 text-gray-400" />
                  {company.username}
                </span>
                <span>•</span>
                <span className="font-semibold text-gray-600">Contact: {company.contactPerson}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-black border border-black text-white hover:bg-neutral-900 rounded-xl text-xs uppercase font-extrabold tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              aria-label="Close Dashboard & Return"
              id="close-client-dashboard-btn"
            >
              <X className="w-4 h-4" />
              <span>Back to Clients</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="border-b border-gray-200 px-6 md:px-8 bg-white shrink-0 flex overflow-x-auto custom-scrollbar pb-1.5 pt-1">
          {[
            { id: 'overview', label: 'Overview & Metrics', icon: Building2 },
            { id: 'products', label: 'Products', icon: Grid, count: enabledProductsCount },
            { id: 'orders', label: 'All Past Orders', icon: ClipboardList, count: companyOrders.length }
          ].map((subtab) => {
            const Icon = subtab.icon;
            const isActive = activeSubTab === subtab.id;
            return (
              <button
                key={subtab.id}
                onClick={() => {
                  setActiveSubTab(subtab.id as any);
                }}
                className={`flex items-center space-x-2 py-4 px-4 font-sans text-xs uppercase tracking-wider font-extrabold transition-all border-b-2 whitespace-nowrap focus:outline-none cursor-pointer ${
                  isActive
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400 hover:text-black hover:border-gray-200'
                }`}
                id={`sub-tab-btn-${subtab.id}`}
              >
                <Icon className="w-4 h-4" />
                <span>{subtab.label}</span>
                {subtab.count !== undefined && (
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1 border ${
                    isActive ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                    {subtab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Contents Section */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#fdfdfd]">
          {/* 1. OVERVIEW & METRICS TAB */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* Financial Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-wider">Total Value Placed</span>
                    <DollarSign className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <span className="block text-xl font-black font-mono text-black">Php {stats.totalSpend.toFixed(2)}</span>
                    <span className="text-[9px] text-gray-400 block font-mono mt-0.5">Aggregated B2B billing invoices</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-wider">Gross Order Count</span>
                    <ClipboardList className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <span className="block text-xl font-black font-mono text-black">{stats.totalCount}</span>
                    <span className="text-[9px] text-gray-400 block font-mono mt-0.5">Orders recorded historically</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-wider">In Queue (Pending/Active)</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <span className="block text-xl font-black font-mono text-amber-600">{stats.pendingCount}</span>
                    <span className="text-[9px] text-gray-400 block font-mono mt-0.5">Awaiting dispatch fulfillment</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                  <div className="flex items-center justify-between text-gray-400 mb-2">
                    <span className="text-[9px] uppercase font-mono font-bold tracking-wider">Avg. Order Value</span>
                    <Tag className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <span className="block text-xl font-black font-mono text-black">Php {stats.avgOrderValue.toFixed(2)}</span>
                    <span className="text-[9px] text-gray-400 block font-mono mt-0.5">Average checkout invoice metric</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Profile Details Card */}
                <div className="lg:col-span-5 bg-white border border-gray-200 rounded-3xl p-5 space-y-4">
                  <h4 className="font-extrabold text-xs uppercase font-mono text-black pb-2 border-b border-gray-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-black" />
                    Account Contact &amp; Dispatch Specs
                  </h4>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-mono font-bold">Buyer Contact Email</span>
                        <a href={`mailto:${company.contactEmail}`} className="font-bold text-black underline hover:text-gray-700 font-mono">
                          {company.contactEmail}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-mono font-bold">Office Hotline</span>
                        <span className="font-bold text-black font-mono">{company.contactPhone}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-mono font-bold">Standard Delivery Destination</span>
                        <p className="font-semibold text-black leading-snug">{company.deliveryAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 pt-2 border-t border-gray-100">
                      <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-mono font-bold">B2B PO Ref Rule</span>
                        <span className="font-bold text-black uppercase">
                          {company.poRequired ? '⚠️ Purchase Order (PO) strictly mandatory' : 'Purchase Order optional'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent activity timeline / recent orders */}
                <div className="lg:col-span-7 bg-white border border-gray-200 rounded-3xl p-5 space-y-4">
                  <h4 className="font-extrabold text-xs uppercase font-mono text-black pb-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-black" />
                      Recent Purchase Requests
                    </span>
                    <button
                      onClick={() => setActiveSubTab('orders')}
                      className="text-[10px] uppercase font-bold text-black underline font-mono hover:text-gray-600"
                    >
                      See All Orders
                    </button>
                  </h4>

                  {companyOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs font-mono">
                      No purchase requests logged yet for {company.name}.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 space-y-3.5">
                      {companyOrders.slice(0, 3).map((ord) => (
                        <div key={ord.id} className="flex items-center justify-between pt-3 first:pt-0 gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-black font-mono text-xs">{ord.orderNumber}</span>
                              <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase rounded border ${
                                ord.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                ord.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                ord.status === 'In Production' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-gray-50 text-gray-500 border-gray-100'
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 block font-mono mt-0.5">
                              {new Date(ord.createdAt).toLocaleDateString()} • {ord.items.length} line-item(s)
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block font-black text-black font-mono text-xs">Php {ord.totalAmount.toFixed(2)}</span>
                            {ord.poNumber && (
                              <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold mt-0.5 inline-block">
                                PO: {ord.poNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. ALLOCATED CATALOG SPECS TAB */}
          {activeSubTab === 'products' && (
            <div className="space-y-4">
              {showProductForm ? (
                /* Product Add/Edit Form */
                <form onSubmit={handleSaveProductSubmit} className="bg-white border-2 border-black rounded-3xl p-6 space-y-5 animate-fade-in">
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm uppercase text-black font-sans">
                        {editingProduct ? 'Edit Product Specification' : 'Add New Product Specification'}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-mono">
                        Configure client catalog availability and details
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="text-xs text-gray-400 hover:text-black font-bold uppercase font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Product Name *</label>
                      <input
                        type="text"
                        required
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="e.g. Signature Leather Lanyards"
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-semibold text-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Category *</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 pr-10 text-xs focus:outline-none font-bold text-black font-mono"
                      >
                        <option value="Uniforms">Uniforms</option>
                        <option value="IDs & Accessories">IDs & Accessories</option>
                        <option value="Print Materials">Print Materials</option>
                        <option value="Promo Items">Promo Items</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">B2B Base Price (PHP) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={productForm.basePrice}
                        onChange={(e) => setProductForm({ ...productForm, basePrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Original Retail Price (PHP) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={productForm.originalPrice}
                        onChange={(e) => setProductForm({ ...productForm, originalPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Delivery Charge / Shipping Fee (PHP) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={productForm.shippingFee}
                        onChange={(e) => setProductForm({ ...productForm, shippingFee: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Fulfillment Lead Time *</label>
                      <input
                        type="text"
                        required
                        value={productForm.leadTime || ''}
                        onChange={(e) => setProductForm({ ...productForm, leadTime: e.target.value })}
                        placeholder="e.g. 5-7 Business Days"
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Min Order Quantity (MOQ) *</label>
                      <input
                        type="number"
                        required
                        value={productForm.minQuantity}
                        onChange={(e) => setProductForm({ ...productForm, minQuantity: parseInt(e.target.value) || 1 })}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Order Unit *</label>
                      <input
                        type="text"
                        required
                        value={productForm.unit}
                        onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                        placeholder="e.g. pcs or box"
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Stock/Sales Count *</label>
                      <input
                        type="number"
                        required
                        value={productForm.saleCount}
                        onChange={(e) => setProductForm({ ...productForm, saleCount: parseInt(e.target.value) || 1 })}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Stock/Sales Limit *</label>
                      <input
                        type="number"
                        required
                        value={productForm.saleLimit}
                        onChange={(e) => setProductForm({ ...productForm, saleLimit: parseInt(e.target.value) || 1 })}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                      />
                    </div>

                    {/* PRODUCT IMAGE CAROUSEL GALLERY (Max 5 Images) */}
                    <div className="space-y-3 md:col-span-2 bg-neutral-50/60 p-4 rounded-2xl border border-gray-200/80">
                      <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
                        <div>
                          <span className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-black">
                            Product Image Carousel Gallery (Max 5 Images) *
                          </span>
                          <span className="block text-[9px] text-gray-400 font-mono">
                            Add up to 5 product photos for buyers to slide through. Image #1 is primary cover photo.
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black text-white">
                          {(productForm.imageUrls || []).length} / 5
                        </span>
                      </div>

                      {/* Existing Images Thumbnails */}
                      {productForm.imageUrls && productForm.imageUrls.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                          {productForm.imageUrls.map((img, idx) => (
                            <div key={idx} className="relative bg-white border border-gray-200 rounded-xl overflow-hidden group shadow-2xs aspect-square flex items-center justify-center">
                              {img.startsWith('http') || img.startsWith('data:') ? (
                                <img src={img} alt={`Product photo ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="text-3xl select-none">{img}</div>
                              )}

                              <div className="absolute top-1 left-1 z-10">
                                {idx === 0 ? (
                                  <span className="bg-black text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase">Primary</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = [...(productForm.imageUrls || [])];
                                      const chosen = current.splice(idx, 1)[0];
                                      current.unshift(chosen);
                                      setProductForm({ ...productForm, imageUrls: current, imageUrl: current[0] });
                                    }}
                                    className="bg-white/90 hover:bg-black hover:text-white text-black text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs cursor-pointer transition-colors"
                                    title="Set as cover image"
                                  >
                                    Set Cover
                                  </button>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const current = (productForm.imageUrls || []).filter((_, i) => i !== idx);
                                  setProductForm({ ...productForm, imageUrls: current, imageUrl: current[0] || '' });
                                }}
                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-700 text-white p-1 rounded-full shadow-xs cursor-pointer opacity-90 group-hover:opacity-100 transition-opacity"
                                title="Remove image"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Image Input Bar */}
                      {(!productForm.imageUrls || productForm.imageUrls.length < 5) ? (
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <input
                            type="text"
                            value={newImgUrlInput}
                            onChange={(e) => setNewImgUrlInput(e.target.value)}
                            placeholder="Paste image URL (https://...) or enter emoji 👕"
                            className="flex-1 bg-white border border-gray-200 focus:bg-white focus:border-black rounded-xl p-2.5 text-xs focus:outline-none font-mono text-black"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newImgUrlInput.trim()) {
                                  const current = productForm.imageUrls || [];
                                  const updated = [...current, newImgUrlInput.trim()];
                                  setProductForm({ ...productForm, imageUrls: updated, imageUrl: updated[0] });
                                  setNewImgUrlInput('');
                                }
                              }
                            }}
                          />

                          <div className="flex gap-2">
                            <label className="cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl px-3 py-2 text-[10px] font-mono uppercase font-bold tracking-wider inline-flex items-center gap-1.5 transition-colors shrink-0">
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>Upload File</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64String = reader.result as string;
                                      const current = productForm.imageUrls || [];
                                      const updated = [...current, base64String];
                                      setProductForm({ ...productForm, imageUrls: updated, imageUrl: updated[0] });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                if (newImgUrlInput.trim()) {
                                  const current = productForm.imageUrls || [];
                                  const updated = [...current, newImgUrlInput.trim()];
                                  setProductForm({ ...productForm, imageUrls: updated, imageUrl: updated[0] });
                                  setNewImgUrlInput('');
                                }
                              }}
                              className="bg-black text-white px-3.5 py-2 rounded-xl text-[10px] font-mono uppercase font-bold hover:bg-neutral-800 shrink-0 cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Photo</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-600 font-mono italic pt-1">
                          Maximum limit of 5 product images reached. Remove an image above to add a replacement.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Product Pitch / B2B Description *</label>
                      <textarea
                        rows={3}
                        required
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Double-sided, matte laminate with your brand identity embedded perfectly."
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-semibold text-black leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="form-freq-ord-modal"
                      checked={productForm.frequentlyOrdered}
                      onChange={(e) => setProductForm({ ...productForm, frequentlyOrdered: e.target.checked })}
                      className="w-4 h-4 cursor-pointer accent-black"
                    />
                    <label htmlFor="form-freq-ord-modal" className="text-xs text-gray-800 font-mono font-bold select-none cursor-pointer">
                      Tag as "B2B Best-Seller" banner
                    </label>
                  </div>

                  {/* VARIATION SPECS EDITING PART */}
                  <div className="border-t border-gray-200 pt-5 space-y-6">
                    <h4 className="font-extrabold text-xs uppercase text-black tracking-wider flex items-center gap-1.5 font-sans border-b border-gray-100 pb-2">
                      <Tag className="w-3.5 h-3.5 text-black" />
                      Product Customization & Variant Specs
                    </h4>

                    {/* SIZES */}
                    <div className="space-y-3 bg-neutral-50/50 p-4 rounded-2xl border border-gray-200/60">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-black">Authorized Corporate Sizes</span>
                          <span className="block text-[9px] text-gray-400 font-mono">Set size variants selectable by buyers</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSizeInput}
                          onChange={(e) => setNewSizeInput(e.target.value)}
                          placeholder="e.g. 4XL"
                          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-black font-bold uppercase w-32"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSize(e as any);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddSize}
                          className="bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold hover:bg-neutral-800 shrink-0 cursor-pointer"
                        >
                          Add Size
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(!productForm.sizeOptions || productForm.sizeOptions.length === 0) ? (
                          <span className="text-[10px] text-gray-400 italic">No custom sizes enabled (Free-text dimensions only)</span>
                        ) : (
                          productForm.sizeOptions.map((sz) => (
                            <span key={sz} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-mono font-bold text-black shadow-2xs">
                              {sz}
                              <button
                                type="button"
                                onClick={() => handleRemoveSize(sz)}
                                className="text-gray-400 hover:text-red-500 font-black ml-0.5 text-xs focus:outline-none cursor-pointer"
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* COLORS */}
                    <div className="space-y-3 bg-neutral-50/50 p-4 rounded-2xl border border-gray-200/60">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-black">Available Corporate Color Palette</span>
                          <span className="block text-[9px] text-gray-400 font-mono">Define brand-approved product colors</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newColorInput}
                          onChange={(e) => setNewColorInput(e.target.value)}
                          placeholder="e.g. Crimson Red"
                          className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-black font-semibold w-48"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddColor(e as any);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddColor}
                          className="bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold hover:bg-neutral-800 shrink-0 cursor-pointer"
                        >
                          Add Color
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(!productForm.colorOptions || productForm.colorOptions.length === 0) ? (
                          <span className="text-[10px] text-gray-400 italic">No color variants enabled (Single default color)</span>
                        ) : (
                          productForm.colorOptions.map((cl) => {
                            // Find hex color
                            let hex = '#ccc';
                            const lower = cl.toLowerCase();
                            if (lower.includes('black')) hex = '#111';
                            else if (lower.includes('grey') || lower.includes('gray')) hex = '#555';
                            else if (lower.includes('white')) hex = '#fbfbfb';
                            else if (lower.includes('blue')) hex = '#1d4ed8';
                            else if (lower.includes('green')) hex = '#15803d';
                            else if (lower.includes('red')) hex = '#b91c1c';
                            else if (lower.includes('gold') || lower.includes('yellow')) hex = '#eab308';
                            else if (lower.includes('orange')) hex = '#ea580c';
                            else if (lower.includes('purple')) hex = '#7c3aed';
                            
                            return (
                              <span key={cl} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-mono font-bold text-black shadow-2xs">
                                <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: hex }} />
                                {cl}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColor(cl)}
                                  className="text-gray-400 hover:text-red-500 font-black ml-0.5 text-xs focus:outline-none cursor-pointer"
                                >
                                  &times;
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* CUSTOM FIELDS (SPECS) */}
                    <div className="space-y-4 bg-neutral-50/50 p-4 rounded-2xl border border-gray-200/60">
                      <div className="flex justify-between items-center border-b border-gray-200/60 pb-2">
                        <div>
                          <span className="block text-[10px] uppercase font-mono tracking-wider font-extrabold text-black">Pre-Configured Customization Specs</span>
                          <span className="block text-[9px] text-gray-400 font-mono">Fields collected during B2B buyer checkout</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomField}
                          className="bg-black text-white px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase font-bold hover:bg-neutral-800 flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Add Spec Field
                        </button>
                      </div>

                      <div className="space-y-3.5 pt-1">
                        {(!productForm.customFields || productForm.customFields.length === 0) ? (
                          <div className="text-center py-4 bg-white/60 rounded-xl border border-dashed border-gray-200">
                            <p className="text-[10px] text-gray-400 font-mono">No custom fields defined. Click "Add Spec Field" to customize.</p>
                          </div>
                        ) : (
                          productForm.customFields.map((cf, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-xl p-3 space-y-3 shadow-2xs relative group/field">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 flex-1">
                                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Spec Label / Title *</label>
                                  <input
                                    type="text"
                                    required
                                    value={cf.label}
                                    onChange={(e) => handleUpdateCustomField(index, { ...cf, label: e.target.value })}
                                    placeholder="e.g. Logo Position"
                                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-lg p-2 text-xs focus:outline-none font-bold text-black"
                                  />
                                </div>

                                <div className="space-y-1 w-36">
                                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Field Type *</label>
                                  <select
                                    value={cf.type}
                                    onChange={(e) => {
                                      const newType = e.target.value as any;
                                      const updated = { ...cf, type: newType };
                                      if (newType === 'select' && !cf.options) {
                                        updated.options = ['Option 1', 'Option 2'];
                                      }
                                      handleUpdateCustomField(index, updated);
                                    }}
                                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-lg p-2 text-xs focus:outline-none font-bold text-black font-mono"
                                  >
                                    <option value="text">Text Input</option>
                                    <option value="select">Dropdown List</option>
                                    <option value="textarea">Paragraph Area</option>
                                  </select>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomField(index)}
                                  className="mt-5 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remove custom field"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {cf.type === 'select' && (
                                <div className="space-y-1">
                                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Dropdown Options (Comma Separated) *</label>
                                  <DropdownOptionsInput
                                    options={cf.options}
                                    onChange={(opts) => handleUpdateCustomField(index, { ...cf, options: opts })}
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`req-cf-${index}`}
                                  checked={!!cf.required}
                                  onChange={(e) => handleUpdateCustomField(index, { ...cf, required: e.target.checked })}
                                  className="w-3.5 h-3.5 cursor-pointer accent-black"
                                />
                                <label htmlFor={`req-cf-${index}`} className="text-[10px] text-gray-600 font-mono select-none cursor-pointer">
                                  Mark as mandatory required field to checkout
                                </label>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="px-5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs uppercase font-bold tracking-wider hover:text-black hover:border-black transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-black border border-black text-white rounded-xl text-xs uppercase font-extrabold tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer shadow-md"
                    >
                      Save Specs
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex items-center w-full sm:max-w-xs">
                        <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-black focus:border-black focus:outline-none"
                          id="client-dash-product-search"
                        />
                      </div>

                      {/* View Mode Toggle Switcher */}
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setProductViewMode('carousel')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            productViewMode === 'carousel'
                              ? 'bg-black text-white shadow-xs'
                              : 'text-gray-500 hover:text-black'
                          }`}
                          id="view-mode-carousel-btn"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Carousel View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductViewMode('compact')}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            productViewMode === 'compact'
                              ? 'bg-black text-white shadow-xs'
                              : 'text-gray-500 hover:text-black'
                          }`}
                          id="view-mode-compact-btn"
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>Compact View</span>
                        </button>
                      </div>

                      <button
                        onClick={handleOpenNewProduct}
                        className="px-3.5 py-2 bg-black border border-black text-white hover:bg-neutral-900 rounded-xl text-xs uppercase font-extrabold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                        id="client-dash-add-product-btn"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Product</span>
                      </button>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono font-bold uppercase">
                      Showing {filteredClientProducts.length} of {products.length} specifications
                    </div>
                  </div>

                  {/* Product Allocation Cards Grid - Carousel View Mode */}
                  {productViewMode === 'carousel' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filteredClientProducts.map((p) => (
                        <div
                          key={p.id}
                          className={`rounded-3xl overflow-hidden bg-white flex flex-col justify-between transition-all duration-300 relative border group shadow-sm hover:shadow-lg ${
                            p.isEnabled ? 'border-gray-200' : 'border-gray-200 opacity-60 bg-gray-50/50'
                          }`}
                          id={`modal-carousel-card-${p.id}`}
                        >
                          {/* Image Carousel Component */}
                          <ProductImageCarousel
                            product={p}
                            onImageClick={() => setSelectedProductForDetails(p)}
                            showFavoriteButton={false}
                            className="m-3.5"
                          />

                          {/* Card Content Section */}
                          <div className="px-5 pb-5 pt-1 flex-1 flex flex-col justify-between space-y-3.5">
                            <div onClick={() => setSelectedProductForDetails(p)} className="space-y-2 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] uppercase font-mono tracking-widest text-gray-400 font-bold">
                                  {p.category}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  MOQ: <strong className="text-black">{p.minQuantity} {p.unit}</strong>
                                </span>
                              </div>

                              <h4 className="font-extrabold text-sm text-black uppercase leading-tight line-clamp-2 min-h-[36px] tracking-tight group-hover:text-black transition-colors">
                                {p.name}
                              </h4>

                              {/* Price */}
                              <div className="flex items-baseline gap-2">
                                <span className="text-lg font-extrabold text-black tracking-tight">
                                  Php {p.basePrice.toFixed(2)}
                                </span>
                                <span className="text-xs text-red-500/80 line-through font-mono font-bold">
                                  Php {(p.originalPrice || p.basePrice * 1.8).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono ml-auto">
                                  /{p.unit}
                                </span>
                              </div>

                              {/* Sale Progress Bar */}
                              <div className="space-y-1 pt-0.5">
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-black h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, ((p.saleCount || 5) / 10) * 100)}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[9px] font-mono text-gray-400 font-bold">
                                  <span>{p.saleCount || 5}/10 Sale</span>
                                  <span className={p.isEnabled ? 'text-emerald-600' : 'text-gray-400'}>
                                    {p.isEnabled ? '● Active Allocation' : '○ Excluded'}
                                  </span>
                                </div>
                              </div>

                              {/* Lead Time & Delivery Info Box */}
                              <div className="bg-neutral-50 border border-gray-200/90 rounded-2xl p-2.5 space-y-1.5 text-[10px] font-mono">
                                <div className="flex items-center gap-1.5 text-gray-800 font-bold truncate">
                                  <Clock className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                                  <span className="truncate">Lead: <strong className="text-black">{p.leadTime || '5-7 Business Days'}</strong></span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-800 font-bold border-t border-gray-200/60 pt-1.5">
                                  <Truck className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                                  <span>Delivery: <strong className="text-black">{p.shippingFee && p.shippingFee > 0 ? `Php ${p.shippingFee.toFixed(2)}` : 'Free Delivery'}</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Admin Specs & Allocation Toolbar */}
                            <div className="flex items-center justify-between gap-1.5 border-t border-gray-100 pt-3 mt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditProduct(p);
                                }}
                                className="flex-1 py-2 px-2 rounded-xl border border-gray-200 hover:border-black bg-white text-gray-700 hover:text-black text-[9px] uppercase tracking-wider font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs"
                                id={`modal-carousel-edit-${p.id}`}
                              >
                                <Edit2 className="w-3 h-3 text-gray-400" />
                                <span>Edit Specs</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAllocation(p.id);
                                }}
                                className={`flex-1 py-2 px-2 rounded-xl border text-[9px] uppercase tracking-wider font-extrabold cursor-pointer transition-all flex items-center justify-center gap-1 shadow-xs ${
                                  p.isEnabled
                                    ? 'bg-black text-white border-black hover:bg-neutral-800'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-black hover:text-black'
                                }`}
                                id={`modal-carousel-toggle-${p.id}`}
                              >
                                <span>{p.isEnabled ? 'Disable' : 'Enable'}</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(p.id);
                                }}
                                className="py-2 px-2.5 rounded-xl border border-red-100 hover:border-red-500 bg-red-50/40 hover:bg-red-50 text-red-600 hover:text-red-700 text-[9px] uppercase tracking-wider font-extrabold cursor-pointer transition-all flex items-center justify-center shadow-xs"
                                id={`modal-carousel-delete-${p.id}`}
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Compact Grid View Mode */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredClientProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProductForDetails(p)}
                          className={`p-4 bg-white border rounded-2xl flex flex-col justify-between transition-all cursor-pointer hover:border-black hover:shadow-md hover:scale-[1.01] ${
                            p.isEnabled ? 'border-black bg-neutral-50/25' : 'border-gray-200 opacity-60'
                          }`}
                          id={`modal-product-card-${p.id}`}
                        >
                          <div className="flex items-start space-x-3.5 mb-3">
                            <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                              {p.imageUrl.startsWith('http') ? (
                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="text-2xl">{p.imageUrl}</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="inline-block text-[8px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded font-mono uppercase mb-0.5 whitespace-nowrap truncate max-w-full">
                                {p.category}
                              </span>
                              <h5 className="font-extrabold text-xs text-black uppercase leading-tight line-clamp-2 min-h-[2rem]">
                                {p.name}
                              </h5>
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                Price: <span className="font-bold text-black">Php {p.basePrice.toFixed(2)}</span> / MOQ: {p.minQuantity} {p.unit}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 mt-2">
                            <span className={`text-[10px] font-mono font-bold uppercase ${
                              p.isEnabled ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              {p.isEnabled ? '● Available' : '○ Excluded'}
                            </span>
                            
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditProduct(p);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-black bg-white text-gray-700 hover:text-black text-[9px] uppercase tracking-wider font-extrabold cursor-pointer transition-colors flex items-center gap-1"
                                id={`modal-edit-specs-${p.id}`}
                              >
                                <Edit2 className="w-3 h-3 text-gray-400" />
                                <span>Edit</span>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAllocation(p.id);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg border text-[9px] uppercase tracking-wider font-extrabold cursor-pointer transition-colors ${
                                  p.isEnabled
                                    ? 'bg-black text-white border-black hover:bg-white hover:text-black'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                                }`}
                                id={`modal-toggle-alloc-${p.id}`}
                              >
                                {p.isEnabled ? 'Disable' : 'Enable'}
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(p.id);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-red-100 hover:border-red-500 bg-red-50/40 hover:bg-red-50 text-red-600 hover:text-red-700 text-[9px] uppercase tracking-wider font-extrabold cursor-pointer transition-colors flex items-center gap-1"
                                id={`modal-delete-product-${p.id}`}
                                title="Delete Product"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 3. ORDER HISTORY TAB */}
          {activeSubTab === 'orders' && (
            <div className="space-y-4 animate-fade-in">
              {/* Order Search Filter */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative flex items-center w-full sm:max-w-xs">
                  <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by order # or PO..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs text-black focus:border-black focus:outline-none"
                    id="client-dash-order-search"
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">
                  {filteredCompanyOrders.length} B2B Purchases Found
                </span>
              </div>

              {/* Purchase Orders Stream Container */}
              <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden shadow-xs divide-y divide-gray-100">
                {filteredCompanyOrders.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 font-mono text-xs">
                    No matching client orders registered.
                  </div>
                ) : (
                  filteredCompanyOrders.map((ord) => {
                    const isExpanded = selectedOrderDetailsId === ord.id;
                    return (
                      <div key={ord.id} className="flex flex-col transition-colors hover:bg-neutral-50/40">
                        {/* Main row header */}
                        <div
                          onClick={() => setSelectedOrderDetailsId(isExpanded ? null : ord.id)}
                          className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center font-bold font-mono text-xs text-black">
                              #
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-black font-mono text-xs md:text-sm">
                                  {ord.orderNumber}
                                </span>
                                <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-md border ${
                                  ord.status === 'Pending Approval' ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse' :
                                  ord.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' :
                                  ord.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                  ord.status === 'In Production' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                  ord.status === 'Approved' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                  'bg-gray-50 text-gray-500 border-gray-100'
                                }`}>
                                  {ord.status === 'Pending Approval' ? '⏳ Pending Review' : ord.status}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 block font-mono mt-0.5">
                                Ordered: {new Date(ord.createdAt).toLocaleString()} • {ord.items.length} unique specification(s)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 justify-between md:justify-end shrink-0">
                            <div className="text-left md:text-right font-mono">
                              <span className="block font-black text-black text-xs md:text-sm">Php {ord.totalAmount.toFixed(2)}</span>
                              {ord.poNumber && (
                                <span className="text-[9px] bg-black text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block mt-0.5">
                                  PO: {ord.poNumber}
                                </span>
                              )}
                            </div>
                            
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Expandable items description panel */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-1 bg-[#fafafa] border-t border-gray-100 space-y-4 text-xs font-mono">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-b border-gray-100 pb-3">
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold mb-1">Shipping &amp; Delivery Destination</span>
                                <p className="font-semibold text-black leading-snug">{ord.deliveryAddress}</p>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold mb-1">Purchasing Rep</span>
                                <p className="font-semibold text-black">
                                  {ord.contactPerson} ({ord.contactEmail})
                                </p>
                              </div>
                            </div>

                            {/* Line items checklist */}
                            <div className="space-y-2">
                              <span className="block text-[8px] uppercase tracking-wider text-gray-400 font-bold">Itemized Order Specifications</span>
                              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                                {ord.items.map((it, idx) => (
                                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-[11px]">
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                                        {it.imageUrl?.startsWith('http') ? (
                                          <img src={it.imageUrl} alt={it.productName} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="text-base">{it.imageUrl || '📦'}</div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <span className="font-bold text-black uppercase block truncate">{it.productName}</span>
                                        <div className="flex flex-wrap gap-1 mt-0.5 text-[9px] text-gray-400 font-sans">
                                          {it.selectedSize && <span className="bg-gray-100 text-gray-600 px-1 py-0.2 rounded font-mono font-bold">Size: {it.selectedSize}</span>}
                                          {it.selectedColor && <span className="bg-gray-100 text-gray-600 px-1 py-0.2 rounded font-mono font-bold">Color: {it.selectedColor}</span>}
                                          {it.customDetails && Object.keys(it.customDetails).map(k => (
                                            <span key={k} className="bg-gray-100 text-gray-600 px-1 py-0.2 rounded font-mono font-semibold max-w-[150px] truncate">
                                              {k}: {it.customDetails![k]}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-bold text-black block">{it.quantity} @ Php {it.price.toFixed(2)}</span>
                                      <span className="font-black text-black block text-xs mt-0.5">Php {(it.quantity * it.price).toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {ord.notes && (
                              <div className="bg-amber-50/50 border border-amber-100 p-2.5 rounded-xl">
                                <span className="block text-[8px] uppercase tracking-wider text-amber-600 font-bold mb-1">Purchaser Remarks &amp; Notes</span>
                                <p className="text-[10px] text-amber-900 leading-normal italic">"{ord.notes}"</p>
                              </div>
                            )}

                            {/* Portal Approval Banner for Company Review */}
                            {ord.status === 'Pending Approval' && (
                              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900 uppercase">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <span>Portal Request Pending Company Review</span>
                                  </div>
                                  <p className="text-[11px] text-amber-800 leading-snug">
                                    This order was submitted via public portal. Review the items and click below to send it to the admin for official ordering &amp; production.
                                  </p>
                                </div>
                                <button
                                  onClick={() => onUpdateOrderStatus(ord.id, 'Pending')}
                                  className="bg-black hover:bg-neutral-800 text-white text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-black shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-2"
                                  id={`submit-to-admin-btn-${ord.id}`}
                                >
                                  <span>Submit to Admin for Ordering</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Direct status advance buttons from dashboard */}
                            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                                Quick Dispatch Action
                              </span>
                              
                              <div className="flex gap-1">
                                {[
                                  { label: 'Portal Review', val: 'Pending Approval' },
                                  { label: 'Sent to Admin', val: 'Pending' },
                                  { label: 'Approve', val: 'Approved' },
                                  { label: 'Production', val: 'In Production' },
                                  { label: 'Ship', val: 'Shipped' },
                                  { label: 'Completed', val: 'Completed' }
                                ].map((st) => (
                                  <button
                                    key={st.val}
                                    onClick={() => onUpdateOrderStatus(ord.id, st.val as any)}
                                    className={`px-2 py-1 rounded border text-[9px] font-bold cursor-pointer transition-colors ${
                                      ord.status === st.val
                                        ? 'bg-black text-white border-black font-extrabold shadow-xs'
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
    {selectedProductForDetails && (
      <ProductDetailsPage
        product={selectedProductForDetails}
        onClose={() => setSelectedProductForDetails(null)}
        onEdit={(p) => {
          setSelectedProductForDetails(null);
          handleOpenEditProduct(p);
        }}
      />
    )}
    {productToDelete && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 font-sans">
        <div className="bg-white border border-gray-200 rounded-[28px] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-up">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm uppercase font-extrabold text-black tracking-tight font-sans">
              Delete Product Specification?
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Are you sure you want to permanently delete <strong className="text-black uppercase">"{productToDelete.name}"</strong>? This will remove it from the master catalog and all company allocations. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setProductToDelete(null)}
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:border-black text-gray-500 hover:text-black rounded-xl text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteProduct}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer shadow-md"
            >
              Delete Spec
            </button>
          </div>
        </div>
      </div>
    )}
    </>,
    document.body
  );
}
