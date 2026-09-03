import {
  StaffMember,
  AttendanceRecord,
  PayrollRecord,
  PayrollStatus,
  PayrollManualAdjustment,
  PayrollDeductionItem
} from '../types';
import {
  getStaffShiftConfig,
  calculateShiftAttendancePayroll,
  ShiftCalculationResult
} from './payrollShiftUtils';
import { normalizeAttendanceDate, normalizeStaffId } from './attendanceUtils';

export interface PayPeriodOption {
  id: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  payDate: string;   // YYYY-MM-DD
}

export interface EmployeePeriodDailyBreakdown {
  date: string;
  dayOfWeek: string;
  isScheduledDay: boolean;
  scheduledShiftStart: string;
  scheduledShiftEnd: string;
  rawRecord?: AttendanceRecord;
  actualClockIn: string;
  actualClockOut: string;
  actualLoggedHours: number;
  regularPayableStart: string;
  regularPayableEnd: string;
  regularPayableHours: number;
  lateMinutes: number;
  isWithinGracePeriod: boolean;
  isLate: boolean;
  undertimeMinutes: number;
  isEarlyDeparture: boolean;
  candidateOvertimeHours: number;
  overtimeStatus: 'Pending' | 'Approved' | 'Rejected';
  approvedOvertimeHours: number;
  summary: string;
}

export interface CalculatedPayrollBreakdown {
  staff: StaffMember;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  dailyBreakdowns: EmployeePeriodDailyBreakdown[];
  scheduledHours: number;
  actualHours: number;
  regularPayableHours: number;
  lateMinutes: number;
  undertimeMinutes: number;
  candidateOvertimeHours: number;
  approvedOvertimeHours: number;
  daysWorked: number;
  dailyRate: number;
  hourlyRate: number;
  basicPay: number;
  overtimePay: number;
  allowances: number;
  manualEarnings: number;
  otherEarnings: number;
  grossPay: number;
  lateDeduction: number;
  undertimeDeduction: number;
  statutoryDeductions: PayrollDeductionItem[];
  manualDeductions: number;
  totalDeductions: number;
  netPay: number;
  manualAdjustments: PayrollManualAdjustment[];
  status: PayrollStatus;
  notes: string;
}

/**
 * Generates standard semi-monthly pay periods for the current year and adjacent months.
 * e.g., September 1–15, September 16–30, October 1–15, etc.
 */
