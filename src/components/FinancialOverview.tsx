/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Order,
  Job,
  JobItemColumn,
  ExpenseRecord,
  PayrollRecord,
  RecurringExpense,
  SystemSettings
} from '../types';
import { isDirectCompanyOrder } from './AnalyticsDashboard';
import { parseYearMonth, MONTH_OPTIONS } from '../utils/financeFilters';
import {
  getJobRevenue,
  getJobDateStr,
  getJobTotalUnits,
  getOrderTotalUnits,
  calculateRequiredQuota,
  calculateQuotaProgress,
  formatCurrency,
  getRecurringExpensesSummaryForMonth,
  getRecurringExpenseCoveredYears,
  deduplicateRecurringExpenses
} from '../utils/financeCalculations';
import {
  Calendar,
  DollarSign,
  Receipt,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  Settings2,
  Check,
  X,
  Info,
  ChevronDown,
  Repeat
} from 'lucide-react';

interface FinancialOverviewProps {
  orders: Order[];
  jobs?: Job[];
  jobItemColumns?: JobItemColumn[];
  expenses?: ExpenseRecord[];
  payroll?: PayrollRecord[];
  recurringExpenses?: RecurringExpense[];
  systemSettings: SystemSettings;
  onUpdateSystemSettings?: (settings: SystemSettings) => void;
  currencySymbol?: string;
}

export interface MonthlyFinancialRow {
  monthIndex: number; // 1 to 12
  monthName: string;
  monthShort: string;
  sales: number;
  ordersCount: number;
  unitsSold: number;
  expenses: number;
  recordedExpenses: number;
  recurringCommitment: number;
  payroll: number;
  totalCosts: number;
  netResult: number;
  monthlyQuota: number;
  quotaProgress: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
}

