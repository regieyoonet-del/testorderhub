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
 * Robustly normalizes any date representation (ISO string, MM/DD/YYYY, Date object)
 * into a standard YYYY-MM-DD format.
 */
export function normalizeAttendanceDate(raw: any): string {
  if (!raw) return formatLocalDate();
  const str = String(raw).trim();
  if (!str) return formatLocalDate();

  // If in ISO format like 2026-08-31T...
  if (str.includes('T')) {
    const dPart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dPart)) {
      return dPart;
    }
  }

  // If already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // If slash-separated e.g. MM/DD/YYYY or YYYY/MM/DD
  if (str.includes('/')) {
    const parts = str.split('/').map(p => p.trim());
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // MM/DD/YYYY
        const y = parts[2];
        const m = parts[0].padStart(2, '0');
        const d = parts[1].padStart(2, '0');
        return `${y}-${m}-${d}`;
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
  }

  // Fallback to JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return formatLocalDate(parsed);
  }

  return str;
}

/**
 * Sanitizes Clock Out value. Returns undefined if empty, "null", "undefined", or "N/A".
 */
export function cleanClockOut(raw: any): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const str = String(raw).trim();
  if (
    !str ||
    str.toLowerCase() === 'undefined' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'none' ||
    str === '-'
  ) {
    return undefined;
  }
  return str;
}

/**
 * Sanitizes Clock In value. Returns clean string or empty string.
 */
export function cleanClockIn(raw: any): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return '';
  return str;
}

/**
 * Parses any clockIn value (12h AM/PM, 24h, ISO timestamp, full datetime) and resolves it
 * to a clean JavaScript Date instance based on the record's date.
 */
export function parseClockInDate(rawClockIn: string, recordDate?: string): Date | null {
  if (!rawClockIn) return null;
  const str = String(rawClockIn).trim();
  if (!str) return null;

  // 1. If it's a full ISO datetime string (e.g. 2026-08-31T08:30:00.000Z)
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // Parse baseline date from recordDate (or fallback to today)
  const normDate = recordDate ? normalizeAttendanceDate(recordDate) : formatLocalDate();
  const dateParts = normDate.split('-').map(Number);
  const now = new Date();
  let year = dateParts[0] || now.getFullYear();
  let month = (dateParts[1] !== undefined ? dateParts[1] - 1 : now.getMonth());
  let day = dateParts[2] || now.getDate();

  const clockInDate = new Date(year, month, day, 0, 0, 0, 0);

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
    return fallbackDate;
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
 */
export function isRecordActiveClockIn(record?: AttendanceRecord | null): boolean {
  if (!record) return false;
  const clockIn = cleanClockIn(record.clockIn);
  const clockOut = cleanClockOut(record.clockOut);
  return Boolean(clockIn && !clockOut);
}
