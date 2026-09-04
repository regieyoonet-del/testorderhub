/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ExpenseRecord,
  ExpenseCategory,
  RecurringExpense,
  ExpenseType,
  PaymentStatus,
  RecurringFrequency,
  SystemSettings
} from '../types';
import {
  generateExpenseId,
  generateRecurringExpenseId,
  DEFAULT_EXPENSE_CATEGORIES
} from '../data/initialFinance';
import {
  MONTH_OPTIONS,
  matchesYearMonth,
  parseYearMonth,
  formatPeriodLabel
} from '../utils/financeFilters';
import {
  Receipt,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Repeat,
  TrendingDown,
  Building,
  CreditCard,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Tag,
  Check,
  RotateCw
} from 'lucide-react';

interface ExpensesManagementProps {
  expenses: ExpenseRecord[];
  expenseCategories: ExpenseCategory[];
  recurringExpenses: RecurringExpense[];
  onSaveExpense: (expense: ExpenseRecord) => void;
  onSaveExpensesBatch?: (expensesList: ExpenseRecord[]) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onSaveRecurringExpense: (recurring: RecurringExpense) => void;
  onSaveRecurringExpensesBatch?: (recurringList: RecurringExpense[]) => void;
  onDeleteRecurringExpense?: (recurringId: string) => void;
  onSaveExpenseCategories: (categories: ExpenseCategory[]) => void;
  systemSettings: SystemSettings;
  currencySymbol?: string;
}

