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
  SystemSettings
} from '../types';
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
  Sparkles
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
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend
} from 'recharts';

interface AnalyticsDashboardProps {
  orders: Order[];
  companies: CompanyProfile[];
  products: Product[];
  staff?: StaffMember[];
  payroll?: PayrollRecord[];
  expenses?: ExpenseRecord[];
  recurringExpenses?: RecurringExpense[];
  expenseCategories?: ExpenseCategory[];
  systemSettings: SystemSettings;
  currencySymbol?: string;
}

export default function AnalyticsDashboard({
  orders = [],
  companies = [],
  products = [],
  staff = [],
  payroll = [],
  expenses = [],
  recurringExpenses = [],
  expenseCategories = [],
  systemSettings,
  currencySymbol = 'Php'
}: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'all' | '30days' | '90days' | 'this_year'>('all');
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'profit_loss' | 'cash_flow' | 'sales_clients'>('overview');

  // Filter records based on selected timeRange
  const filterDateCutoff = useMemo(() => {
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
  }, [timeRange]);

  const scopedOrders = useMemo(() => {
    if (!filterDateCutoff) return orders;
    return orders.filter(o => new Date(o.createdAt).getTime() >= filterDateCutoff.getTime());
  }, [orders, filterDateCutoff]);

  const scopedExpenses = useMemo(() => {
    if (!filterDateCutoff) return expenses;
    return expenses.filter(e => new Date(e.expenseDate).getTime() >= filterDateCutoff.getTime());
  }, [expenses, filterDateCutoff]);

  const scopedPayroll = useMemo(() => {
    if (!filterDateCutoff) return payroll;
    return payroll.filter(p => new Date(p.payDate).getTime() >= filterDateCutoff.getTime());
  }, [payroll, filterDateCutoff]);

  // ----------------------------------------------------
  // FINANCIAL TOTALS & METRICS
  // ----------------------------------------------------
  const metrics = useMemo(() => {
    // 1. Revenue Calculations
    const validOrders = scopedOrders.filter(o => o.status !== 'Pending Approval' && o.status !== 'Draft' as any);
    const totalGrossRevenue = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const realizedRevenue = validOrders
      .filter(o => o.status === 'Completed' || o.status === 'Delivered' || o.status === 'Customer Claimed' || o.status === 'Picked Up')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pipelineRevenue = totalGrossRevenue - realizedRevenue;
    const orderCount = validOrders.length;
    const aov = orderCount > 0 ? totalGrossRevenue / orderCount : 0;

    // 2. Expenses Calculations
    const totalExpenses = scopedExpenses
      .filter(e => e.paymentStatus !== 'Voided')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const paidExpenses = scopedExpenses
      .filter(e => e.paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingExpenses = scopedExpenses
      .filter(e => e.paymentStatus === 'Pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    // 3. Payroll Calculations
    const totalPayrollGross = scopedPayroll
      .filter(p => p.status !== 'Voided')
      .reduce((sum, p) => sum + (p.grossPay || 0), 0);

    const totalPayrollNet = scopedPayroll
      .filter(p => p.status !== 'Voided')
      .reduce((sum, p) => sum + (p.netPay || 0), 0);

    const totalPayrollDeductions = scopedPayroll
      .filter(p => p.status !== 'Voided')
      .reduce((sum, p) => sum + (p.totalDeductions || 0), 0);

    // 4. Net Profit & Margins
    const totalCosts = totalExpenses + totalPayrollGross;
    const netProfit = totalGrossRevenue - totalCosts;
    const profitMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;

    // 5. Cash Flow (Realized Inflows vs Realized Outflows)
    const totalCashInflow = realizedRevenue;
    const totalCashOutflow = paidExpenses + totalPayrollNet;
    const netCashFlow = totalCashInflow - totalCashOutflow;

    // 6. Monthly Fixed Commitment (from Active Staff & Active Recurring Rules)
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
      totalGrossRevenue,
      realizedRevenue,
      pipelineRevenue,
      orderCount,
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
  }, [scopedOrders, scopedExpenses, scopedPayroll, staff, recurringExpenses]);

  // ----------------------------------------------------
  // MONTHLY FINANCIAL TRENDS (Revenue vs Expenses vs Profit)
  // ----------------------------------------------------
  const monthlyFinancialTrends = useMemo(() => {
    const monthMap: Record<string, { month: string; revenue: number; expenses: number; payroll: number; profit: number }> = {};

    // Generate last 6 calendar months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      monthMap[key] = { month: label, revenue: 0, expenses: 0, payroll: 0, profit: 0 };
    }

    // Tally Orders
    scopedOrders.forEach(o => {
      if (o.status === 'Pending Approval' || o.status === 'Draft' as any) return;
      const key = (o.createdAt || '').slice(0, 7);
      if (monthMap[key]) {
        monthMap[key].revenue += (o.totalAmount || 0);
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
  }, [scopedOrders, scopedExpenses, scopedPayroll]);

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
  // CLIENT REVENUE LEADERBOARD
  // ----------------------------------------------------
  const clientLeaderboard = useMemo(() => {
    const clientMap: Record<string, { name: string; revenue: number; orders: number }> = {};
    companies.forEach(c => {
      clientMap[c.name.toLowerCase()] = { name: c.name, revenue: 0, orders: 0 };
    });

    scopedOrders.forEach(o => {
      if (o.status === 'Pending Approval' || o.status === 'Draft' as any) return;
      const key = (o.companyName || 'Direct Storefront').toLowerCase();
      if (!clientMap[key]) {
        clientMap[key] = { name: o.companyName || 'Direct Storefront', revenue: 0, orders: 0 };
      }
      clientMap[key].revenue += (o.totalAmount || 0);
      clientMap[key].orders += 1;
    });

    return Object.values(clientMap)
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [companies, scopedOrders]);

  // ----------------------------------------------------
  // PRODUCT DEMAND LEADERBOARD
  // ----------------------------------------------------
  const productLeaderboard = useMemo(() => {
    const pMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    scopedOrders.forEach(o => {
      (o.items || []).forEach(it => {
        const name = it.productName || it.productId || 'Item';
        if (!pMap[name]) {
          pMap[name] = { name, quantity: 0, revenue: 0 };
        }
        pMap[name].quantity += (it.quantity || 0);
        pMap[name].revenue += (it.quantity || 0) * (it.price || 0);
      });
    });

    return Object.values(pMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [scopedOrders]);

  return (
    <div className="space-y-6 font-sans text-left" id="comprehensive-analytics-root">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-extrabold uppercase text-black tracking-wider flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-black" />
            Executive Financial &amp; Sales Analytics
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Real-time P&amp;L analysis, cash flow tracking, expense burn-rate, and corporate sales contribution.
          </p>
        </div>

        {/* View & Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
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
              Sales &amp; Demand
            </button>
          </div>

          {/* Time Range Filter */}
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as any)}
            className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl font-mono bg-white font-bold"
          >
            <option value="all">All Time History</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="this_year">This Calendar Year</option>
          </select>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 4 PRIMARY EXECUTIVE KPI CARDS                        */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Gross Sales Revenue</span>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-2xl font-extrabold text-black font-mono">
            {currencySymbol} {metrics.totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
          <p className="text-[10px] text-gray-500 font-mono">
            {metrics.orderCount} corporate &amp; portal orders processed
          </p>
        </div>

        {/* Total Cost Outflow (Expenses + Payroll) */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Total Operating Costs</span>
            <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-2xl font-extrabold text-black font-mono">
            {currencySymbol} {metrics.totalCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
          <p className="text-[10px] text-gray-500 font-mono">
            Expenses ({currencySymbol} {metrics.totalExpenses.toLocaleString()}) + Payroll ({currencySymbol} {metrics.totalPayrollGross.toLocaleString()})
          </p>
        </div>

        {/* Net Profit & Margin */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-1">
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
          <h4 className={`text-2xl font-extrabold font-mono ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {currencySymbol} {metrics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className={`font-bold ${metrics.profitMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {metrics.profitMargin.toFixed(1)}% Net Margin
            </span>
            <span className="text-gray-400">• Revenue - All Costs</span>
          </div>
        </div>

        {/* Monthly Fixed Burn Commitment */}
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs space-y-1">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Monthly Committed Burn</span>
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-2xl font-extrabold text-black font-mono">
            {currencySymbol} {metrics.monthlyCommittedBurnRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h4>
          <p className="text-[10px] text-gray-500 font-mono">
            Staff ({currencySymbol} {metrics.activeStaffMonthly.toLocaleString()}) + Rent/Subs ({currencySymbol} {metrics.activeRecurringMonthly.toLocaleString()})
          </p>
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
                Historical monthly billing against logged expenses and staff disbursements
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
                  <Bar dataKey="revenue" name="Sales Revenue" fill="#000000" radius={[4, 4, 0, 0]} maxBarSize={30} />
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
                Proportion of total expenditures across categories
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
              Liquidity balance comparing realized client collections against settled expenses and paid payroll
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
                From delivered &amp; fulfilled customer orders
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
                Net operational surplus after all settled disbursements
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
                Top Client Accounts by Billing Volume
              </h4>
              <p className="text-[10px] text-gray-500 font-mono">
                Corporate revenue contribution per client company
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {clientLeaderboard.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-mono text-xs">No client orders recorded.</div>
              ) : (
                clientLeaderboard.slice(0, 6).map((co, idx) => (
                  <div key={co.name} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-black text-xs">{co.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{co.orders} orders processed</div>
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
                Top Selling Products by Volume
              </h4>
              <p className="text-[10px] text-gray-500 font-mono">
                Highest demand catalog &amp; custom merchandise
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {productLeaderboard.length === 0 ? (
                <div className="py-8 text-center text-gray-400 font-mono text-xs">No product orders processed.</div>
              ) : (
                productLeaderboard.map((prod, idx) => (
                  <div key={prod.name} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-black text-xs">{prod.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{prod.quantity} units ordered</div>
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
    </div>
  );
}
