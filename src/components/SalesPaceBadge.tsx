/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { SalesPaceStatus } from '../types';

export interface SalesPaceBadgeProps {
  pace: SalesPaceStatus;
  isCompleted?: boolean;
}

export const SalesPaceBadge: React.FC<SalesPaceBadgeProps> = ({ pace, isCompleted }) => {
  if (pace === 'Ahead of Pace') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
        <ArrowUpRight className="w-3.5 h-3.5" />
        <span>{isCompleted ? 'Goal Achieved' : 'Ahead of Pace'}</span>
      </span>
    );
  }
  if (pace === 'On Pace') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
        <Clock className="w-3.5 h-3.5" />
        <span>On Pace</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
      <ArrowDownRight className="w-3.5 h-3.5" />
      <span>Behind Pace</span>
    </span>
  );
};

export default SalesPaceBadge;