export function generateStandardPayPeriods(referenceDateStr?: string): PayPeriodOption[] {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 0-indexed

  const periods: PayPeriodOption[] = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate for past 3 months to next 2 months
  for (let offset = -3; offset <= 2; offset++) {
    const d = new Date(currentYear, currentMonth + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = monthNames[month];
    const monthStr = String(month + 1).padStart(2, '0');

    // Last day of month
    const lastDay = new Date(year, month + 1, 0).getDate();

    // 1st Period: 1st to 15th
    const start1 = `${year}-${monthStr}-01`;
    const end1 = `${year}-${monthStr}-15`;
    const pay1 = `${year}-${monthStr}-15`;
    periods.push({
      id: `${year}-${monthStr}-P1`,
      label: `${monthName} 1–15, ${year}`,
      startDate: start1,
      endDate: end1,
      payDate: pay1
    });

    // 2nd Period: 16th to end of month
    const start2 = `${year}-${monthStr}-16`;
    const end2 = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    const pay2 = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    periods.push({
      id: `${year}-${monthStr}-P2`,
      label: `${monthName} 16–${lastDay}, ${year}`,
      startDate: start2,
      endDate: end2,
      payDate: pay2
    });
  }

  // Sort descending by startDate so latest is first
  return periods.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * Computes scheduled working days between two dates for a staff member.
 */
export function getScheduledDaysInPeriod(
  startDate: string,
  endDate: string,
  workingDays: string[]
): number {
  if (!startDate || !endDate) return 0;
  try {
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const curr = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let count = 0;

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
 * Calculates hourly and daily base rates for a staff member based on their salary type.
 */
export function calculateStaffRates(staff: StaffMember): { dailyRate: number; hourlyRate: number } {
  const basic = Number(staff.basicSalary) || 0;
  const cfg = getStaffShiftConfig(staff);
  const workDaysPerWeek = cfg.workingDays.length || 5;
  const daysInMonth = workDaysPerWeek >= 6 ? 26 : 22; // Standard PH labor calculation base

  let dailyRate = 0;
  let hourlyRate = 0;

  if (staff.salaryType === 'Daily') {
    dailyRate = basic;
    hourlyRate = basic > 0 ? basic / 8 : 0;
  } else if (staff.salaryType === 'Hourly') {
    hourlyRate = basic;
    dailyRate = basic * 8;
  } else {
    // Monthly
    dailyRate = basic > 0 ? basic / daysInMonth : 0;
    hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
  }

  return {
    dailyRate: Number(dailyRate.toFixed(2)),
    hourlyRate: Number(hourlyRate.toFixed(2))
  };
}

/**
 * Core attendance-to-payroll calculation engine for an individual staff member.
 * Strictly adheres to:
 * - Shift Start / End Clamping (early arrivals do not increase payable hours)
 * - 15-Minute Grace Period (within grace = 0 late mins; past grace = actual diff from scheduled start)
 * - Undertime Minutes (early departure before shift end)
 * - Overtime from Overtime Approval Station (only Approved OT is payable!)
 * - Controlled manual adjustments
 */
export function calculateStaffPeriodPayroll(
  staff: StaffMember,
  payPeriodStart: string,
  payPeriodEnd: string,
  payDate: string,
  attendanceRecords: AttendanceRecord[],
  existingRecord?: PayrollRecord | null
): CalculatedPayrollBreakdown {
  const shiftCfg = getStaffShiftConfig(staff);
  const { dailyRate, hourlyRate } = calculateStaffRates(staff);

  // Normalize staff ID for matching attendance records
  const targetId = normalizeStaffId(staff.id);
  const staffNameLower = (staff.fullName || '').trim().toLowerCase();

  // Filter attendance records in this period for this staff
  const staffAtt = attendanceRecords.filter(r => {
    const matchesId = normalizeStaffId(r.staffId) === targetId;
    const matchesName = r.staffName && r.staffName.trim().toLowerCase() === staffNameLower;
    if (!matchesId && !matchesName) return false;

    const normDate = normalizeAttendanceDate(r.date);
    return normDate >= payPeriodStart && normDate <= payPeriodEnd;
  });

  // Calculate daily breakdowns for all recorded attendances
  const dailyBreakdowns: EmployeePeriodDailyBreakdown[] = staffAtt.map(r => {
    const calc: ShiftCalculationResult = calculateShiftAttendancePayroll(r, staff);

    return {
      date: normalizeAttendanceDate(r.date),
      dayOfWeek: calc.dayOfWeek,
      isScheduledDay: calc.isScheduledDay,
      scheduledShiftStart: calc.scheduledShiftStart,
      scheduledShiftEnd: calc.scheduledShiftEnd,
      rawRecord: r,
      actualClockIn: calc.actualClockIn,
      actualClockOut: calc.actualClockOut || '',
      actualLoggedHours: calc.actualLoggedHours,
      regularPayableStart: calc.regularPayableStart,
      regularPayableEnd: calc.regularPayableEnd,
      regularPayableHours: calc.regularHours,
      lateMinutes: calc.lateMinutes,
      isWithinGracePeriod: calc.isWithinGracePeriod,
      isLate: calc.isLate,
      undertimeMinutes: calc.undertimeMinutes,
      isEarlyDeparture: calc.isEarlyDeparture,
      candidateOvertimeHours: calc.overtimeHours,
      overtimeStatus: calc.overtimeStatus,
      approvedOvertimeHours: calc.approvedOvertimeHours,
      summary: calc.summary
    };
  });

  // Sort breakdowns by date ascending
  dailyBreakdowns.sort((a, b) => a.date.localeCompare(b.date));

  // Compute scheduled hours for the period
  const scheduledDaysCount = getScheduledDaysInPeriod(payPeriodStart, payPeriodEnd, shiftCfg.workingDays);
  const scheduledHours = scheduledDaysCount * 8; // Standard 8 regular hours per scheduled shift

  // Aggregate attendance metrics
  let actualHours = 0;
  let regularPayableHours = 0;
  let lateMinutes = 0;
  let undertimeMinutes = 0;
  let candidateOvertimeHours = 0;
  let approvedOvertimeHours = 0;
  let daysWorked = 0;

  dailyBreakdowns.forEach(d => {
    actualHours += d.actualLoggedHours;
    regularPayableHours += d.regularPayableHours;
    lateMinutes += d.lateMinutes;
    undertimeMinutes += d.undertimeMinutes;
    candidateOvertimeHours += d.candidateOvertimeHours;
    approvedOvertimeHours += d.approvedOvertimeHours;

    // Count qualifying days worked if employee had closed shift
    if (d.actualClockIn && d.actualClockOut && d.regularPayableHours > 0) {
      daysWorked++;
    }
  });

  actualHours = Number(actualHours.toFixed(2));
  regularPayableHours = Number(regularPayableHours.toFixed(2));
  candidateOvertimeHours = Number(candidateOvertimeHours.toFixed(2));
  approvedOvertimeHours = Number(approvedOvertimeHours.toFixed(2));

  // Base Pay computation
  let basicPay = 0;
  if (staff.salaryType === 'Daily') {
    basicPay = Number((daysWorked * dailyRate).toFixed(2));
  } else if (staff.salaryType === 'Hourly') {
    basicPay = Number((regularPayableHours * hourlyRate).toFixed(2));
  } else {
    // Monthly salary split semi-monthly (divider = 2)
    basicPay = Number(((Number(staff.basicSalary) || 0) / 2).toFixed(2));
  }

  // Deductions from Attendance
  const lateDeduction = Number(((lateMinutes / 60) * hourlyRate).toFixed(2));
  const undertimeDeduction = Number(((undertimeMinutes / 60) * hourlyRate).toFixed(2));

  // Overtime Pay (Only Approved Overtime is payable! Standard 125% OT rate)
  const overtimePay = Number((approvedOvertimeHours * hourlyRate * 1.25).toFixed(2));

  // Allowances (half for semi-monthly if monthly salary)
  const allowances = staff.salaryType === 'Monthly'
    ? Number(((Number(staff.allowances) || 0) / 2).toFixed(2))
    : 0;

  // Manual Adjustments from existing record or empty
  const manualAdjustments: PayrollManualAdjustment[] = existingRecord?.manualAdjustments
    ? [...existingRecord.manualAdjustments]
    : [];

  const manualEarnings = manualAdjustments
    .filter(a => a.type === 'earning')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const manualDeductions = manualAdjustments
    .filter(a => a.type === 'deduction')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const otherEarnings = Number((allowances + manualEarnings).toFixed(2));
  const grossPay = Number((basicPay + overtimePay + otherEarnings).toFixed(2));

  // Statutory Deductions (if basicPay > 0)
  const statutoryDeductions: PayrollDeductionItem[] = [];
  if (basicPay > 0) {
    statutoryDeductions.push({
      id: `ded-sss-${staff.id}`,
      name: 'SSS Contribution',
      amount: Number((basicPay * 0.045).toFixed(2))
    });
    statutoryDeductions.push({
      id: `ded-ph-${staff.id}`,
      name: 'PhilHealth',
      amount: Number((basicPay * 0.02).toFixed(2))
    });
    statutoryDeductions.push({
      id: `ded-pagibig-${staff.id}`,
      name: 'Pag-IBIG',
      amount: 100
    });
  }

  const statDedTotal = statutoryDeductions.reduce((sum, d) => sum + d.amount, 0);
  const totalDeductions = Number((lateDeduction + undertimeDeduction + statDedTotal + manualDeductions).toFixed(2));
  const netPay = Math.max(0, Number((grossPay - totalDeductions).toFixed(2)));

  const status: PayrollStatus = existingRecord?.status || 'Draft';

  // Informative notes
  const notesParts: string[] = [];
  if (lateMinutes > 0) notesParts.push(`Late: ${lateMinutes}m (-₱${lateDeduction})`);
  if (undertimeMinutes > 0) notesParts.push(`Undertime: ${undertimeMinutes}m (-₱${undertimeDeduction})`);
  if (approvedOvertimeHours > 0) notesParts.push(`Approved OT: ${approvedOvertimeHours}h (+₱${overtimePay})`);
  if (candidateOvertimeHours > approvedOvertimeHours) {
    const unapproved = (candidateOvertimeHours - approvedOvertimeHours).toFixed(2);
    notesParts.push(`${unapproved}h pending/rejected OT excluded`);
  }
  if (manualAdjustments.length > 0) {
    notesParts.push(`${manualAdjustments.length} manual adjustment(s)`);
  }

  return {
    staff,
    payPeriodStart,
    payPeriodEnd,
    payDate,
    dailyBreakdowns,
    scheduledHours,
    actualHours,
    regularPayableHours,
    lateMinutes,
    undertimeMinutes,
    candidateOvertimeHours,
    approvedOvertimeHours,
    daysWorked,
    dailyRate,
    hourlyRate,
    basicPay,
    overtimePay,
    allowances,
    manualEarnings,
    otherEarnings,
    grossPay,
    lateDeduction,
    undertimeDeduction,
    statutoryDeductions,
    manualDeductions,
    totalDeductions,
    netPay,
    manualAdjustments,
    status,
    notes: notesParts.join(' | ') || 'Calculated from shift schedule & attendance records'
  };
}

/**
 * Converts a CalculatedPayrollBreakdown into a persistent PayrollRecord.
 */
export function convertBreakdownToPayrollRecord(
  calc: CalculatedPayrollBreakdown,
  existingRecord?: PayrollRecord | null
): PayrollRecord {
  const staff = calc.staff;
  const payId = existingRecord?.id || `PR-${calc.payPeriodStart.replace(/-/g, '')}-${staff.id}`;

  const allItemizedDeductions: PayrollDeductionItem[] = [
    ...calc.statutoryDeductions
  ];

  if (calc.lateDeduction > 0) {
    allItemizedDeductions.push({
      id: `ded-late-${staff.id}`,
      name: `Late Arrival (${calc.lateMinutes} mins)`,
      amount: calc.lateDeduction
    });
  }

  if (calc.undertimeDeduction > 0) {
    allItemizedDeductions.push({
      id: `ded-undertime-${staff.id}`,
      name: `Early Departure (${calc.undertimeMinutes} mins)`,
      amount: calc.undertimeDeduction
    });
  }

  // Add manual deductions to itemized list
  calc.manualAdjustments
    .filter(a => a.type === 'deduction')
    .forEach(a => {
      allItemizedDeductions.push({
        id: a.id,
        name: `${a.category || 'Manual Adjustment'}: ${a.reason}`,
        amount: Number(a.amount)
      });
    });

  return {
    id: payId,
    staffId: staff.id,
    staffName: staff.fullName,
    position: staff.position,
    department: staff.department,
    payPeriodStart: calc.payPeriodStart,
    payPeriodEnd: calc.payPeriodEnd,
    payDate: calc.payDate,
    salaryType: staff.salaryType,
    rateSnapshot: staff.basicSalary,
    hourlyRateSnapshot: calc.hourlyRate,
    daysWorked: calc.daysWorked,
    hoursWorked: calc.regularPayableHours,
    scheduledHours: calc.scheduledHours,
    actualHours: calc.actualHours,
    regularHours: calc.regularPayableHours,
    lateMinutes: calc.lateMinutes,
    undertimeMinutes: calc.undertimeMinutes,
    lateDeduction: calc.lateDeduction,
    undertimeDeduction: calc.undertimeDeduction,
    candidateOvertimeHours: calc.candidateOvertimeHours,
    approvedOvertimeHours: calc.approvedOvertimeHours,
    overtimePay: calc.overtimePay,
    manualAdjustments: calc.manualAdjustments,
    basicPay: calc.basicPay,
    allowances: calc.allowances,
    otherEarnings: calc.otherEarnings,
    grossPay: calc.grossPay,
    deductions: calc.totalDeductions,
    itemizedDeductions: allItemizedDeductions,
    totalDeductions: calc.totalDeductions,
    netPay: calc.netPay,
    status: calc.status,
    notes: calc.notes,
    finalizedAt: existingRecord?.finalizedAt,
    finalizedBy: existingRecord?.finalizedBy,
    createdAt: existingRecord?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
