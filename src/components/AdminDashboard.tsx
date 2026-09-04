/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Product,
  CompanyProfile,
  Order,
  SystemSettings,
  AppsScriptConfig,
  CatalogProduct,
  QuoteEnquiry,
  Job,
  JobColumn,
  JobItemColumn,
  JobStatus,
  StaffMember,
  StaffAccount,
  PayrollRecord,
  AttendanceRecord,
  ExpenseRecord,
  RecurringExpense,
  ExpenseCategory,
  AuthUser,
  getDisplayPurchaserName
} from '../types';
import AppsScriptInstructions from './AppsScriptInstructions';
import SettingsPanel from './SettingsPanel';
import AdminProductCatalog from './AdminProductCatalog';
import JobManagementBoard from './JobManagementBoard';
import StaffManagement from './StaffManagement';
import ExpensesManagement from './ExpensesManagement';
import AnalyticsDashboard from './AnalyticsDashboard';
import { createJobFromOrder } from '../data/initialJobs';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  Grid,
  ClipboardList,
  UserPlus,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Clock,
  Truck,
  Package,
  Search,
  Building,
  Key,
  DollarSign,
  AlertCircle,
  Lock,
  Layers,
  Heart,
  ArrowRight,
  X,
  Building2,
  BarChart3,
  TrendingUp,
  PieChart,
  Filter,
  Settings,
  Mail,
  Paperclip,
  Send,
  Eye,
  RefreshCw,
  Inbox,
  FileSpreadsheet,
  ExternalLink,
  MapPin,
  Receipt,
  Printer,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  Kanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClientDashboardModal from './ClientDashboardModal';
import ReceiptGenerator from './ReceiptGenerator';
import QuoteBuilder from './QuoteBuilder';
import { AdminAppBranding } from './AdminAppBranding';

interface AdminDashboardProps {
  products: Product[];
  companies: CompanyProfile[];
  orders: Order[];
  jobs?: Job[];
  jobColumns?: JobColumn[];
  jobItemColumns?: JobItemColumn[];
  catalogProducts?: CatalogProduct[];
  quoteEnquiries?: QuoteEnquiry[];
  onAddCatalogProduct?: (product: CatalogProduct) => void;
  onUpdateCatalogProduct?: (product: CatalogProduct) => void;
  onDeleteCatalogProduct?: (productId: string) => void;
  onUpdateQuoteEnquiryStatus?: (enquiryId: string, status: QuoteEnquiry['status']) => void;
  onDeleteQuoteEnquiry?: (enquiryId: string) => void;
  onSaveQuoteEnquiry?: (updatedEnquiry: QuoteEnquiry) => void;
  onAddProductToCompanyCatalog?: (product: Product, companyIdentifier: string) => void;
  onAddCompany: (co: CompanyProfile) => void;
  onUpdateCompany: (co: CompanyProfile) => void;
  onDeleteCompany: (companyId: string) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onSaveJob?: (job: Job) => void;
  onUpdateJobStatus?: (jobId: string, status: JobStatus) => void;
  onDeleteJob?: (jobId: string) => void;
  onSaveJobsBatch?: (jobs: Job[]) => void;
  onSaveJobColumns?: (columns: JobColumn[]) => void;
  onSaveJobItemColumns?: (columns: JobItemColumn[]) => void;
  onCreateJobFromOrder?: (order: Order) => void;
  staff?: StaffMember[];
  payroll?: PayrollRecord[];
  attendance?: AttendanceRecord[];
  staffAccounts?: StaffAccount[];
  onSaveAttendance?: (record: AttendanceRecord) => void;
  onSaveAttendanceBatch?: (records: AttendanceRecord[]) => void;
  expenses?: ExpenseRecord[];
  recurringExpenses?: RecurringExpense[];
  expenseCategories?: ExpenseCategory[];
  onSaveStaff?: (staff: StaffMember) => void;
  onSaveStaffBatch?: (staffList: StaffMember[]) => void;
  onDeleteStaff?: (staffId: string) => void;
  onSaveStaffAccount?: (account: StaffAccount) => void;
  onDeleteStaffAccount?: (accountId: string) => void;
  onSavePayroll?: (record: PayrollRecord) => void;
  onSavePayrollBatch?: (records: PayrollRecord[]) => void;
  onDeletePayroll?: (payrollId: string) => void;
  onSaveExpense?: (expense: ExpenseRecord) => void;
  onSaveExpensesBatch?: (expensesList: ExpenseRecord[]) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onSaveRecurringExpense?: (recurring: RecurringExpense) => void;
  onSaveRecurringExpensesBatch?: (recurringList: RecurringExpense[]) => void;
  onDeleteRecurringExpense?: (recurringId: string) => void;
  onSaveExpenseCategories?: (categories: ExpenseCategory[]) => void;
  onSimulateClient: (companyId: string) => void;
  systemSettings: SystemSettings;
  onUpdateSystemSettings: (settings: SystemSettings) => void;
  appsScriptConfig: AppsScriptConfig;
  onUpdateAppsScriptConfig: (config: AppsScriptConfig) => void;
  onForceSyncAll: () => Promise<boolean>;
  onPullFromSheets?: () => Promise<void>;
  isSyncingSheets?: boolean;
  initialTab?: 'jobs' | 'clients' | 'catalog' | 'orders' | 'staff' | 'expenses' | 'analytics' | 'receipt' | 'quotes' | 'settings' | 'sync';
  initialCatalogSection?: 'catalog' | 'enquiries';
  highlightEnquiryNumber?: string;
  highlightOrderNumber?: string;
  highlightOrderId?: string;
  highlightJobId?: string;
  isMobileNavOpen?: boolean;
  onToggleMobileNav?: (open?: boolean) => void;
  onLogout?: () => void;
  currentUser?: AuthUser;
}

