/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AttendanceRecord } from '../types';

/**
 * Returns today's date in local YYYY-MM-DD format.
 */
export function formatLocalDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a date string is a valid attendance calendar date (YYYY-MM-DD)
 * within a realistic operational timeframe (2020 - 2100).
 */
export function isValidAttendanceDate(raw: any): boolean {
  if (!raw) return false;
  const str = String(raw).trim();
  if (!str) return false;

  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 2020 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * Robustly normalizes any date representation (ISO string, MM/DD/YYYY, Date object)
 * into a standard YYYY-MM-DD format with strict year validation (2020-2100).
 */
export function normalizeAttendanceDate(raw: any, fallbackDate: string = formatLocalDate()): string {
  if (!raw) return fallbackDate;
  const str = String(raw).trim();
  if (!str) return fallbackDate;

  // If in ISO format like 2026-08-31T...
  if (str.includes('T')) {
    const dPart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dPart)) {
      const year = parseInt(dPart.slice(0, 4), 10);
      if (year >= 2020 && year <= 2100) {
        return dPart;
      }
      return fallbackDate;
    }
  }

  // If already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const year = parseInt(str.slice(0, 4), 10);
    if (year >= 2020 && year <= 2100) {
      return str;
    }
    return fallbackDate;
  }

  // If slash-separated e.g. MM/DD/YYYY or YYYY/MM/DD
  if (str.includes('/')) {
    const parts = str.split('/').map(p => p.trim());
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // MM/DD/YYYY
        const y = parseInt(parts[2], 10);
        if (y >= 2020 && y <= 2100) {
          const m = parts[0].padStart(2, '0');
          const d = parts[1].padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD
        const y = parseInt(parts[0], 10);
        if (y >= 2020 && y <= 2100) {
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
    }
  }

  // Fallback to JS Date parse if valid year
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y >= 2020 && y <= 2100) {
      return formatLocalDate(parsed);
    }
  }

  return fallbackDate;
}

/**
 * Formats any raw clock time (including 1899 Google Sheets ISO time artifacts)
 * into a clean, human-readable 12-hour AM/PM time string (e.g., "08:30:00 AM").
 */
export function formatClockTime(raw: any): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (
    !str ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'none' ||
    str === '-'
  ) {
    return '';
  }

  // If it's an ISO timestamp starting with 1899 or modern ISO string
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
  }

  return str;
}

/**
 * Sanitizes Clock Out value. Returns undefined if empty, "null", "undefined", or "N/A".
 */
export function cleanClockOut(raw: any): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const formatted = formatClockTime(raw);
  return formatted ? formatted : undefined;
}

/**
 * Sanitizes Clock In value. Returns clean string or empty string.
 */
export function cleanClockIn(raw: any): string {
  if (!raw) return '';
  return formatClockTime(raw);
}

/**
 * Parses any clockIn value (12h AM/PM, 24h, ISO timestamp, full datetime) and resolves it
 * to a clean JavaScript Date instance based on the record's date (or today).
 * Never permits historical/1899 epoch years to contaminate the calculation.
 */
export function parseClockInDate(rawClockIn: string, recordDate?: string): Date | null {
  if (!rawClockIn) return null;
  const str = String(rawClockIn).trim();
  if (!str) return null;

  // Parse baseline date from recordDate (or fallback to today)
  const normDate = normalizeAttendanceDate(recordDate);
  const dateParts = normDate.split('-').map(Number);
  const now = new Date();
  const year = dateParts[0] || now.getFullYear();
  const month = dateParts[1] !== undefined ? dateParts[1] - 1 : now.getMonth();
  const day = dateParts[2] || now.getDate();

  const clockInDate = new Date(year, month, day, 0, 0, 0, 0);

  // 1. If it's an ISO timestamp (e.g. 1899-12-29T23:28:52.000Z or 2026-08-31T08:30:00.000Z)
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // If modern year and no explicit recordDate override, use d directly
      if (d.getFullYear() >= 2020 && !recordDate) {
        return d;
      }
      // Otherwise apply the hours/minutes/seconds of d onto the record's calendar date!
      clockInDate.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), 0);
      return clockInDate;
    }
  }

  // 2. 12-hour format with AM/PM (e.g., "08:30:15 AM", "4:15 PM")
  if (/am|pm/i.test(str)) {
    const match = str.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = match[3] ? parseInt(match[3], 10) : 0;
      const ampm = match[4].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      clockInDate.setHours(hours, minutes, seconds, 0);
      return clockInDate;
    }
  }

  // 3. 24-hour time format (e.g., "16:30:00", "08:30")
  if (str.includes(':')) {
    const parts = str.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const seconds = parseInt(parts[2] || '0', 10) || 0;
    clockInDate.setHours(hours, minutes, seconds, 0);
    return clockInDate;
  }

  // 4. Try generic Date constructor
  const fallbackDate = new Date(str);
  if (!isNaN(fallbackDate.getTime())) {
    clockInDate.setHours(fallbackDate.getHours(), fallbackDate.getMinutes(), fallbackDate.getSeconds(), 0);
    return clockInDate;
  }

  return null;
}