export default function FinancialOverview({
  orders = [],
  jobs = [],
  jobItemColumns = [],
  expenses = [],
  payroll = [],
  recurringExpenses = [],
  systemSettings,
  onUpdateSystemSettings,
  currencySymbol = '₱'
}: FinancialOverviewProps) {
  // Current calendar date
  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  const currentCalendarMonth = now.getMonth() + 1; // 1-12

  // 1. Year Selection (Defaults to current calendar year)
  const [selectedYear, setSelectedYear] = useState<number>(() => currentCalendarYear);

  // Scope selector: 'ytd' (Year-to-Date through current month) vs 'fullYear' (Full 12-Month Projection)
  // Defaults to 'ytd' for the active calendar year so unbilled future months are not counted in current expenses
  const [scopeMode, setScopeMode] = useState<'ytd' | 'fullYear'>(() => {
    return selectedYear === currentCalendarYear ? 'ytd' : 'fullYear';
  });

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    if (newYear === currentCalendarYear) {
      setScopeMode('ytd');
    } else {
      setScopeMode('fullYear');
    }
  };

  // Target profit margin % editing
  const targetProfitMargin = systemSettings.targetProfitMargin ?? 30;
  const [isEditingMargin, setIsEditingMargin] = useState(false);
  const [customMarginInput, setCustomMarginInput] = useState<string>(String(targetProfitMargin));
  const [marginSaveSuccess, setMarginSaveSuccess] = useState(false);

  // Responsive view toggle: table vs cards on mobile
  const [mobileViewMode, setMobileViewMode] = useState<'table' | 'cards'>('table');

  // Dynamic available years based on data + current year + recurring schedules
  // Deduplicate recurring expenses to guarantee no double-counting from sync or multiple sources
  const uniqueRecurringExpenses = useMemo(() => {
    return deduplicateRecurringExpenses(recurringExpenses);
  }, [recurringExpenses]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentCalendarYear + 1);
    years.add(currentCalendarYear);
    years.add(currentCalendarYear - 1);
    years.add(currentCalendarYear - 2);

    orders.forEach(o => {
      const p = parseYearMonth(o.createdAt);
      if (p) years.add(p.year);
    });

    (jobs || []).forEach(j => {
      const p = parseYearMonth(getJobDateStr(j));
      if (p) years.add(p.year);
    });

    (expenses || []).forEach(e => {
      const p = parseYearMonth(e.expenseDate || e.date || e.createdAt);
      if (p) years.add(p.year);
    });

    (payroll || []).forEach(pRec => {
      const p = parseYearMonth(pRec.payDate || pRec.payPeriodEnd || pRec.createdAt);
      if (p) years.add(p.year);
    });

    getRecurringExpenseCoveredYears(uniqueRecurringExpenses).forEach(y => {
      years.add(y);
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [orders, jobs, expenses, payroll, uniqueRecurringExpenses, currentCalendarYear]);

  // Handle saving configured Target Profit Margin %
  const handleSaveMargin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(customMarginInput);
    if (!isNaN(num) && num >= 0 && num <= 99) {
      if (onUpdateSystemSettings) {
        onUpdateSystemSettings({
          ...systemSettings,
          targetProfitMargin: Math.round(num * 10) / 10
        });
      }
      setIsEditingMargin(false);
      setMarginSaveSuccess(true);
      setTimeout(() => setMarginSaveSuccess(false), 3000);
    }
  };

  // ----------------------------------------------------
  // QUALIFYING SALES, ORDERS, UNITS (Reuse existing Analytics rules)
  // ----------------------------------------------------
  const qualifyingOrdersForYear = useMemo(() => {
    // 1. Must be direct company order (no storefront / portals)
    const directOnly = orders.filter(o => isDirectCompanyOrder(o));

    // 2. Confirmed sales only (exclude Pending, Pending Approval, Draft, Canceled)
    return directOnly.filter(o => {
      if (
        o.status === 'Pending' ||
        o.status === 'Pending Approval' ||
        (o.status as any) === 'Draft' ||
        o.status === 'Canceled'
      ) {
        return false;
      }
      const parsed = parseYearMonth(o.createdAt);
      return parsed && parsed.year === selectedYear;
    });
  }, [orders, selectedYear]);

  const qualifyingJobsForYear = useMemo(() => {
    const directOrders = orders.filter(o => isDirectCompanyOrder(o));
    const orderIdSet = new Set(directOrders.map(o => o.id));
    const orderNumSet = new Set(directOrders.map(o => (o.orderNumber || '').toLowerCase().trim()));

    return (jobs || []).filter(j => {
      // Exclude if linked to an existing direct order (anti-double-counting)
      const hasMatchingOrderId = Boolean(j.orderId && orderIdSet.has(j.orderId));
      const hasMatchingOrderNum = Boolean(j.orderNumber && orderNumSet.has(j.orderNumber.toLowerCase().trim()));
      if (hasMatchingOrderId || hasMatchingOrderNum || j.source === 'Company Order') {
        return false;
      }

      // Exclude if associated with storefront/portal
      if ((j as any).portalId || (j as any).portalName || (j as any).storefrontId || (j as any).isPortalJob) {
        return false;
      }
      if ((j.source as any) === 'Custom Storefront' || (j.source as any) === 'Order Portal' || (j as any).sourceType === 'Storefront' || (j as any).sourceType === 'Order Portal') {
        return false;
      }

      // Confirmed sales only
      if (j.status === 'Pending' || (j.status as any) === 'Draft' || j.status === 'Canceled') {
        return false;
      }

      const parsed = parseYearMonth(getJobDateStr(j));
      return parsed && parsed.year === selectedYear;
    });
  }, [jobs, orders, selectedYear]);

  // ----------------------------------------------------
  // QUALIFYING EXPENSES FOR YEAR
  // ----------------------------------------------------
  const qualifyingExpensesForYear = useMemo(() => {
    return (expenses || []).filter(e => {
      if ((e.paymentStatus || e.status) === 'Voided') return false;
      const parsed = parseYearMonth(e.expenseDate || e.date || e.createdAt);
      return parsed && parsed.year === selectedYear;
    });
  }, [expenses, selectedYear]);

  // ----------------------------------------------------
  // QUALIFYING PAYROLL FOR YEAR
  // ----------------------------------------------------
  const qualifyingPayrollForYear = useMemo(() => {
    return (payroll || []).filter(p => {
      if (p.status === 'Voided') return false;
      const parsed = parseYearMonth(p.payDate || p.payPeriodEnd || p.createdAt);
      return parsed && parsed.year === selectedYear;
    });
  }, [payroll, selectedYear]);

  // ----------------------------------------------------
  // MONTHLY BREAKDOWN (January - December)
  // ----------------------------------------------------
  const monthlyData = useMemo<MonthlyFinancialRow[]>(() => {
    const rows: MonthlyFinancialRow[] = [];
    const monthsDef = MONTH_OPTIONS.filter(m => m.value !== 'all');

    monthsDef.forEach((mOpt, idx) => {
      const monthNum = idx + 1; // 1 to 12

      // Orders for this month
      const monthOrders = qualifyingOrdersForYear.filter(o => {
        const p = parseYearMonth(o.createdAt);
        return p && p.month === monthNum;
      });

      // Jobs for this month
      const monthJobs = qualifyingJobsForYear.filter(j => {
        const p = parseYearMonth(getJobDateStr(j));
        return p && p.month === monthNum;
      });

      // Sales = Order Amounts + Manual Job Amounts
      const orderSales = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const jobSales = monthJobs.reduce((sum, j) => sum + getJobRevenue(j, jobItemColumns), 0);
      const sales = orderSales + jobSales;

      // Orders Count = Orders + Standalone Jobs
      const ordersCount = monthOrders.length + monthJobs.length;

      // Units Sold
      const orderUnits = monthOrders.reduce((sum, o) => sum + getOrderTotalUnits(o), 0);
      const jobUnits = monthJobs.reduce((sum, j) => sum + getJobTotalUnits(j, jobItemColumns), 0);
      const unitsSold = orderUnits + jobUnits;

      // Expenses
      // 1. Actual recorded vouchers for this month
      const monthRecordedExpenses = qualifyingExpensesForYear.filter(e => {
        const p = parseYearMonth(e.expenseDate || e.date || e.createdAt);
        return p && p.month === monthNum;
      });
      const recordedExpensesSum = monthRecordedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // 2. Active recurring schedules for this month (avoiding double-counting)
      const recurringSummary = getRecurringExpensesSummaryForMonth(
        uniqueRecurringExpenses,
        selectedYear,
        monthNum,
        monthRecordedExpenses
      );

      const isCurrentMonth = selectedYear === currentCalendarYear && monthNum === currentCalendarMonth;
      const isFutureMonth = selectedYear === currentCalendarYear ? monthNum > currentCalendarMonth : selectedYear > currentCalendarYear;

      // In Year-to-Date mode:
      // Future months have not occurred yet. Unmaterialized recurring commitments for future months
      // are future obligations for planning target sales quota, NOT realized operating expenses for this month.
      const recognizedRecurring = (isFutureMonth && scopeMode === 'ytd') ? 0 : recurringSummary.unmaterializedAmount;
      const monthExpenses = recordedExpensesSum + recognizedRecurring;

      // Payroll
      const monthPayroll = qualifyingPayrollForYear
        .filter(p => {
          const parsed = parseYearMonth(p.payDate || p.payPeriodEnd || p.createdAt);
          return parsed && parsed.month === monthNum;
        })
        .reduce((sum, p) => sum + (p.grossPay || 0), 0);

      // Total Costs = Expenses + Payroll
      const totalCosts = monthExpenses + monthPayroll;

      // Net Result = Sales - Total Costs
      const netResult = sales - totalCosts;

      // Monthly Quota = Total Costs / (1 - Target Profit Margin)
      // For quota planning in future months, base quota on full scheduled commitments (scheduled expenses + payroll)
      const plannedCostsForQuota = isFutureMonth && scopeMode === 'ytd'
        ? (recordedExpensesSum + recurringSummary.unmaterializedAmount + monthPayroll)
        : totalCosts;
      const monthlyQuota = calculateRequiredQuota(plannedCostsForQuota, targetProfitMargin);

      // Quota Progress %
      const quotaProgress = calculateQuotaProgress(sales, monthlyQuota);

      rows.push({
        monthIndex: monthNum,
        monthName: mOpt.label,
        monthShort: mOpt.shortLabel,
        sales,
        ordersCount,
        unitsSold,
        expenses: monthExpenses,
        recordedExpenses: recordedExpensesSum,
        recurringCommitment: recurringSummary.unmaterializedAmount,
        payroll: monthPayroll,
        totalCosts,
        netResult,
        monthlyQuota,
        quotaProgress,
        isCurrentMonth,
        isFutureMonth
      });
    });

    return rows;
  }, [
    qualifyingOrdersForYear,
    qualifyingJobsForYear,
    qualifyingExpensesForYear,
    qualifyingPayrollForYear,
    uniqueRecurringExpenses,
    jobItemColumns,
    targetProfitMargin,
    selectedYear,
    currentCalendarYear,
    currentCalendarMonth,
    scopeMode
  ]);

  // ----------------------------------------------------
  // ANNUAL SUMMARY (Calculated from active scope rows)
  // ----------------------------------------------------
  const activeSummaryRows = useMemo(() => {
    if (scopeMode === 'ytd' && selectedYear === currentCalendarYear) {
      return monthlyData.filter(m => m.monthIndex <= currentCalendarMonth);
    }
    return monthlyData;
  }, [monthlyData, scopeMode, selectedYear, currentCalendarYear, currentCalendarMonth]);

  const annualSummary = useMemo(() => {
    const totalSales = activeSummaryRows.reduce((sum, m) => sum + m.sales, 0);
    const totalOrders = activeSummaryRows.reduce((sum, m) => sum + m.ordersCount, 0);
    const totalUnitsSold = activeSummaryRows.reduce((sum, m) => sum + m.unitsSold, 0);
    const totalExpenses = activeSummaryRows.reduce((sum, m) => sum + m.expenses, 0);
    const totalRecordedExpenses = activeSummaryRows.reduce((sum, m) => sum + m.recordedExpenses, 0);
    const totalRecurringCommitment = activeSummaryRows.reduce((sum, m) => sum + m.recurringCommitment, 0);
    const totalPayroll = activeSummaryRows.reduce((sum, m) => sum + m.payroll, 0);
    const totalCosts = totalExpenses + totalPayroll;
    const netResult = totalSales - totalCosts;
    const annualQuota = activeSummaryRows.reduce((sum, m) => sum + m.monthlyQuota, 0);
    const overallQuotaProgress = calculateQuotaProgress(totalSales, annualQuota);
    const actualProfitMargin = totalSales > 0 ? (netResult / totalSales) * 100 : 0;

    return {
      totalSales,
      totalOrders,
      totalUnitsSold,
      totalExpenses,
      totalRecordedExpenses,
      totalRecurringCommitment,
      totalPayroll,
      totalCosts,
      netResult,
      annualQuota,
      overallQuotaProgress,
      actualProfitMargin
    };
  }, [activeSummaryRows]);

  // Helper for Quota Status Badge
  const renderQuotaStatusBadge = (progress: number, quota: number, sales: number) => {
    if (quota === 0) {
      if (sales > 0) {
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Check className="w-3 h-3" />
            <span>Zero Costs (100% Margin)</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
          <span>No Quota</span>
        </span>
      );
    }

    if (progress >= 100) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Achieved ({progress.toFixed(0)}%)</span>
        </span>
      );
    }
    if (progress >= 70) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Approaching ({progress.toFixed(0)}%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        <span>Behind ({progress.toFixed(0)}%)</span>
      </span>
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Month',
      'Sales',
      'Orders',
      'Units Sold',
      'Expenses',
      'Payroll',
      'Total Costs',
      'Net Result',
      'Monthly Quota',
      'Quota Progress %'
    ];

    const csvRows = monthlyData.map(r => [
      `"${r.monthName}"`,
      r.sales.toFixed(2),
      r.ordersCount,
      r.unitsSold,
      r.expenses.toFixed(2),
      r.payroll.toFixed(2),
      r.totalCosts.toFixed(2),
      r.netResult.toFixed(2),
      r.monthlyQuota.toFixed(2),
      `${r.quotaProgress.toFixed(1)}%`
    ]);

    // Add Annual / YTD Total row
    csvRows.push([
      scopeMode === 'ytd' && selectedYear === currentCalendarYear
        ? `"YTD Total ${selectedYear}"`
        : `"Annual Total ${selectedYear}"`,
      annualSummary.totalSales.toFixed(2),
      annualSummary.totalOrders,
      annualSummary.totalUnitsSold,
      annualSummary.totalExpenses.toFixed(2),
      annualSummary.totalPayroll.toFixed(2),
      annualSummary.totalCosts.toFixed(2),
      annualSummary.netResult.toFixed(2),
      annualSummary.annualQuota.toFixed(2),
      `${annualSummary.overallQuotaProgress.toFixed(1)}%`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ARH_Financial_Overview_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="financial-overview-container">
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* TOP HEADER CONTROLS: Year Selector + Target Margin Setting + Export */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-gray-100">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-black text-white flex items-center justify-center font-bold shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-black">
                  Financial Overview
                </h1>
                <p className="text-xs text-gray-500 font-mono">
                  Monthly performance analysis, costs breakdown &amp; quota tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Year Selector */}
            <div className="flex items-center bg-gray-50 border border-black rounded-2xl px-3.5 py-2 shadow-2xs">
              <Calendar className="w-4 h-4 text-black mr-2 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mr-2">Year:</span>
              <div className="relative">
                <select
                  id="financial-year-selector"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                  className="appearance-none bg-white text-black font-sans font-extrabold text-sm px-3 py-1 pr-8 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                  aria-label="Select Financial Year"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>
                      {yr} {yr === currentCalendarYear ? '(Current Year)' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            {/* Scope Selector: YTD vs Full Year */}
            {selectedYear === currentCalendarYear && (
              <div className="flex items-center bg-gray-100 border border-gray-300 rounded-2xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setScopeMode('ytd')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    scopeMode === 'ytd'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                  id="btn-scope-ytd"
                  title="View Year-to-Date performance through current month"
                >
                  Year to Date (YTD)
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('fullYear')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    scopeMode === 'fullYear'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                  id="btn-scope-fullyear"
                  title="View Full Year (12 Months) including scheduled commitments"
                >
                  Full Year (12M)
                </button>
              </div>
            )}

            {/* Target Margin Pill / Configurator */}
            <div className="relative">
              {!isEditingMargin ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomMarginInput(String(targetProfitMargin));
                    setIsEditingMargin(true);
                  }}
                  className="flex items-center space-x-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-2xl px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-wider text-gray-700 transition-all cursor-pointer shadow-2xs"
                  id="btn-edit-target-margin"
                  title="Click to configure Target Profit Margin %"
                >
                  <Target className="w-4 h-4 text-black" />
                  <span>Target Margin:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-black text-white font-mono text-xs font-bold">
                    {targetProfitMargin}%
                  </span>
                  <Settings2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              ) : (
                <form
                  onSubmit={handleSaveMargin}
                  className="flex items-center space-x-2 bg-white border-2 border-black rounded-2xl p-1.5 shadow-md"
                >
                  <span className="text-xs font-bold uppercase pl-2 text-black">Margin:</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    step="1"
                    autoFocus
                    value={customMarginInput}
                    onChange={(e) => setCustomMarginInput(e.target.value)}
                    className="w-16 px-2 py-1 text-sm font-mono font-bold text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                    id="input-target-margin"
                  />
                  <span className="font-bold text-sm">%</span>
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Save Target Margin"
                    id="btn-save-target-margin"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingMargin(false)}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center space-x-2 bg-white hover:bg-gray-100 border border-black text-black px-4 py-2.5 rounded-2xl text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-98"
              id="btn-export-financial-csv"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {marginSaveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Target Profit Margin updated to {targetProfitMargin}% and saved successfully.</span>
          </div>
        )}

        {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
        {/* FINANCIAL SUMMARY CARDS (Top of the page - Section 15) */}
        {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Card 1: Total Sales */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4.5 shadow-2xs hover:border-black transition-all">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider">
                Total Sales{scopeMode === 'ytd' && selectedYear === currentCalendarYear ? ' (YTD)' : ''}
              </span>
              <TrendingUp className="w-4 h-4 text-black" />
            </div>
            <div className="text-xl font-bold font-sans text-black truncate" title={formatCurrency(annualSummary.totalSales, currencySymbol)}>
              {formatCurrency(annualSummary.totalSales, currencySymbol)}
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-1">
              {annualSummary.totalOrders} {annualSummary.totalOrders === 1 ? 'order' : 'orders'} · {annualSummary.totalUnitsSold.toLocaleString()} units
            </div>
          </div>

          {/* Card 2: Total Expenses */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4.5 shadow-2xs hover:border-black transition-all">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider">
                Total Expenses{scopeMode === 'ytd' && selectedYear === currentCalendarYear ? ' (YTD)' : ''}
              </span>
              <Receipt className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-xl font-bold font-sans text-black truncate" title={formatCurrency(annualSummary.totalExpenses, currencySymbol)}>
              {formatCurrency(annualSummary.totalExpenses, currencySymbol)}
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-1 truncate">
              {annualSummary.totalRecurringCommitment > 0
                ? `incl. ${formatCurrency(annualSummary.totalRecurringCommitment, currencySymbol)} recurring${scopeMode === 'fullYear' && selectedYear === currentCalendarYear ? ' (Full Year)' : ''}`
                : 'Recorded operating outlays'}
            </div>
          </div>

          {/* Card 3: Total Payroll */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4.5 shadow-2xs hover:border-black transition-all">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider">
                Total Payroll{scopeMode === 'ytd' && selectedYear === currentCalendarYear ? ' (YTD)' : ''}
              </span>
              <Users className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-xl font-bold font-sans text-black truncate" title={formatCurrency(annualSummary.totalPayroll, currencySymbol)}>
              {formatCurrency(annualSummary.totalPayroll, currencySymbol)}
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-1">
              Gross wages &amp; compensation
            </div>
          </div>

          {/* Card 4: Net Result */}
          <div className={`border rounded-2xl p-4.5 shadow-2xs transition-all ${
            annualSummary.netResult >= 0
              ? 'bg-emerald-50/50 border-emerald-300'
              : 'bg-rose-50/50 border-rose-300'
          }`}>
            <div className="flex items-center justify-between text-gray-600 mb-1.5">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider">
                Net Result{scopeMode === 'ytd' && selectedYear === currentCalendarYear ? ' (YTD)' : ''}
              </span>
              {annualSummary.netResult >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-700" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-700" />
              )}
            </div>
            <div className={`text-xl font-bold font-sans truncate ${
              annualSummary.netResult >= 0 ? 'text-emerald-900' : 'text-rose-900'
            }`} title={formatCurrency(annualSummary.netResult, currencySymbol)}>
              {annualSummary.netResult < 0 ? '-' : ''}
              {formatCurrency(Math.abs(annualSummary.netResult), currencySymbol)}
            </div>
            <div className="text-[11px] font-mono text-gray-600 mt-1 flex items-center justify-between">
              <span>{annualSummary.netResult >= 0 ? 'Profit' : 'Loss'}</span>
              <span className="font-bold">
                {annualSummary.actualProfitMargin.toFixed(1)}% margin
              </span>
            </div>
          </div>

          {/* Card 5: Target Quota */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4.5 shadow-2xs hover:border-black transition-all">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider">
                {scopeMode === 'ytd' && selectedYear === currentCalendarYear ? 'Target Quota (YTD)' : 'Annual Quota'}
              </span>
              <Target className="w-4 h-4 text-black" />
            </div>
            <div className="text-xl font-bold font-sans text-black truncate" title={formatCurrency(annualSummary.annualQuota, currencySymbol)}>
              {formatCurrency(annualSummary.annualQuota, currencySymbol)}
            </div>
            <div className="text-[11px] font-mono text-gray-500 mt-1">
              @{targetProfitMargin}% target margin
            </div>
          </div>

          {/* Card 6: Quota Progress */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4.5 shadow-2xs hover:border-black transition-all">
            <div className="flex items-center justify-between text-gray-500 mb-1.5">
              <span className="text-[11px] font-sans font-bold uppercase tracking-wider">
                Quota Progress{scopeMode === 'ytd' && selectedYear === currentCalendarYear ? ' (YTD)' : ''}
              </span>
              <span className="text-[11px] font-mono font-bold text-black">
                {annualSummary.overallQuotaProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mt-2 mb-2">
              <div
                className={`h-full transition-all duration-500 ${
                  annualSummary.overallQuotaProgress >= 100
                    ? 'bg-emerald-600'
                    : annualSummary.overallQuotaProgress >= 70
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(annualSummary.overallQuotaProgress, 100)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-gray-600">
              {annualSummary.overallQuotaProgress >= 100 ? (
                <span className="text-emerald-700 font-bold">Quota Met</span>
              ) : annualSummary.overallQuotaProgress >= 70 ? (
                <span className="text-amber-700 font-bold">Approaching Target</span>
              ) : (
                <span className="text-rose-700 font-bold">Behind Target</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      {/* MONTHLY FINANCIAL TABLE (Section 3) */}
      {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
      <div className="bg-white border border-black rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight text-black flex items-center space-x-2">
              <span>Monthly Financial Performance</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-300">
                {selectedYear}
              </span>
            </h2>
            <p className="text-xs text-gray-500 font-mono">
              January to December financial breakdown and calculated target margin sales quotas
            </p>
          </div>

          {/* Mobile view switcher */}
          <div className="sm:hidden flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setMobileViewMode('table')}
              className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${
                mobileViewMode === 'table' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('cards')}
              className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border ${
                mobileViewMode === 'cards' ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Responsive Table View */}
        <div className={`${mobileViewMode === 'cards' ? 'hidden sm:block' : 'block'} overflow-x-auto border border-gray-200 rounded-2xl`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 text-black border-b border-black text-[11px] font-sans font-extrabold uppercase tracking-wider">
                <th className="py-3.5 px-4 sticky left-0 bg-gray-50 z-10">Month</th>
                <th className="py-3.5 px-3 text-right">Sales</th>
                <th className="py-3.5 px-3 text-center">Orders</th>
                <th className="py-3.5 px-3 text-center">Units Sold</th>
                <th className="py-3.5 px-3 text-right">Expenses</th>
                <th className="py-3.5 px-3 text-right">Payroll</th>
                <th className="py-3.5 px-3 text-right font-bold text-gray-900">Total Costs</th>
                <th className="py-3.5 px-3 text-right font-bold">Net Result</th>
                <th className="py-3.5 px-3 text-right">Monthly Quota</th>
                <th className="py-3.5 px-4 text-center">Quota Progress %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {monthlyData.map((row) => {
                const isLoss = row.netResult < 0;
                const isProfit = row.netResult > 0;

                return (
                  <tr
                    key={row.monthIndex}
                    className={`hover:bg-gray-50/80 transition-colors ${
                      row.isCurrentMonth
                        ? 'bg-blue-50/40 font-semibold'
                        : ''
                    }`}
                  >
                    {/* 1. Month */}
                    <td className={`py-3.5 px-4 font-sans font-bold uppercase text-black sticky left-0 z-10 ${
                      row.isCurrentMonth ? 'bg-blue-50/90 border-l-4 border-blue-600' : 'bg-white'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span>{row.monthName}</span>
                        {row.isCurrentMonth && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-sans uppercase font-bold tracking-wider">
                            Current
                          </span>
                        )}
                        {row.isFutureMonth && row.sales === 0 && row.totalCosts === 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 font-sans uppercase">
                            Upcoming
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Sales */}
                    <td className="py-3.5 px-3 text-right text-black font-bold">
                      {formatCurrency(row.sales, currencySymbol)}
                    </td>

                    {/* 3. Orders */}
                    <td className="py-3.5 px-3 text-center text-gray-700">
                      {row.ordersCount}
                    </td>

                    {/* 4. Units Sold */}
                    <td className="py-3.5 px-3 text-center text-gray-700">
                      {row.unitsSold.toLocaleString()}
                    </td>

                    {/* 5. Expenses */}
                    <td className="py-3.5 px-3 text-right text-gray-700">
                      <div>{formatCurrency(row.expenses, currencySymbol)}</div>
                      {row.recurringCommitment > 0 && (
                        <div
                          className={`text-[10px] font-sans font-medium tracking-tight ${
                            row.isFutureMonth && scopeMode === 'ytd' ? 'text-gray-400' : 'text-indigo-600'
                          }`}
                          title={`${row.isFutureMonth && scopeMode === 'ytd' ? 'Scheduled future commitment' : 'Includes scheduled recurring commitment'}: ${formatCurrency(row.recurringCommitment, currencySymbol)}`}
                        >
                          {row.isFutureMonth && scopeMode === 'ytd'
                            ? `~${formatCurrency(row.recurringCommitment, currencySymbol)} scheduled`
                            : `incl. ${formatCurrency(row.recurringCommitment, currencySymbol)} rec`}
                        </div>
                      )}
                    </td>

                    {/* 6. Payroll */}
                    <td className="py-3.5 px-3 text-right text-gray-700">
                      {formatCurrency(row.payroll, currencySymbol)}
                    </td>

                    {/* 7. Total Costs */}
                    <td className="py-3.5 px-3 text-right font-bold text-gray-900 bg-gray-50/50">
                      {formatCurrency(row.totalCosts, currencySymbol)}
                    </td>

                    {/* 8. Net Result */}
                    <td className={`py-3.5 px-3 text-right font-bold ${
                      isProfit
                        ? 'text-emerald-700'
                        : isLoss
                        ? 'text-rose-700'
                        : 'text-gray-500'
                    }`}>
                      {isLoss ? '-' : ''}
                      {formatCurrency(Math.abs(row.netResult), currencySymbol)}
                    </td>

                    {/* 9. Monthly Quota */}
                    <td className="py-3.5 px-3 text-right text-gray-800">
                      {formatCurrency(row.monthlyQuota, currencySymbol)}
                    </td>

                    {/* 10. Quota Progress % */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs">
                            {row.quotaProgress.toFixed(1)}%
                          </span>
                          {renderQuotaStatusBadge(row.quotaProgress, row.monthlyQuota, row.sales)}
                        </div>
                        {row.monthlyQuota > 0 && (
                          <div className="w-24 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                row.quotaProgress >= 100
                                  ? 'bg-emerald-600'
                                  : row.quotaProgress >= 70
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(row.quotaProgress, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ---------------------------------------------------- */}
            {/* ANNUAL / YTD TOTAL FOOTER ROW */}
            {/* ---------------------------------------------------- */}
            <tfoot>
              <tr className="bg-black text-white font-mono font-bold text-xs border-t-2 border-black">
                <td className="py-4 px-4 font-sans uppercase tracking-wider sticky left-0 bg-black z-10">
                  {scopeMode === 'ytd' && selectedYear === currentCalendarYear
                    ? `YTD Total (Jan – ${MONTH_OPTIONS.find(m => m.value === String(currentCalendarMonth).padStart(2, '0'))?.shortLabel || 'Sep'} ${selectedYear})`
                    : `Annual Total (${selectedYear})`}
                </td>
                <td className="py-4 px-3 text-right font-bold text-white text-sm">
                  {formatCurrency(annualSummary.totalSales, currencySymbol)}
                </td>
                <td className="py-4 px-3 text-center text-white">
                  {annualSummary.totalOrders}
                </td>
                <td className="py-4 px-3 text-center text-white">
                  {annualSummary.totalUnitsSold.toLocaleString()}
                </td>
                <td className="py-4 px-3 text-right text-gray-200">
                  <div>{formatCurrency(annualSummary.totalExpenses, currencySymbol)}</div>
                  {annualSummary.totalRecurringCommitment > 0 && (
                    <div className="text-[10px] font-sans text-indigo-300 font-normal">
                      incl. {formatCurrency(annualSummary.totalRecurringCommitment, currencySymbol)} rec{scopeMode === 'fullYear' && selectedYear === currentCalendarYear ? ' (Full Year)' : ''}
                    </div>
                  )}
                </td>
                <td className="py-4 px-3 text-right text-gray-200">
                  {formatCurrency(annualSummary.totalPayroll, currencySymbol)}
                </td>
                <td className="py-4 px-3 text-right font-bold text-gray-100">
                  {formatCurrency(annualSummary.totalCosts, currencySymbol)}
                </td>
                <td className={`py-4 px-3 text-right font-bold text-sm ${
                  annualSummary.netResult >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {annualSummary.netResult < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(annualSummary.netResult), currencySymbol)}
                </td>
                <td className="py-4 px-3 text-right text-gray-200 font-bold">
                  {formatCurrency(annualSummary.annualQuota, currencySymbol)}
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <span className="font-extrabold text-sm text-white">
                      {annualSummary.overallQuotaProgress.toFixed(1)}%
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      annualSummary.overallQuotaProgress >= 100
                        ? 'bg-emerald-500 text-white'
                        : annualSummary.overallQuotaProgress >= 70
                        ? 'bg-amber-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {annualSummary.overallQuotaProgress >= 100
                        ? 'Achieved'
                        : annualSummary.overallQuotaProgress >= 70
                        ? 'Approaching'
                        : 'Behind Target'}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Cards View (Only visible on small screens when selected) */}
        <div className={`${mobileViewMode === 'cards' ? 'block sm:hidden' : 'hidden'} space-y-4`}>
          {monthlyData.map((row) => {
            const isLoss = row.netResult < 0;
            return (
              <div
                key={`card-${row.monthIndex}`}
                className={`border rounded-2xl p-4 space-y-3 ${
                  row.isCurrentMonth
                    ? 'border-blue-500 bg-blue-50/20'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold uppercase text-sm text-black">{row.monthName}</span>
                    {row.isCurrentMonth && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white font-bold uppercase">
                        Current
                      </span>
                    )}
                  </div>
                  <div>
                    {renderQuotaStatusBadge(row.quotaProgress, row.monthlyQuota, row.sales)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Sales</span>
                    <span className="font-mono font-bold text-black text-sm">
                      {formatCurrency(row.sales, currencySymbol)}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 block">
                      {row.ordersCount} orders · {row.unitsSold} units
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Total Costs</span>
                    <span className="font-mono font-bold text-gray-900 text-sm">
                      {formatCurrency(row.totalCosts, currencySymbol)}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 block">
                      Exp: {formatCurrency(row.expenses, currencySymbol)} {row.recurringCommitment > 0 ? `(incl. ${formatCurrency(row.recurringCommitment, currencySymbol)} rec)` : ''} | Pay: {formatCurrency(row.payroll, currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Net Result</span>
                    <span className={`font-mono font-bold text-sm ${isLoss ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isLoss ? '-' : ''}{formatCurrency(Math.abs(row.netResult), currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 text-[10px] uppercase font-bold block">Monthly Quota</span>
                    <span className="font-mono font-bold text-black text-sm">
                      {formatCurrency(row.monthlyQuota, currencySymbol)}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 block">
                      Progress: {row.quotaProgress.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile Annual / YTD Summary Card */}
          <div className="bg-black text-white border-2 border-black rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/20 pb-2">
              <span className="font-bold uppercase tracking-wider text-sm">
                {scopeMode === 'ytd' && selectedYear === currentCalendarYear
                  ? `YTD Total (${selectedYear})`
                  : `Annual Total (${selectedYear})`}
              </span>
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-white text-black">
                {annualSummary.overallQuotaProgress.toFixed(1)}% Quota
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-gray-400 text-[10px] uppercase block">Sales</span>
                <span className="text-sm font-bold">{formatCurrency(annualSummary.totalSales, currencySymbol)}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase block">Total Costs</span>
                <span className="text-sm font-bold">{formatCurrency(annualSummary.totalCosts, currencySymbol)}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase block">Net Result</span>
                <span className={`text-sm font-bold ${annualSummary.netResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {annualSummary.netResult < 0 ? '-' : ''}{formatCurrency(Math.abs(annualSummary.netResult), currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] uppercase block">Annual Quota</span>
                <span className="text-sm font-bold">{formatCurrency(annualSummary.annualQuota, currencySymbol)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
        {/* CALCULATION LOGIC & TRANSPARENCY EXPLAINER CARD */}
        {/* ------------------------------------------------------------------------------------------------------------------------------------------------------ */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-600 space-y-2">
          <div className="flex items-center space-x-2 text-black font-bold uppercase text-[11px] tracking-wider">
            <Info className="w-4 h-4 text-black shrink-0" />
            <span>Financial Overview Calculation Rules &amp; Methodologies</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-[11px] pt-1">
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <span className="font-bold text-black block mb-1 font-sans uppercase">1. Sales &amp; Costs</span>
              <p className="text-gray-500 leading-relaxed">
                Sales: Recognized corporate orders + standalone production jobs (pending &amp; canceled excluded).
                Costs: Operating expenses + Gross staff payroll.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <span className="font-bold text-black block mb-1 font-sans uppercase">2. Quota Formula</span>
              <p className="text-gray-500 leading-relaxed">
                Required Sales Quota = Total Costs / (1 - Target Margin %).
                At {targetProfitMargin}% target margin, required sales cover costs plus {targetProfitMargin}% retainable business profit.
              </p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <span className="font-bold text-black block mb-1 font-sans uppercase">3. Quota Progress</span>
              <p className="text-gray-500 leading-relaxed">
                Progress % = Sales / Quota × 100.
                &gt;100% indicates quota exceeded. Months with zero costs safely display 0% or 100% margin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
