/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job, JobColumn, JobItem, JobItemColumn, Order, OrderItem } from '../types';

export const DEFAULT_JOB_COLUMNS: JobColumn[] = [
  {
    id: 'col-job-name',
    name: 'Job Name',
    type: 'text',
    position: 0,
    required: true,
    isSystemField: true,
    isHidden: false,
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-company',
    name: 'Company',
    type: 'company',
    position: 1,
    required: true,
    isSystemField: true,
    isHidden: false,
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-job-type',
    name: 'Job Type',
    type: 'dropdown',
    position: 2,
    required: false,
    isSystemField: false,
    isHidden: false,
    options: [
      'Screen Print',
      'DTF',
      'Sticker',
      'Digital Print',
      'Embroidery',
      'Sublimation',
      'Promotional Product',
      'Other'
    ],
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-status',
    name: 'Status',
    type: 'status',
    position: 3,
    required: true,
    isSystemField: true,
    isHidden: false,
    options: ['Pending', 'Approved', 'In Production', 'Shipped', 'Completed', 'Canceled'],
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-date-added',
    name: 'Date Added',
    type: 'date',
    position: 4,
    required: false,
    isSystemField: false,
    isHidden: false,
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-in-hand-date',
    name: 'In-Hand Date',
    type: 'date',
    position: 5,
    required: false,
    isSystemField: false,
    isHidden: false,
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-artwork-link',
    name: 'Artwork Link',
    type: 'link',
    position: 6,
    required: false,
    isSystemField: false,
    isHidden: false,
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-designer',
    name: 'Designer',
    type: 'person',
    position: 7,
    required: false,
    isSystemField: false,
    isHidden: false,
    options: ['Regie', 'Alex M.', 'Sarah K.', 'Production Team'],
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-priority',
    name: 'Priority',
    type: 'dropdown',
    position: 8,
    required: false,
    isSystemField: false,
    isHidden: false,
    options: ['Urgent', 'High', 'Normal', 'Low'],
    createdDate: '2026-08-01T00:00:00.000Z'
  },
  {
    id: 'col-notes',
    name: 'Notes',
    type: 'long_text',
    position: 9,
    required: false,
    isSystemField: false,
    isHidden: false,
    createdDate: '2026-08-01T00:00:00.000Z'
  }
];

export const DEFAULT_JOB_ITEM_COLUMNS: JobItemColumn[] = [
  { id: 'col-sub-design', name: 'Design Name', type: 'text', position: 0, required: true },
  { id: 'col-sub-brand', name: 'Brand', type: 'text', position: 1 },
  { id: 'col-sub-garment', name: 'Garment / Item Type', type: 'text', position: 2 },
  { id: 'col-sub-sku', name: 'SKU', type: 'text', position: 3 },
  { id: 'col-sub-colour', name: 'Colour', type: 'text', position: 4 },
  { id: 'col-sub-onesize', name: 'One Size', type: 'number', position: 5 },
  { id: 'col-sub-xs', name: 'XS', type: 'number', position: 6 },
  { id: 'col-sub-s', name: 'S', type: 'number', position: 7 },
  { id: 'col-sub-m', name: 'M', type: 'number', position: 8 },
  { id: 'col-sub-l', name: 'L', type: 'number', position: 9 },
  { id: 'col-sub-xl', name: 'XL', type: 'number', position: 10 },
  { id: 'col-sub-2xl', name: '2XL', type: 'number', position: 11 },
  { id: 'col-sub-3xl', name: '3XL', type: 'number', position: 12 },
  { id: 'col-sub-4xl', name: '4XL', type: 'number', position: 13 },
  { id: 'col-sub-total-qty', name: 'Total Qty', type: 'number', position: 14, isSystemField: true, calculation: 'total_qty' },
  { id: 'col-sub-amount-piece', name: 'Amount / Piece', type: 'currency', position: 15 },
  { id: 'col-sub-total-amount', name: 'Total Amount', type: 'currency', position: 16, isSystemField: true, calculation: 'total_amount' }
];

export const SIZE_COLUMN_IDS = [
  'col-sub-onesize',
  'col-sub-xs',
  'col-sub-s',
  'col-sub-m',
  'col-sub-l',
  'col-sub-xl',
  'col-sub-2xl',
  'col-sub-3xl',
  'col-sub-4xl'
];

/**
 * Calculates total quantity for a sub-item based on numeric size columns.
 */
export function calculateSubItemTotalQty(
  values: Record<string, any>,
  columns: JobItemColumn[] = DEFAULT_JOB_ITEM_COLUMNS
): number {
  const sizeCols = columns.filter(c =>
    c.type === 'number' &&
    c.id !== 'col-sub-total-qty' &&
    c.id !== 'col-sub-total-amount' &&
    c.id !== 'col-sub-amount-piece' &&
    !c.id.startsWith('col-custom-')
  );

  let total = 0;
  for (const col of sizeCols) {
    const val = Number(values[col.id]);
    if (!isNaN(val) && val > 0) {
      total += val;
    }
  }

  // If no size columns were populated, check if manual totalQty was provided
  if (total === 0 && values['col-sub-total-qty'] !== undefined) {
    const manualTotal = Number(values['col-sub-total-qty']);
    if (!isNaN(manualTotal) && manualTotal > 0) {
      return manualTotal;
    }
  }

  return total;
}

/**
 * Calculates total amount for a sub-item based on total qty * amount per piece.
 */