export default function AdminDashboard({
  products,
  companies,
  orders,
  jobs = [],
  jobColumns = [],
  jobItemColumns = [],
  catalogProducts = [],
  quoteEnquiries = [],
  onAddCatalogProduct = () => {},
  onUpdateCatalogProduct = () => {},
  onDeleteCatalogProduct = () => {},
  onUpdateQuoteEnquiryStatus = () => {},
  onDeleteQuoteEnquiry,
  onSaveQuoteEnquiry,
  onAddProductToCompanyCatalog,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onUpdateProducts,
  onUpdateOrders,
  onSaveJob,
  onUpdateJobStatus,
  onDeleteJob,
  onSaveJobsBatch,
  onSaveJobColumns,
  onSaveJobItemColumns,
  onCreateJobFromOrder,
  staff = [],
  payroll = [],
  attendance = [],
  staffAccounts = [],
  onSaveAttendance,
  onSaveAttendanceBatch,
  expenses = [],
  recurringExpenses = [],
  expenseCategories = [],
  onSaveStaff = () => {},
  onSaveStaffBatch,
  onDeleteStaff,
  onSaveStaffAccount,
  onDeleteStaffAccount,
  onSavePayroll = () => {},
  onSavePayrollBatch,
  onDeletePayroll,
  onSaveExpense = () => {},
  onSaveExpensesBatch,
  onDeleteExpense,
  onSaveRecurringExpense = () => {},
  onSaveRecurringExpensesBatch,
  onDeleteRecurringExpense,
  onSaveExpenseCategories = () => {},
  onSimulateClient,
  systemSettings,
  onUpdateSystemSettings,
  appsScriptConfig,
  onUpdateAppsScriptConfig,
  onForceSyncAll,
  onPullFromSheets,
  isSyncingSheets,
  initialTab,
  initialCatalogSection,
  highlightEnquiryNumber,
  highlightOrderNumber,
  highlightOrderId,
  highlightJobId,
  isMobileNavOpen,
  onToggleMobileNav,
  onLogout,
  currentUser
}: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'jobs' | 'clients' | 'catalog' | 'orders' | 'staff' | 'expenses' | 'analytics' | 'receipt' | 'quotes' | 'settings' | 'sync'>(initialTab || 'jobs');

  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);
  const isDrawerOpen = isMobileNavOpen !== undefined ? isMobileNavOpen : internalDrawerOpen;
  const setDrawerOpen = (open: boolean) => {
    if (onToggleMobileNav) {
      onToggleMobileNav(open);
    }
    setInternalDrawerOpen(open);
  };

  // Close drawer on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  React.useEffect(() => {
    if (initialTab) {
      setAdminTab(initialTab);
    }
  }, [initialTab]);

  React.useEffect(() => {
    if (highlightJobId) {
      setAdminTab('jobs');
    }
  }, [highlightJobId]);

  React.useEffect(() => {
    if (highlightOrderNumber || highlightOrderId) {
      setAdminTab('orders');
      const searchVal = highlightOrderNumber || highlightOrderId || '';
      setOrderSearch(searchVal);
      setFilterStatus('all');
      setFilterCompany('all');
      setFilterCategory('all');
      setFilterDate('all');
      setFilterSpecificDate('');

      const matchingOrder = orders.find(
        o =>
          (highlightOrderNumber && o.orderNumber && o.orderNumber.toLowerCase() === highlightOrderNumber.toLowerCase()) ||
          (highlightOrderId && o.id === highlightOrderId)
      );
      if (matchingOrder) {
        setSelectedOrder(matchingOrder);
      }
    }
  }, [highlightOrderNumber, highlightOrderId, orders]);

  // Admin Settings Tab state
  const isSettingsDirtyRef = React.useRef(false);
  const [adminUser, setAdminUser] = useState(() => systemSettings.adminUsername || 'admin');
  const [adminPass, setAdminPass] = useState(() => systemSettings.adminPasscode || 'admin123');
  const [hubName, setHubName] = useState(systemSettings.hubName);
  const [shortHubName, setShortHubName] = useState(systemSettings.shortHubName);
  const [orderPrefix, setOrderPrefix] = useState(systemSettings.orderPrefix);
  const [currencySymbol, setCurrencySymbol] = useState(systemSettings.currencySymbol);
  const [colorTheme, setColorTheme] = useState(systemSettings.colorTheme || 'classic_noir');
  const [adminEmail, setAdminEmail] = useState(systemSettings.adminEmail || '');
  const [appLogoUrl, setAppLogoUrl] = useState(systemSettings.logoUrl || '');
  const [appFaviconUrl, setAppFaviconUrl] = useState(systemSettings.faviconUrl || '');
  const [companyTagline, setCompanyTagline] = useState(systemSettings.companyTagline ?? '');
  const [companyAddress, setCompanyAddress] = useState(systemSettings.companyAddress ?? '');
  const [taxId, setTaxId] = useState(systemSettings.taxId ?? '');
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  const onSettingsInputChange = <T,>(setter: React.Dispatch<React.SetStateAction<T>>, val: T) => {
    isSettingsDirtyRef.current = true;
    setter(val);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccessMsg('');
    isSettingsDirtyRef.current = false;

    onUpdateSystemSettings({
      ...systemSettings,
      hubName: hubName.trim(),
      shortHubName: shortHubName.trim(),
      companyTagline: companyTagline.trim(),
      companyAddress: companyAddress.trim(),
      taxId: taxId.trim(),
      orderPrefix: orderPrefix.trim(),
      currencySymbol: currencySymbol.trim(),
      colorTheme: colorTheme,
      adminEmail: adminEmail.trim(),
      logoUrl: appLogoUrl.trim(),
      faviconUrl: appFaviconUrl.trim(),
      adminUsername: adminUser.trim(),
      adminPasscode: adminPass.trim()
    });

    setSettingsSuccessMsg('Settings updated successfully!');
    setTimeout(() => setSettingsSuccessMsg(''), 4000);
  };

  React.useEffect(() => {
    if (!isSettingsDirtyRef.current) {
      setHubName(systemSettings.hubName);
      setShortHubName(systemSettings.shortHubName);
      setOrderPrefix(systemSettings.orderPrefix);
      setCurrencySymbol(systemSettings.currencySymbol);
      if (systemSettings.colorTheme) {
        setColorTheme(systemSettings.colorTheme);
      }
      setAdminEmail(systemSettings.adminEmail || '');
      setAppLogoUrl(systemSettings.logoUrl || '');
      setAppFaviconUrl(systemSettings.faviconUrl || '');
      setCompanyTagline(systemSettings.companyTagline ?? '');
      setCompanyAddress(systemSettings.companyAddress ?? '');
      setTaxId(systemSettings.taxId ?? '');
      if (systemSettings.adminUsername) {
        setAdminUser(systemSettings.adminUsername);
      }
      if (systemSettings.adminPasscode) {
        setAdminPass(systemSettings.adminPasscode);
      }
    }
  }, [systemSettings]);
  
  // Search & Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Orders Tab filters
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterSpecificDate, setFilterSpecificDate] = useState<string>('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [orderSort, setOrderSort] = useState<'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'az' | 'za'>('newest');

  // Selected Dashboard Company state
  const [selectedDashboardCompany, setSelectedDashboardCompany] = useState<CompanyProfile | null>(null);

  // Selected Order for detail view modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [confirmDeleteCompanyId, setConfirmDeleteCompanyId] = useState<string | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);

  const currentCompany = React.useMemo(() => {
    if (!selectedDashboardCompany) return null;
    return companies.find(c => c.id === selectedDashboardCompany.id) || selectedDashboardCompany;
  }, [companies, selectedDashboardCompany]);

  // ----------------------------------------------------
  // CLIENT MANAGEMENT FORM
  // ----------------------------------------------------
  const [editingClient, setEditingClient] = useState<CompanyProfile | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [hasManuallyEditedUsername, setHasManuallyEditedUsername] = useState(false);
  const [hasManuallyEditedPasscode, setHasManuallyEditedPasscode] = useState(false);
  const [clientForm, setClientForm] = useState<Omit<CompanyProfile, 'id'>>({
    name: '',
    username: '',
    passcode: '',
    deliveryAddress: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    poRequired: false,
    enabledProductIds: []
  });

  const handleOpenNewClient = () => {
    setEditingClient(null);
    setHasManuallyEditedUsername(false);
    setHasManuallyEditedPasscode(false);
    setClientForm({
      name: '',
      username: '',
      passcode: '',
      deliveryAddress: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      poRequired: false,
      enabledProductIds: [] // New company starts with empty catalog
    });
    setShowClientForm(true);
  };

  const handleOpenEditClient = (co: CompanyProfile) => {
    setEditingClient(co);
    setHasManuallyEditedUsername(true);
    setHasManuallyEditedPasscode(true);
    setClientForm({
      name: co.name,
      logoUrl: co.logoUrl || '',
      username: co.username || '',
      passcode: co.passcode || '',
      deliveryAddress: co.deliveryAddress,
      contactPerson: co.contactPerson,
      contactEmail: co.contactEmail,
      contactPhone: co.contactPhone,
      poRequired: co.poRequired,
      enabledProductIds: co.enabledProductIds || []
    });
    setShowClientForm(true);
  };

  const handleNameChange = (nameVal: string) => {
    let nextUsername = clientForm.username;
    let nextPasscode = clientForm.passcode;

    if (!editingClient) {
      // Slugify name: lowercased, keep only alphanumeric characters
      const slug = nameVal.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (slug) {
        if (!hasManuallyEditedUsername) {
          nextUsername = slug;
        }
        if (!hasManuallyEditedPasscode) {
          // simple passcode derived from the prefix of slug and 2026
          const prefix = slug.substring(0, 4);
          nextPasscode = `${prefix}2026`;
        }
      } else {
        if (!hasManuallyEditedUsername) {
          nextUsername = '';
        }
        if (!hasManuallyEditedPasscode) {
          nextPasscode = '';
        }
      }
    }

    setClientForm(prev => ({
      ...prev,
      name: nameVal,
      username: nextUsername,
      passcode: nextPasscode
    }));
  };

  const handleSaveClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.username || !clientForm.passcode) {
      alert('Please fill in Name, Username, and Passcode.');
      return;
    }

    if (editingClient) {
      onUpdateCompany({
        ...editingClient,
        ...clientForm,
        username: clientForm.username.trim().toLowerCase(),
        enabledProductIds: clientForm.enabledProductIds
      });
    } else {
      onAddCompany({
        id: `co-${Date.now()}`,
        name: clientForm.name,
        logoUrl: clientForm.logoUrl || '',
        deliveryAddress: clientForm.deliveryAddress || 'Standard Office St, CA 94000',
        contactPerson: clientForm.contactPerson || 'Manager Representative',
        contactEmail: clientForm.contactEmail || 'office@client.com',
        contactPhone: clientForm.contactPhone || '+1 555-000-0000',
        poRequired: clientForm.poRequired,
        username: clientForm.username.trim().toLowerCase(),
        passcode: clientForm.passcode,
        enabledProductIds: clientForm.enabledProductIds
      });
    }
    setShowClientForm(false);
    setEditingClient(null);
  };

  // ----------------------------------------------------
  // PRODUCT MANAGEMENT FORM
  // ----------------------------------------------------
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState<Omit<Product, 'id'>>({
    name: '',
    category: 'Uniforms',
    description: '',
    imageUrl: '',
    basePrice: 10.00,
    originalPrice: 20.00,
    shippingFee: 0.00,
    leadTime: '5-7 Business Days',
    minQuantity: 10,
    unit: 'pcs',
    saleCount: 5,
    saleLimit: 10,
    frequentlyOrdered: false
  });

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: 'Uniforms',
      description: '',
      imageUrl: '',
      basePrice: 12.00,
      originalPrice: 25.00,
      shippingFee: 0.00,
      leadTime: '5-7 Business Days',
      minQuantity: 10,
      unit: 'pcs',
      saleCount: 5,
      saleLimit: 10,
      frequentlyOrdered: false
    });
    setShowProductForm(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      category: prod.category,
      description: prod.description,
      imageUrl: prod.imageUrl,
      basePrice: prod.basePrice,
      originalPrice: prod.originalPrice || prod.basePrice * 1.8,
      shippingFee: prod.shippingFee || 0.00,
      leadTime: prod.leadTime || '5-7 Business Days',
      minQuantity: prod.minQuantity,
      unit: prod.unit,
      saleCount: prod.saleCount || 5,
      saleLimit: prod.saleLimit || 10,
      frequentlyOrdered: !!prod.frequentlyOrdered
    });
    setShowProductForm(true);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.imageUrl) {
      alert('Please fill in Product Name and Image URL / Symbol.');
      return;
    }

    let updatedProducts = [...products];

    if (editingProduct) {
      updatedProducts = products.map(p =>
        p.id === editingProduct.id
          ? { ...editingProduct, ...productForm }
          : p
      );
    } else {
      const newProd: Product = {
        ...productForm,
        id: `prod-${Date.now()}`
      };
      updatedProducts.push(newProd);

      // Automatically enable this new product for all existing companies too
      companies.forEach(co => {
        const ids = co.enabledProductIds ? [...co.enabledProductIds, newProd.id] : [newProd.id];
        onUpdateCompany({ ...co, enabledProductIds: ids });
      });
    }

    onUpdateProducts(updatedProducts);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter(p => p.id !== productId);
    onUpdateProducts(updated);

    // Clean up company lists
    companies.forEach(co => {
      if (co.enabledProductIds) {
        const filtered = co.enabledProductIds.filter(id => id !== productId);
        onUpdateCompany({ ...co, enabledProductIds: filtered });
      }
    });
  };

  // ----------------------------------------------------
  // ALLOCATION MANAGEMENT
  // ----------------------------------------------------
  const [selectedAllocCompanyId, setSelectedAllocCompanyId] = useState<string>(
    companies[0]?.id || ''
  );

  const selectedAllocCompany = companies.find(c => c.id === selectedAllocCompanyId);

  const handleToggleProductAllocation = (productId: string) => {
    if (!selectedAllocCompany) return;

    let currentList = selectedAllocCompany.enabledProductIds || [];
    if (currentList.includes(productId)) {
      currentList = currentList.filter(id => id !== productId);
    } else {
      currentList = [...currentList, productId];
    }

    onUpdateCompany({
      ...selectedAllocCompany,
      enabledProductIds: currentList
    });
  };

  const handleToggleAllAllocation = (enableAll: boolean) => {
    if (!selectedAllocCompany) return;

    onUpdateCompany({
      ...selectedAllocCompany,
      enabledProductIds: enableAll ? products.map(p => p.id) : []
    });
  };

  // ----------------------------------------------------
  // ORDER TRACKING STATUS UPDATER
  // ----------------------------------------------------
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    const updated = orders.map(ord =>
      ord.id === orderId ? { ...ord, status } : ord
    );
    onUpdateOrders(updated);
  };

  // Helper to identify whether an order is from a Customer Storefront / Portal
  const isStorefrontOrder = (order: Order): boolean => {
    if (!order) return false;
    if (order.portalId && order.portalId.trim() !== '') return true;
    if (order.portalName && order.portalName.trim() !== '') return true;
    if (order.id && order.id.startsWith('ord-portal-')) return true;
    if (order.orderNumber && order.orderNumber.toLowerCase().includes('portal')) return true;
    if ((order as any).storefrontId || (order as any).storefrontName) return true;
    if ((order as any).source === 'Custom Storefront' || (order as any).source === 'Order Portal' || (order as any).source === 'Storefront' || (order as any).source === 'Portal') return true;
    if ((order as any).sourceType === 'Storefront' || (order as any).sourceType === 'Order Portal' || (order as any).sourceType === 'Portal') return true;
    if (order.status === 'Pending Approval') return true;
    return false;
  };

  // Exclude custom company storefront portal orders from ARH Admin default order views & analytics
  const directCompanyOrders = React.useMemo(() => {
    return orders.filter(o => !isStorefrontOrder(o));
  }, [orders]);

  const filteredOrders = React.useMemo(() => {
    const list = directCompanyOrders.filter((ord) => {
      // Search matching
      const matchesSearch = 
        ord.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        ord.companyName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        ord.status.toLowerCase().includes(orderSearch.toLowerCase());
      
      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus !== 'all' && ord.status !== filterStatus) {
        return false;
      }

      // Company filter
      if (filterCompany !== 'all' && ord.companyName.toLowerCase() !== filterCompany.toLowerCase()) {
        return false;
      }

      // Category / Item Type filter
      if (filterCategory !== 'all') {
        const hasCategory = ord.items.some(it => {
          const matchProd = products.find(p => p.id === it.productId || p.name.toLowerCase() === it.productName.toLowerCase());
          return matchProd?.category?.toLowerCase() === filterCategory.toLowerCase();
        });
        if (!hasCategory) return false;
      }

      // Date quick filter
      const orderDate = new Date(ord.createdAt);
      const orderTime = orderDate.getTime();
      
      if (filterDate === 'today') {
        const today = new Date();
        if (orderDate.toDateString() !== today.toDateString()) return false;
      } else if (filterDate === 'week') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (orderTime < sevenDaysAgo) return false;
      } else if (filterDate === 'month') {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (orderTime < thirtyDaysAgo) return false;
      }

      // Specific Date filter
      if (filterSpecificDate) {
        const ordDateStr = orderDate.toISOString().split('T')[0];
        if (ordDateStr !== filterSpecificDate) return false;
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
        return (a.companyName || '').localeCompare(b.companyName || '') || (a.orderNumber || '').localeCompare(b.orderNumber || '');
      }
      if (orderSort === 'za') {
        return (b.companyName || '').localeCompare(a.companyName || '') || (b.orderNumber || '').localeCompare(a.orderNumber || '');
      }
      // Default: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [directCompanyOrders, orderSearch, filterStatus, filterCompany, filterCategory, filterDate, filterSpecificDate, products, orderSort]);

  const filteredCompanies = companies.filter(
    (co) =>
      co.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (co.username || '').toLowerCase().includes(clientSearch.toLowerCase())
  );

  const filteredProductsMaster = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const navItems = [
    { id: 'jobs', label: 'Job Management', icon: Kanban, count: jobs.length },
    { id: 'clients', label: 'Client Accounts', icon: Users, count: companies.length },
    { id: 'catalog', label: 'ARH Products', icon: Layers, count: catalogProducts.length },
    { id: 'orders', label: 'Orders', icon: ClipboardList, count: directCompanyOrders.length },
    { id: 'staff', label: 'Staff Management', icon: Users, count: (staff || []).length },
    { id: 'expenses', label: 'Expenses & Outflow', icon: Receipt, count: (expenses || []).length },
    { id: 'analytics', label: 'Financial & Sales Analytics', icon: BarChart3, count: null },
    { id: 'receipt', label: 'Receipt Generator', icon: Receipt, count: null },
    { id: 'quotes', label: 'Quote Builder', icon: Calculator, count: null },
    { id: 'settings', label: 'Admin Settings', icon: Settings, count: null },
    { id: 'sync', label: 'Google Sheet Sync', icon: FileSpreadsheet, count: null }
  ];

  return (
    <div className="w-full relative animate-fade-in" id="admin-workspace-layout">
      {/* 1. Slide-in Navigation Drawer & Backdrop (All Screen Sizes) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex" id="admin-nav-drawer-root">
            {/* Dimmed Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-in Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-80 max-w-[85vw] bg-white border-r-2 border-black h-full flex flex-col p-5 shadow-2xl z-10 justify-between overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Admin Navigation Menu"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-black text-white p-2 rounded-xl font-mono font-bold text-xs flex items-center justify-center">
                      ARH
                    </div>
                    <div>
                      <span className="text-xs font-extrabold uppercase text-black block leading-none">Admin Menu</span>
                      <span className="text-[10px] font-mono text-gray-400">Navigation Hub</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center border border-gray-200"
                    aria-label="Close navigation menu"
                    id="close-admin-nav-drawer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Nav Items */}
                <nav className="space-y-2" role="navigation" aria-label="Admin Navigation Sections">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = adminTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setAdminTab(item.id as any);
                          setShowClientForm(false);
                          setShowProductForm(false);
                          setDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-sans text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] cursor-pointer ${
                          isActive
                            ? 'bg-black text-white shadow-xs'
                            : 'text-gray-700 hover:text-black hover:bg-gray-100'
                        }`}
                        aria-current={isActive ? 'page' : undefined}
                        id={`admin-nav-item-${item.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.count !== null && (
                          <span
                            className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isActive
                                ? 'bg-white/20 text-white border-white/20'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Drawer Bottom Section with Sign Out & Footer */}
              <div className="pt-4 border-t border-gray-200 mt-auto space-y-3">
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 border border-black font-sans text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer shadow-xs active:scale-98"
                    id="admin-sidebar-signout-btn"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                )}
                <div className="text-center font-mono text-[10px] text-gray-400">
                  {systemSettings?.hubName || 'ARH Print Hub'} Admin v2.0
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Main Stage Content Area */}
      <div className="w-full space-y-8 transition-all duration-300" id="admin-main-stage">
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* JOB MANAGEMENT / PRODUCTION BOARD PANEL */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {adminTab === 'jobs' && (
        <JobManagementBoard
          jobs={jobs}
          jobColumns={jobColumns}
          jobItemColumns={jobItemColumns}
          companies={companies}
          orders={orders}
          onSaveJob={onSaveJob || (() => {})}
          onUpdateJobStatus={onUpdateJobStatus || (() => {})}
          onDeleteJob={onDeleteJob || (() => {})}
          onSaveJobsBatch={onSaveJobsBatch}
          onSaveJobColumns={onSaveJobColumns}
          onSaveJobItemColumns={onSaveJobItemColumns}
          onSelectOrder={(ord) => {
            setAdminTab('orders');
            setSelectedOrder(ord);
          }}
          currencySymbol={currencySymbol}
          highlightJobId={highlightJobId}
          currentUser={currentUser}
          appsScriptUrl={appsScriptConfig?.isConnected ? appsScriptConfig?.webAppUrl : undefined}
        />
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* PRODUCT CATALOG PANEL */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {adminTab === 'catalog' && (
        <AdminProductCatalog
          products={catalogProducts}
          quoteEnquiries={quoteEnquiries}
          onAddProduct={onAddCatalogProduct}
          onUpdateProduct={onUpdateCatalogProduct}
          onDeleteProduct={onDeleteCatalogProduct}
          onUpdateQuoteEnquiryStatus={onUpdateQuoteEnquiryStatus}
          onDeleteQuoteEnquiry={onDeleteQuoteEnquiry}
          onSaveQuoteEnquiry={onSaveQuoteEnquiry}
          onAddProductToCompanyCatalog={onAddProductToCompanyCatalog}
          currencySymbol={currencySymbol}
          initialSection={initialCatalogSection}
          highlightEnquiryNumber={highlightEnquiryNumber}
          hubName={hubName}
          appLogoUrl={appLogoUrl}
          adminEmail={adminEmail}
          companyTagline={companyTagline}
          companyAddress={companyAddress}
          taxId={taxId}
        />
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* CLIENTS ACCOUNTS PANEL */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {adminTab === 'clients' && (
        <div className="space-y-6">
          {showClientForm ? (
            <form onSubmit={handleSaveClientSubmit} className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-md space-y-6 max-w-2xl animate-slide-up">
              <h3 className="font-extrabold uppercase text-base text-black pb-3 border-b border-gray-100">
                {editingClient ? `Edit ${editingClient.name} Portal Profile` : 'Setup New B2B Client Profile'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Paramount Pictures Inc"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-semibold text-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Company Logo</label>
                  <input
                    type="text"
                    value={clientForm.logoUrl}
                    onChange={(e) => setClientForm({ ...clientForm, logoUrl: e.target.value })}
                    placeholder="https://... or attach a local file"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none text-black font-mono"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <label className="cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono uppercase font-bold tracking-wider inline-flex items-center gap-1.5 transition-colors shrink-0">
                      <Paperclip className="w-3 h-3" />
                      <span>Attach Logo File</span>
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
                              setClientForm({ ...clientForm, logoUrl: base64String });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[9px] text-gray-500 font-mono truncate">
                      Convert PNG/JPG to offline-friendly logo.
                    </span>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2 bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-neutral-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-800">B2B Portal Authentication Settings</p>
                    <p className="text-[10px] text-neutral-500 font-mono leading-relaxed">
                      Login username and passcode are automatically generated in real-time as you type the Company Name. You can manually adjust them below if needed.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Username *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.username}
                    onChange={(e) => {
                      setHasManuallyEditedUsername(true);
                      setClientForm({ ...clientForm, username: e.target.value });
                    }}
                    placeholder="e.g. paramount"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Passcode *</label>
                  <input
                    type="text"
                    required
                    value={clientForm.passcode}
                    onChange={(e) => {
                      setHasManuallyEditedPasscode(true);
                      setClientForm({ ...clientForm, passcode: e.target.value });
                    }}
                    placeholder="e.g. para991"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-bold text-black font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    value={clientForm.contactPerson}
                    onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                    placeholder="e.g. Michael Bay"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-semibold text-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Email</label>
                  <input
                    type="email"
                    value={clientForm.contactEmail}
                    onChange={(e) => setClientForm({ ...clientForm, contactEmail: e.target.value })}
                    placeholder="bay@paramount.com"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-semibold text-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={clientForm.contactPhone}
                    onChange={(e) => setClientForm({ ...clientForm, contactPhone: e.target.value })}
                    placeholder="+1 (555) 300-1122"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono tracking-wider font-bold text-gray-700">Address</label>
                  <textarea
                    rows={2}
                    value={clientForm.deliveryAddress}
                    onChange={(e) => setClientForm({ ...clientForm, deliveryAddress: e.target.value })}
                    placeholder="Building 4, Hollywood Blvd, Los Angeles, CA 90028"
                    className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl p-3 text-xs focus:outline-none font-semibold text-black resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <input
                  type="checkbox"
                  id="form-po-req"
                  checked={clientForm.poRequired}
                  onChange={(e) => setClientForm({ ...clientForm, poRequired: e.target.checked })}
                  className="w-4 h-4 cursor-pointer accent-black"
                />
                <label htmlFor="form-po-req" className="text-xs text-gray-800 font-mono font-bold select-none cursor-pointer">
                  Require B2B Billing Purchase Order (PO) Number to checkout
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowClientForm(false)}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-500 rounded-xl text-xs uppercase font-bold tracking-wider hover:text-black hover:border-black transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black border border-black text-white rounded-xl text-xs uppercase font-extrabold tracking-wider hover:bg-white hover:text-black transition-all cursor-pointer shadow-md"
                >
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Toolbar: Search & Create Client Account */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex items-center w-full sm:max-w-sm">
                  <Search className="absolute left-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search client accounts..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-2.5 text-xs text-black focus:border-black focus:outline-none"
                    id="admin-client-search"
                  />
                </div>

                <button
                  onClick={handleOpenNewClient}
                  className="bg-black text-white px-4 py-2.5 rounded-xl text-xs uppercase font-extrabold tracking-wider border border-black hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0"
                  id="admin-new-client-btn"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Client Account</span>
                </button>
              </div>

              {/* Profiles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((co) => (
                  <div
                    key={co.id}
                    onClick={() => setSelectedDashboardCompany(co)}
                    className="bg-white border border-gray-200 rounded-3xl p-5 hover:border-black hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer hover:scale-[1.01] shadow-xs hover:shadow-sm group relative"
                    id={`client-card-${co.id}`}
                  >
                    <div className="space-y-3">
                      {/* Logo header */}
                      <div className="flex items-start justify-between">
                        {co.logoUrl ? (
                          <img
                            src={co.logoUrl}
                            alt={co.name}
                            className="w-12 h-12 object-contain shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-400 uppercase font-mono text-lg shrink-0">
                            {co.name.substring(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-sm uppercase text-black leading-tight tracking-tight group-hover:underline">
                            {co.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 group-hover:text-black font-mono font-bold transition-colors flex items-center gap-1 shrink-0 ml-2">
                            Open <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-black transition-colors" />
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 block font-bold uppercase">
                          Contact: {co.contactPerson}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-gray-600 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 space-y-1">
                        <p><span className="text-gray-400">Email:</span> {co.contactEmail}</p>
                        <p><span className="text-gray-400">Phone:</span> {co.contactPhone}</p>
                        <p className="line-clamp-1"><span className="text-gray-400">Deliver to:</span> {co.deliveryAddress}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-wider text-gray-400 font-mono leading-none">
                          PO Obligation
                        </span>
                        <span className="text-[10px] font-bold text-black font-mono mt-0.5">
                          {co.poRequired ? '⚠️ Mandatory PO' : 'Optional PO'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDashboardCompany(co);
                          }}
                          className="px-2.5 py-1.5 bg-black border border-black hover:bg-white text-white hover:text-black rounded-lg transition-all text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center gap-1 shadow-xs hover:shadow-sm"
                          title="Open Client Dashboard"
                          id={`open-client-dash-btn-${co.id}`}
                        >
                          <Building className="w-3 h-3" />
                          <span>Dashboard</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditClient(co);
                          }}
                          className="p-2 border border-gray-200 hover:border-black text-gray-600 hover:text-black rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                          title="Edit Profile"
                          id={`edit-client-btn-${co.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {confirmDeleteCompanyId === co.id ? (
                          <div className="flex items-center gap-1.5 animate-fade-in shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCompany(co.id);
                                setConfirmDeleteCompanyId(null);
                              }}
                              className="px-2.5 py-1.5 bg-red-600 border border-red-600 hover:bg-red-700 text-white text-[10px] font-sans font-bold uppercase rounded-lg transition-all cursor-pointer"
                              id={`confirm-delete-btn-${co.id}`}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteCompanyId(null);
                              }}
                              className="px-2.5 py-1.5 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 text-[10px] font-sans font-bold uppercase rounded-lg transition-all cursor-pointer"
                              id={`cancel-delete-btn-${co.id}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteCompanyId(co.id);
                            }}
                            className="p-2 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                            title="Delete Company"
                            id={`delete-client-btn-${co.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* MASTER ORDERS DISPATCH (BOARDS VIEW) */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {adminTab === 'orders' && (
        <div className="space-y-6">
          
          {/* Order stream search & Filters layout */}
          <div className="flex flex-col gap-4">
            <div className="relative flex items-center max-w-sm">
              <Search className="absolute left-3.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search master order stream..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-2 text-xs text-black focus:border-black focus:outline-none"
                id="admin-order-search"
              />
            </div>

            {/* Advanced Filters panel */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 font-mono flex items-center gap-1.5 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-black" />
                  Advanced Filters
                </span>
                {/* Reset button */}
                {(filterDate !== 'all' || filterSpecificDate !== '' || filterCompany !== 'all' || filterCategory !== 'all' || filterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterDate('all');
                      setFilterSpecificDate('');
                      setFilterCompany('all');
                      setFilterCategory('all');
                      setFilterStatus('all');
                    }}
                    className="text-[10px] font-mono text-red-500 hover:text-red-700 font-bold self-end sm:self-auto cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {/* Order Sorting Dropdown */}
                <div className="space-y-1 sm:col-span-1 lg:col-span-1">
                  <label className="block text-[9px] uppercase font-mono font-extrabold text-black flex items-center gap-1">
                    <span>Sort By</span>
                  </label>
                  <select
                    value={orderSort}
                    onChange={(e) => setOrderSort(e.target.value as any)}
                    className="w-full bg-white border-2 border-black focus:ring-2 focus:ring-black rounded-lg px-2.5 py-1.5 text-xs font-bold text-black focus:outline-none shadow-2xs"
                    id="admin-order-sort-select"
                  >
                    <option value="newest">Newer - Older</option>
                    <option value="oldest">Older - Newer</option>
                    <option value="amount_high">Price: High to Low</option>
                    <option value="amount_low">Price: Low to High</option>
                    <option value="az">Company/Order #: A - Z</option>
                    <option value="za">Company/Order #: Z - A</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Date Range</label>
                  <div className="flex gap-1.5">
                    <select
                      value={filterDate}
                      onChange={(e) => {
                        setFilterDate(e.target.value);
                        if (e.target.value !== 'all') setFilterSpecificDate('');
                      }}
                      className="w-1/2 bg-white border border-gray-200 focus:border-black rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black focus:outline-none"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                    </select>
                    <input
                      type="date"
                      value={filterSpecificDate}
                      onChange={(e) => {
                        setFilterSpecificDate(e.target.value);
                        setFilterDate('all');
                      }}
                      className="w-1/2 bg-white border border-gray-200 focus:border-black rounded-lg px-2 py-1 text-xs font-semibold text-black focus:outline-none"
                      title="Choose a specific date"
                    />
                  </div>
                </div>

                {/* Company Filter */}
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Company</label>
                  <select
                    value={filterCompany}
                    onChange={(e) => setFilterCompany(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black focus:outline-none"
                  >
                    <option value="all">All Companies</option>
                    {Array.from(new Set(orders.map(o => o.companyName))).map((coName) => (
                      <option key={coName} value={coName}>{coName}</option>
                    ))}
                  </select>
                </div>

                {/* Item Type / Category Filter */}
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Item Type</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black focus:outline-none"
                  >
                    <option value="all">All Item Types</option>
                    {Array.from(new Set(products.map(p => p.category))).filter(Boolean).map((catName) => (
                      <option key={catName} value={catName}>{catName}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending Approval">Portal Review (Pending)</option>
                    <option value="Pending">Pending (Admin)</option>
                    <option value="Approved">Approved</option>
                    <option value="In Production">In Production</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Completed">Completed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Kanban boards wrapper */}
          <div className="flex flex-col xl:flex-row gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-200 select-none items-start">
            {[
              { id: 'Pending Approval', label: 'Portal Review', bg: 'bg-amber-50/40', text: 'text-amber-800', border: 'border-amber-200', badge: 'bg-amber-200 text-amber-900 font-extrabold' },
              { id: 'Pending', label: 'Pending (Admin)', bg: 'bg-neutral-50', text: 'text-gray-500', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' },
              { id: 'Approved', label: 'Approved', bg: 'bg-purple-50/40', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
              { id: 'In Production', label: 'In Production', bg: 'bg-amber-50/40', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
              { id: 'Shipped', label: 'Shipped', bg: 'bg-blue-50/40', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
              { id: 'Completed', label: 'Completed', bg: 'bg-green-50/40', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
              { id: 'Canceled', label: 'Canceled', bg: 'bg-red-50/40', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }
            ].map((col) => {
              // Filter orders specifically for this board status and search criteria
              const boardOrders = filteredOrders.filter(o => o.status === col.id);

              return (
                <div 
                  key={col.id} 
                  className={`flex-1 min-w-[280px] w-full xl:w-auto bg-white border border-gray-200 rounded-[24px] p-4 flex flex-col space-y-4`}
                  id={`board-column-${col.id.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        col.id === 'Completed' ? 'bg-green-500' :
                        col.id === 'Shipped' ? 'bg-blue-500' :
                        col.id === 'In Production' ? 'bg-amber-500' :
                        col.id === 'Approved' ? 'bg-purple-500' :
                        'bg-gray-400'
                      }`} />
                      <h4 className="font-extrabold uppercase font-mono text-xs text-black tracking-tight">
                        {col.label}
                      </h4>
                    </div>
                    <span className={`${col.badge} font-mono text-[9px] px-2 py-0.5 rounded-full font-bold border border-current/10`}>
                      {boardOrders.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="space-y-3 min-h-[150px] xl:max-h-[650px] overflow-y-auto pr-1 pb-4">
                    {boardOrders.length === 0 ? (
                      <div className="border border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400 font-mono text-[10px] bg-gray-50/30 flex items-center justify-center min-h-[100px]">
                        No orders in {col.label}
                      </div>
                    ) : (
                      boardOrders.map((ord) => (
                        <div
                          key={ord.id}
                          onClick={() => setSelectedOrder(ord)}
                          className="bg-white border border-gray-200 hover:border-black rounded-2xl p-4 shadow-xs hover:shadow-md cursor-pointer transition-all space-y-3 relative group"
                          id={`board-order-card-${ord.id}`}
                        >
                          {/* Card Header: Order Number and Date */}
                          <div className="flex items-center justify-between font-mono text-[9px] text-gray-400">
                            <span className="font-extrabold text-black">{ord.orderNumber}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(ord);
                                  setTimeout(() => window.print(), 100);
                                }}
                                className="no-print inline-flex items-center gap-1 bg-gray-100 hover:bg-black hover:text-white text-gray-700 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer"
                                title="Print or save PDF of this order"
                                id={`btn-print-order-card-${ord.id}`}
                              >
                                <Printer className="w-2.5 h-2.5" />
                                <span>Print</span>
                              </button>
                              <span>{new Date(ord.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Client Information */}
                          <div>
                            <h5 className="font-extrabold text-xs text-black uppercase tracking-tight">
                              {ord.companyName}
                            </h5>
                            <div className="text-[10px] text-gray-600 font-mono mt-1 space-y-1">
                              {/* 1. Customer Name */}
                              <div className="flex items-center gap-1 font-semibold text-neutral-900">
                                <span className="text-gray-400">Customer:</span>
                                <strong className="text-black font-extrabold">{getDisplayPurchaserName(ord)}</strong>
                              </div>

                              {/* 2. Delivery Address */}
                              <div className="text-gray-700 font-sans text-[10px] leading-snug flex items-start gap-1 bg-gray-50 p-1.5 rounded-md border border-gray-100">
                                <MapPin className="w-3 h-3 text-gray-500 shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <span className="font-bold text-black font-mono text-[9px] block">Address:</span>
                                  <span className="break-words">{ord.deliveryAddress || 'No address specified'}</span>
                                </div>
                              </div>

                              {/* 3. Facebook Messenger Link */}
                              {ord.fbMessengerLink ? (
                                <a
                                  href={ord.fbMessengerLink.startsWith('http') ? ord.fbMessengerLink : `https://${ord.fbMessengerLink}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer"
                                >
                                  <span>💬 FB Messenger Link</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                </a>
                              ) : (
                                <div className="text-gray-400 text-[9px]">FB Messenger: Not provided</div>
                              )}

                              {/* Email & Phone */}
                              <div className="flex flex-wrap gap-x-2 text-gray-500 text-[9px]">
                                {ord.contactNumber && <span className="font-bold text-gray-700">📞 {ord.contactNumber}</span>}
                                {ord.contactEmail && <span className="underline">{ord.contactEmail}</span>}
                              </div>

                              {/* 4. Notes */}
                              {ord.notes && (
                                <div className="mt-1 bg-amber-50 border border-amber-200 rounded p-1.5 text-[9px] font-mono text-amber-900 leading-tight">
                                  <span className="font-bold block uppercase text-[8px] text-amber-700">Notes:</span>
                                  <span className="italic">"{ord.notes}"</span>
                                </div>
                              )}
                            </div>
                            {ord.status === 'Pending Approval' && (
                              <div className="mt-1.5 bg-amber-50 border border-amber-200 rounded p-1.5 text-[9px] font-mono font-bold text-amber-900 leading-tight">
                                ⏳ Awaiting company confirmation before production
                              </div>
                            )}
                          </div>

                          {/* Linked Production Job indicator */}
                          {(() => {
                            const linkedJob = jobs.find(j => j.orderId === ord.id || (j.orderNumber && ord.orderNumber && j.orderNumber === ord.orderNumber));
                            if (linkedJob) {
                              return (
                                <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-[9px] font-mono">
                                  <span className="text-gray-500 font-bold">
                                    Job: <strong className="text-black">{linkedJob.id}</strong>
                                    <span className="ml-1 text-[8px] px-1 py-0.2 rounded bg-neutral-200 text-neutral-800">{linkedJob.status}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAdminTab('jobs');
                                    }}
                                    className="text-black font-extrabold hover:underline inline-flex items-center gap-0.5 cursor-pointer text-[9px]"
                                    title="View this job in Job Management Board"
                                  >
                                    <span>View Job</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center justify-between bg-gray-50/70 border border-dashed border-gray-200 rounded-lg px-2 py-1 text-[9px] font-mono">
                                <span className="text-gray-400">No Job Created</span>
                                {onCreateJobFromOrder && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onCreateJobFromOrder(ord);
                                    }}
                                    className="bg-black hover:bg-neutral-800 text-white font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider cursor-pointer"
                                    title="Create Production Job from this Order"
                                  >
                                    + Create Job
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* Order items count & Billing total */}
                          <div className="flex justify-between items-center border-t border-dashed border-gray-100 pt-2 text-xs font-mono">
                            <span className="text-[9px] text-gray-400 font-bold">{ord.items.length} line-item(s)</span>
                            <span className="font-extrabold text-black">Php {(Number(ord.totalAmount) || 0).toFixed(2)}</span>
                          </div>

                          {/* Pipeline status trigger controls */}
                          <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                            {[
                              { label: 'Pend', val: 'Pending', color: 'bg-white hover:bg-neutral-100 text-gray-500' },
                              { label: 'Appr', val: 'Approved', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
                              { label: 'Prod', val: 'In Production', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
                              { label: 'Ship', val: 'Shipped', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
                              { label: 'Done', val: 'Completed', color: 'bg-green-50 hover:bg-green-100 text-green-700' }
                            ].map((st) => (
                              <button
                                key={st.val}
                                onClick={() => handleUpdateOrderStatus(ord.id, st.val as any)}
                                className={`px-1.5 py-0.5 rounded border font-mono text-[8px] font-bold cursor-pointer transition-all ${
                                  ord.status === st.val
                                    ? 'ring-1 ring-black border-black font-extrabold bg-black text-white'
                                    : `${st.color} border-gray-200`
                                }`}
                                id={`board-status-${ord.id}-${st.val.toLowerCase()}`}
                                title={`Move to ${st.val}`}
                              >
                                {st.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* STAFF MANAGEMENT & PAYROLL PANEL */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {adminTab === 'staff' && (
        <StaffManagement
          staff={staff}
          payroll={payroll}
          attendance={attendance}
          staffAccounts={staffAccounts}
          onSaveStaff={onSaveStaff}
          onSaveStaffBatch={onSaveStaffBatch}
          onDeleteStaff={onDeleteStaff}
          onSaveStaffAccount={onSaveStaffAccount}
          onDeleteStaffAccount={onDeleteStaffAccount}
          onSavePayroll={onSavePayroll}
          onSavePayrollBatch={onSavePayrollBatch}
          onDeletePayroll={onDeletePayroll}
          onSaveAttendance={onSaveAttendance}
          onSaveAttendanceBatch={onSaveAttendanceBatch}
          systemSettings={systemSettings}
          currencySymbol={currencySymbol}
          currentAdminName={currentUser?.username || 'Administrator'}
        />
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* EXPENSES & OUTFLOW PANEL */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {adminTab === 'expenses' && (
        <ExpensesManagement
          expenses={expenses}
          expenseCategories={expenseCategories}
          recurringExpenses={recurringExpenses}
          onSaveExpense={onSaveExpense}
          onSaveExpensesBatch={onSaveExpensesBatch}
          onDeleteExpense={onDeleteExpense}
          onSaveRecurringExpense={onSaveRecurringExpense}
          onSaveRecurringExpensesBatch={onSaveRecurringExpensesBatch}
          onDeleteRecurringExpense={onDeleteRecurringExpense}
          onSaveExpenseCategories={onSaveExpenseCategories}
          systemSettings={systemSettings}
          currencySymbol={currencySymbol}
        />
      )}

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* COMPREHENSIVE FINANCIAL & SALES ANALYTICS DASHBOARD */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {adminTab === 'analytics' && (
        <AnalyticsDashboard
          orders={directCompanyOrders}
          companies={companies}
          products={products}
          jobs={jobs}
          jobItemColumns={jobItemColumns}
          staff={staff}
          payroll={payroll}
          expenses={expenses}
          recurringExpenses={recurringExpenses}
          expenseCategories={expenseCategories}
          systemSettings={systemSettings}
          currencySymbol={currencySymbol}
        />
      )}

      {adminTab === 'settings' && (
        <div className="max-w-4xl mx-auto animate-fade-in space-y-8" id="admin-settings-tab">
          {/* Progressive Web App (PWA) & Mobile App Icon Branding Settings */}
          <AdminAppBranding
            systemSettings={systemSettings}
            onUpdateSystemSettings={onUpdateSystemSettings}
            onForceSyncAll={onForceSyncAll}
          />

          <form onSubmit={handleSaveSettings} className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-base uppercase font-extrabold text-black tracking-tight flex items-center gap-2">
                <Settings className="w-5 h-5 text-black animate-spin-slow" />
                System Configuration &amp; Credentials
              </h3>
              <p className="text-[11px] text-gray-400 font-mono mt-1">
                Configure your portal identity, ordering rules, and administrator authentication.
              </p>
            </div>

            {settingsSuccessMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs font-mono flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            {/* Identity Section */}
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono border-b border-gray-50 pb-1">
                Portal Identity Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Hub Display Name</label>
                  <input
                    type="text"
                    value={hubName}
                    onChange={(e) => onSettingsInputChange(setHubName, e.target.value)}
                    required
                    placeholder="e.g. ARH Print Hub"
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Short Initials (Logo)</label>
                  <input
                    type="text"
                    value={shortHubName}
                    onChange={(e) => onSettingsInputChange(setShortHubName, e.target.value)}
                    required
                    placeholder="e.g. ARH"
                    maxLength={5}
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Company Tagline / Sub-header</label>
                  <input
                    type="text"
                    value={companyTagline}
                    onChange={(e) => onSettingsInputChange(setCompanyTagline, e.target.value)}
                    placeholder="e.g. Corporate Apparel & Custom Merchandise Solutions"
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                  />
                  <p className="text-[9px] text-gray-400 font-mono">
                    Displayed directly beneath your company name on quotes, receipts, and invoices.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Company Address / Location</label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => onSettingsInputChange(setCompanyAddress, e.target.value)}
                    placeholder="e.g. Manila, Philippines"
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                  />
                  <p className="text-[9px] text-gray-400 font-mono">
                    Official business address for documents and billing.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Tax / TIN ID</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => onSettingsInputChange(setTaxId, e.target.value)}
                    placeholder="e.g. TIN: 009-876-543-000"
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none font-mono"
                  />
                  <p className="text-[9px] text-gray-400 font-mono">
                    Official Tax Identification Number for official receipts and quotations.
                  </p>
                </div>

                 <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Portal Main Logo URL (URL, base64, or attach below)</label>
                  <div className="flex items-center gap-2">
                    {appLogoUrl && (
                      <div className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={appLogoUrl}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      value={appLogoUrl}
                      onChange={(e) => onSettingsInputChange(setAppLogoUrl, e.target.value)}
                      placeholder="https://images.unsplash.com/... or a direct image web link"
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-mono font-semibold text-black focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label className="cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono uppercase font-bold tracking-wider inline-flex items-center gap-1.5 transition-colors shrink-0">
                      <Paperclip className="w-3 h-3" />
                      <span>Attach Logo File</span>
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
                              onSettingsInputChange(setAppLogoUrl, base64String);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[9px] text-gray-500 font-mono truncate">
                      Convert local image file to offline logo.
                    </span>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Portal Favicon URL (Browser Tab Icon, base64, or attach below)</label>
                  <div className="flex items-center gap-2">
                    {appFaviconUrl && (
                      <div className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={appFaviconUrl}
                          alt="Favicon Preview"
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <input
                      type="text"
                      value={appFaviconUrl}
                      onChange={(e) => onSettingsInputChange(setAppFaviconUrl, e.target.value)}
                      placeholder="https://... or .ico / .png / image URL for browser tab icon"
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-mono font-semibold text-black focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <label className="cursor-pointer bg-neutral-900 text-white hover:bg-neutral-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono uppercase font-bold tracking-wider inline-flex items-center gap-1.5 transition-colors shrink-0">
                      <Paperclip className="w-3 h-3" />
                      <span>Attach Favicon File</span>
                      <input
                        type="file"
                        accept="image/png,image/x-icon,image/svg+xml,image/jpeg,image/webp,image/*,.ico"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const base64String = reader.result as string;
                              onSettingsInputChange(setAppFaviconUrl, base64String);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[9px] text-gray-500 font-mono truncate">
                      Sets the browser tab icon across all devices (PNG, ICO, SVG, JPG). Saved to Google Sheets.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Settings Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono border-b border-gray-50 pb-1">
                Ordering &amp; Invoice Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Order Number Prefix</label>
                  <input
                    type="text"
                    value={orderPrefix}
                    onChange={(e) => onSettingsInputChange(setOrderPrefix, e.target.value)}
                    required
                    placeholder="e.g. ARH-2026"
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => onSettingsInputChange(setCurrencySymbol, e.target.value)}
                    required
                    placeholder="e.g. Php"
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg px-3 py-2 text-xs font-semibold text-black focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Theme Settings Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono border-b border-gray-50 pb-1">
                Portal Theme Accent Color
              </h4>
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Visual Color Picker Input */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all shrink-0">
                      <input
                        type="color"
                        value={colorTheme.startsWith('#') ? colorTheme : '#000000'}
                        onChange={(e) => onSettingsInputChange(setColorTheme, e.target.value)}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                        title="Click to choose a color"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Custom Accent HEX</label>
                      <input
                        type="text"
                        value={colorTheme}
                        onChange={(e) => onSettingsInputChange(setColorTheme, e.target.value)}
                        placeholder="#000000"
                        required
                        className="w-32 bg-white border border-gray-200 focus:border-black rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-black uppercase focus:outline-none"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-mono font-bold text-gray-400 mb-1">Live Theme Preview</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: colorTheme }} />
                      <span className="text-xs text-gray-600 font-medium font-mono uppercase">{colorTheme}</span>
                    </div>
                  </div>
                </div>

                {/* Standard presets that write HEX values */}
                <div className="space-y-2">
                  <span className="block text-[9px] uppercase font-mono font-bold text-gray-400">Standard Presets</span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: '#000000', name: 'Classic Noir', bg: 'bg-black' },
                      { id: '#064e3b', name: 'Royal Emerald', bg: 'bg-emerald-900' },
                      { id: '#1e3a8a', name: 'Deep Ocean', bg: 'bg-blue-900' },
                      { id: '#881337', name: 'Sunset Crimson', bg: 'bg-rose-900' },
                      { id: '#78350f', name: 'Warm Amber', bg: 'bg-amber-900' }
                    ].map((themeOpt) => (
                      <button
                        key={themeOpt.id}
                        type="button"
                        onClick={() => onSettingsInputChange(setColorTheme, themeOpt.id)}
                        className={`flex items-center gap-2 p-2 border rounded-xl text-left cursor-pointer transition-all ${
                          colorTheme.toLowerCase() === themeOpt.id.toLowerCase()
                            ? 'border-black ring-1 ring-black bg-white font-extrabold'
                            : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50/50'
                        }`}
                        id={`theme-btn-${themeOpt.id}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 ${themeOpt.bg}`} />
                        <span className="text-[10px] text-gray-700 leading-none truncate font-medium">{themeOpt.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono border-b border-gray-50 pb-1">
                Administrator Contact
              </h4>
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Admin Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => onSettingsInputChange(setAdminEmail, e.target.value)}
                    placeholder="e.g. admin@yourdomain.com"
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-black focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[9px] text-gray-400 font-mono">
                  Primary contact email for system records and support inquiries.
                </p>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono border-b border-gray-50 pb-1">
                Admin Login Credentials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Admin Username</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={adminUser}
                      onChange={(e) => onSettingsInputChange(setAdminUser, e.target.value)}
                      required
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-black focus:outline-none font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Admin Passcode</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={adminPass}
                      onChange={(e) => onSettingsInputChange(setAdminPass, e.target.value)}
                      required
                      className="w-full bg-white border border-gray-200 focus:border-black rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-black focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                className="bg-black hover:bg-neutral-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl border border-black transition-all cursor-pointer shadow-md"
              >
                Save Admin Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receipt Generator Tab */}
      {adminTab === 'receipt' && (
        <ReceiptGenerator
          orders={orders}
          companies={companies}
          hubName={hubName}
          currencySymbol={currencySymbol}
          appLogoUrl={appLogoUrl}
          adminEmail={adminEmail}
          companyTagline={companyTagline}
          companyAddress={companyAddress}
          taxId={taxId}
        />
      )}

      {/* Quote Builder Tab */}
      {adminTab === 'quotes' && (
        <QuoteBuilder
          companies={companies}
          products={products}
          catalogProducts={catalogProducts}
          quoteEnquiries={quoteEnquiries}
          hubName={hubName}
          currencySymbol={currencySymbol}
          appLogoUrl={appLogoUrl}
          adminEmail={adminEmail}
          companyTagline={companyTagline}
          companyAddress={companyAddress}
          taxId={taxId}
          onSaveQuoteEnquiry={onSaveQuoteEnquiry}
        />
      )}

      {/* Google Sheet Sync Tab */}
      {adminTab === 'sync' && (
        <div className="animate-fade-in" id="admin-sync-tab">
          <SettingsPanel
            config={appsScriptConfig}
            onUpdateConfig={onUpdateAppsScriptConfig}
            companies={companies}
            onAddCompany={onAddCompany}
            onUpdateCompany={onUpdateCompany}
            totalOrders={orders.length}
            productsCount={products.length}
            onForceSyncAll={onForceSyncAll}
            onPullFromSheets={onPullFromSheets}
            isSyncingSheets={isSyncingSheets}
          />
        </div>
      )}
      </div>

      {/* Full Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
            {/* Background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={() => setSelectedOrder(null)}
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="printable-area bg-white border-2 border-black max-w-2xl w-full p-6 md:p-8 pb-10 md:pb-12 rounded-3xl relative z-10 space-y-6 shadow-2xl my-8 sm:my-12 font-sans text-left"
              id="order-details-modal"
            >
              {/* Header Action Controls */}
              <div className="absolute top-4 right-4 flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-black hover:bg-neutral-800 text-white font-mono text-xs font-bold uppercase px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
                  id="btn-print-order-modal"
                  title="Print or Save PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-all cursor-pointer"
                  id="close-order-details-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Header */}
              <div className="border-b border-gray-100 pb-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-mono text-gray-500 tracking-widest block font-bold">
                    B2B Order Record Full Specs
                  </span>
                  <span className={`inline-block px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md border ${
                    selectedOrder.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                    selectedOrder.status === 'Canceled' ? 'bg-red-50 text-red-700 border-red-200' :
                    selectedOrder.status === 'Shipped' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedOrder.status === 'In Production' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    selectedOrder.status === 'Approved' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold uppercase tracking-tight text-black">
                  Order Ref: {selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-gray-500 font-mono">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Client Account &amp; Customer Details</span>
                  <p className="font-extrabold text-sm text-black uppercase">{selectedOrder.companyName}</p>
                  <p className="text-gray-900 font-bold">Customer: {getDisplayPurchaserName(selectedOrder)}</p>
                  {selectedOrder.contactNumber && (
                    <p className="text-gray-700 font-bold">Phone: {selectedOrder.contactNumber}</p>
                  )}
                  {selectedOrder.fbMessengerLink && (
                    <p>
                      <a
                        href={selectedOrder.fbMessengerLink.startsWith('http') ? selectedOrder.fbMessengerLink : `https://${selectedOrder.fbMessengerLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs"
                      >
                        <span>FB Messenger Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  )}
                  <p className="text-gray-400 underline">{selectedOrder.contactEmail}</p>
                  {selectedOrder.status === 'Pending Approval' && (
                    <div className="mt-2 bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs font-sans text-amber-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-extrabold text-amber-900 uppercase">
                        <span>⏳ Awaiting Company Approval</span>
                      </div>
                      <p className="leading-snug text-[11px] text-amber-900">
                        This order was submitted through the Storefront Order Portal and requires company representative approval in their Client Portal before production.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Logistics & Billing</span>
                  {selectedOrder.poNumber && (
                    <p className="text-black font-bold">
                      PO: <span className="bg-black text-white px-1.5 py-0.5 rounded font-bold">{selectedOrder.poNumber}</span>
                    </p>
                  )}
                  <p className="text-gray-600 leading-relaxed">
                    <span className="text-gray-400 block font-bold text-[8px] uppercase">Address:</span>
                    {selectedOrder.deliveryAddress || 'No address specified'}
                  </p>
                </div>
              </div>

              {/* Order Notes */}
              {selectedOrder.notes && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs font-mono space-y-1 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-amber-700 font-bold block">Purchasing Agent Notes</span>
                  <p className="text-gray-700 leading-relaxed italic">"{selectedOrder.notes}"</p>
                </div>
              )}

              {/* Production Job Card */}
              {(() => {
                const linkedJob = jobs.find(j => j.orderId === selectedOrder.id || (j.orderNumber && selectedOrder.orderNumber && j.orderNumber === selectedOrder.orderNumber));
                if (linkedJob) {
                  return (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-xs font-mono space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold block">Linked Production Job</span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-black text-white">
                          {linkedJob.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-extrabold text-black">{linkedJob.id} - {linkedJob.values['col-job-name'] || 'Production Job'}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Due: <strong className="text-neutral-900">{linkedJob.values['col-in-hand-date'] ? new Date(linkedJob.values['col-in-hand-date']).toLocaleDateString() : 'No date'}</strong> | Sub-Items: <strong className="text-neutral-900">{(linkedJob.items || []).length}</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrder(null);
                            setAdminTab('jobs');
                          }}
                          className="bg-black hover:bg-neutral-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          id="btn-open-linked-job"
                        >
                          <span>Open in Production Board</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 text-xs font-mono flex items-center justify-between gap-4 text-left">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Production Pipeline</span>
                      <p className="text-gray-600 text-xs">No linked production job has been created yet for this order.</p>
                    </div>
                    {onCreateJobFromOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          onCreateJobFromOrder(selectedOrder);
                        }}
                        className="bg-black hover:bg-neutral-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                        id="btn-create-linked-job"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Create Production Job</span>
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Order Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-400 font-mono">Line Items Summary</h4>
                  {selectedOrder.items.some(i => i.submitterName) && (
                    <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-mono font-bold">
                      📦 Batch Order (Separated by Person)
                    </span>
                  )}
                </div>

                <div className="divide-y divide-gray-100 border-y border-gray-100 divide-dashed max-h-[380px] overflow-y-auto pr-2 space-y-4">
                  {(() => {
                    const hasSubmitters = selectedOrder.items.some(i => i.submitterName);
                    if (!hasSubmitters) {
                      return selectedOrder.items.map((it, idx) => (
                        <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {it.imageUrl ? (
                              it.imageUrl.startsWith('http') ? (
                                <img
                                  src={it.imageUrl}
                                  alt="Product"
                                  className="w-10 h-10 object-cover rounded-lg shrink-0 border border-gray-100"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-sm p-1 bg-gray-50 border border-gray-100 w-10 h-10 flex items-center justify-center select-none shrink-0 rounded-lg font-sans">
                                  {it.imageUrl}
                                </span>
                              )
                            ) : (
                              <div className="w-10 h-10 bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 rounded-lg">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h5 className="font-bold text-xs text-black uppercase tracking-tight truncate">
                                {it.productName}
                              </h5>
                              
                              {(it.selectedSize || it.selectedColor || (it.customDetails && Object.keys(it.customDetails).length > 0)) && (
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-mono text-gray-500 mt-1">
                                  {it.selectedSize && (
                                    <span className="bg-gray-100 px-1 py-0.5 rounded">
                                      Size: <strong>{it.selectedSize}</strong>
                                    </span>
                                  )}
                                  {it.selectedColor && (
                                    <span className="bg-gray-100 px-1 py-0.5 rounded">
                                      Color: <strong>{it.selectedColor}</strong>
                                    </span>
                                  )}
                                  {it.customDetails && Object.entries(it.customDetails).map(([k, v]) => (
                                    v ? (
                                      <span key={k} className="block w-full text-[8px] text-gray-400">
                                        {k}: {v}
                                      </span>
                                    ) : null
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-left sm:text-right text-xs font-mono shrink-0">
                            <span className="text-gray-500">{it.quantity} x Php {(Number(it.price ?? it.unitPrice) || 0).toFixed(2)} = </span>
                            <span className="font-bold text-black block sm:inline-block sm:ml-1">Php {(Number(it.quantity || 0) * (Number(it.price ?? it.unitPrice) || 0)).toFixed(2)}</span>
                          </div>
                        </div>
                      ));
                    }

                    // Group items by submitterName
                    const groups: { [name: string]: { email?: string; phone?: string; orderNum?: string; items: typeof selectedOrder.items } } = {};
                    selectedOrder.items.forEach(it => {
                      const name = it.submitterName || 'General Order';
                      if (!groups[name]) {
                        groups[name] = {
                          email: it.submitterEmail,
                          phone: it.submitterPhone,
                          orderNum: it.originalOrderNumber,
                          items: []
                        };
                      }
                      groups[name].items.push(it);
                    });

                    return Object.entries(groups).map(([name, group], gIdx) => (
                      <div key={gIdx} className="pt-3 pb-2 space-y-2">
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-amber-950 uppercase">👤 Person: {name}</span>
                            {group.orderNum && (
                              <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                {group.orderNum}
                              </span>
                            )}
                          </div>
                          {(group.email || group.phone) && (
                            <div className="text-[10px] text-amber-800 flex items-center gap-2">
                              {group.email && <span>{group.email}</span>}
                              {group.phone && <span>{group.phone}</span>}
                            </div>
                          )}
                        </div>

                        <div className="pl-2 space-y-2 divide-y divide-gray-100">
                          {group.items.map((it, idx) => (
                            <div key={idx} className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {it.imageUrl ? (
                                  it.imageUrl.startsWith('http') ? (
                                    <img
                                      src={it.imageUrl}
                                      alt="Product"
                                      className="w-9 h-9 object-cover rounded-lg shrink-0 border border-gray-100"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <span className="text-sm p-1 bg-gray-50 border border-gray-100 w-9 h-9 flex items-center justify-center select-none shrink-0 rounded-lg font-sans">
                                      {it.imageUrl}
                                    </span>
                                  )
                                ) : (
                                  <div className="w-9 h-9 bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 rounded-lg">
                                    <Package className="w-4 h-4 text-gray-400" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <h5 className="font-bold text-xs text-black uppercase tracking-tight truncate">
                                    {it.productName}
                                  </h5>
                                  
                                  {(it.selectedSize || it.selectedColor || (it.customDetails && Object.keys(it.customDetails).length > 0)) && (
                                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-mono text-gray-500 mt-0.5">
                                      {it.selectedSize && (
                                        <span className="bg-gray-100 px-1 py-0.5 rounded">
                                          Size: <strong>{it.selectedSize}</strong>
                                        </span>
                                      )}
                                      {it.selectedColor && (
                                        <span className="bg-gray-100 px-1 py-0.5 rounded">
                                          Color: <strong>{it.selectedColor}</strong>
                                        </span>
                                      )}
                                      {it.customDetails && Object.entries(it.customDetails).map(([k, v]) => (
                                        v ? (
                                          <span key={k} className="block w-full text-[8px] text-gray-400">
                                            {k}: {v}
                                          </span>
                                        ) : null
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-left sm:text-right text-xs font-mono shrink-0">
                                <span className="text-gray-500">{it.quantity} x Php {(Number(it.price ?? it.unitPrice) || 0).toFixed(2)} = </span>
                                <span className="font-bold text-black block sm:inline-block sm:ml-1">Php {(Number(it.quantity || 0) * (Number(it.price ?? it.unitPrice) || 0)).toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Total Cost */}
              <div className="flex justify-between items-center bg-black text-white p-5 rounded-2xl font-mono text-left">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Aggregated Total Amount</span>
                  <span className="text-xs text-gray-300">Including shipping where applicable</span>
                </div>
                <span className="text-xl font-black shrink-0">Php {(Number(selectedOrder.totalAmount) || 0).toFixed(2)}</span>
              </div>

              {/* Change status inside Details view too */}
              <div className="border-t border-gray-100 pt-5 space-y-2 text-center no-print">
                <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block font-mono">Update Dispatch Pipeline Status</span>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { label: 'Pending', val: 'Pending', color: 'bg-white hover:bg-neutral-100 text-gray-500' },
                    { label: 'Approved', val: 'Approved', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200' },
                    { label: 'In Production', val: 'In Production', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' },
                    { label: 'Shipped', val: 'Shipped', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200' },
                    { label: 'Completed', val: 'Completed', color: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200' },
                    { label: 'Canceled', val: 'Canceled', color: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200' }
                  ].map((st) => (
                    <button
                      key={st.val}
                      onClick={() => {
                        if (selectedOrder.status === 'Pending Approval' && (st.val === 'In Production' || st.val === 'Shipped' || st.val === 'Completed')) {
                          if (!window.confirm(`⚠️ Notice: This order is currently awaiting company representative approval in their Client Portal.\n\nAre you sure you want to approve this order on behalf of ${selectedOrder.companyName}?`)) {
                            return;
                          }
                        }
                        handleUpdateOrderStatus(selectedOrder.id, st.val as any);
                        setSelectedOrder(prev => prev ? { ...prev, status: st.val as any } : null);
                      }}
                      className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                        selectedOrder.status === st.val
                          ? 'ring-2 ring-black border-black bg-black text-white font-extrabold'
                          : `${st.color} border-gray-200`
                      }`}
                      id={`modal-details-status-${st.val.toLowerCase()}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-center">
                  {confirmDeleteOrderId === selectedOrder.id ? (
                    <div className="flex flex-col items-center gap-2 animate-fade-in">
                      <span className="text-[11px] text-red-600 font-semibold">Are you sure? This cannot be undone.</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const updatedOrders = orders.filter(o => o.id !== selectedOrder.id);
                            onUpdateOrders(updatedOrders);
                            setSelectedOrder(null);
                            setConfirmDeleteOrderId(null);
                          }}
                          className="px-4 py-2 bg-red-600 border border-red-600 hover:bg-red-700 text-white rounded-xl font-sans text-xs font-bold cursor-pointer transition-all"
                          id={`confirm-delete-order-btn`}
                        >
                          Confirm Permanent Delete
                        </button>
                        <button
                          onClick={() => setConfirmDeleteOrderId(null)}
                          className="px-4 py-2 bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-700 rounded-xl font-sans text-xs font-bold cursor-pointer transition-all"
                          id={`cancel-delete-order-btn`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmDeleteOrderId(selectedOrder.id);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 border border-red-200 text-red-600 hover:text-white hover:bg-red-600 rounded-xl font-sans text-xs font-bold cursor-pointer transition-all"
                      id={`btn-delete-order-${selectedOrder.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Order Record</span>
                    </button>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Dashboard Drill-down Modal */}
      {currentCompany && (
        <ClientDashboardModal
          company={currentCompany}
          orders={orders}
          products={currentCompany.customProducts || []}
          masterProducts={products}
          onClose={() => setSelectedDashboardCompany(null)}
          onUpdateCompany={onUpdateCompany}
          onUpdateProducts={onUpdateProducts}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onSimulateClient={onSimulateClient}
        />
      )}

    </div>
  );
}
