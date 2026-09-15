/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StaffMember,
  StaffAccount,
  AttendanceRecord,
  PayrollRecord,
  ExpenseCategory,
  ExpenseRecord,
  RecurringExpenseRule,
  SalesGoalRecord
} from '../types';

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-salaries', name: 'Salaries / Payroll', isSystem: true, status: 'Active' },
  { id: 'cat-rent', name: 'Rent', isSystem: true, status: 'Active' },
  { id: 'cat-utilities', name: 'Utilities', isSystem: true, status: 'Active' },
  { id: 'cat-internet', name: 'Internet / Communications', isSystem: true, status: 'Active' },
  { id: 'cat-software', name: 'Software / Subscriptions', isSystem: true, status: 'Active' },
  { id: 'cat-office', name: 'Office Supplies', isSystem: true, status: 'Active' },
  { id: 'cat-production', name: 'Production Supplies', isSystem: true, status: 'Active' },
  { id: 'cat-equipment', name: 'Equipment', isSystem: true, status: 'Active' },
  { id: 'cat-repairs', name: 'Repairs / Maintenance', isSystem: true, status: 'Active' },
  { id: 'cat-transpo', name: 'Transportation', isSystem: true, status: 'Active' },
  { id: 'cat-marketing', name: 'Marketing', isSystem: true, status: 'Active' },
  { id: 'cat-bank', name: 'Bank / Payment Fees', isSystem: true, status: 'Active' },
  { id: 'cat-insurance', name: 'Insurance', isSystem: true, status: 'Active' },
  { id: 'cat-taxes', name: 'Taxes / Government', isSystem: true, status: 'Active' },
  { id: 'cat-misc', name: 'Miscellaneous', isSystem: true, status: 'Active' }
];

export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'STF-101',
    fullName: 'Regie Santos',
    position: 'Head of Production & Screen Printing',
    department: 'Production',
    employmentStatus: 'Full-Time',
    dateStarted: '2024-03-15',
    salaryType: 'Monthly',
    basicSalary: 28000,
    allowances: 3500,
    otherCompensation: 1000,
    notes: 'Lead master printer and workshop supervisor',
    status: 'Active',
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 15,
    breakMinutes: 60,
    createdAt: '2024-03-15T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  }
];

export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 'SA-101',
    staffId: 'STF-101',
    name: 'Regie Santos',
    username: 'regie',
    passcode: 'regie123',
    role: 'Staff',
    status: 'Active',
    email: 'regie.santos@arhprint.com',
    phone: '+63 917 555 0101',
    createdAt: '2024-03-15T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [];

export const INITIAL_PAYROLL_RECORDS: PayrollRecord[] = [
  {
    id: 'PR-2026-0801',
    staffId: 'STF-101',
    staffName: 'Regie Santos',
    position: 'Head of Production & Screen Printing',
    department: 'Production',
    payPeriodStart: '2026-08-01',
    payPeriodEnd: '2026-08-15',
    payDate: '2026-08-15',
    salaryType: 'Monthly',
    rateSnapshot: 28000,
    basicPay: 14000,
    allowances: 1750,
    otherEarnings: 500,
    grossPay: 16250,
    deductions: 1250,
    itemizedDeductions: [
      { id: 'ded-1', name: 'SSS / Govt Contributions', amount: 800 },
      { id: 'ded-2', name: 'PhilHealth & Pag-IBIG', amount: 450 }
    ],
    totalDeductions: 1250,
    netPay: 15000,
    status: 'Finalized',
    notes: '1st Half August 2026 Payroll - Processed and Paid',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z'
  }
];

export const INITIAL_RECURRING_EXPENSES: RecurringExpenseRule[] = [
  {
    id: 'REC-EXP-001',
    name: 'Print Hub Main Studio & Workshop Lease',
    category: 'Rent',
    amount: 45000,
    frequency: 'Monthly',
    startDate: '2026-01-01',
    durationMonths: 12,
    paymentsPerYear: 12,
    specificMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    status: 'Active',
    notes: 'Main industrial unit 4B monthly rental',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'REC-EXP-002',
    name: 'Dedicated High-Speed Fiber Internet (500 Mbps)',
    category: 'Internet / Communications',
    amount: 3800,
    frequency: 'Monthly',
    startDate: '2026-01-01',
    durationMonths: 12,
    paymentsPerYear: 12,
    specificMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    status: 'Active',
    notes: 'Commercial fiber line for large artwork downloads',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'REC-EXP-003',
    name: 'Adobe Creative Cloud Team Subscription',
    category: 'Software / Subscriptions',
    amount: 4200,
    frequency: 'Monthly',
    startDate: '2026-01-01',
    durationMonths: 12,
    paymentsPerYear: 12,
    specificMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    status: 'Active',
    notes: '2 Design workstation licenses',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'REC-EXP-004',
    name: 'Commercial Equipment Comprehensive Insurance',
    category: 'Insurance',
    amount: 28000,
    frequency: 'Yearly',
    startDate: '2026-06-01',
    paymentsPerYear: 1,
    specificMonths: [6],
    status: 'Active',
    notes: 'Annual policy covering DTF printers and embroidery machinery',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  },
  {
    id: 'REC-EXP-005',
    name: 'Printhead Preventive Maintenance Service',
    category: 'Repairs / Maintenance',
    amount: 7500,
    frequency: 'Quarterly',
    startDate: '2026-03-01',
    paymentsPerYear: 4,
    specificMonths: [3, 6, 9, 12],
    status: 'Active',
    notes: 'Quarterly technician visit and calibration',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z'
  }
];

