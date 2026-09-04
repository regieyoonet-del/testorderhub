/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MonthOption {
  value: string;
  label: string;
  shortLabel: string;
}

export const MONTH_OPTIONS: MonthOption[] = [
  { value: 'all', label: 'All Months', shortLabel: 'All' },
  { value: '01', label: 'January', shortLabel: 'Jan' },
  { value: '02', label: 'February', shortLabel: 'Feb' },
  { value: '03', label: 'March', shortLabel: 'Mar' },
  { value: '04', label: 'April', shortLabel: 'Apr' },
  { value: '05', label: 'May', shortLabel: 'May' },
  { value: '06', label: 'June', shortLabel: 'Jun' },
  { value: '07', label: 'July', shortLabel: 'Jul' },
  { value: '08', label: 'August', shortLabel: 'Aug' },
  { value: '09', label: 'September', shortLabel: 'Sep' },
  { value: '10', label: 'October', shortLabel: 'Oct' },
  { value: '11', label: 'November', shortLabel: 'Nov' },
  { value: '12', label: 'December', shortLabel: 'Dec' },
];

/**
 * Safely parses year and month from diverse date formats (YYYY-MM-DD, ISO string, etc.)
 * avoiding local timezone offset bugs on date-only strings.
 */
export function parseYearMonth(dateStr?: string | null): { year: number; month: number } | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // Fast check for YYYY-MM or YYYY/MM prefix
  const match = str.match(/^(\d{4})[-/](\d{1,2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  // Fallback to Date object parsing
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  return null;
}

/**
 * Checks if a date string matches the selected year and month filter criteria.
 */
export function matchesYearMonth(
  dateStr?: string | null,
  selectedYear: string = 'all',
  selectedMonth: string = 'all'
): boolean {
  if (!dateStr) return false;
  if (selectedYear === 'all' && selectedMonth === 'all') return true;

  const parsed = parseYearMonth(dateStr);
  if (!parsed) return false;

  if (selectedYear !== 'all' && parsed.year !== parseInt(selectedYear, 10)) {
    return false;
  }

  if (selectedMonth !== 'all' && parsed.month !== parseInt(selectedMonth, 10)) {
    return false;
  }

  return true;
}

/**
 * Formats a clean human-readable label for the active period.
 */
export function formatPeriodLabel(selectedYear: string, selectedMonth: string): string {
  const monthObj = MONTH_OPTIONS.find(m => m.value === selectedMonth);
  const monthName = monthObj && selectedMonth !== 'all' ? monthObj.label : 'All Months';

  if (selectedYear === 'all' && selectedMonth === 'all') {
    return 'All Time History';
  }
  if (selectedYear !== 'all' && selectedMonth === 'all') {
    return `Year ${selectedYear}`;
  }
  if (selectedYear === 'all' && selectedMonth !== 'all') {
    return `Every ${monthName}`;
  }
  return `${monthName} ${selectedYear}`;
}
