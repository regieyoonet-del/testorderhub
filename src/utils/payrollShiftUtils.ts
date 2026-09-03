import { AttendanceRecord, StaffMember, OvertimeStatus } from '../types';

export interface StaffShiftConfig {
  shiftStartTime: string;     // HH:mm (24-hour e.g. "08:00")
  shiftEndTime: string;       // HH:mm (24-hour e.g. "17:00")
  workingDays: string[];      // ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  gracePeriodMinutes: number; // e.g. 15
  breakMinutes: number;       // e.g. 60 (unpaid meal break)
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const DEFAULT_SHIFT_CONFIG: StaffShiftConfig = {
  shiftStartTime: '08:00',
  shiftEndTime: '17:00',
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  gracePeriodMinutes: 15,
  breakMinutes: 60
};

/**
 * Converts any time string (12h or 24h, with or without seconds/AM/PM)
 * into total minutes from midnight (0 to 1439).
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim();
  if (!clean) return null;

  // 12-hour AM/PM format (e.g., "08:00 AM", "5:00 PM", "08:00:23 AM")
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = parseInt(ampmMatch[2], 10);
    const meridian = ampmMatch[3].toUpperCase();

    if (meridian === 'AM') {
      if (hours === 12) hours = 0;
    } else if (meridian === 'PM') {
      if (hours !== 12) hours += 12;
    }
    return hours * 60 + minutes;
  }

  // 24-hour format (e.g., "08:00", "17:00", "08:00:00")
  const militaryMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (militaryMatch) {
    const hours = parseInt(militaryMatch[1], 10);
    const minutes = parseInt(militaryMatch[2], 10);
    return hours * 60 + minutes;
  }

  // Try parsing ISO Date string if passed
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  } catch {
    // Ignore error
  }

  return null;
}

/**
 * Formats minutes from midnight into 24-hour format "HH:mm".
 */
export function formatMinutesToTime24(totalMinutes: number): string {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Formats minutes from midnight into 12-hour format "h:mm A" (e.g., "8:00 AM", "5:00 PM").
 */
export function formatMinutesToTime12(totalMinutes: number): string {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  let hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  const meridian = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${meridian}`;
}

/**
 * Normalizes any time representation to a clean 24-hour "HH:mm" string for form inputs.
 */
export function normalizeTo24H(timeStr?: string, fallback = '08:00'): string {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return fallback;
  return formatMinutesToTime24(mins);
}

/**
 * Converts any time string to a readable 12-hour display format (e.g. "8:00 AM").
 */
export function formatTimeDisplay(timeStr?: string): string {
  if (!timeStr) return '';
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr;
  return formatMinutesToTime12(mins);
}

/**
 * Retrieves a staff member's configured shift schedule or returns default values.
 */
export function getStaffShiftConfig(staff?: Partial<StaffMember> | null): StaffShiftConfig {
  if (!staff) return { ...DEFAULT_SHIFT_CONFIG };

  const shiftStartTime = normalizeTo24H(staff.shiftStartTime, DEFAULT_SHIFT_CONFIG.shiftStartTime);
  const shiftEndTime = normalizeTo24H(staff.shiftEndTime, DEFAULT_SHIFT_CONFIG.shiftEndTime);
  const workingDays = Array.isArray(staff.workingDays) && staff.workingDays.length > 0
    ? staff.workingDays
    : [...DEFAULT_SHIFT_CONFIG.workingDays];
  const gracePeriodMinutes = typeof staff.gracePeriodMinutes === 'number' && !isNaN(staff.gracePeriodMinutes)
    ? staff.gracePeriodMinutes
    : DEFAULT_SHIFT_CONFIG.gracePeriodMinutes;
  const breakMinutes = typeof staff.breakMinutes === 'number' && !isNaN(staff.breakMinutes)
    ? staff.breakMinutes
    : DEFAULT_SHIFT_CONFIG.breakMinutes;

  return {
    shiftStartTime,
    shiftEndTime,
    workingDays,
    gracePeriodMinutes,
    breakMinutes
  };
}

export interface ShiftCalculationResult {
  actualClockIn: string;
  actualClockOut?: string;
  actualLoggedHours: number;
  scheduledShiftStart: string;
  scheduledShiftEnd: string;
  regularPayableStart: string;
  regularPayableEnd: string;
  regularHours: number;
  lateMinutes: number;
  isWithinGracePeriod: boolean;
  isLate: boolean;
  undertimeMinutes: number;
  isEarlyDeparture: boolean;
  overtimeMinutes: number;
  overtimeHours: number;
  overtimeStatus: OvertimeStatus;
  approvedOvertimeHours: number;
  isScheduledDay: boolean;
  dayOfWeek: string;
  summary: string;
}

/**
 * Calculates shift and payroll metrics strictly respecting:
 * 1. Configured Shift Start & End Times
 * 2. Late Grace Period (15 minutes default)
 * 3. Regular payable time starts at Shift Start Time (early clock in does NOT start payable early)
 * 4. Overtime beyond Shift End Time is "Pending Approval" by default and not automatically payable
 * 5. Actual Attendance Record values (clockIn, clockOut, totalHours) are never modified.
 */
export function calculateShiftAttendancePayroll(
  record: AttendanceRecord,
  staff?: Partial<StaffMember> | null
): ShiftCalculationResult {
  const config = getStaffShiftConfig(staff);
  const actualClockIn = record.clockIn || '';
  const actualClockOut = record.clockOut || '';
  const actualLoggedHours = record.totalHours || 0;

  const shiftStartMins = parseTimeToMinutes(config.shiftStartTime) ?? 480; // default 8:00 AM (480)
  let shiftEndMins = parseTimeToMinutes(config.shiftEndTime) ?? 1020;      // default 5:00 PM (1020)
  if (shiftEndMins <= shiftStartMins) {
    shiftEndMins += 1440; // Handles cross-midnight shifts
  }

  const graceMins = Math.max(0, config.gracePeriodMinutes ?? 15);
  const graceCutoffMins = shiftStartMins + graceMins;

  // Day of week check
  let dayOfWeek = '';
  let isScheduledDay = true;
  if (record.date) {
    try {
      const parts = record.date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        dayOfWeek = DAYS_OF_WEEK[(d.getDay() + 6) % 7]; // Mon=0, Sun=6
        if (config.workingDays && config.workingDays.length > 0) {
          isScheduledDay = config.workingDays.includes(dayOfWeek);
        }
      }
    } catch {
      // Ignore
    }
  }

  const actualInMins = parseTimeToMinutes(actualClockIn);
  let actualOutMins = parseTimeToMinutes(actualClockOut);

  // If missing or unparsed clock in, fallback
  if (actualInMins === null) {
    return {
      actualClockIn,
      actualClockOut,
      actualLoggedHours,
      scheduledShiftStart: formatMinutesToTime12(shiftStartMins),
      scheduledShiftEnd: formatMinutesToTime12(shiftEndMins),
      regularPayableStart: formatMinutesToTime12(shiftStartMins),
      regularPayableEnd: formatMinutesToTime12(shiftEndMins),
      regularHours: 0,
      lateMinutes: 0,
      isWithinGracePeriod: false,
      isLate: false,
      undertimeMinutes: 0,
      isEarlyDeparture: false,
      overtimeMinutes: 0,
      overtimeHours: 0,
      overtimeStatus: record.overtimeStatus || 'Pending',
      approvedOvertimeHours: record.overtimeApprovedHours || 0,
      isScheduledDay,
      dayOfWeek,
      summary: 'No clock-in recorded'
    };
  }

  // Determine Regular Payable Start Time & Late status
  let regularPayableStartMins = shiftStartMins;
  let lateMinutes = 0;
  let isWithinGracePeriod = false;
  let isLate = false;

  if (actualInMins <= shiftStartMins) {
    // Early arrival (e.g. 6:00 AM or 7:55 AM for 8:00 AM shift)
    // Regular payable time starts at Shift Start Time (8:00 AM)
    regularPayableStartMins = shiftStartMins;
    lateMinutes = 0;
    isWithinGracePeriod = false;
    isLate = false;
  } else if (actualInMins <= graceCutoffMins) {
    // Within Grace Period (e.g. 8:10 AM or 8:15 AM for 8:00 AM shift with 15m grace)
    // No late deduction applies! Regular payable starts at Shift Start Time (8:00 AM)
    regularPayableStartMins = shiftStartMins;
    lateMinutes = 0;
    isWithinGracePeriod = true;
    isLate = false;
  } else {
    // Beyond Grace Period (e.g. 8:16 AM or 8:30 AM)
    // Late deduction applies
    lateMinutes = actualInMins - shiftStartMins;
    regularPayableStartMins = actualInMins;
    isWithinGracePeriod = false;
    isLate = true;
  }

  // Handle Clock Out, Undertime, and Overtime
  let regularPayableEndMins = shiftEndMins;
  let undertimeMinutes = 0;
  let isEarlyDeparture = false;
  let overtimeMinutes = 0;
  let overtimeHours = 0;

  if (actualOutMins !== null) {
    // Normalize if clock out is on next day
    if (actualOutMins < actualInMins) {
      actualOutMins += 1440;
    }

    if (actualOutMins >= shiftEndMins) {
      // Clocked out at or after scheduled shift end
      regularPayableEndMins = shiftEndMins;
      undertimeMinutes = 0;
      isEarlyDeparture = false;
      overtimeMinutes = actualOutMins - shiftEndMins;
      overtimeHours = Number((overtimeMinutes / 60).toFixed(2));
    } else {
      // Departed before shift end (undertime)
      regularPayableEndMins = actualOutMins;
      undertimeMinutes = shiftEndMins - actualOutMins;
      isEarlyDeparture = true;
      overtimeMinutes = 0;
      overtimeHours = 0;
    }
  } else {
    // Active shift (no clock out yet)
    regularPayableEndMins = shiftEndMins;
  }

  // Calculate regular payable duration in hours
  let regularDurationMins = Math.max(0, regularPayableEndMins - regularPayableStartMins);

  // Deduct meal break if full shift or spans typical 4+ hours
  const scheduledSpanMins = shiftEndMins - shiftStartMins;
  const breakDeductionMins = (scheduledSpanMins > 300 && config.breakMinutes > 0)
    ? config.breakMinutes
    : 0;

  if (regularDurationMins > breakDeductionMins && actualOutMins !== null) {
    regularDurationMins -= breakDeductionMins;
  }

  const maxRegularHours = Math.max(0, (scheduledSpanMins - breakDeductionMins) / 60);
  let regularHours = Number((regularDurationMins / 60).toFixed(2));
  if (regularHours > maxRegularHours) {
    regularHours = Number(maxRegularHours.toFixed(2));
  }
  if (actualOutMins === null) {
    // If shift is ongoing, regular hours is 0 until shift finishes
    regularHours = 0;
  }

  // Overtime Status & Approved Hours
  let overtimeStatus: OvertimeStatus = record.overtimeStatus || 'Pending';
  if (overtimeHours <= 0) {
    overtimeStatus = 'Pending';
  }

  let approvedOvertimeHours = 0;
  if (overtimeHours > 0) {
    if (overtimeStatus === 'Approved') {
      approvedOvertimeHours = typeof record.overtimeApprovedHours === 'number' && record.overtimeApprovedHours >= 0
        ? record.overtimeApprovedHours
        : overtimeHours;
    }
  }

  // Generate clear human-readable summary
  const summaryParts: string[] = [];
  if (actualInMins <= shiftStartMins) {
    summaryParts.push(`Early/On-time (Payable from ${formatMinutesToTime12(shiftStartMins)})`);
  } else if (isWithinGracePeriod) {
    summaryParts.push(`Within 15m grace (No late deduction)`);
  } else if (isLate) {
    summaryParts.push(`Late by ${lateMinutes}m`);
  }

  if (isEarlyDeparture) {
    summaryParts.push(`Left ${undertimeMinutes}m early`);
  }

  if (overtimeHours > 0) {
    summaryParts.push(`Overtime: ${overtimeHours}h (${overtimeStatus})`);
  }

  return {
    actualClockIn,
    actualClockOut,
    actualLoggedHours,
    scheduledShiftStart: formatMinutesToTime12(shiftStartMins),
    scheduledShiftEnd: formatMinutesToTime12(shiftEndMins),
    regularPayableStart: formatMinutesToTime12(regularPayableStartMins),
    regularPayableEnd: formatMinutesToTime12(regularPayableEndMins),
    regularHours,
    lateMinutes,
    isWithinGracePeriod,
    isLate,
    undertimeMinutes,
    isEarlyDeparture,
    overtimeMinutes,
    overtimeHours,
    overtimeStatus,
    approvedOvertimeHours,
    isScheduledDay,
    dayOfWeek,
    summary: summaryParts.join(' • ') || 'Normal shift completed'
  };
}
