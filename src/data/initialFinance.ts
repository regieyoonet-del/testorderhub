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
  RecurringExpenseRule
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
  },
  {
    id: 'STF-102',
    fullName: 'Alex Mendoza',
    position: 'Senior Graphic Designer',
    department: 'Design / Creative',
    employmentStatus: 'Full-Time',
    dateStarted: '2024-06-01',
    salaryType: 'Monthly',
    basicSalary: 26000,
    allowances: 2500,
    otherCompensation: 500,
    notes: 'Handles client vector proofs and DTF separation',
    status: 'Active',
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 15,
    breakMinutes: 60,
    createdAt: '2024-06-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'STF-103',
    fullName: 'Sarah K. Dela Cruz',
    position: 'Client Relations & Orders Specialist',
    department: 'Sales & Account Management',
    employmentStatus: 'Full-Time',
    dateStarted: '2025-01-10',
    salaryType: 'Monthly',
    basicSalary: 24000,
    allowances: 2000,
    otherCompensation: 1500,
    notes: 'Coordinates corporate quotes and storefront accounts',
    status: 'Active',
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 15,
    breakMinutes: 60,
    createdAt: '2025-01-10T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'STF-104',
    fullName: 'Mark Villanueva',
    position: 'Embroidery & Heat Press Operator',
    department: 'Production',
    employmentStatus: 'Full-Time',
    dateStarted: '2025-04-01',
    salaryType: 'Monthly',
    basicSalary: 20000,
    allowances: 1500,
    otherCompensation: 0,
    notes: 'Handles multi-head embroidery machine runs',
    status: 'Active',
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 15,
    breakMinutes: 60,
    createdAt: '2025-04-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'STF-105',
    fullName: 'Juan Dela Cruz',
    position: 'Print Production Specialist',
    department: 'Production',
    employmentStatus: 'Full-Time',
    dateStarted: '2025-08-01',
    salaryType: 'Daily',
    basicSalary: 700,
    allowances: 0,
    otherCompensation: 0,
    notes: 'Master screen printer, DTF transfer press, and textile finishing',
    status: 'Active',
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    gracePeriodMinutes: 15,
    breakMinutes: 60,
    createdAt: '2025-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  }
];

