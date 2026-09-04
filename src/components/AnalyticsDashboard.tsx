/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Order,
  CompanyProfile,
  Product,
  StaffMember,
  PayrollRecord,
  ExpenseRecord,
  RecurringExpense,
  ExpenseCategory,
  SystemSettings,
  Job,
  JobItemColumn
} from '../types';
import { calculateJobTotals, calculateSubItemTotalQty, calculateSubItemTotalAmount } from '../data/initialJobs';
import { MONTH_OPTIONS, matchesYearMonth, parseYearMonth, formatPeriodLabel } from '../utils/financeFilters';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ClipboardList,
  BarChart3,
  PieChart,
  Calendar,
  Layers,
  Package,
  CreditCard,
  Receipt,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  Sparkles,
  Briefcase,
  ShoppingBag,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Truck
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';

interface AnalyticsDashboardProps {
  orders: Order[];
  companies: CompanyProfile[];
  products: Product[];
  jobs?: Job[];
  jobItemColumns?: JobItemColumn[];
  staff?: StaffMember[];
  payroll?: PayrollRecord[];
  expenses?: ExpenseRecord[];
  recurringExpenses?: RecurringExpense[];
  expenseCategories?: ExpenseCategory[];
  systemSettings: SystemSettings;
  currencySymbol?: string;
}

export interface SaleRecord {
  id: string;
  sourceType: 'Direct Company Order' | 'Manual Job';
  referenceNumber: string;
  companyName: string;
  dateStr: string;
  timestamp: number;
  itemsSummary: string;
  totalQuantity: number;
  status: string;
  totalAmount: number;
  isRealized: boolean;
  isLinkedToOrder: boolean;
  rawOrder?: Order;
  rawJob?: Job;
}

