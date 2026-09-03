import React from 'react';
import {
  Lock,
  X,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  Clock,
  DollarSign,
  ShieldAlert
} from 'lucide-react';
import { CalculatedPayrollBreakdown } from '../utils/payrollCalculator';
import { AuthUser } from '../types';

interface PayrollFinalizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFinalize: () => void;
  payPeriodLabel: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  breakdowns: CalculatedPayrollBreakdown[];
  currencySymbol?: string;
  currentUser?: AuthUser | null;
}

export default function PayrollFinalizeModal({
  isOpen,
  onClose,
  onConfirmFinalize,
  payPeriodLabel,
  payPeriodStart,
  payPeriodEnd,
  payDate,
  breakdowns,
  currencySymbol = '₱',
  currentUser
}: PayrollFinalizeModalProps) {
  if (!isOpen) return null;

  const totalEmployees = breakdowns.length;
  const totalGrossPay = breakdowns.reduce((sum, b) => sum + b.grossPay, 0);
  const totalDeductions = breakdowns.reduce((sum, b) => sum + b.totalDeductions, 0);
  const totalApprovedOvertime = breakdowns.reduce((sum, b) => sum + b.approvedOvertimeHours, 0);
  const totalNetPay = breakdowns.reduce((sum, b) => sum + b.netPay, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-black">
                Finalize Payroll Run
              </h3>
              <p className="text-[11px] font-mono text-gray-500">
                Official period approval &amp; freeze
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs font-mono text-blue-950 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-blue-900">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Preserved Historical Payroll Record</span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Finalizing this payroll run will lock the calculated attendance, overtime, gross pay, deductions, and net payouts for this cut-off. 
            <strong> Future attendance modifications or syncs will NOT automatically overwrite this finalized record.</strong>
          </p>
        </div>

        {/* Confirmation Summary Matrix */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Pay Period:
            </span>
            <span className="font-bold text-gray-900">{payPeriodLabel || `${payPeriodStart} to ${payPeriodEnd}`}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Official Pay Date:
            </span>
            <span className="font-bold text-gray-900">{payDate}</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              Staff Count:
            </span>
            <span className="font-bold text-gray-900">{totalEmployees} Active Employees</span>
          </div>

          <div className="flex justify-between items-center text-gray-600">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Total Approved Overtime:
            </span>
            <span className="font-bold text-emerald-700">{totalApprovedOvertime.toFixed(2)} Hours</span>
          </div>

          <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-gray-700">
            <span>Total Gross Pay:</span>
            <span className="font-bold text-gray-900">{currencySymbol}{totalGrossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex justify-between items-center text-gray-700">
            <span>Total Deductions:</span>
            <span className="font-bold text-red-600">-{currencySymbol}{totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="border-t border-gray-200 pt-2.5 flex justify-between items-center font-bold text-sm bg-white p-2.5 rounded-xl border border-gray-200">
            <span className="text-gray-900 uppercase">Total Net Disbursement:</span>
            <span className="font-extrabold text-emerald-700 text-base">
              {currencySymbol}{totalNetPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase text-gray-600 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmFinalize}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold uppercase transition-colors shadow-md cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm &amp; Finalize Payroll
          </button>
        </div>

      </div>
    </div>
  );
}