export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 'SA-105',
    staffId: 'STF-105',
    name: 'Juan Dela Cruz',
    username: 'juan',
    passcode: 'juan123',
    role: 'Staff',
    status: 'Active',
    email: 'juan@arhprint.com',
    phone: '+63 917 555 0105',
    createdAt: '2025-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  },
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
  },
  {
    id: 'SA-102',
    staffId: 'STF-102',
    name: 'Alex Mendoza',
    username: 'alex',
    passcode: 'alex123',
    role: 'Staff',
    status: 'Active',
    email: 'alex.mendoza@arhprint.com',
    phone: '+63 917 555 0102',
    createdAt: '2024-06-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'SA-103',
    staffId: 'STF-103',
    name: 'Sarah K. Dela Cruz',
    username: 'sarah',
    passcode: 'sarah123',
    role: 'Staff',
    status: 'Active',
    email: 'sarah.delacruz@arhprint.com',
    phone: '+63 917 555 0103',
    createdAt: '2025-01-10T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  },
  {
    id: 'SA-104',
    staffId: 'STF-104',
    name: 'Mark Villanueva',
    username: 'mark',
    passcode: 'mark123',
    role: 'Staff',
    status: 'Active',
    email: 'mark.villanueva@arhprint.com',
    phone: '+63 917 555 0104',
    createdAt: '2025-04-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z'
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'ATT-2026-0801-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-01',
    clockIn: '07:55 AM',
    clockOut: '05:05 PM',
    totalHours: 9.17,
    status: 'Present',
    notes: 'Morning DTF printer prep and vector screening',
    createdAt: '2026-08-01T07:55:00.000Z',
    updatedAt: '2026-08-01T17:05:00.000Z'
  },
  {
    id: 'ATT-2026-0802-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-02',
    clockIn: '08:00 AM',
    clockOut: '05:00 PM',
    totalHours: 9.00,
    status: 'Present',
    notes: 'Full shift production runs',
    createdAt: '2026-08-02T08:00:00.000Z',
    updatedAt: '2026-08-02T17:00:00.000Z'
  },
  {
    id: 'ATT-2026-0803-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-04',
    clockIn: '07:58 AM',
    clockOut: '05:02 PM',
    totalHours: 9.07,
    status: 'Present',
    notes: 'Embroidery framing and heat pressing',
    createdAt: '2026-08-04T07:58:00.000Z',
    updatedAt: '2026-08-04T17:02:00.000Z'
  },
  {
    id: 'ATT-2026-0804-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-05',
    clockIn: '08:02 AM',
    clockOut: '05:01 PM',
    totalHours: 8.98,
    status: 'Present',
    notes: 'Silkscreen ink mixing and squeegee washup',
    createdAt: '2026-08-05T08:02:00.000Z',
    updatedAt: '2026-08-05T17:01:00.000Z'
  },
  {
    id: 'ATT-2026-0805-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-06',
    clockIn: '07:50 AM',
    clockOut: '05:10 PM',
    totalHours: 9.33,
    status: 'Present',
    notes: 'Quality inspection & packaging batch 1',
    createdAt: '2026-08-06T07:50:00.000Z',
    updatedAt: '2026-08-06T17:10:00.000Z'
  },
  {
    id: 'ATT-2026-0806-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-07',
    clockIn: '08:00 AM',
    clockOut: '05:00 PM',
    totalHours: 9.00,
    status: 'Present',
    notes: 'Main studio printing line',
    createdAt: '2026-08-07T08:00:00.000Z',
    updatedAt: '2026-08-07T17:00:00.000Z'
  },
  {
    id: 'ATT-2026-0807-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-08',
    clockIn: '07:57 AM',
    clockOut: '05:03 PM',
    totalHours: 9.10,
    status: 'Present',
    notes: 'Pre-curing flash dryers',
    createdAt: '2026-08-08T07:57:00.000Z',
    updatedAt: '2026-08-08T17:03:00.000Z'
  },
  {
    id: 'ATT-2026-0808-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-09',
    clockIn: '08:05 AM',
    clockOut: '05:00 PM',
    totalHours: 8.92,
    status: 'Present',
    notes: 'Tunnel dryer conveyor operation',
    createdAt: '2026-08-09T08:05:00.000Z',
    updatedAt: '2026-08-09T17:00:00.000Z'
  },
  {
    id: 'ATT-2026-0809-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-11',
    clockIn: '07:59 AM',
    clockOut: '05:00 PM',
    totalHours: 9.02,
    status: 'Present',
    notes: 'Mesh tensioning and darkroom exposure',
    createdAt: '2026-08-11T07:59:00.000Z',
    updatedAt: '2026-08-11T17:00:00.000Z'
  },
  {
    id: 'ATT-2026-0810-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-12',
    clockIn: '07:55 AM',
    clockOut: '05:04 PM',
    totalHours: 9.15,
    status: 'Present',
    notes: 'Garment tagging and polybag sealing',
    createdAt: '2026-08-12T07:55:00.000Z',
    updatedAt: '2026-08-12T17:04:00.000Z'
  },
  {
    id: 'ATT-2026-0811-01',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    date: '2026-08-13',
    clockIn: '08:00 AM',
    clockOut: '05:00 PM',
    totalHours: 9.00,
    status: 'Present',
    notes: 'Final pre-shipment counts',
    createdAt: '2026-08-13T08:00:00.000Z',
    updatedAt: '2026-08-13T17:00:00.000Z'
  }
];

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
  },
  {
    id: 'PR-2026-0802',
    staffId: 'STF-102',
    staffName: 'Alex Mendoza',
    position: 'Senior Graphic Designer',
    department: 'Design / Creative',
    payPeriodStart: '2026-08-01',
    payPeriodEnd: '2026-08-15',
    payDate: '2026-08-15',
    salaryType: 'Monthly',
    rateSnapshot: 26000,
    basicPay: 13000,
    allowances: 1250,
    otherEarnings: 0,
    grossPay: 14250,
    deductions: 1100,
    itemizedDeductions: [
      { id: 'ded-1', name: 'SSS / Govt Contributions', amount: 700 },
      { id: 'ded-2', name: 'PhilHealth & Pag-IBIG', amount: 400 }
    ],
    totalDeductions: 1100,
    netPay: 13150,
    status: 'Finalized',
    notes: '1st Half August 2026 Payroll - Processed and Paid',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z'
  },
  {
    id: 'PR-2026-0803',
    staffId: 'STF-105',
    staffName: 'Juan Dela Cruz',
    position: 'Print Production Specialist',
    department: 'Production',
    payPeriodStart: '2026-08-01',
    payPeriodEnd: '2026-08-15',
    payDate: '2026-08-15',
    salaryType: 'Daily',
    rateSnapshot: 700,
    daysWorked: 11,
    basicPay: 7700, // 700 * 11 days
    allowances: 800,
    otherEarnings: 0,
    grossPay: 8500,
    deductions: 750,
    itemizedDeductions: [
      { id: 'ded-1', name: 'SSS / Govt Contributions', amount: 500 },
      { id: 'ded-2', name: 'PhilHealth & Pag-IBIG', amount: 250 }
    ],
    totalDeductions: 750,
    netPay: 7750,
    status: 'Finalized',
    notes: '1st Half August 2026 Payroll (11 Days @ ₱700/day) - Processed & Paid',
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