export default function ExpensesManagement({
  expenses = [],
  expenseCategories = DEFAULT_EXPENSE_CATEGORIES,
  recurringExpenses = [],
  onSaveExpense,
  onSaveExpensesBatch,
  onDeleteExpense,
  onSaveRecurringExpense,
  onSaveRecurringExpensesBatch,
  onDeleteRecurringExpense,
  onSaveExpenseCategories,
  systemSettings,
  currencySymbol = 'Php'
}: ExpensesManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'recurring' | 'categories'>('records');

  // ----------------------------------------------------
  // EXPENSE RECORDS STATE & FILTERS
  // ----------------------------------------------------
  const [expenseSearch, setExpenseSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Dynamic available years list
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(String(currentYear));
    yearsSet.add(String(currentYear - 1));

    expenses.forEach(e => {
      const p = parseYearMonth(e.expenseDate);
      if (p) yearsSet.add(String(p.year));
    });

    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [expenses]);

  // Expense Form Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [expenseFormData, setExpenseFormData] = useState<Omit<ExpenseRecord, 'id'>>({
    name: '',
    category: 'Rent & Studio Lease',
    expenseType: 'Fixed',
    amount: 10000,
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentStatus: 'Paid',
    paymentDate: new Date().toISOString().slice(0, 10),
    vendor: '',
    referenceNumber: '',
    notes: '',
    recurringExpenseId: undefined
  });

  // ----------------------------------------------------
  // RECURRING EXPENSES STATE
  // ----------------------------------------------------
  const [recurringSearch, setRecurringSearch] = useState('');
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [recurringFormData, setRecurringFormData] = useState<Omit<RecurringExpense, 'id'>>({
    name: '',
    category: 'Rent & Studio Lease',
    amount: 15000,
    frequency: 'Monthly',
    startDate: new Date().toISOString().slice(0, 10),
    paymentsPerYear: 12,
    specificMonths: undefined,
    status: 'Active',
    notes: ''
  });

  // ----------------------------------------------------
  // CATEGORIES STATE
  // ----------------------------------------------------
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatType, setNewCatType] = useState<ExpenseType>('Fixed');

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = expenseSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        e.name.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q) ||
        (e.referenceNumber || '').toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'all' || e.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesType = typeFilter === 'all' || e.expenseType === typeFilter;
      const matchesStatus = statusFilter === 'all' || e.paymentStatus === statusFilter;
      const matchesPeriod = matchesYearMonth(e.expenseDate, yearFilter, monthFilter);

      return matchesSearch && matchesCat && matchesType && matchesStatus && matchesPeriod;
    }).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }, [expenses, expenseSearch, categoryFilter, typeFilter, statusFilter, yearFilter, monthFilter]);

  // Filtered Recurring Expenses
  const filteredRecurring = useMemo(() => {
    return recurringExpenses.filter(r => {
      const q = recurringSearch.toLowerCase().trim();
      return !q ||
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q);
    });
  }, [recurringExpenses, recurringSearch]);

  // Expense KPIs
  const expenseStats = useMemo(() => {
    const totalPaid = expenses
      .filter(e => e.paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalPending = expenses
      .filter(e => e.paymentStatus === 'Pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const activeRecurring = recurringExpenses.filter(r => r.status === 'Active');
    const annualRecurringRunRate = activeRecurring.reduce((sum, r) => {
      let multiplier = 12;
      if (r.frequency === 'Quarterly') multiplier = 4;
      if (r.frequency === 'Semi-Annual') multiplier = 2;
      if (r.frequency === 'Yearly') multiplier = 1;
      if ((r.frequency === 'Custom' || (r.frequency as string) === 'Custom / Specific Months') && r.specificMonths) multiplier = r.specificMonths.length;
      return sum + (r.amount * multiplier);
    }, 0);

    const monthlyRecurringEstimated = annualRecurringRunRate / 12;

    // Top Category
    const catMap: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.paymentStatus !== 'Voided') {
        catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
      }
    });

    let topCatName = 'None';
    let topCatAmount = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
      if (amt > topCatAmount) {
        topCatAmount = amt;
        topCatName = cat;
      }
    });

    return {
      totalPaid,
      totalPending,
      annualRecurringRunRate,
      monthlyRecurringEstimated,
      topCatName,
      topCatAmount
    };
  }, [expenses, recurringExpenses]);

  // ----------------------------------------------------
  // EXPENSE CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenNewExpense = () => {
    setEditingExpense(null);
    const defaultCat = expenseCategories[0]?.name || 'Rent & Studio Lease';
    setExpenseFormData({
      name: '',
      category: defaultCat,
      expenseType: 'Fixed',
      amount: 5000,
      expenseDate: new Date().toISOString().slice(0, 10),
      paymentStatus: 'Paid',
      paymentDate: new Date().toISOString().slice(0, 10),
      vendor: '',
      referenceNumber: '',
      notes: '',
      recurringExpenseId: undefined
    });
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (record: ExpenseRecord) => {
    setEditingExpense(record);
    setExpenseFormData({
      name: record.name,
      category: record.category,
      expenseType: record.expenseType,
      amount: record.amount,
      expenseDate: record.expenseDate,
      paymentStatus: record.paymentStatus,
      paymentDate: record.paymentDate || '',
      vendor: record.vendor || '',
      referenceNumber: record.referenceNumber || '',
      notes: record.notes || '',
      recurringExpenseId: record.recurringExpenseId
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.name.trim()) {
      alert('Please enter expense title / description.');
      return;
    }
    if (Number(expenseFormData.amount) <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    const record: ExpenseRecord = {
      id: editingExpense ? editingExpense.id : generateExpenseId(expenses),
      name: expenseFormData.name.trim(),
      category: expenseFormData.category,
      type: expenseFormData.expenseType,
      expenseType: expenseFormData.expenseType,
      amount: Number(expenseFormData.amount) || 0,
      date: expenseFormData.expenseDate,
      expenseDate: expenseFormData.expenseDate,
      status: expenseFormData.paymentStatus,
      paymentStatus: expenseFormData.paymentStatus,
      paymentDate: expenseFormData.paymentStatus === 'Paid' ? (expenseFormData.paymentDate || expenseFormData.expenseDate) : undefined,
      vendor: expenseFormData.vendor?.trim() || '',
      referenceNumber: expenseFormData.referenceNumber?.trim() || '',
      notes: expenseFormData.notes?.trim() || '',
      recurringExpenseId: expenseFormData.recurringExpenseId,
      createdAt: editingExpense?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveExpense(record);
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleQuickMarkPaid = (record: ExpenseRecord) => {
    const updated: ExpenseRecord = {
      ...record,
      paymentStatus: 'Paid',
      paymentDate: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString()
    };
    onSaveExpense(updated);
  };

  // ----------------------------------------------------
  // RECURRING EXPENSE CRUD & INSTANTIATION
  // ----------------------------------------------------
  const handleOpenNewRecurring = () => {
    setEditingRecurring(null);
    setRecurringFormData({
      name: '',
      category: expenseCategories[0]?.name || 'Rent & Studio Lease',
      amount: 15000,
      frequency: 'Monthly',
      startDate: new Date().toISOString().slice(0, 10),
      paymentsPerYear: 12,
      specificMonths: undefined,
      status: 'Active',
      notes: ''
    });
    setIsRecurringModalOpen(true);
  };

  const handleOpenEditRecurring = (recurring: RecurringExpense) => {
    setEditingRecurring(recurring);
    setRecurringFormData({
      name: recurring.name,
      category: recurring.category,
      amount: recurring.amount,
      frequency: recurring.frequency,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      paymentsPerYear: recurring.paymentsPerYear || 12,
      specificMonths: recurring.specificMonths,
      status: recurring.status,
      notes: recurring.notes || ''
    });
    setIsRecurringModalOpen(true);
  };

  const handleSaveRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringFormData.name.trim()) {
      alert('Please enter a recurring expense name.');
      return;
    }

    let ppy = 12;
    if (recurringFormData.frequency === 'Quarterly') ppy = 4;
    if (recurringFormData.frequency === 'Semi-Annual') ppy = 2;
    if (recurringFormData.frequency === 'Yearly') ppy = 1;
    if (recurringFormData.frequency === 'Custom' && recurringFormData.specificMonths) {
      ppy = recurringFormData.specificMonths.length;
    }

    const rule: RecurringExpense = {
      id: editingRecurring ? editingRecurring.id : generateRecurringExpenseId(recurringExpenses),
      name: recurringFormData.name.trim(),
      category: recurringFormData.category,
      amount: Number(recurringFormData.amount) || 0,
      frequency: recurringFormData.frequency,
      startDate: recurringFormData.startDate,
      endDate: recurringFormData.endDate || undefined,
      paymentsPerYear: ppy,
      specificMonths: recurringFormData.specificMonths,
      status: recurringFormData.status,
      notes: recurringFormData.notes?.trim() || '',
      createdAt: editingRecurring?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveRecurringExpense(rule);
    setIsRecurringModalOpen(false);
    setEditingRecurring(null);
  };

  const handleGenerateExpenseFromRecurring = (rule: RecurringExpense) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const newExpense: ExpenseRecord = {
      id: generateExpenseId(expenses),
      name: `${rule.name} (${new Date().toLocaleString('default', { month: 'short', year: 'numeric' })})`,
      category: rule.category,
      type: 'Fixed / Recurring',
      expenseType: 'Fixed / Recurring',
      amount: rule.amount,
      date: todayStr,
      expenseDate: todayStr,
      status: 'Pending',
      paymentStatus: 'Pending',
      notes: `Generated from recurring rule: ${rule.name} (${rule.id})`,
      recurringExpenseId: rule.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveExpense(newExpense);
    alert(`Logged monthly expense voucher for "${rule.name}" (${currencySymbol} ${rule.amount.toLocaleString()}). You can find it in the Expense Records tab.`);
  };

  // ----------------------------------------------------
  // CATEGORIES MANAGEMENT HANDLERS
  // ----------------------------------------------------
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const exists = expenseCategories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (exists) {
      alert('A category with this name already exists.');
      return;
    }

    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDesc.trim(),
      defaultType: newCatType,
      status: 'Active',
      isActive: true
    };

    onSaveExpenseCategories([...expenseCategories, newCat]);
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleToggleCategoryActive = (catId: string) => {
    const updated = expenseCategories.map(c => {
      if (c.id === catId) {
        return { ...c, isActive: !c.isActive };
      }
      return c;
    });
    onSaveExpenseCategories(updated);
  };

  return (
    <div className="space-y-6 font-sans text-left" id="admin-expenses-management-container">
      {/* Section Tabs */}
      <div className="flex items-center justify-start border-b border-gray-200 pb-4 overflow-x-auto">
        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('records')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'records'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-200/60'
            }`}
            id="tab-expense-records"
          >
            <Receipt className="w-3.5 h-3.5" />
            Expense Records ({expenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('recurring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'recurring'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-200/60'
            }`}
            id="tab-recurring-planner"
          >
            <Repeat className="w-3.5 h-3.5" />
            Recurring Planner ({recurringExpenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-200/60'
            }`}
            id="tab-expense-categories"
          >
            <Tag className="w-3.5 h-3.5" />
            Categories ({expenseCategories.length})
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Total Paid Outflow</span>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {expenseStats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-gray-500 font-mono">Disbursed across all logged expenses</p>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Pending Payables</span>
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {expenseStats.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-gray-500 font-mono">Awaiting settlement or due invoices</p>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Annual Recurring Run-rate</span>
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {expenseStats.annualRecurringRunRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-gray-500 font-mono">~{currencySymbol} {expenseStats.monthlyRecurringEstimated.toLocaleString(undefined, { maximumFractionDigits: 0 })} / month commitment</p>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Primary Expense Category</span>
            <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-purple-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-lg font-extrabold text-black font-mono truncate">{expenseStats.topCatName}</h4>
            <p className="text-[10px] text-gray-500 font-mono">
              {currencySymbol} {expenseStats.topCatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} total share
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: EXPENSE RECORDS                               */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'records' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  placeholder="Search by name, vendor, ref #..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono bg-white"
              >
                <option value="all">All Categories</option>
                {expenseCategories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono bg-white"
              >
                <option value="all">All Types</option>
                <option value="Fixed">Fixed</option>
                <option value="Variable">Variable</option>
                <option value="One-Time">One-Time</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Voided">Voided</option>
              </select>

              {/* Year Filter */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 shadow-2xs">
                <label htmlFor="expense-year-select" className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                  Year:
                </label>
                <select
                  id="expense-year-select"
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  className="text-xs font-mono font-bold bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1 shadow-2xs">
                <label htmlFor="expense-month-select" className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                  Month:
                </label>
                <select
                  id="expense-month-select"
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="text-xs font-mono font-bold bg-transparent focus:outline-none cursor-pointer"
                >
                  {MONTH_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {(yearFilter !== 'all' || monthFilter !== 'all' || categoryFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || expenseSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setYearFilter('all');
                    setMonthFilter('all');
                    setCategoryFilter('all');
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setExpenseSearch('');
                  }}
                  className="text-xs font-mono font-bold text-red-600 hover:text-red-800 px-2 py-1 rounded cursor-pointer"
                  title="Reset all filters"
                >
                  Reset
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleOpenNewExpense}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              id="log-expense-btn"
            >
              <Plus className="w-4 h-4" />
              Log Expense
            </button>
          </div>

          {/* Expenses Table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] uppercase font-bold text-gray-500">
                    <th className="py-3 px-4">Expense Title &amp; ID</th>
                    <th className="py-3 px-4">Category &amp; Type</th>
                    <th className="py-3 px-4">Vendor &amp; Ref #</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 font-mono text-xs">
                        No expense records found. Click "+ Log Expense" to record an expense voucher.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-black text-sm">{item.name}</div>
                          <div className="font-mono text-[10px] text-gray-400 flex items-center gap-1.5">
                            <span>{item.id}</span>
                            <span>•</span>
                            <span>{item.expenseDate}</span>
                            {item.recurringExpenseId && (
                              <span className="inline-flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1.5 rounded text-[9px]">
                                <Repeat className="w-2.5 h-2.5" /> Recurring
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900">{item.category}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{item.expenseType}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="text-gray-900 font-medium">{item.vendor || '—'}</div>
                          <div className="text-[10px] text-gray-400">{item.referenceNumber || 'No ref #'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-black text-sm">
                          {currencySymbol} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border ${
                              item.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : item.paymentStatus === 'Pending'
                                ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                            }`}
                          >
                            {item.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.paymentStatus === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleQuickMarkPaid(item)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                title="Mark this invoice as Paid"
                              >
                                Mark Paid
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(item)}
                              className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteExpense && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete expense ${item.name} (${item.id})?`)) {
                                    onDeleteExpense(item.id);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: RECURRING PLANNER                             */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'recurring' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200">
            <div className="relative min-w-[240px] w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={recurringSearch}
                onChange={e => setRecurringSearch(e.target.value)}
                placeholder="Search recurring schedules..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenNewRecurring}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              id="add-recurring-rule-btn"
            >
              <Plus className="w-4 h-4" />
              Add Recurring Schedule
            </button>
          </div>

          {/* Recurring Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecurring.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400 font-mono text-xs border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                No recurring expense schedules configured. Click "+ Add Recurring Schedule" to set up predictable rent, utilities, or SaaS subscriptions.
              </div>
            ) : (
              filteredRecurring.map(rule => {
                let yearlyAmt = rule.amount * 12;
                if (rule.frequency === 'Quarterly') yearlyAmt = rule.amount * 4;
                if (rule.frequency === 'Semi-Annual') yearlyAmt = rule.amount * 2;
                if (rule.frequency === 'Yearly') yearlyAmt = rule.amount * 1;
                if (rule.frequency === 'Custom' && rule.specificMonths) yearlyAmt = rule.amount * rule.specificMonths.length;

                return (
                  <div
                    key={rule.id}
                    className="bg-white border-2 border-gray-200 hover:border-black rounded-2xl p-5 space-y-4 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider block">
                            {rule.category}
                          </span>
                          <h4 className="font-extrabold text-black text-base leading-tight mt-0.5">{rule.name}</h4>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase border shrink-0 ${
                            rule.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {rule.status}
                        </span>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1 font-mono">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-gray-500">Scheduled Rate:</span>
                          <span className="text-sm font-extrabold text-black">
                            {currencySymbol} {rule.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span className="text-[10px] text-gray-400 font-normal"> / {rule.frequency.toLowerCase()}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                          <span>Annualized Run-rate:</span>
                          <span className="font-bold text-gray-800">
                            {currencySymbol} {yearlyAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {rule.notes && (
                        <p className="text-[11px] text-gray-500 font-mono line-clamp-2">
                          {rule.notes}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateExpenseFromRecurring(rule)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-black hover:text-white text-black px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                        title="Generate a draft expense record for this month"
                      >
                        <RotateCw className="w-3 h-3" />
                        Log This Month
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRecurring(rule)}
                          className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                          title="Edit Schedule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteRecurringExpense && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete recurring schedule ${rule.name}?`)) {
                                onDeleteRecurringExpense(rule.id);
                              }
                            }}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: EXPENSE CATEGORIES                            */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Category Form */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 space-y-4 h-fit shadow-xs">
            <h3 className="font-extrabold uppercase text-sm text-black flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Add Expense Category
            </h3>
            <form onSubmit={handleAddCategory} className="space-y-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g. Workshop Tooling"
                  className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Default Expense Type</label>
                <select
                  value={newCatType}
                  onChange={e => setNewCatType(e.target.value as ExpenseType)}
                  className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                >
                  <option value="Fixed">Fixed Overhead</option>
                  <option value="Variable">Variable Cost</option>
                  <option value="One-Time">One-Time Capex</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Description</label>
                <textarea
                  rows={2}
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  placeholder="e.g. Squeegees, emulsion, screen mesh replacement..."
                  className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs transition-colors cursor-pointer shadow-xs"
              >
                Create Category
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] uppercase font-bold text-gray-500">
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Default Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenseCategories.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-black">{cat.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-gray-500">{cat.defaultType}</td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">{cat.description || '—'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleCategoryActive(cat.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase cursor-pointer border transition-colors ${
                            cat.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-100 text-gray-400 border-gray-200'
                          }`}
                        >
                          {cat.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT EXPENSE RECORD                     */}
      {/* ---------------------------------------------------- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold uppercase text-base text-black flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                {editingExpense ? `Edit Expense Record (${editingExpense.id})` : 'Log New Expense'}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Expense Title / Description *</label>
                  <input
                    type="text"
                    required
                    value={expenseFormData.name}
                    onChange={e => setExpenseFormData({ ...expenseFormData, name: e.target.value })}
                    placeholder="e.g. October Studio Rent & Warehouse Bay 2"
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Expense Category</label>
                  <select
                    value={expenseFormData.category}
                    onChange={e => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    {expenseCategories.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Expense Type</label>
                  <select
                    value={expenseFormData.expenseType}
                    onChange={e => setExpenseFormData({ ...expenseFormData, expenseType: e.target.value as ExpenseType })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Fixed">Fixed Overhead</option>
                    <option value="Variable">Variable Production Cost</option>
                    <option value="One-Time">One-Time Capex</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={expenseFormData.amount}
                    onChange={e => setExpenseFormData({ ...expenseFormData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono font-bold focus:outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseFormData.expenseDate}
                    onChange={e => setExpenseFormData({ ...expenseFormData, expenseDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Vendor / Payee</label>
                  <input
                    type="text"
                    value={expenseFormData.vendor}
                    onChange={e => setExpenseFormData({ ...expenseFormData, vendor: e.target.value })}
                    placeholder="e.g. Apex Industrial Real Estate"
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Reference / Invoice #</label>
                  <input
                    type="text"
                    value={expenseFormData.referenceNumber}
                    onChange={e => setExpenseFormData({ ...expenseFormData, referenceNumber: e.target.value })}
                    placeholder="e.g. INV-2026-9921"
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Payment Status</label>
                  <select
                    value={expenseFormData.paymentStatus}
                    onChange={e => setExpenseFormData({ ...expenseFormData, paymentStatus: e.target.value as PaymentStatus })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Paid">Paid / Settled</option>
                    <option value="Pending">Pending / Due</option>
                    <option value="Voided">Voided</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Settlement Date</label>
                  <input
                    type="date"
                    value={expenseFormData.paymentDate}
                    onChange={e => setExpenseFormData({ ...expenseFormData, paymentDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Internal Notes / Breakdown</label>
                  <textarea
                    rows={2}
                    value={expenseFormData.notes}
                    onChange={e => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs shadow-xs"
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT RECURRING SCHEDULE                 */}
      {/* ---------------------------------------------------- */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold uppercase text-base text-black flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                {editingRecurring ? `Edit Recurring Schedule (${editingRecurring.id})` : 'Add Recurring Schedule'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecurringSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Schedule Name *</label>
                  <input
                    type="text"
                    required
                    value={recurringFormData.name}
                    onChange={e => setRecurringFormData({ ...recurringFormData, name: e.target.value })}
                    placeholder="e.g. Adobe Creative Cloud & Software Subs"
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Category</label>
                  <select
                    value={recurringFormData.category}
                    onChange={e => setRecurringFormData({ ...recurringFormData, category: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    {expenseCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                    Recurring Rate ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={recurringFormData.amount}
                    onChange={e => setRecurringFormData({ ...recurringFormData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono font-bold focus:outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Frequency</label>
                  <select
                    value={recurringFormData.frequency}
                    onChange={e => setRecurringFormData({ ...recurringFormData, frequency: e.target.value as RecurringFrequency })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Monthly">Monthly (12x / yr)</option>
                    <option value="Quarterly">Quarterly (4x / yr)</option>
                    <option value="Semi-Annual">Semi-Annual (2x / yr)</option>
                    <option value="Yearly">Yearly (1x / yr)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Start Date</label>
                  <input
                    type="date"
                    required
                    value={recurringFormData.startDate}
                    onChange={e => setRecurringFormData({ ...recurringFormData, startDate: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Schedule Status</label>
                  <select
                    value={recurringFormData.status}
                    onChange={e => setRecurringFormData({ ...recurringFormData, status: e.target.value as any })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive / Suspended</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Notes / Contract Details</label>
                  <textarea
                    rows={2}
                    value={recurringFormData.notes}
                    onChange={e => setRecurringFormData({ ...recurringFormData, notes: e.target.value })}
                    placeholder="e.g. Annual renewal date, card on file..."
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs shadow-xs"
                >
                  {editingRecurring ? 'Update Schedule' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