export function calculateSubItemTotalAmount(
  values: Record<string, any>,
  columns: JobItemColumn[] = DEFAULT_JOB_ITEM_COLUMNS
): number {
  const totalQty = calculateSubItemTotalQty(values, columns);
  const amountPerPiece = Number(values['col-sub-amount-piece']) || 0;
  return totalQty * amountPerPiece;
}

/**
 * Helper to calculate sum of sub-items for a Job.
 */
export function calculateJobTotals(
  items: JobItem[] = [],
  columns: JobItemColumn[] = DEFAULT_JOB_ITEM_COLUMNS
): { totalQuantity: number; totalAmount: number; itemCount: number } {
  let totalQuantity = 0;
  let totalAmount = 0;

  for (const item of items) {
    const qty = calculateSubItemTotalQty(item.values, columns);
    const amt = calculateSubItemTotalAmount(item.values, columns);
    totalQuantity += qty;
    totalAmount += amt;
  }

  return {
    totalQuantity,
    totalAmount,
    itemCount: items.length
  };
}

/**
 * Generates next unique Job ID (e.g. JOB-10452)
 */
export function generateJobId(existingJobs: Job[] = []): string {
  let allJobs = existingJobs;
  if (!allJobs || allJobs.length === 0) {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('rp_jobs') : null;
      if (cached) {
        allJobs = JSON.parse(cached);
      }
    } catch {
      allJobs = [];
    }
  }

  let maxNum = 10450;
  for (const j of allJobs || []) {
    const match = (j.id || '').match(/JOB-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `JOB-${maxNum + 1}`;
}

/**
 * Map an Order Item to a Job Sub-Item with snapshot data.
 */
export function convertOrderItemToJobItem(
  orderItem: OrderItem,
  jobId: string,
  index: number
): JobItem {
  const values: Record<string, any> = {
    'col-sub-design': orderItem.productName || 'Custom Print Design',
    'col-sub-brand': 'ARH Custom',
    'col-sub-garment': orderItem.productName || '',
    'col-sub-sku': orderItem.productId || '',
    'col-sub-colour': orderItem.selectedColor || 'Standard',
    'col-sub-amount-piece': orderItem.price || orderItem.unitPrice || 0
  };

  const qty = Number(orderItem.quantity) || 1;
  const size = (orderItem.selectedSize || '').toUpperCase().trim();

  // Distribute quantity to the matching size column
  if (size === 'XS') values['col-sub-xs'] = qty;
  else if (size === 'S') values['col-sub-s'] = qty;
  else if (size === 'M') values['col-sub-m'] = qty;
  else if (size === 'L') values['col-sub-l'] = qty;
  else if (size === 'XL') values['col-sub-xl'] = qty;
  else if (size === '2XL' || size === 'XXL') values['col-sub-2xl'] = qty;
  else if (size === '3XL' || size === 'XXXL') values['col-sub-3xl'] = qty;
  else if (size === '4XL' || size === 'XXXXL') values['col-sub-4xl'] = qty;
  else values['col-sub-onesize'] = qty;

  values['col-sub-total-qty'] = qty;
  values['col-sub-total-amount'] = qty * (Number(orderItem.price) || Number(orderItem.unitPrice) || 0);

  return {
    id: `item-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
    jobId,
    position: index,
    values,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Creates a new Job from an existing Company Order.
 */
export function createJobFromOrder(
  order: Order,
  existingJobs: Job[] = [],
  designer: string = 'Regie'
): Job {
  const jobId = generateJobId(existingJobs);
  const now = new Date().toISOString();

  // Target In-Hand Date: 7 days from order date by default
  const inHandDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateAdded = (order.createdAt ? new Date(order.createdAt) : new Date()).toISOString().split('T')[0];

  // Initial Job Status logic:
  // Job directly inherits the order's status if valid, otherwise defaults to Pending
  let initialJobStatus: Job['status'] = 'Pending';
  if (
    order.status === 'Approved' ||
    order.status === 'In Production' ||
    order.status === 'Shipped' ||
    order.status === 'Completed' ||
    order.status === 'Canceled'
  ) {
    initialJobStatus = order.status;
  }

  const subItems: JobItem[] = (order.items || []).map((it, idx) =>
    convertOrderItemToJobItem(it, jobId, idx)
  );

  const jobValues: Record<string, any> = {
    'col-job-name': `${order.companyName} - ${order.orderNumber}`,
    'col-company': order.companyName,
    'col-job-type': 'Screen Print',
    'col-status': initialJobStatus,
    'col-date-added': dateAdded,
    'col-in-hand-date': inHandDate,
    'col-artwork-link': '',
    'col-designer': designer,
    'col-priority': 'Normal',
    'col-notes': order.notes || `Production job generated from Order ${order.orderNumber}`
  };

  const newJob: Job = {
    id: jobId,
    companyName: order.companyName,
    orderId: order.id,
    orderNumber: order.orderNumber,
    source: 'Company Order',
    status: initialJobStatus,
    position: 0,
    values: jobValues,
    items: subItems,
    activities: [
      {
        id: `act-${Date.now()}-1`,
        jobId,
        user: 'Admin',
        action: 'Job created from Company Order',
        newValue: `${order.orderNumber} (${initialJobStatus})`,
        timestamp: now
      }
    ],
    comments: [],
    createdAt: now,
    updatedAt: now,
    createdBy: 'Admin'
  };

  return newJob;
}

export const INITIAL_JOBS: Job[] = [];
