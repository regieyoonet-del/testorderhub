/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, Job, JobItemColumn, RecurringExpense, ExpenseRecord } from '../types';
import { calculateJobTotals, calculateSubItemTotalQty } from '../data/initialJobs';
import { parseYearMonth } from './financeFilters';

/**
 * Calculates revenue/amount for a manual job using job items or custom value columns.
 */
export function getJobRevenue(job: Job, jobItemColumns: JobItemColumn[] = []): number {
  if (job.items && job.items.length > 0) {
    const totals = calculateJobTotals(job.items, jobItemColumns);
    if (totals.totalAmount > 0) return totals.totalAmount;
  }
  if (typeof (job as any).totalAmount === 'number' && (job as any).totalAmount > 0) {
    return (job as any).totalAmount;
  }
  const valAmt = Number(job.values?.['col-total-amount']) || Number(job.values?.['col-sub-total-amount']) || 0;
  return valAmt;
}

/**
 * Extracts a dependable date string for a job.
 */
export function getJobDateStr(job: Job): string {
  return job.createdAt || job.values?.['col-date-added'] || job.updatedAt || new Date().toISOString();
}

/**
 * Calculates total units/quantity sold for a manual job.
 */
export function getJobTotalUnits(job: Job, jobItemColumns: JobItemColumn[] = []): number {
  if (job.items && job.items.length > 0) {
    return job.items.reduce((acc, it) => {
      const qty = calculateSubItemTotalQty(it.values, jobItemColumns) || Number(it.values?.['col-sub-total-qty']) || 1;
      return acc + qty;
    }, 0);
  }
  return 1;
}

/**
 * Calculates total units/quantity sold for an order.
 */
export function getOrderTotalUnits(order: Order): number {
  return (order.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);
}

/**
 * Calculates Required Sales Quota given total costs and target profit margin %.
 * Formula: Required Sales Quota = Total Costs / (1 - Target Profit Margin)
 * Example: Costs = ₱100,000, Margin = 30% -> Quota = ₱100,000 / (1 - 0.30) = ₱142,857.14
 */
export function calculateRequiredQuota(totalCosts: number, targetProfitMarginPercent: number = 30): number {
  if (totalCosts <= 0) return 0;
  // Clamp margin between 0% and 99% to prevent negative or zero division
  const clampedMargin = Math.min(Math.max(targetProfitMarginPercent, 0), 99);
  const marginDecimal = clampedMargin / 100;
  const denominator = 1 - marginDecimal;
  if (denominator <= 0) return 0;
  return totalCosts / denominator;
}

/**
 * Calculates Quota Progress % safely.
 * Formula: Sales / Monthly Quota * 100
 * Handles zero quota without division-by-zero errors.
 */
export function calculateQuotaProgress(sales: number, quota: number): number {
  if (quota <= 0) {
    return sales > 0 ? 100 : 0;
  }
  const progress = (sales / quota) * 100;
  return isNaN(progress) || !isFinite(progress) ? 0 : progress;
}

/**
 * Formats a currency amount using Philippine Peso or custom symbol.
 * Example: ₱125,000.00
 */
