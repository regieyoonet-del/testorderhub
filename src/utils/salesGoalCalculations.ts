/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Job, JobItemColumn, SalesGoalRecord, SalesPaceStatus } from '../types';
import { getJobRevenue, getJobDateStr } from './financeCalculations';
import { parseYearMonth } from './financeFilters';
import { isDirectCompanyOrder } from '../components/AnalyticsDashboard';

export interface QuarterTimeProgress {
  elapsedDays: number;
  totalDays: number;
  percentage: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

export interface QuarterSalesMetric {
  quarter: 1 | 2 | 3 | 4;
  quarterLabel: string;
  monthsLabel: string;
  goal: number;
  salesAchieved: number;
  salesStillNeeded: number;
  goalProgress: number; // in %
  timeProgress: QuarterTimeProgress;
  salesPace: SalesPaceStatus;
  remainingWorkingDays: number;
  requiredDailySales: number;
  expectedSalesToDate: number;
  paceVarianceAmount: number; // positive = ahead, negative = behind
}

export interface AnnualSalesMetric {
  year: number;
  annualGoal: number;
  salesAchieved: number;
  salesStillNeeded: number;
  goalProgress: number; // in %
  timeProgress: QuarterTimeProgress;
  salesPace: SalesPaceStatus;
  remainingWorkingDays: number;
  requiredDailySales: number;
  expectedSalesToDate: number;
  paceVarianceAmount: number;
  quarters: QuarterSalesMetric[];
}

/**
 * Returns the calendar months (1-12) that belong to a given quarter.
 */
export function getQuarterMonths(quarter: 1 | 2 | 3 | 4): number[] {
  switch (quarter) {
    case 1: return [1, 2, 3];
    case 2: return [4, 5, 6];
    case 3: return [7, 8, 9];
    case 4: return [10, 11, 12];
  }
}

/**
 * Returns start and end date strings for a given quarter in YYYY-MM-DD.
 */
export function getQuarterDateRange(year: number, quarter: 1 | 2 | 3 | 4): { startDate: string; endDate: string } {
  switch (quarter) {
    case 1:
      return { startDate: `${year}-01-01`, endDate: `${year}-03-31` };
    case 2:
      return { startDate: `${year}-04-01`, endDate: `${year}-06-30` };
    case 3:
      return { startDate: `${year}-07-01`, endDate: `${year}-09-30` };
    case 4:
      return { startDate: `${year}-10-01`, endDate: `${year}-12-31` };
  }
}

/**
 * Returns the current calendar quarter (1-4) for a given date.
 */
export function getCurrentQuarter(date: Date = new Date()): 1 | 2 | 3 | 4 {
  const m = date.getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

/**
 * Determines whether a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Computes Annual Time Progress (percentage of year elapsed).
 */
export function calculateAnnualTimeProgress(year: number, asOfDate: Date = new Date()): QuarterTimeProgress {
  const currentYear = asOfDate.getFullYear();
  const totalDays = isLeapYear(year) ? 366 : 365;

  if (currentYear > year) {
    return {
      elapsedDays: totalDays,
      totalDays,
      percentage: 100,
      isCompleted: true,
      isCurrent: false,
      isFuture: false
    };
  }

  if (currentYear < year) {
    return {
      elapsedDays: 0,
      totalDays,
      percentage: 0,
      isCompleted: false,
      isCurrent: false,
      isFuture: true
    };
  }

  // Current year
  const startOfYear = new Date(year, 0, 1);
  const diffMs = asOfDate.getTime() - startOfYear.getTime();
  const elapsedDays = Math.min(totalDays, Math.max(1, Math.floor(diffMs / 86400000) + 1));
  const percentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  return {
    elapsedDays,
    totalDays,
    percentage,
    isCompleted: false,
    isCurrent: true,
    isFuture: false
  };
}

/**
 * Computes Quarter Time Progress (percentage of quarter elapsed).
 */
export function calculateQuarterTimeProgress(
  year: number,
  quarter: 1 | 2 | 3 | 4,
  asOfDate: Date = new Date()
): QuarterTimeProgress {
  const currentYear = asOfDate.getFullYear();
  const { startDate, endDate } = getQuarterDateRange(year, quarter);
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);

  if (asOfDate.getTime() > end.getTime()) {
    return {
      elapsedDays: totalDays,
      totalDays,
      percentage: 100,
      isCompleted: true,
      isCurrent: false,
      isFuture: false
    };
  }

  if (asOfDate.getTime() < start.getTime()) {
    return {
      elapsedDays: 0,
      totalDays,
      percentage: 0,
      isCompleted: false,
      isCurrent: false,
      isFuture: true
    };
  }

  // Active current quarter
  const diffMs = asOfDate.getTime() - start.getTime();
  const elapsedDays = Math.min(totalDays, Math.max(1, Math.floor(diffMs / 86400000) + 1));
  const percentage = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  return {
    elapsedDays,
    totalDays,
    percentage,
    isCompleted: false,
    isCurrent: true,
    isFuture: false
  };
}

/**
 * Computes remaining working days (default Monday - Friday) from asOfDate to period end.
 */
export function calculateRemainingWorkingDays(
  startDateStr: string,
  endDateStr: string,
  asOfDate: Date = new Date(),
  workingDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
): number {
  if (!startDateStr || !endDateStr) return 0;
  try {
    const end = new Date(`${endDateStr}T23:59:59`);
    if (asOfDate > end) return 0;

    const start = new Date(`${startDateStr}T00:00:00`);
    // Effective start is max(asOfDate, start)
    const effectiveStart = asOfDate > start ? new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate()) : start;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let count = 0;
    const curr = new Date(effectiveStart);

    while (curr <= end) {
      const dayName = dayNames[curr.getDay()];
      if (workingDays.includes(dayName)) {
        count++;
      }
      curr.setDate(curr.getDate() + 1);
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Determines Sales Pace: Ahead of Pace, On Pace, or Behind Pace.
 * Compares Goal Progress vs Time Progress.
 */
export function calculateSalesPace(
  goalProgress: number,
  timeProgress: number,
  isCompleted: boolean,
  isFuture: boolean
): SalesPaceStatus {
  if (isCompleted) {
    return goalProgress >= 100 ? 'Ahead of Pace' : 'Behind Pace';
  }

  if (isFuture) {
    return 'On Pace';
  }

  // Period is active
  if (goalProgress >= 100) {
    return 'Ahead of Pace';
  }

  const delta = goalProgress - timeProgress;
  // If goal progress is ahead of time progress by at least 2%
  if (delta >= 2) {
    return 'Ahead of Pace';
  }
  // If within 2% margin
  if (delta >= -2) {
    return 'On Pace';
  }
  // Otherwise behind
  return 'Behind Pace';
}

/**
 * Validates whether quarterly goals equal the annual goal.
 */
export function validateSalesGoal(
  annualGoal: number,
  q1: number,
  q2: number,
  q3: number,
  q4: number
): { isValid: boolean; difference: number; quarterTotal: number; errorMessage?: string } {
  const safeAnnual = Number(annualGoal) || 0;
  const safeQ1 = Number(q1) || 0;
  const safeQ2 = Number(q2) || 0;
  const safeQ3 = Number(q3) || 0;
  const safeQ4 = Number(q4) || 0;
  const quarterTotal = safeQ1 + safeQ2 + safeQ3 + safeQ4;
  const difference = Math.round((quarterTotal - safeAnnual) * 100) / 100;

  if (safeAnnual <= 0) {
    return {
      isValid: false,
      difference,
      quarterTotal,
      errorMessage: 'Annual Sales Goal must be greater than zero.'
    };
  }

  if (Math.abs(difference) > 0.01) {
    const diffSign = difference > 0 ? '+' : '-';
    return {
      isValid: false,
      difference,
      quarterTotal,
      errorMessage: `Quarterly goals total does not match the Annual Sales Goal. Difference: ${diffSign}₱${Math.abs(difference).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    };
  }

  return {
    isValid: true,
    difference: 0,
    quarterTotal
  };
}

/**
 * Splits an Annual Sales Goal equally into 4 quarters, preserving exact sum.
 */
export function splitAnnualGoalEqually(annualGoal: number): { q1: number; q2: number; q3: number; q4: number } {
  const safeAnnual = Math.max(0, Number(annualGoal) || 0);
  const baseQuarter = Math.floor(safeAnnual / 4);
  const remainder = safeAnnual - (baseQuarter * 3); // assign any fractional or modulo remainder to Q4

  return {
    q1: baseQuarter,
    q2: baseQuarter,
    q3: baseQuarter,
    q4: remainder
  };
}

/**
 * Computes full Management Sales Goals metrics for a given year.
 */
export function calculateSalesGoalMetrics(
  goalRecord: SalesGoalRecord | null | undefined,
  year: number,
  orders: Order[],
  jobs: Job[],
  jobItemColumns: JobItemColumn[] = [],
  asOfDate: Date = new Date()
): AnnualSalesMetric | null {
  if (!goalRecord) return null;

  // Filter confirmed direct company orders for this year
  const directOrders = orders.filter(o => isDirectCompanyOrder(o));
  const confirmedDirectOrders = directOrders.filter(o =>
    o.status !== 'Pending' &&
    o.status !== 'Pending Approval' &&
    (o.status as any) !== 'Draft' &&
    o.status !== 'Canceled'
  );

  // Standalone manual jobs
  const orderIdSet = new Set(directOrders.map(o => o.id));
  const orderNumSet = new Set(directOrders.map(o => (o.orderNumber || '').toLowerCase().trim()));

  const confirmedManualJobs = (jobs || []).filter(j => {
    const hasMatchingOrderId = Boolean(j.orderId && orderIdSet.has(j.orderId));
    const hasMatchingOrderNum = Boolean(j.orderNumber && orderNumSet.has(j.orderNumber.toLowerCase().trim()));
    const isCompanyOrderSource = j.source === 'Company Order';
    if (hasMatchingOrderId || hasMatchingOrderNum || isCompanyOrderSource) return false;
    if ((j as any).portalId || (j as any).portalName || (j as any).storefrontId || (j as any).isPortalJob) return false;
    if ((j.source as any) === 'Custom Storefront' || (j.source as any) === 'Order Portal' || (j as any).sourceType === 'Storefront' || (j as any).sourceType === 'Order Portal') return false;
    if (j.status === 'Pending' || (j.status as any) === 'Draft' || j.status === 'Canceled') return false;
    return true;
  });

  // Calculate recognized sales per month for this year
  const monthlySales: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
    7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0
  };

  confirmedDirectOrders.forEach(o => {
    const p = parseYearMonth(o.createdAt);
    if (p && p.year === year) {
      monthlySales[p.month] = (monthlySales[p.month] || 0) + (o.totalAmount || 0);
    }
  });

  confirmedManualJobs.forEach(j => {
    const dateStr = getJobDateStr(j);
    const p = parseYearMonth(dateStr);
    if (p && p.year === year) {
      monthlySales[p.month] = (monthlySales[p.month] || 0) + getJobRevenue(j, jobItemColumns);
    }
  });

  const quarterLabels: Record<1 | 2 | 3 | 4, { label: string; months: string }> = {
    1: { label: 'Q1', months: 'Jan - Mar' },
    2: { label: 'Q2', months: 'Apr - Jun' },
    3: { label: 'Q3', months: 'Jul - Sep' },
    4: { label: 'Q4', months: 'Oct - Dec' }
  };

  const quarterGoals: Record<1 | 2 | 3 | 4, number> = {
    1: goalRecord.q1Goal || 0,
    2: goalRecord.q2Goal || 0,
    3: goalRecord.q3Goal || 0,
    4: goalRecord.q4Goal || 0
  };

  // Compute quarters
  const quarters: QuarterSalesMetric[] = ([1, 2, 3, 4] as const).map(q => {
    const months = getQuarterMonths(q);
    const salesAchieved = months.reduce((acc, m) => acc + (monthlySales[m] || 0), 0);
    const goal = quarterGoals[q];
    const salesStillNeeded = Math.max(0, goal - salesAchieved);
    const goalProgress = goal > 0 ? (salesAchieved / goal) * 100 : 0;
    const timeProgress = calculateQuarterTimeProgress(year, q, asOfDate);
    const salesPace = calculateSalesPace(goalProgress, timeProgress.percentage, timeProgress.isCompleted, timeProgress.isFuture);
    const { startDate, endDate } = getQuarterDateRange(year, q);
    const remainingWorkingDays = calculateRemainingWorkingDays(startDate, endDate, asOfDate);
    const requiredDailySales = remainingWorkingDays > 0 ? salesStillNeeded / remainingWorkingDays : (timeProgress.isCompleted ? 0 : salesStillNeeded);
    const expectedSalesToDate = goal * (timeProgress.percentage / 100);
    const paceVarianceAmount = salesAchieved - expectedSalesToDate;

    return {
      quarter: q,
      quarterLabel: quarterLabels[q].label,
      monthsLabel: quarterLabels[q].months,
      goal,
      salesAchieved,
      salesStillNeeded,
      goalProgress,
      timeProgress,
      salesPace,
      remainingWorkingDays,
      requiredDailySales,
      expectedSalesToDate,
      paceVarianceAmount
    };
  });

  // Annual Totals
  const totalSalesAchieved = quarters.reduce((acc, q) => acc + q.salesAchieved, 0);
  const annualGoal = goalRecord.annualGoal || 0;
  const annualSalesStillNeeded = Math.max(0, annualGoal - totalSalesAchieved);
  const annualGoalProgress = annualGoal > 0 ? (totalSalesAchieved / annualGoal) * 100 : 0;
  const annualTimeProgress = calculateAnnualTimeProgress(year, asOfDate);
  const annualSalesPace = calculateSalesPace(annualGoalProgress, annualTimeProgress.percentage, annualTimeProgress.isCompleted, annualTimeProgress.isFuture);
  const annualRemainingWorkingDays = calculateRemainingWorkingDays(`${year}-01-01`, `${year}-12-31`, asOfDate);
  const annualRequiredDailySales = annualRemainingWorkingDays > 0
    ? annualSalesStillNeeded / annualRemainingWorkingDays
    : (annualTimeProgress.isCompleted ? 0 : annualSalesStillNeeded);
  const expectedAnnualSalesToDate = annualGoal * (annualTimeProgress.percentage / 100);
  const paceVarianceAmount = totalSalesAchieved - expectedAnnualSalesToDate;

  return {
    year,
    annualGoal,
    salesAchieved: totalSalesAchieved,
    salesStillNeeded: annualSalesStillNeeded,
    goalProgress: annualGoalProgress,
    timeProgress: annualTimeProgress,
    salesPace: annualSalesPace,
    remainingWorkingDays: annualRemainingWorkingDays,
    requiredDailySales: annualRequiredDailySales,
    expectedSalesToDate: expectedAnnualSalesToDate,
    paceVarianceAmount,
    quarters
  };
}

/**
 * Convenience helper for year metrics
 */
export function calculateYearSalesMetrics(
  year: number,
  goalRecord: SalesGoalRecord | null | undefined,
  orders: Order[],
  jobs: Job[],
  jobItemColumns: JobItemColumn[] = [],
  asOfDate: Date = new Date()
) {
  const res = calculateSalesGoalMetrics(goalRecord, year, orders, jobs, jobItemColumns, asOfDate);
  const currentQ = getCurrentQuarter(asOfDate);
  const qMetric = res?.quarters.find(q => q.quarter === currentQ);

  return {
    year,
    annualGoal: res?.annualGoal || 0,
    salesAchieved: res?.salesAchieved || 0,
    salesStillNeeded: res?.salesStillNeeded || 0,
    annualGoalProgress: res?.goalProgress || 0,
    annualTimeProgress: res?.timeProgress.percentage || 0,
    annualPaceStatus: res?.salesPace || 'On Pace',
    annualRequiredDailySales: res?.requiredDailySales || 0,
    annualPaceVariance: res?.paceVarianceAmount || 0,
    currentQuarter: currentQ,
    currentQuarterGoal: qMetric?.goal || 0,
    quarterSalesAchieved: qMetric?.salesAchieved || 0,
    raw: res
  };
}