// Helper to identify whether an order is from a Customer Storefront / Portal
export const isStorefrontOrder = (order: Order): boolean => {
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

export const isDirectCompanyOrder = (order: Order): boolean => {
  return !isStorefrontOrder(order);
};

export default function AnalyticsDashboard({
  orders = [],
  companies = [],
  products = [],
  jobs = [],
  jobItemColumns = [],
  staff = [],
  payroll = [],
  expenses = [],
  recurringExpenses = [],
  expenseCategories = [],
  systemSettings,
  currencySymbol = 'Php'
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'all' | '30days' | '90days' | 'this_year'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'profit_loss' | 'cash_flow' | 'sales_clients'>('overview');

  // Sales History Table Filters
  const [salesSearch, setSalesSearch] = useState<string>('');
  const [salesSourceFilter, setSalesSourceFilter] = useState<'all' | 'Direct Company Order' | 'Manual Job'>('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');
  const [salesSort, setSalesSort] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_low'>('date_desc');

  // ----------------------------------------------------
  // HELPER: MANUAL JOB AMOUNT CALCULATOR
  // ----------------------------------------------------
  const getJobRevenue = (job: Job): number => {
    if (job.items && job.items.length > 0) {
      const totals = calculateJobTotals(job.items, jobItemColumns);
      if (totals.totalAmount > 0) return totals.totalAmount;
    }
    if (typeof (job as any).totalAmount === 'number' && (job as any).totalAmount > 0) {
      return (job as any).totalAmount;
    }
    const valAmt = Number(job.values?.['col-total-amount']) || Number(job.values?.['col-sub-total-amount']) || 0;
    return valAmt;
  };

  // Helper to extract job date
  const getJobDateStr = (job: Job): string => {
    return job.createdAt || job.values?.['col-date-added'] || job.updatedAt || new Date().toISOString();
  };

  // ----------------------------------------------------
  // AVAILABLE YEARS (Derived dynamically from data)
  // ----------------------------------------------------
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(String(currentYear));
    yearsSet.add(String(currentYear - 1));

    orders.forEach(o => {
      const p = parseYearMonth(o.createdAt);
      if (p) yearsSet.add(String(p.year));
    });

    (jobs || []).forEach(j => {
      const p = parseYearMonth(getJobDateStr(j));
      if (p) yearsSet.add(String(p.year));
    });

    (expenses || []).forEach(e => {
      const p = parseYearMonth(e.expenseDate);
      if (p) yearsSet.add(String(p.year));
    });

    (payroll || []).forEach(pRec => {
      const p = parseYearMonth(pRec.payDate || pRec.payPeriodEnd || pRec.createdAt);
      if (p) yearsSet.add(String(p.year));
    });

    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [orders, jobs, expenses, payroll]);

  // ----------------------------------------------------
  // DATE FILTERING CUTOFF (For quick presets)
  // ----------------------------------------------------
  const filterDateCutoff = useMemo(() => {
    if (selectedYear !== 'all' || selectedMonth !== 'all') {
      return null; // Year/Month filter takes precedence
    }
    const now = new Date();
    if (timeRange === '30days') {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      return d;
    }
    if (timeRange === '90days') {
      const d = new Date();
      d.setDate(now.getDate() - 90);
      return d;
    }
    if (timeRange === 'this_year') {
      return new Date(now.getFullYear(), 0, 1);
    }
    return null;
  }, [timeRange, selectedYear, selectedMonth]);

  // Helper to evaluate whether an item date falls within the selected period filter
  const isItemInPeriod = (dateStr?: string | null): boolean => {
    if (!dateStr) return false;
    if (!matchesYearMonth(dateStr, selectedYear, selectedMonth)) return false;
    if (selectedYear === 'all' && selectedMonth === 'all' && filterDateCutoff) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime()) && d.getTime() < filterDateCutoff.getTime()) {
        return false;
      }
    }
    return true;
  };

  // Scoped Direct Company Orders (Strictly excluding Storefronts & Portals)
  const scopedOrders = useMemo(() => {
    const directOnly = orders.filter(o => isDirectCompanyOrder(o));
    return directOnly.filter(o => isItemInPeriod(o.createdAt));
  }, [orders, selectedYear, selectedMonth, filterDateCutoff]);

  // Scoped Manual Jobs (STRICT ANTI-DOUBLE-COUNTING & STOREFRONT EXCLUSION)
  // 1. Must NOT be linked to an existing Direct Company Order (by orderId, orderNumber, or source === 'Company Order')
  // 2. Must NOT be a storefront/portal job
  // 3. Status must not be Canceled
  const scopedManualJobs = useMemo(() => {
    const directOrders = orders.filter(o => isDirectCompanyOrder(o));
    const orderIdSet = new Set(directOrders.map(o => o.id));
    const orderNumSet = new Set(directOrders.map(o => (o.orderNumber || '').toLowerCase().trim()));

    // Filter to purely standalone manual jobs
    const manualOnly = (jobs || []).filter(j => {
      // Exclude if linked to an existing direct order
      const hasMatchingOrderId = Boolean(j.orderId && orderIdSet.has(j.orderId));
      const hasMatchingOrderNum = Boolean(j.orderNumber && orderNumSet.has(j.orderNumber.toLowerCase().trim()));
      const isCompanyOrderSource = j.source === 'Company Order';
      if (hasMatchingOrderId || hasMatchingOrderNum || isCompanyOrderSource) return false;

      // Exclude if associated with a storefront portal
      if ((j as any).portalId || (j as any).portalName || (j as any).storefrontId || (j as any).isPortalJob) return false;
      if ((j.source as any) === 'Custom Storefront' || (j.source as any) === 'Order Portal' || (j as any).sourceType === 'Storefront' || (j as any).sourceType === 'Order Portal') return false;

      return true;
    });

    return manualOnly.filter(j => isItemInPeriod(getJobDateStr(j)));
  }, [jobs, orders, selectedYear, selectedMonth, filterDateCutoff]);

  // Scoped Expenses & Payroll
  const scopedExpenses = useMemo(() => {
    return expenses.filter(e => isItemInPeriod(e.expenseDate));
  }, [expenses, selectedYear, selectedMonth, filterDateCutoff]);

  const scopedPayroll = useMemo(() => {
    return payroll.filter(p => isItemInPeriod(p.payDate || p.payPeriodEnd || p.createdAt));
  }, [payroll, selectedYear, selectedMonth, filterDateCutoff]);

  // ----------------------------------------------------
  // UNIFIED SALES HISTORY & REVENUE LEDGER
  // Only Confirmed Sales (Approved, In Production, Shipped, Completed, Delivered, Claimed)
  // Pending, Draft, and Canceled orders/jobs are strictly excluded from recognized sales.
  // ----------------------------------------------------
  const unifiedSalesLedger = useMemo<SaleRecord[]>(() => {
    const records: SaleRecord[] = [];

    // 1. Map Direct Company Orders (Confirmed Sales only)
    scopedOrders.forEach(o => {
      const isUnconfirmedOrCanceled = 
        o.status === 'Draft' as any || 
        o.status === 'Pending Approval' || 
        o.status === 'Pending' || 
        o.status === 'Canceled';
      if (isUnconfirmedOrCanceled) return;

      const isRealized = o.status === 'Completed' || o.status === 'Delivered' || o.status === 'Customer Claimed' || o.status === 'Picked Up';
      const itemsList = (o.items || []).map(it => `${it.quantity}x ${it.productName || it.productId}`).join(', ') || 'Custom Merchandise';
      const totalQty = (o.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);

      records.push({
        id: o.id,
        sourceType: 'Direct Company Order',
        referenceNumber: o.orderNumber || o.id,
        companyName: o.companyName || 'Corporate Client',
        dateStr: o.createdAt,
        timestamp: new Date(o.createdAt).getTime() || 0,
        itemsSummary: itemsList,
        totalQuantity: totalQty,
        status: o.status,
        totalAmount: o.totalAmount || 0,
        isRealized,
        isLinkedToOrder: true,
        rawOrder: o
      });
    });

    // 2. Map Standalone Manual Jobs (Confirmed Sales only)
    scopedManualJobs.forEach(j => {
      const isUnconfirmedOrCanceled = 
        j.status === 'Pending' || 
        j.status === 'Draft' as any || 
        j.status === 'Canceled';
      if (isUnconfirmedOrCanceled) return;

      const isRealized = j.status === 'Completed' || j.status === 'Shipped';
      const jobAmt = getJobRevenue(j);
      
      let itemsSummary = '';
      let totalQty = 0;
      if (j.items && j.items.length > 0) {
        const itemNames = j.items.map(it => {
          const design = it.values?.['col-sub-design'] || it.values?.['col-sub-garment'] || it.values?.['col-sub-brand'] || 'Item';
          const qty = calculateSubItemTotalQty(it.values, jobItemColumns) || Number(it.values?.['col-sub-total-qty']) || 1;
          totalQty += qty;
          return `${qty}x ${design}`;
        });
        itemsSummary = itemNames.join(', ');
      } else {
        itemsSummary = j.values?.['col-job-type'] || 'Manual Production Job';
        totalQty = 1;
      }

      const coName = j.companyName || j.values?.['col-company'] || 'Direct Production Client';

      records.push({
        id: j.id,
        sourceType: 'Manual Job',
        referenceNumber: j.id,
        companyName: coName,
        dateStr: getJobDateStr(j),
        timestamp: new Date(getJobDateStr(j)).getTime() || 0,
        itemsSummary: itemsSummary || 'Custom Job Order',
        totalQuantity: totalQty,
        status: j.status,
        totalAmount: jobAmt,
        isRealized,
        isLinkedToOrder: false,
        rawJob: j
      });
    });

    return records;
  }, [scopedOrders, scopedManualJobs, jobItemColumns]);

  // Filtered & Sorted Sales Records for the Ledger Table
  const filteredSalesLedger = useMemo(() => {
    let result = unifiedSalesLedger;

    // Filter by Source
    if (salesSourceFilter !== 'all') {
      result = result.filter(r => r.sourceType === salesSourceFilter);
    }

    // Filter by Status
    if (salesStatusFilter !== 'all') {
      result = result.filter(r => r.status.toLowerCase() === salesStatusFilter.toLowerCase());
    }

    // Search query
    if (salesSearch.trim()) {
      const q = salesSearch.toLowerCase().trim();
      result = result.filter(r =>
        r.referenceNumber.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.itemsSummary.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
      );
    }

    // Sorting
    result = [...result].sort((a, b) => {
      if (salesSort === 'date_desc') return b.timestamp - a.timestamp;
      if (salesSort === 'date_asc') return a.timestamp - b.timestamp;
      if (salesSort === 'amount_desc') return b.totalAmount - a.totalAmount;
      if (salesSort === 'amount_low') return a.totalAmount - b.totalAmount;
      return 0;
    });

    return result;
  }, [unifiedSalesLedger, salesSourceFilter, salesStatusFilter, salesSearch, salesSort]);

  // ----------------------------------------------------
  // FINANCIAL TOTALS & METRICS
  // Strictly excludes unconfirmed Pending, Draft, and Canceled items from recognized Sales & Revenue
  // ----------------------------------------------------
  const metrics = useMemo(() => {
    // 1. Order-based Recognized Sales/Revenue (Confirmed Sales only: Approved, In Production, Shipped, Completed, Delivered, Picked Up)
    const validOrders = scopedOrders.filter(o => 
      o.status !== 'Pending' && 
      o.status !== 'Pending Approval' && 
      o.status !== 'Draft' as any && 
      o.status !== 'Canceled'
    );
    const orderGrossRevenue = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderRealizedRevenue = validOrders
      .filter(o => o.status === 'Completed' || o.status === 'Delivered' || o.status === 'Customer Claimed' || o.status === 'Picked Up')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const orderPipelineRevenue = orderGrossRevenue - orderRealizedRevenue;

    // 2. Manual Job-based Recognized Sales/Revenue (Confirmed Jobs only: Approved, In Production, Shipped, Completed)
    const validManualJobs = scopedManualJobs.filter(j => 
      j.status !== 'Pending' && 
      j.status !== 'Draft' as any && 
      j.status !== 'Canceled'
    );
    const manualJobGrossRevenue = validManualJobs.reduce((sum, j) => sum + getJobRevenue(j), 0);
    const manualJobRealizedRevenue = validManualJobs
      .filter(j => j.status === 'Completed' || j.status === 'Shipped')
      .reduce((sum, j) => sum + getJobRevenue(j), 0);
    const manualJobPipelineRevenue = manualJobGrossRevenue - manualJobRealizedRevenue;

    // 3. Quoted / Pending Value (Unconfirmed Requests - Separated from recognized Sales)
    const pendingOrders = scopedOrders.filter(o => o.status === 'Pending' || o.status === 'Pending Approval' || o.status === 'Draft' as any);
    const pendingManualJobs = scopedManualJobs.filter(j => j.status === 'Pending' || j.status === 'Draft' as any);
    const pendingOrdersValue = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingJobsValue = pendingManualJobs.reduce((sum, j) => sum + getJobRevenue(j), 0);
    const totalPendingQuotedValue = pendingOrdersValue + pendingJobsValue;
    const totalPendingCount = pendingOrders.length + pendingManualJobs.length;

    // 4. Combined Revenue & Sales Count
    const totalGrossRevenue = orderGrossRevenue + manualJobGrossRevenue;
    const realizedRevenue = orderRealizedRevenue + manualJobRealizedRevenue;
    const pipelineRevenue = totalGrossRevenue - realizedRevenue;
    const totalSalesCount = validOrders.length + validManualJobs.length;
    const aov = totalSalesCount > 0 ? totalGrossRevenue / totalSalesCount : 0;

    // 5. Expenses Calculations
    const totalExpenses = scopedExpenses
      .filter(e => e.paymentStatus !== 'Voided')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const paidExpenses = scopedExpenses
      .filter(e => e.paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingExpenses = scopedExpenses
      .filter(e => e.paymentStatus === 'Pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // 6. Payroll Calculations
    const totalPayrollGross = scopedPayroll
      .filter(p => p.status !== 'Voided')
      .reduce((sum, p) => sum + (p.grossPay || 0), 0);

    const totalPayrollNet = scopedPayroll
      .filter(p => p.status !== 'Voided')
      .reduce((sum, p) => sum + (p.netPay || 0), 0);

    const totalPayrollDeductions = scopedPayroll
      .filter(p => p.status !== 'Voided')
      .reduce((sum, p) => sum + (p.totalDeductions || 0), 0);

    // 7. Net Profit & Margins
    const totalCosts = totalExpenses + totalPayrollGross;
    const netProfit = totalGrossRevenue - totalCosts;
    const profitMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;

    // 8. Cash Flow (Realized Inflows vs Realized Outflows)
    const totalCashInflow = realizedRevenue;
    const totalCashOutflow = paidExpenses + totalPayrollNet;
    const netCashFlow = totalCashInflow - totalCashOutflow;

    // 9. Monthly Fixed Commitment (from Active Staff & Active Recurring Rules)
    const activeStaffMonthly = staff
      .filter(s => s.status === 'Active')
      .reduce((sum, s) => {
        let monthly = s.basicSalary || 0;
        if (s.salaryType === 'Daily') monthly = s.basicSalary * 26;
        if (s.salaryType === 'Hourly') monthly = s.basicSalary * 8 * 26;
        return sum + monthly + (s.allowances || 0) + (s.otherCompensation || 0);
      }, 0);

    const activeRecurringMonthly = recurringExpenses
      .filter(r => r.status === 'Active')
      .reduce((sum, r) => {
        let mult = 1;
        if (r.frequency === 'Quarterly') mult = 1 / 3;
        if (r.frequency === 'Semi-Annual') mult = 1 / 6;
        if (r.frequency === 'Yearly') mult = 1 / 12;
        return sum + (r.amount * mult);
      }, 0);

    const monthlyCommittedBurnRate = activeStaffMonthly + activeRecurringMonthly;

    return {
      orderGrossRevenue,
      manualJobGrossRevenue,
      orderRealizedRevenue,
      manualJobRealizedRevenue,
      orderPipelineRevenue,
      manualJobPipelineRevenue,
      orderCount: validOrders.length,
      manualJobCount: validManualJobs.length,
      totalGrossRevenue,
      realizedRevenue,
      pipelineRevenue,
      totalPendingQuotedValue,
      totalPendingCount,
      pendingOrdersValue,
      pendingJobsValue,
      totalSalesCount,
      aov,
      totalExpenses,
      paidExpenses,
      pendingExpenses,
      totalPayrollGross,
      totalPayrollNet,
      totalPayrollDeductions,
      totalCosts,
      netProfit,
      profitMargin,
      totalCashInflow,
      totalCashOutflow,
      netCashFlow,
      monthlyCommittedBurnRate,
      activeStaffMonthly,
      activeRecurringMonthly
    };
  }, [scopedOrders, scopedManualJobs, scopedExpenses, scopedPayroll, staff, recurringExpenses, jobItemColumns]);

  // ----------------------------------------------------
  // MONTHLY & PERIOD FINANCIAL TRENDS (Revenue vs Expenses vs Profit)
  // ----------------------------------------------------
  const monthlyFinancialTrends = useMemo(() => {
    // Mode 1: A specific Year and specific Month is chosen (e.g. September 2026)
    if (selectedYear !== 'all' && selectedMonth !== 'all') {
      const yearNum = parseInt(selectedYear, 10);
      const monthNum = parseInt(selectedMonth, 10);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const monthObj = MONTH_OPTIONS.find(m => m.value === selectedMonth);
      const monthShort = monthObj ? monthObj.shortLabel : 'Mo';

      const buckets = [
        { label: `${monthShort} 1–7`, start: 1, end: 7, revenue: 0, expenses: 0, payroll: 0, profit: 0 },
        { label: `${monthShort} 8–14`, start: 8, end: 14, revenue: 0, expenses: 0, payroll: 0, profit: 0 },
        { label: `${monthShort} 15–21`, start: 15, end: 21, revenue: 0, expenses: 0, payroll: 0, profit: 0 },
        { label: `${monthShort} 22–28`, start: 22, end: 28, revenue: 0, expenses: 0, payroll: 0, profit: 0 },
        { label: `${monthShort} 29–${daysInMonth}`, start: 29, end: daysInMonth, revenue: 0, expenses: 0, payroll: 0, profit: 0 }
      ];

      const getBucket = (dateStr?: string) => {
        if (!dateStr) return null;
        let day: number | null = null;
        const match = String(dateStr).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (match) {
          day = parseInt(match[3], 10);
        } else {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) day = d.getDate();
        }
        if (day === null) return null;
        return buckets.find(b => day! >= b.start && day! <= b.end) || null;
      };

      scopedOrders.forEach(o => {
        if (o.status === 'Pending' || o.status === 'Pending Approval' || (o.status as any) === 'Draft' || o.status === 'Canceled') return;
        const b = getBucket(o.createdAt);
        if (b) b.revenue += (o.totalAmount || 0);
      });

      scopedManualJobs.forEach(j => {
        if (j.status === 'Pending' || (j.status as any) === 'Draft' || j.status === 'Canceled') return;
        const b = getBucket(getJobDateStr(j));
        if (b) b.revenue += getJobRevenue(j);
      });

      scopedExpenses.forEach(e => {
        if (e.paymentStatus === 'Voided') return;
        const b = getBucket(e.expenseDate);
        if (b) b.expenses += (e.amount || 0);
      });

      scopedPayroll.forEach(p => {
        if (p.status === 'Voided') return;
        const b = getBucket(p.payDate || p.payPeriodEnd || p.createdAt);
        if (b) b.payroll += (p.grossPay || 0);
      });

      return buckets.map(b => ({
        month: b.label,
        revenue: b.revenue,
        expenses: b.expenses,
        payroll: b.payroll,
        profit: b.revenue - (b.expenses + b.payroll)
      }));
    }

    // Mode 2: A specific Year is chosen, all months
    if (selectedYear !== 'all' && selectedMonth === 'all') {
      const monthBuckets: Record<string, { month: string; revenue: number; expenses: number; payroll: number; profit: number }> = {};
      MONTH_OPTIONS.filter(m => m.value !== 'all').forEach(m => {
        const key = `${selectedYear}-${m.value}`;
        monthBuckets[key] = { month: m.shortLabel, revenue: 0, expenses: 0, payroll: 0, profit: 0 };
      });

      scopedOrders.forEach(o => {
        if (o.status === 'Pending' || o.status === 'Pending Approval' || (o.status as any) === 'Draft' || o.status === 'Canceled') return;
        const key = (o.createdAt || '').slice(0, 7);
        if (monthBuckets[key]) monthBuckets[key].revenue += (o.totalAmount || 0);
      });

      scopedManualJobs.forEach(j => {
        if (j.status === 'Pending' || (j.status as any) === 'Draft' || j.status === 'Canceled') return;
        const key = getJobDateStr(j).slice(0, 7);
        if (monthBuckets[key]) monthBuckets[key].revenue += getJobRevenue(j);
      });

      scopedExpenses.forEach(e => {
        if (e.paymentStatus === 'Voided') return;
        const key = (e.expenseDate || '').slice(0, 7);
        if (monthBuckets[key]) monthBuckets[key].expenses += (e.amount || 0);
      });

      scopedPayroll.forEach(p => {
        if (p.status === 'Voided') return;
        const key = (p.payDate || p.payPeriodEnd || p.createdAt || '').slice(0, 7);
        if (monthBuckets[key]) monthBuckets[key].payroll += (p.grossPay || 0);
      });

      return Object.values(monthBuckets).map(m => ({
        ...m,
        profit: m.revenue - (m.expenses + m.payroll)
      }));
    }

    // Mode 3: Default rolling 6 calendar months
    const monthMap: Record<string, { month: string; revenue: number; expenses: number; payroll: number; profit: number }> = {};

    // Generate last 6 calendar months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      monthMap[key] = { month: label, revenue: 0, expenses: 0, payroll: 0, profit: 0 };
    }

    // Tally Orders (confirmed sales only - exclude Pending, Draft, Pending Approval, Canceled)
    scopedOrders.forEach(o => {
      if (o.status === 'Pending' || o.status === 'Pending Approval' || o.status === 'Draft' as any || o.status === 'Canceled') return;
      const key = (o.createdAt || '').slice(0, 7);
      if (monthMap[key]) {
        monthMap[key].revenue += (o.totalAmount || 0);
      }
    });

    // Tally Standalone Manual Jobs (confirmed sales only - exclude Pending, Draft, Canceled)
    scopedManualJobs.forEach(j => {
      if (j.status === 'Pending' || j.status === 'Draft' as any || j.status === 'Canceled') return;
      const key = getJobDateStr(j).slice(0, 7);
      if (monthMap[key]) {
        monthMap[key].revenue += getJobRevenue(j);
      }
    });

    // Tally Expenses
    scopedExpenses.forEach(e => {
      if (e.paymentStatus === 'Voided') return;
      const key = (e.expenseDate || '').slice(0, 7);
      if (monthMap[key]) {
        monthMap[key].expenses += (e.amount || 0);
      }
    });

    // Tally Payroll
    scopedPayroll.forEach(p => {
      if (p.status === 'Voided') return;
      const key = (p.payDate || '').slice(0, 7);
      if (monthMap[key]) {
        monthMap[key].payroll += (p.grossPay || 0);
      }
    });

    // Compute Net Profit per Month
    return Object.values(monthMap).map(m => ({
      ...m,
      profit: m.revenue - (m.expenses + m.payroll)
    }));
  }, [scopedOrders, scopedManualJobs, scopedExpenses, scopedPayroll, selectedYear, selectedMonth, jobItemColumns]);

  // ----------------------------------------------------
  // EXPENSE CATEGORY DISTRIBUTION
  // ----------------------------------------------------
  const expenseCategoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    scopedExpenses.forEach(e => {
      if (e.paymentStatus !== 'Voided') {
        map[e.category] = (map[e.category] || 0) + (e.amount || 0);
      }
    });

    // Also include Payroll as a primary category
    if (metrics.totalPayrollGross > 0) {
      map['Staff Salaries & Payroll'] = (map['Staff Salaries & Payroll'] || 0) + metrics.totalPayrollGross;
    }

    const colors = ['#000000', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#4b5563'];

    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [scopedExpenses, metrics.totalPayrollGross]);

  // ----------------------------------------------------
  // CLIENT REVENUE LEADERBOARD (Direct Orders + Recognized Manual Jobs)
  // ----------------------------------------------------
  const clientLeaderboard = useMemo(() => {
    const clientMap: Record<string, { name: string; revenue: number; orders: number; manualJobs: number }> = {};
    companies.forEach(c => {
      clientMap[c.name.toLowerCase()] = { name: c.name, revenue: 0, orders: 0, manualJobs: 0 };
    });

    // Tally Direct Company Orders (confirmed sales only)
    scopedOrders.forEach(o => {
      if (o.status === 'Pending' || o.status === 'Pending Approval' || o.status === 'Draft' as any || o.status === 'Canceled') return;
      const key = (o.companyName || 'Direct Client').toLowerCase();
      if (!clientMap[key]) {
        clientMap[key] = { name: o.companyName || 'Direct Client', revenue: 0, orders: 0, manualJobs: 0 };
      }
      clientMap[key].revenue += (o.totalAmount || 0);
      clientMap[key].orders += 1;
    });

    // Tally Standalone Manual Jobs (confirmed sales only)
    scopedManualJobs.forEach(j => {
      if (j.status === 'Pending' || j.status === 'Draft' as any || j.status === 'Canceled') return;
      const coName = j.companyName || j.values?.['col-company'] || 'Direct Production Client';
      const key = coName.toLowerCase();
      if (!clientMap[key]) {
        clientMap[key] = { name: coName, revenue: 0, orders: 0, manualJobs: 0 };
      }
      clientMap[key].revenue += getJobRevenue(j);
      clientMap[key].manualJobs += 1;
    });

    return Object.values(clientMap)
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [companies, scopedOrders, scopedManualJobs, jobItemColumns]);

  // ----------------------------------------------------
  // PRODUCT / MERCHANDISE DEMAND LEADERBOARD
  // ----------------------------------------------------
  const productLeaderboard = useMemo(() => {
    const pMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    // Direct Orders line items (confirmed sales only)
    scopedOrders.forEach(o => {
      if (o.status === 'Pending' || o.status === 'Pending Approval' || o.status === 'Draft' as any || o.status === 'Canceled') return;
      (o.items || []).forEach(it => {
        const name = it.productName || it.productId || 'Item';
        if (!pMap[name]) {
          pMap[name] = { name, quantity: 0, revenue: 0 };
        }
        pMap[name].quantity += (it.quantity || 0);
        pMap[name].revenue += (it.quantity || 0) * (it.price || 0);
      });
    });

    // Standalone Manual Jobs sub-items (confirmed sales only)
    scopedManualJobs.forEach(j => {
      if (j.status === 'Pending' || j.status === 'Draft' as any || j.status === 'Canceled') return;
      if (j.items && j.items.length > 0) {
        j.items.forEach(it => {
          const name = it.values?.['col-sub-design'] || it.values?.['col-sub-garment'] || it.values?.['col-sub-brand'] || j.values?.['col-job-type'] || 'Custom Print Job';
          const qty = calculateSubItemTotalQty(it.values, jobItemColumns) || Number(it.values?.['col-sub-total-qty']) || 1;
          const pieceAmt = Number(it.values?.['col-sub-amount-piece']) || 0;
          const totalAmt = calculateSubItemTotalAmount(it.values, jobItemColumns) || (qty * pieceAmt);

          if (!pMap[name]) {
            pMap[name] = { name, quantity: 0, revenue: 0 };
          }
          pMap[name].quantity += qty;
          pMap[name].revenue += totalAmt;
        });
      } else {
        const name = j.values?.['col-job-type'] || 'Custom Job Order';
        if (!pMap[name]) {
          pMap[name] = { name, quantity: 0, revenue: 0 };
        }
        pMap[name].quantity += 1;
        pMap[name].revenue += getJobRevenue(j);
      }
    });

    return Object.values(pMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [scopedOrders, scopedManualJobs, jobItemColumns]);

  return (
    <div className="space-y-6 font-sans text-left" id="comprehensive-analytics-root">
      {/* View & Period Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4">
        {/* Sub-view Navigation */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setAnalyticsView('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                analyticsView === 'overview' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsView('profit_loss')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                analyticsView === 'profit_loss' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              P&amp;L Breakdown
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsView('cash_flow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                analyticsView === 'cash_flow' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              Cash Flow
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsView('sales_clients')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                analyticsView === 'sales_clients' ? 'bg-black text-white shadow-xs' : 'text-gray-600 hover:text-black'
              }`}
            >
              Sales History
            </button>
          </div>

          {/* Dedicated Year and Month Period Filters */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-1.5 px-1.5 text-[11px] font-mono font-bold text-gray-500 uppercase">
              <Calendar className="w-3.5 h-3.5 text-black" />
              <span className="hidden sm:inline">Period:</span>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1">
              <label htmlFor="analytics-year-select" className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                Year:
              </label>
              <select
                id="analytics-year-select"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono font-bold border border-gray-200 focus:border-black rounded-lg bg-white cursor-pointer shadow-2xs"
              >
                <option value="all">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1">
              <label htmlFor="analytics-month-select" className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                Month:
              </label>
              <select
                id="analytics-month-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono font-bold border border-gray-200 focus:border-black rounded-lg bg-white cursor-pointer shadow-2xs"
              >
                {MONTH_OPTIONS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {(selectedYear !== 'all' || selectedMonth !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear('all');
                  setSelectedMonth('all');
                }}
                className="px-2 py-1 text-[10px] font-mono font-bold text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                title="Reset to all-time"
              >
                Reset
              </button>
            )}
          </div>
        </div>

      {/* ---------------------------------------------------- */}
      {/* 4 PRIMARY EXECUTIVE KPI CARDS                        */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Sales</span>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {metrics.totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 font-mono">
              <span className="font-semibold text-gray-800">
                {metrics.orderCount} Direct Orders ({currencySymbol} {metrics.orderGrossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
              </span>
              <span>+</span>
              <span className="font-semibold text-purple-700">
                {metrics.manualJobCount} Manual Jobs ({currencySymbol} {metrics.manualJobGrossRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })})
              </span>
            </div>
          </div>
        </div>

        {/* Total Cost Outflow (Expenses + Payroll) */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Total Operating Costs</span>
            <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {metrics.totalCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="mt-1 text-[10px] text-gray-500 font-mono">
              Expenses ({currencySymbol} {metrics.totalExpenses.toLocaleString()}) + Payroll ({currencySymbol} {metrics.totalPayrollGross.toLocaleString()})
            </p>
          </div>
        </div>

        {/* Net Profit & Margin */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Net Business Profit</span>
            <div className={`p-2 rounded-lg border ${
              metrics.netProfit >= 0
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className={`text-2xl font-extrabold font-mono ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {currencySymbol} {metrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono">
              <span className={`font-bold ${metrics.profitMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {metrics.profitMargin.toFixed(1)}% Net Margin
              </span>
              <span className="text-gray-400">• Internal Sales - All Costs</span>
            </div>
          </div>
        </div>

        {/* Monthly Fixed Burn Commitment */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Monthly Committed Burn</span>
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {metrics.monthlyCommittedBurnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="mt-1 text-[10px] text-gray-500 font-mono">
              Staff ({currencySymbol} {metrics.activeStaffMonthly.toLocaleString()}) + Rent/Subs ({currencySymbol} {metrics.activeRecurringMonthly.toLocaleString()})
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECONDARY SALES METRIC SUMMARY STRIP                */}
      {/* ---------------------------------------------------- */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-gray-500">Direct Company Orders</div>
              <div className="text-xs font-mono font-extrabold text-black">
                {currencySymbol} {metrics.orderGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({metrics.orderCount} orders)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-gray-500">Recognized Manual Jobs</div>
              <div className="text-xs font-mono font-extrabold text-purple-900">
                {currencySymbol} {metrics.manualJobGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({metrics.manualJobCount} jobs)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <div>
              <div className="text-[10px] font-mono font-bold uppercase text-gray-500">Realized Collections</div>
              <div className="text-xs font-mono font-extrabold text-emerald-800">
                {currencySymbol} {metrics.realizedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {metrics.pipelineRevenue > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-gray-500">In Production Pipeline</div>
                <div className="text-xs font-mono font-extrabold text-amber-800">
                  {currencySymbol} {metrics.pipelineRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {metrics.totalPendingQuotedValue > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-gray-500">Quoted / Pending (Unconfirmed)</div>
                <div className="text-xs font-mono font-extrabold text-gray-700">
                  {currencySymbol} {metrics.totalPendingQuotedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({metrics.totalPendingCount} items)
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-[10px] font-mono font-bold uppercase text-gray-400">Average Transaction Ticket</div>
          <div className="text-xs font-mono font-extrabold text-black">
            {currencySymbol} {metrics.aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* VIEW: OVERVIEW / MAIN CHARTS                         */}
      {/* ---------------------------------------------------- */}
      {(analyticsView === 'overview' || analyticsView === 'profit_loss') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expenses Trend Chart */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
            <div>
              <h4 className="font-extrabold uppercase font-mono text-xs text-black tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Monthly Revenue, Cost &amp; Profit Trajectory
              </h4>
              <p className="text-[10px] text-gray-500 font-mono">
                Historical monthly internal sales (Direct Orders + Manual Jobs) against operating expenses and staff disbursements
              </p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={monthlyFinancialTrends} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => [`${currencySymbol} ${Number(val).toLocaleString()}`, name]}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="revenue" name="Sales" fill="#000000" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="expenses" name="Operating Expenses" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="payroll" name="Payroll Labor" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Category Share Pie Chart */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="font-extrabold uppercase font-mono text-xs text-black tracking-wider flex items-center gap-2">
                <PieChart className="w-4 h-4" />
                Cost &amp; Expense Breakdown
              </h4>
              <p className="text-[10px] text-gray-500 font-mono">
                Proportion of total expenditures across operating categories
              </p>
            </div>

            <div className="h-[200px] w-full flex items-center justify-center">
              {expenseCategoryBreakdown.length === 0 ? (
                <div className="text-gray-400 font-mono text-xs">No cost records logged yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={expenseCategoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseCategoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`${currencySymbol} ${Number(val).toLocaleString()}`, 'Cost Share']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Custom Legend */}
            <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
              {expenseCategoryBreakdown.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-gray-800 font-bold truncate">{cat.name}</span>
                  </div>
                  <span className="text-gray-500 shrink-0 font-bold">
                    {currencySymbol} {cat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW: CASH FLOW BREAKDOWN                            */}
      {/* ---------------------------------------------------- */}
      {(analyticsView === 'overview' || analyticsView === 'cash_flow') && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-6">
          <div>
            <h4 className="font-extrabold uppercase font-mono text-xs text-black tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Cash Inflow vs. Cash Outflow Settlement Matrix
            </h4>
            <p className="text-[10px] text-gray-500 font-mono">
              Liquidity balance comparing realized collections (Completed Direct Orders &amp; Shipped Manual Jobs) against settled payables and disbursed payroll
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Realized Inflow */}
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-emerald-800">Realized Cash Inflow</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-extrabold font-mono text-emerald-900">
                {currencySymbol} {metrics.totalCashInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-emerald-700 font-mono">
                From delivered direct company orders &amp; completed production jobs
              </p>
              {metrics.pipelineRevenue > 0 && (
                <div className="text-[10px] text-emerald-800/80 font-mono pt-2 border-t border-emerald-200">
                  +{currencySymbol} {metrics.pipelineRevenue.toLocaleString()} in active production pipeline
                </div>
              )}
            </div>

            {/* Settled Outflow */}
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-rose-800">Disbursed Cash Outflow</span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
              <h3 className="text-2xl font-extrabold font-mono text-rose-900">
                {currencySymbol} {metrics.totalCashOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-rose-700 font-mono">
                Paid operating expenses + Disbursed staff payroll
              </p>
              {metrics.pendingExpenses > 0 && (
                <div className="text-[10px] text-rose-800/80 font-mono pt-2 border-t border-rose-200">
                  +{currencySymbol} {metrics.pendingExpenses.toLocaleString()} pending supplier payables
                </div>
              )}
            </div>

            {/* Net Operating Cash Position */}
            <div className="bg-neutral-900 text-white rounded-2xl p-5 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-gray-400">Net Realized Cash Position</span>
                <h3 className={`text-2xl font-extrabold font-mono mt-1 ${metrics.netCashFlow >= 0 ? 'text-green-400' : 'text-rose-400'}`}>
                  {currencySymbol} {metrics.netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Net operational liquidity after all settled disbursements
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW: CLIENT & PRODUCT SALES LEADERBOARD             */}
      {/* ---------------------------------------------------- */}
      {(analyticsView === 'overview' || analyticsView === 'sales_clients') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Leaderboard */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
            <div>
              <h4 className="font-extrabold uppercase font-mono text-xs text-black tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4" />
                Top Client Accounts by Internal Volume
              </h4>
              <p className="text-[10px] text-gray-500 font-mono">
                Corporate revenue contribution per client company (Direct Orders + Manual Jobs)
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {clientLeaderboard.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-mono text-xs">No direct company orders or jobs recorded.</div>
              ) : (
                clientLeaderboard.slice(0, 6).map((co, idx) => (
                  <div key={co.name} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-black text-xs">{co.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {co.orders > 0 ? `${co.orders} direct orders` : ''}
                          {co.orders > 0 && co.manualJobs > 0 ? ' • ' : ''}
                          {co.manualJobs > 0 ? `${co.manualJobs} manual jobs` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-extrabold text-black text-xs">
                      {currencySymbol} {co.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Product Leaderboard */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4">
            <div>
              <h4 className="font-extrabold uppercase font-mono text-xs text-black tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4" />
                Top Selling Merchandise by Volume
              </h4>
              <p className="text-[10px] text-gray-500 font-mono">
                Highest demand catalog products from Direct Orders &amp; custom job designs
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {productLeaderboard.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-mono text-xs">No merchandise volume processed.</div>
              ) : (
                productLeaderboard.map((prod, idx) => (
                  <div key={prod.name} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-black text-xs">{prod.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{prod.quantity} units processed</div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-extrabold text-black text-xs">
                      {currencySymbol} {prod.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* VIEW: COMPREHENSIVE UNIFIED SALES HISTORY LEDGER     */}
      {/* ---------------------------------------------------- */}
      {(analyticsView === 'overview' || analyticsView === 'sales_clients') && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-5" id="unified-sales-ledger-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-extrabold uppercase text-black tracking-wider flex items-center gap-2 font-mono">
                <Receipt className="w-4 h-4 text-black" />
                Sales History
              </h3>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                Internal sales history across Direct Orders and recognized Manual Jobs.
              </p>
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                  placeholder="Search Ref #, Client, Items..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-xl font-mono text-black w-48 md:w-56 focus:outline-none"
                />
              </div>

              {/* Source Filter */}
              <select
                value={salesSourceFilter}
                onChange={e => setSalesSourceFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 focus:border-black rounded-xl font-mono text-black font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Internal Sales Sources</option>
                <option value="Direct Company Order">Direct Company Orders Only</option>
                <option value="Manual Job">Manual Jobs Only</option>
              </select>

              {/* Status Filter */}
              <select
                value={salesStatusFilter}
                onChange={e => setSalesStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 focus:border-black rounded-xl font-mono text-black font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="shipped">Shipped</option>
                <option value="in production">In Production</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>

              {/* Sort Filter */}
              <select
                value={salesSort}
                onChange={e => setSalesSort(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 focus:border-black rounded-xl font-mono text-black font-bold focus:outline-none cursor-pointer"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Amount: High to Low</option>
                <option value="amount_low">Amount: Low to High</option>
              </select>
            </div>
          </div>

          {/* Sales Ledger Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-gray-50 text-[10px] uppercase font-mono font-extrabold text-gray-500 border-b border-gray-200 select-none">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4">Source Type</th>
                  <th className="py-3 px-4">Client / Account</th>
                  <th className="py-3 px-4">Description / Items</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Revenue Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredSalesLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400 font-mono text-xs">
                      No internal sales transactions match the specified filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSalesLedger.map((rec) => {
                    const isDirectOrder = rec.sourceType === 'Direct Company Order';
                    const formattedDate = new Date(rec.dateStr).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    return (
                      <tr key={`${rec.sourceType}-${rec.id}`} className="hover:bg-neutral-50/80 transition-colors">
                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-gray-500 whitespace-nowrap text-[11px]">
                          {formattedDate}
                        </td>

                        {/* Reference # */}
                        <td className="py-3.5 px-4 font-mono font-bold text-black whitespace-nowrap">
                          {rec.referenceNumber}
                        </td>

                        {/* Source Type Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isDirectOrder ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-extrabold">
                              <ShoppingBag className="w-3 h-3" />
                              Direct Order
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-mono font-extrabold">
                              <Briefcase className="w-3 h-3" />
                              Manual Job
                            </span>
                          )}
                        </td>

                        {/* Client Account */}
                        <td className="py-3.5 px-4 font-semibold text-black whitespace-nowrap">
                          {rec.companyName}
                        </td>

                        {/* Description / Items */}
                        <td className="py-3.5 px-4 text-gray-600 font-mono text-[11px] max-w-xs truncate" title={rec.itemsSummary}>
                          {rec.itemsSummary}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                            rec.status.toLowerCase().includes('completed') || rec.status.toLowerCase().includes('delivered')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status.toLowerCase().includes('shipped')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : rec.status.toLowerCase().includes('production')
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : rec.status.toLowerCase().includes('approved')
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {rec.status}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-black whitespace-nowrap text-xs">
                          {currencySymbol} {rec.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Sales Ledger Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 font-mono pt-2 gap-2">
            <div>
              Showing <span className="font-bold text-black">{filteredSalesLedger.length}</span> of{' '}
              <span className="font-bold text-black">{unifiedSalesLedger.length}</span> total internal sales transactions
            </div>
            <div className="text-right">
              Filtered Total Revenue:{' '}
              <span className="font-extrabold text-black">
                {currencySymbol} {filteredSalesLedger.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