export const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'EXP-101',
    name: 'August Studio Rent',
    category: 'Rent',
    type: 'Fixed / Recurring',
    amount: 45000,
    date: '2026-08-05',
    status: 'Paid',
    paymentDate: '2026-08-05',
    vendor: 'Prime Commercial Properties Inc.',
    referenceNumber: 'OR-994821',
    notes: 'August 2026 rent payment via bank transfer',
    recurringExpenseId: 'REC-EXP-001',
    createdAt: '2026-08-05T08:00:00.000Z',
    updatedAt: '2026-08-05T08:00:00.000Z'
  },
  {
    id: 'EXP-102',
    name: 'August Fiber Internet Bill',
    category: 'Internet / Communications',
    type: 'Fixed / Recurring',
    amount: 3800,
    date: '2026-08-10',
    status: 'Paid',
    paymentDate: '2026-08-10',
    vendor: 'PLDT Enterprise',
    referenceNumber: 'INV-PLDT-8829',
    notes: 'Paid via auto-debit',
    recurringExpenseId: 'REC-EXP-002',
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-10T08:00:00.000Z'
  },
  {
    id: 'EXP-103',
    name: 'Plastisol Inks & Screen Emulsion Restock',
    category: 'Production Supplies',
    type: 'Variable',
    amount: 18500,
    date: '2026-08-12',
    status: 'Paid',
    paymentDate: '2026-08-12',
    vendor: 'ColorTech Screen Supplies Co.',
    referenceNumber: 'INV-CT-4402',
    notes: 'Restock of black, white, gold inks and cleaning solutions',
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z'
  },
  {
    id: 'EXP-104',
    name: 'Electricity & Studio Power Bill',
    category: 'Utilities',
    type: 'Variable',
    amount: 14200,
    date: '2026-08-18',
    status: 'Paid',
    paymentDate: '2026-08-18',
    vendor: 'Meralco Electric Utility',
    referenceNumber: 'UTIL-081826',
    notes: 'Industrial dryer and heat press power consumption',
    createdAt: '2026-08-18T09:00:00.000Z',
    updatedAt: '2026-08-18T09:00:00.000Z'
  },
  {
    id: 'EXP-105',
    name: 'Packaging Boxes & Polybags Bulk Order',
    category: 'Office Supplies',
    type: 'Variable',
    amount: 6500,
    date: '2026-08-20',
    status: 'Pending',
    vendor: 'PackPro Logistics Supplies',
    referenceNumber: 'PO-PACK-109',
    notes: '500 custom garment shipping polybags',
    createdAt: '2026-08-20T11:00:00.000Z',
    updatedAt: '2026-08-20T11:00:00.000Z'
  }
];

export function generateStaffId(existingStaff: StaffMember[] = []): string {
  let maxNum = 100;
  for (const s of existingStaff) {
    const match = (s.id || '').match(/STF-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `STF-${maxNum + 1}`;
}

export function generatePayrollId(existingRecords: PayrollRecord[] = []): string {
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
  let count = existingRecords.length + 1;
  return `PR-${yearMonth}-${String(count).padStart(3, '0')}`;
}

export function generateExpenseId(existingExpenses: ExpenseRecord[] = []): string {
  let maxNum = 100;
  for (const e of existingExpenses) {
    const match = (e.id || '').match(/EXP-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `EXP-${maxNum + 1}`;
}

export function generateRecurringExpenseId(existingRules: RecurringExpenseRule[] = []): string {
  let maxNum = 0;
  for (const r of existingRules) {
    const match = (r.id || '').match(/REC-EXP-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `REC-EXP-${String(maxNum + 1).padStart(3, '0')}`;
}

export function generateStaffAccountId(existingAccounts: StaffAccount[] = []): string {
  let maxNum = 100;
  for (const a of existingAccounts) {
    const match = (a.id || '').match(/SA-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `SA-${maxNum + 1}`;
}

export function generateTemporaryPassword(prefix: string = 'ARH'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const specialChars = ['!', '#', '@', '$'];
  const special = specialChars[Math.floor(Math.random() * specialChars.length)];
  return `${prefix}-${rand}${special}${Math.floor(100 + Math.random() * 900)}`;
}

export function generateAttendanceId(existingOrStaffId?: AttendanceRecord[] | string, dateStrParam?: string): string {
  if (typeof existingOrStaffId === 'string') {
    const d = dateStrParam || new Date().toISOString().slice(0, 10);
    return `ATT-${existingOrStaffId}-${d}`;
  }
  const existingRecords = Array.isArray(existingOrStaffId) ? existingOrStaffId : [];
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let count = existingRecords.filter(r => (r.id || '').includes(dateStr)).length + 1;
  return `ATT-${dateStr}-${String(count).padStart(2, '0')}`;
}

export const INITIAL_SALES_GOALS: SalesGoalRecord[] = [
  {
    id: 'SG-2026',
    year: 2026,
    annualGoal: 6000000,
    q1Goal: 1200000,
    q2Goal: 1500000,
    q3Goal: 1800000,
    q4Goal: 1500000,
    notes: '2026 Management Sales Target (Annual: ₱6.0M, Q1: ₱1.2M, Q2: ₱1.5M, Q3: ₱1.8M, Q4: ₱1.5M)',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'Admin'
  }
];
