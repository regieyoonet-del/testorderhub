import { JobStatus } from '../types';

export const SHIPPED_INTERNAL_STATUS: JobStatus = 'Shipped';
export const SHIPPED_DISPLAY_LABEL = 'To Ship / To Deliver / To Pickup';

/**
 * Returns user-facing display label for a Job or Order status string.
 * Keeps the underlying status values ('Shipped', etc.) unchanged for data integrity.
 */
export function formatStatusLabel(status: string | undefined | null): string {
  if (!status) return '';
  if (status === 'Shipped' || status === SHIPPED_DISPLAY_LABEL) {
    return SHIPPED_DISPLAY_LABEL;
  }
  return status;
}

/**
 * Normalizes any external or raw status string (e.g. from Sheets or user inputs)
 * back to the canonical internal status value.
 */
export function normalizeStatusValue(status: string | undefined | null): string {
  if (!status) return '';
  const trimmed = status.trim();
  if (trimmed === SHIPPED_DISPLAY_LABEL || trimmed === 'Shipped') {
    return 'Shipped';
  }
  return trimmed;
}
