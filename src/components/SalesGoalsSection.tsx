/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Target,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  PlusCircle,
  HelpCircle,
  BarChart3,
  CalendarDays,
  Sparkles,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Order, Job, JobItemColumn, SalesGoalRecord, SalesPaceStatus } from '../types';
import { calculateSalesGoalMetrics, AnnualSalesMetric, QuarterSalesMetric } from '../utils/salesGoalCalculations';
import { formatCurrency } from '../utils/financeCalculations';

export interface SalesGoalsSectionProps {
  salesGoals: SalesGoalRecord[];
  selectedYear?: number;
  orders: Order[];
  jobs: Job[];
  jobItemColumns?: JobItemColumn[];
  currencySymbol?: string;
  onOpenSettings: (yearToOpen?: number) => void;
  onYearChange?: (year: number) => void;
}

export const SalesGoalsSection: React.FC<SalesGoalsSectionProps> = ({
  salesGoals,
  selectedYear: propSelectedYear,
  orders,
  jobs,
  jobItemColumns = [],
  currencySymbol = '₱',
  onOpenSettings,
  onYearChange
}) => {
  const currentYear = new Date().getFullYear();
  const [internalYear, setInternalYear] = useState<number>(propSelectedYear || currentYear);
  const selectedYear = propSelectedYear ?? internalYear;

  const handleSelectYear = (yr: number) => {
    setInternalYear(yr);
    onYearChange?.(yr);
  };

  // Find goal record for the chosen year
  const goalRecord = useMemo(() => {
    return salesGoals.find(g => g.year === selectedYear);
  }, [salesGoals, selectedYear]);

  // Compute calculated metrics
  const metrics: AnnualSalesMetric | null = useMemo(() => {
    if (!goalRecord) return null;
    return calculateSalesGoalMetrics(goalRecord, selectedYear, orders, jobs, jobItemColumns);
  }, [goalRecord, selectedYear, orders, jobs, jobItemColumns]);

  // Available configured years for quick pill navigation
  const configuredYears = useMemo(() => {
    return salesGoals.map(g => g.year).sort((a, b) => b - a);
  }, [salesGoals]);

  // Pace badge styling helper
  const getPaceBadge = (pace: SalesPaceStatus, isCompleted?: boolean) => {
    if (pace === 'Ahead of Pace') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
          <ArrowUpRight className="w-3.5 h-3.5" />
          {isCompleted ? 'Goal Achieved' : 'Ahead of Pace'}
        </span>
      );
    }
    if (pace === 'On Pace') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
          <Clock className="w-3.5 h-3.5" />
          On Pace
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
        <ArrowDownRight className="w-3.5 h-3.5" />
        Behind Pace
      </span>
    );
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!metrics) return [];
    return metrics.quarters.map(q => ({
      name: `${q.quarterLabel} (${q.monthsLabel})`,
      'Quarter Sales Goal': q.goal,
      'Sales Achieved': q.salesAchieved,
      salesPace: q.salesPace
    }));
  }, [metrics]);

  return (
    <div className="space-y-6" id="management-sales-goals-section">
      {/* Top Header Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-neutral-900 text-white rounded-xl shadow-xs">
                <Target className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-900">
                  Management Sales Goals
                </h2>
                <p className="text-xs text-neutral-500">
                  Annual &amp; quarterly target tracking compared against confirmed sales
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Selector Pills */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              {configuredYears.length > 0 ? (
                configuredYears.map(yr => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleSelectYear(yr)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      yr === selectedYear
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                    id={`sales-goal-year-select-${yr}`}
                  >
                    {yr}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectYear(currentYear)}
                  className="px-3 py-1 text-xs font-bold bg-neutral-900 text-white rounded-lg"
                >
                  {selectedYear}
                </button>
              )}

              {/* Allow selecting active year if not configured */}
              {!configuredYears.includes(selectedYear) && (
                <span className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg">
                  {selectedYear}
                </span>
              )}
            </div>

            {/* Configure Button */}
            <button
              type="button"
              onClick={() => onOpenSettings(selectedYear)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              id="configure-sales-goals-btn"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>Configure Sales Goals</span>
            </button>
          </div>
        </div>
      </div>

      {/* STATE 1: Goal Not Configured for Selected Year */}
      {!metrics ? (
        <div
          className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 text-center space-y-4 max-w-2xl mx-auto shadow-xs"
          id="sales-goal-unconfigured-banner"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200">
            <Target className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-neutral-900">
              Sales goal not configured for {selectedYear}
            </h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Management sales goals have not been defined for calendar year {selectedYear}.
              Configure annual and quarterly target quotas to enable pace analysis, calculate daily run-rate targets, and track milestone achievement.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenSettings(selectedYear)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              id="set-up-sales-goal-cta"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              Configure {selectedYear} Sales Goal
            </button>
          </div>
        </div>
      ) : (
        /* STATE 2: Goal IS Configured -> Full Performance Dashboard */
        <div className="space-y-6 animate-fade-in" id="sales-goal-metrics-dashboard">
          {/* Executive Annual Overview Card */}
          <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white rounded-3xl p-6 md:p-8 shadow-xl border border-neutral-800 space-y-6">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">
                    Calendar Year {metrics.year}
                  </span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-xs text-neutral-400">Annual Executive Target</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black tracking-tight font-mono text-white">
                  {formatCurrency(metrics.annualGoal, currencySymbol)}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {getPaceBadge(metrics.salesPace, metrics.timeProgress.isCompleted)}
                <button
                  type="button"
                  onClick={() => onOpenSettings(selectedYear)}
                  className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
                  title="Edit Sales Goal"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4-Metric Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Annual Sales Goal */}
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Annual Sales Goal
                </span>
                <span className="text-lg md:text-xl font-black font-mono text-white block">
                  {formatCurrency(metrics.annualGoal, currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-400">Target baseline</span>
              </div>

              {/* Metric 2: Sales Achieved */}
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block flex items-center justify-between">
                  <span>Sales Achieved</span>
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <span className="text-lg md:text-xl font-black font-mono text-emerald-300 block">
                  {formatCurrency(metrics.salesAchieved, currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {metrics.goalProgress.toFixed(1)}% of Annual Goal
                </span>
              </div>

              {/* Metric 3: Sales Still Needed */}
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                  Sales Still Needed
                </span>
                <span className="text-lg md:text-xl font-black font-mono text-amber-300 block">
                  {metrics.salesStillNeeded <= 0 ? (
                    <span className="text-emerald-400">Goal Reached!</span>
                  ) : (
                    formatCurrency(metrics.salesStillNeeded, currencySymbol)
                  )}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {metrics.salesStillNeeded > 0
                    ? `${(100 - metrics.goalProgress).toFixed(1)}% remaining`
                    : 'Surplus achieved!'}
                </span>
              </div>

              {/* Metric 4: Required Daily Sales */}
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block flex items-center justify-between">
                  <span>Required Daily Sales</span>
                  <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                </span>
                <span className="text-lg md:text-xl font-black font-mono text-blue-300 block">
                  {metrics.timeProgress.isCompleted
                    ? '—'
                    : formatCurrency(metrics.requiredDailySales, currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {metrics.timeProgress.isCompleted
                    ? 'Period completed'
                    : `${metrics.remainingWorkingDays} work days remaining`}
                </span>
              </div>
            </div>

            {/* Pacing Visualizer: Goal Progress vs Time Progress */}
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4 md:p-5 space-y-4">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Annual Pacing Analysis</span>
                  <span className="text-neutral-500">•</span>
                  <span className="text-neutral-400 text-[11px]">
                    Day {metrics.timeProgress.elapsedDays} of {metrics.timeProgress.totalDays} ({metrics.timeProgress.percentage.toFixed(1)}% of year elapsed)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-neutral-300">Goal Progress: <strong className="text-white font-mono">{metrics.goalProgress.toFixed(1)}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-neutral-300">Time Progress: <strong className="text-white font-mono">{metrics.timeProgress.percentage.toFixed(1)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Progress bars comparison */}
              <div className="space-y-2">
                {/* Goal Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono">
                    <span className="text-neutral-400">Sales Goal Progress</span>
                    <span className="text-emerald-400 font-bold">{metrics.goalProgress.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        metrics.salesPace === 'Ahead of Pace'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : metrics.salesPace === 'On Pace'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : 'bg-gradient-to-r from-rose-500 to-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, metrics.goalProgress))}%` }}
                    />
                  </div>
                </div>

                {/* Time Progress benchmark bar */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono">
                    <span className="text-neutral-400">Time Elapsed Benchmark</span>
                    <span className="text-blue-400 font-bold">{metrics.timeProgress.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500 opacity-80"
                      style={{ width: `${Math.min(100, Math.max(0, metrics.timeProgress.percentage))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Summary Commentary */}
              <div className="pt-2 text-xs text-neutral-300 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Status:</span>
                  <span>
                    {metrics.salesPace === 'Ahead of Pace' ? (
                      <span className="text-emerald-400 font-medium">
                        Running +{formatCurrency(Math.abs(metrics.paceVarianceAmount), currencySymbol)} ahead of expected run rate (+{(metrics.goalProgress - metrics.timeProgress.percentage).toFixed(1)}% vs elapsed time).
                      </span>
                    ) : metrics.salesPace === 'On Pace' ? (
                      <span className="text-amber-300 font-medium">
                        Tracking on pace with elapsed calendar timeline (variance: {formatCurrency(metrics.paceVarianceAmount, currencySymbol)}).
                      </span>
                    ) : (
                      <span className="text-rose-400 font-medium">
                        Trailing timeline by {formatCurrency(Math.abs(metrics.paceVarianceAmount), currencySymbol)} ({Math.abs(metrics.goalProgress - metrics.timeProgress.percentage).toFixed(1)}% behind schedule).
                      </span>
                    )}
                  </span>
                </div>

                {goalRecord.notes && (
                  <span className="text-[11px] text-neutral-400 italic">
                    "{goalRecord.notes}"
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quarterly Breakdown Grid (Q1, Q2, Q3, Q4) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-600" />
                Quarterly Breakdown &amp; Pacing
              </h4>
              <span className="text-xs text-neutral-500">
                4 Quarters = {formatCurrency(metrics.annualGoal, currencySymbol)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.quarters.map(q => {
                return (
                  <div
                    key={q.quarter}
                    className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 transition-all relative overflow-hidden ${
                      q.timeProgress.isCurrent
                        ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                        : 'border-gray-200'
                    }`}
                    id={`quarter-card-q${q.quarter}`}
                  >
                    {/* Top Row: Quarter Title + Active Badge */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-neutral-900 block font-mono">
                          {q.quarterLabel}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-medium">
                          {q.monthsLabel}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {q.timeProgress.isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-900 text-white">
                            Active
                          </span>
                        )}
                        {q.timeProgress.isCompleted && (
                          <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
                            Closed
                          </span>
                        )}
                        {q.timeProgress.isFuture && (
                          <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded-md">
                            Upcoming
                          </span>
                        )}
                        <div>{getPaceBadge(q.salesPace, q.timeProgress.isCompleted)}</div>
                      </div>
                    </div>

                    {/* Quarter Metrics */}
                    <div className="space-y-2 pt-1 border-t border-gray-100 text-xs">
                      {/* Goal */}
                      <div className="flex justify-between items-baseline">
                        <span className="text-neutral-500">Quarter Sales Goal:</span>
                        <span className="font-mono font-bold text-neutral-900">
                          {formatCurrency(q.goal, currencySymbol)}
                        </span>
                      </div>

                      {/* Achieved */}
                      <div className="flex justify-between items-baseline">
                        <span className="text-neutral-500">Sales Achieved:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatCurrency(q.salesAchieved, currencySymbol)}
                        </span>
                      </div>

                      {/* Needed */}
                      <div className="flex justify-between items-baseline">
                        <span className="text-neutral-500">Sales Still Needed:</span>
                        <span className="font-mono font-bold text-amber-700">
                          {q.salesStillNeeded <= 0 ? '₱0.00' : formatCurrency(q.salesStillNeeded, currencySymbol)}
                        </span>
                      </div>

                      {/* Required Daily Sales */}
                      <div className="flex justify-between items-baseline">
                        <span className="text-neutral-500">Required Daily Sales:</span>
                        <span className="font-mono font-bold text-blue-700">
                          {q.timeProgress.isCompleted
                            ? '—'
                            : formatCurrency(q.requiredDailySales, currencySymbol)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="pt-2 border-t border-gray-100 space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-neutral-500">Goal Progress</span>
                        <span className="font-bold text-neutral-900">{q.goalProgress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            q.salesPace === 'Ahead of Pace'
                              ? 'bg-emerald-500'
                              : q.salesPace === 'On Pace'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, q.goalProgress))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                        <span>Time: {q.timeProgress.percentage.toFixed(0)}%</span>
                        <span>{q.remainingWorkingDays} work days left</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quarterly Comparison Visual Chart (Recharts) */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-neutral-700" />
                <h4 className="text-sm font-bold text-neutral-900">
                  Quarterly Goals vs. Sales Achieved ({selectedYear})
                </h4>
              </div>
              <span className="text-xs text-neutral-500">
                Direct visual benchmark of quarterly targets against confirmed revenue
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#666' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={val => `${currencySymbol}${(val / 1000000).toFixed(1)}M`}
                    tick={{ fontSize: 11, fill: '#666' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value) || 0, currencySymbol),
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: '#171717',
                      color: '#fff',
                      borderRadius: '0.75rem',
                      border: 'none',
                      fontSize: '12px',
                      padding: '8px 12px'
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                  />
                  <Bar
                    dataKey="Quarter Sales Goal"
                    fill="#a3a3a3"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Bar
                    dataKey="Sales Achieved"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesGoalsSection;