export function formatCurrency(amount: number, currencySymbol: string = '₱'): string {
  const sym = currencySymbol === 'Php' ? '₱' : (currencySymbol || '₱');
  const safeAmt = isNaN(amount) || !isFinite(amount) ? 0 : amount;
  return `${sym}${safeAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface RecurringExpenseMonthMatch {
  applies: boolean;
  amount: number;
  alreadyRecorded: boolean;
  matchedExpenseId?: string;
  matchedExpenseAmount?: number;
}

/**
 * Determines whether an active recurring expense rule applies to a specific calendar year and month (1-12).
 * Handles:
 * - Start Date boundaries
 * - Duration in months (e.g. 12 months)
 * - End Date boundaries
 * - Supported recurring frequencies (Monthly, Quarterly, Semi-Annual, Yearly, Weekly, Custom / Specific Months)
 * - Anti-double-counting: checks whether the occurrence has already been logged as an actual ExpenseRecord
 */
export function getRecurringExpenseForMonth(
  rule: RecurringExpense,
  year: number,
  month: number, // 1 to 12
  monthExpenses: ExpenseRecord[] = []
): RecurringExpenseMonthMatch {
  // 1. Must be Active
  if (rule.status !== 'Active') {
    return { applies: false, amount: 0, alreadyRecorded: false };
  }

  // 2. Amount must be positive
  if (!rule.amount || rule.amount <= 0) {
    return { applies: false, amount: 0, alreadyRecorded: false };
  }

  // 3. Parse Start Date
  const pStart = parseYearMonth(rule.startDate);
  if (!pStart) {
    return { applies: false, amount: 0, alreadyRecorded: false };
  }

  const startTotalMonths = pStart.year * 12 + (pStart.month - 1);
  const currentTotalMonths = year * 12 + (month - 1);

  // Month is before start date
  if (currentTotalMonths < startTotalMonths) {
    return { applies: false, amount: 0, alreadyRecorded: false };
  }

  // 4. Calculate End Month boundary
  let endTotalMonths: number | null = null;

  if (typeof rule.durationMonths === 'number' && rule.durationMonths > 0) {
    endTotalMonths = startTotalMonths + Math.round(rule.durationMonths) - 1;
  } else if (rule.endDate) {
    const pEnd = parseYearMonth(rule.endDate);
    if (pEnd) {
      endTotalMonths = pEnd.year * 12 + (pEnd.month - 1);
    }
  } else if (rule.notes) {
    const match = rule.notes.match(/(?:duration|term|period)[:\s]+(\d+)\s*months?/i) ||
                  rule.notes.match(/(\d+)\s*months?\s*(?:commitment|term|duration)/i);
    if (match) {
      const parsedDuration = parseInt(match[1], 10);
      if (parsedDuration > 0) {
        endTotalMonths = startTotalMonths + parsedDuration - 1;
      }
    }
  }

  // Month is after end date / duration
  if (endTotalMonths !== null && currentTotalMonths > endTotalMonths) {
    return { applies: false, amount: 0, alreadyRecorded: false };
  }

  // 5. Frequency Matching
  const diffMonths = currentTotalMonths - startTotalMonths;
  const rawFreq = (rule.frequency || 'Monthly').trim();
  const freq = rawFreq.toLowerCase();

  let applies = false;
  let occurrenceMultiplier = 1;

  if (freq === 'monthly' || freq.startsWith('month')) {
    applies = true;
    occurrenceMultiplier = 1;
  } else if (freq === 'quarterly' || freq.startsWith('quarter')) {
    if (rule.specificMonths && rule.specificMonths.length > 0) {
      applies = rule.specificMonths.includes(month);
    } else {
      applies = (diffMonths % 3 === 0);
    }
  } else if (freq === 'semi-annual' || freq === 'semiannual' || freq.startsWith('semi')) {
    if (rule.specificMonths && rule.specificMonths.length > 0) {
      applies = rule.specificMonths.includes(month);
    } else {
      applies = (diffMonths % 6 === 0);
    }
  } else if (freq === 'yearly' || freq === 'annual' || freq.startsWith('year')) {
    if (rule.specificMonths && rule.specificMonths.length > 0) {
      applies = rule.specificMonths.includes(month);
    } else {
      applies = (diffMonths % 12 === 0);
    }
  } else if (freq === 'weekly') {
    applies = true;
    try {
      const startDay = new Date(rule.startDate).getDay();
      const daysInMonth = new Date(year, month, 0).getDate();
      let weeklyCount = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month - 1, day);
        if (d.getDay() === startDay) {
          const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          if (dStr >= rule.startDate && (!rule.endDate || dStr <= rule.endDate)) {
            weeklyCount++;
          }
        }
      }
      occurrenceMultiplier = weeklyCount > 0 ? weeklyCount : 4;
    } catch {
      occurrenceMultiplier = 4;
    }
  } else {
    // Custom / Specific Months
    if (rule.specificMonths && rule.specificMonths.length > 0) {
      applies = rule.specificMonths.includes(month);
    } else {
      applies = true;
    }
  }

  if (!applies) {
    return { applies: false, amount: 0, alreadyRecorded: false };
  }

  const scheduledAmount = rule.amount * occurrenceMultiplier;

  const ruleNameNorm = (rule.name || '').toLowerCase().trim();
  const ruleCatNorm = (rule.category || '').toLowerCase().trim();
  const ruleIdNorm = (rule.id || '').toLowerCase().trim();

  // 6. Anti-Double-Counting check with month's actual expenses
  const matchedExpense = monthExpenses.find(e => {
    if ((e.paymentStatus || e.status) === 'Voided') return false;

    // Check direct recurringExpenseId reference
    if (e.recurringExpenseId && (e.recurringExpenseId === rule.id || (ruleIdNorm && e.recurringExpenseId.toLowerCase().trim() === ruleIdNorm))) {
      return true;
    }

    // Check if notes link to the rule id or rule name
    if (e.notes) {
      const notesLower = e.notes.toLowerCase();
      if (ruleIdNorm && notesLower.includes(ruleIdNorm)) return true;
      if (ruleNameNorm && notesLower.includes(ruleNameNorm)) return true;
    }

    // Check matching name (e.g. "Electric Bill", "Electric Bill (Sep 2026)")
    if (e.name && ruleNameNorm) {
      const expNameLower = e.name.toLowerCase().trim();
      if (expNameLower === ruleNameNorm || expNameLower.includes(ruleNameNorm) || ruleNameNorm.includes(expNameLower)) {
        return true;
      }
    }

    // Category and exact amount match as fallback
    if (ruleCatNorm && (e.category || '').toLowerCase().trim() === ruleCatNorm && Math.abs((e.amount || 0) - rule.amount) < 0.01) {
      return true;
    }

    return false;
  });

  return {
    applies: true,
    amount: scheduledAmount,
    alreadyRecorded: Boolean(matchedExpense),
    matchedExpenseId: matchedExpense?.id,
    matchedExpenseAmount: matchedExpense?.amount
  };
}

/**
 * Deduplicates recurring expense rules by ID and semantic signature
 * (Normalized Name + Normalized Category + Amount + Frequency + Start Year-Month).
 * Prevents multiple copies of the same recurring expense definition from multiplying costs.
 */
export function deduplicateRecurringExpenses(
  rules: RecurringExpense[] = []
): RecurringExpense[] {
  if (!Array.isArray(rules)) return [];

  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: RecurringExpense[] = [];

  for (const rule of rules) {
    if (!rule) continue;

    const id = String(rule.id || '').trim();
    if (id && seenIds.has(id)) {
      continue;
    }

    const normName = String(rule.name || '').trim().toLowerCase();
    const normCat = String(rule.category || '').trim().toLowerCase();
    const amt = Number(rule.amount) || 0;
    const normFreq = String(rule.frequency || 'Monthly').trim().toLowerCase();
    const startYm = String(rule.startDate || '').slice(0, 7);

    const signature = `${normName}|${normCat}|${amt}|${normFreq}|${startYm}`;
    if (seenSignatures.has(signature)) {
      continue;
    }

    if (id) seenIds.add(id);
    seenSignatures.add(signature);
    result.push(rule);
  }

  return result;
}

export interface RecurringExpenseMonthSummary {
  totalScheduled: number;
  unmaterializedAmount: number;
  materializedAmount: number;
  details: Array<{
    ruleId: string;
    ruleName: string;
    category: string;
    amount: number;
    frequency: string;
    alreadyRecorded: boolean;
    matchedExpenseId?: string;
  }>;
}

/**
 * Calculates recurring expense summary for a given year and month.
 * Computes unmaterialized recurring commitments to add to monthly expenses without double-counting.
 */
export function getRecurringExpensesSummaryForMonth(
  recurringExpenses: RecurringExpense[] = [],
  year: number,
  month: number,
  monthExpenses: ExpenseRecord[] = []
): RecurringExpenseMonthSummary {
  let totalScheduled = 0;
  let unmaterializedAmount = 0;
  let materializedAmount = 0;
  const details: Array<{
    ruleId: string;
    ruleName: string;
    category: string;
    amount: number;
    frequency: string;
    alreadyRecorded: boolean;
    matchedExpenseId?: string;
  }> = [];

  // Deduplicate recurring expense rules before calculating
  const uniqueRules = deduplicateRecurringExpenses(recurringExpenses);

  // Set of claimed expense voucher IDs to prevent multiple rules from claiming the same voucher
  const claimedExpenseIds = new Set<string>();

  uniqueRules.forEach(rule => {
    // Only pass vouchers that have not already been claimed by a previous recurring rule
    const availableExpenses = monthExpenses.filter(e => !claimedExpenseIds.has(e.id));
    const res = getRecurringExpenseForMonth(rule, year, month, availableExpenses);

    if (res.applies) {
      totalScheduled += res.amount;

      if (res.alreadyRecorded && res.matchedExpenseId) {
        claimedExpenseIds.add(res.matchedExpenseId);
        materializedAmount += res.amount;
      } else {
        unmaterializedAmount += res.amount;
      }

      details.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        amount: res.amount,
        frequency: rule.frequency,
        alreadyRecorded: res.alreadyRecorded,
        matchedExpenseId: res.matchedExpenseId
      });
    }
  });

  return {
    totalScheduled,
    unmaterializedAmount,
    materializedAmount,
    details
  };
}

/**
 * Extracts all calendar years spanned by active recurring expenses.
 */
export function getRecurringExpenseCoveredYears(recurringExpenses: RecurringExpense[] = []): number[] {
  const years = new Set<number>();
  const uniqueRules = deduplicateRecurringExpenses(recurringExpenses);
  uniqueRules.forEach(rule => {
    if (rule.status !== 'Active') return;
    const pStart = parseYearMonth(rule.startDate);
    if (!pStart) return;

    years.add(pStart.year);

    let endYear = pStart.year;
    if (typeof rule.durationMonths === 'number' && rule.durationMonths > 0) {
      const endTotal = (pStart.year * 12 + pStart.month - 1) + Math.round(rule.durationMonths) - 1;
      endYear = Math.floor(endTotal / 12);
    } else if (rule.endDate) {
      const pEnd = parseYearMonth(rule.endDate);
      if (pEnd) endYear = pEnd.year;
    } else if (rule.notes) {
      const match = rule.notes.match(/(?:duration|term|period)[:\s]+(\d+)\s*months?/i);
      if (match) {
        const d = parseInt(match[1], 10);
        if (d > 0) {
          const endTotal = (pStart.year * 12 + pStart.month - 1) + d - 1;
          endYear = Math.floor(endTotal / 12);
        }
      }
    } else {
      // Indefinite recurring: at least cover next year
      endYear = pStart.year + 1;
    }

    for (let y = pStart.year; y <= endYear; y++) {
      years.add(y);
    }
  });

  return Array.from(years);
}