/**
 * Calculates real-time elapsed duration string (HH:MM:SS) since clock-in.
 */
export function calculateElapsedDuration(rawClockIn?: string, recordDate?: string): string {
  if (!rawClockIn) return '00:00:00';
  const clockInDate = parseClockInDate(rawClockIn, recordDate);
  if (!clockInDate) return '00:00:00';

  const now = new Date();
  let diffMs = now.getTime() - clockInDate.getTime();
  if (diffMs < 0) diffMs = 0;

  const diffSecs = Math.floor(diffMs / 1000);
  const hrs = Math.floor(diffSecs / 3600);
  const mins = Math.floor((diffSecs % 3600) / 60);
  const secs = diffSecs % 60;

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Calculates total hours worked between clock-in and clock-out.
 */
export function calculateHoursWorked(rawClockIn?: string, rawClockOut?: string, recordDate?: string): number {
  if (!rawClockIn) return 0;
  const clockInDate = parseClockInDate(rawClockIn, recordDate);
  if (!clockInDate) return 8;

  let clockOutDate: Date | null = null;
  if (rawClockOut) {
    clockOutDate = parseClockInDate(rawClockOut, recordDate);
  }
  if (!clockOutDate) {
    clockOutDate = new Date();
  }

  let diffMs = clockOutDate.getTime() - clockInDate.getTime();
  if (diffMs < 0) {
    // Cross-midnight shift support
    diffMs += 24 * 60 * 60 * 1000;
  }

  return Number(Math.max(0.01, diffMs / (1000 * 60 * 60)).toFixed(2));
}

/**
 * Determines whether an attendance record represents an actively clocked-in session.
 * Strictly validates that the record:
 * - Has a valid staffId
 * - Has a non-empty clockIn and NO clockOut
 * - Has a valid calendar date (year 2020-2100)
 * - Belongs to today's active shift window (or overnight shift within last 18 hours)
 */
export function isRecordActiveClockIn(record?: AttendanceRecord | null, targetDate?: string): boolean {
  if (!record) return false;
  if (!record.staffId || !String(record.staffId).trim()) return false;

  // 1. Must have valid clock-in and NO clock-out
  const clockIn = cleanClockIn(record.clockIn);
  const clockOut = cleanClockOut(record.clockOut);
  if (!clockIn || clockOut) return false;

  // 2. Status cannot be non-active (e.g. Absent, Leave)
  if ((record.status as string) === 'Absent' || record.status === 'Leave') return false;

  // 3. Must have a valid calendar date
  const normDate = normalizeAttendanceDate(record.date, '');
  if (!isValidAttendanceDate(normDate)) return false;

  // 4. Must match the target date or today's active shift window
  const todayLocal = targetDate || formatLocalDate();
  const todayIso = new Date().toISOString().slice(0, 10);

  // Exact calendar match for today
  if (normDate === todayLocal || normDate === todayIso) {
    return true;
  }

  // Allow recent shift started within last 18 hours (e.g. night shift crossing midnight)
  const clockInDate = parseClockInDate(clockIn, normDate);
  if (clockInDate) {
    const elapsedMs = Date.now() - clockInDate.getTime();
    if (elapsedMs >= 0 && elapsedMs <= 18 * 60 * 60 * 1000) {
      return true;
    }
  }

  return false;
}
