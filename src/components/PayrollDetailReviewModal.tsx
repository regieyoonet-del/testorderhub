import React, { useState } from 'react';
import {
  X,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  Trash2,
  Info,
  ShieldCheck,
  Lock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import {
  CalculatedPayrollBreakdown,
  convertBreakdownToPayrollRecord
} from '../utils/payrollCalculator';
import {
  PayrollRecord,
  PayrollManualAdjustment,
  PayrollStatus,
  AuthUser
} from '../types';

interface PayrollDetailReviewModalProps {
  breakdown: CalculatedPayrollBreakdown;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBreakdown: (updated: CalculatedPayrollBreakdown) => void;
  onSaveRecord: (record: PayrollRecord) => void;
  currencySymbol?: string;
  currentUser?: AuthUser | null;
}

export default function PayrollDetailReviewModal({
  breakdown,
  isOpen,
  onClose,
  onUpdateBreakdown,
  onSaveRecord,
  currencySymbol = '₱',
  currentUser
}: PayrollDetailReviewModalProps) {
  const [activeTab, setActiveTab] = useState<'breakdown' | 'adjustments'>('breakdown');
  
  // New Manual Adjustment Form State
  const [adjType, setAdjType] = useState<'earning' | 'deduction'>('earning');
  const [adjCategory, setAdjCategory] = useState<string>('Additional Earning');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjError, setAdjError] = useState<string>('');

  if (!isOpen) return null;

  const isFinalized = breakdown.status === 'Finalized';
  const staff = breakdown.staff;

  const handleAddAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError('');

    const num = parseFloat(adjAmount);
    if (isNaN(num) || num <= 0) {
      setAdjError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!adjReason.trim()) {
      setAdjError('Please provide a note or reason for this adjustment.');
      return;
    }

    const adminName = currentUser?.name || 'Administrator';
    const newAdj: PayrollManualAdjustment = {
      id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: adjType,
      category: adjCategory,
      amount: Number(num.toFixed(2)),
      reason: adjReason.trim(),
      adminName,
      timestamp: new Date().toISOString()
    };

    const updatedAdjustments = [...breakdown.manualAdjustments, newAdj];

    // Recalculate totals
    const manualEarnings = updatedAdjustments
      .filter(a => a.type === 'earning')
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const manualDeductions = updatedAdjustments
      .filter(a => a.type === 'deduction')
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const otherEarnings = Number((breakdown.allowances + manualEarnings).toFixed(2));
    const grossPay = Number((breakdown.basicPay + breakdown.overtimePay + otherEarnings).toFixed(2));

    const statDedTotal = breakdown.statutoryDeductions.reduce((sum, d) => sum + d.amount, 0);
    const totalDeductions = Number((breakdown.lateDeduction + breakdown.undertimeDeduction + statDedTotal + manualDeductions).toFixed(2));
    const netPay = Math.max(0, Number((grossPay - totalDeductions).toFixed(2)));

    const updatedBreakdown: CalculatedPayrollBreakdown = {
      ...breakdown,
      manualAdjustments: updatedAdjustments,
      manualEarnings,
      manualDeductions,
      otherEarnings,
      grossPay,
      totalDeductions,
      netPay
    };

    onUpdateBreakdown(updatedBreakdown);
    const updatedRecord = convertBreakdownToPayrollRecord(updatedBreakdown);
    onSaveRecord(updatedRecord);

    // Reset form
    setAdjAmount('');
    setAdjReason('');
  };

  const handleRemoveAdjustment = (adjId: string) => {
    if (isFinalized) {
      alert('This payroll record is Finalized. Cannot delete historical adjustments.');
      return;
    }

    const updatedAdjustments = breakdown.manualAdjustments.filter(a => a.id !== adjId);

    const manualEarnings = updatedAdjustments
      .filter(a => a.type === 'earning')
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const manualDeductions = updatedAdjustments
      .filter(a => a.type === 'deduction')
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    const otherEarnings = Number((breakdown.allowances + manualEarnings).toFixed(2));
    const grossPay = Number((breakdown.basicPay + breakdown.overtimePay + otherEarnings).toFixed(2));

    const statDedTotal = breakdown.statutoryDeductions.reduce((sum, d) => sum + d.amount, 0);
    const totalDeductions = Number((breakdown.lateDeduction + breakdown.undertimeDeduction + statDedTotal + manualDeductions).toFixed(2));
    const netPay = Math.max(0, Number((grossPay - totalDeductions).toFixed(2)));

    const updatedBreakdown: CalculatedPayrollBreakdown = {
      ...breakdown,
      manualAdjustments: updatedAdjustments,
      manualEarnings,
      manualDeductions,
      otherEarnings,
      grossPay,
      totalDeductions,
      netPay
    };

    onUpdateBreakdown(updatedBreakdown);
    const updatedRecord = convertBreakdownToPayrollRecord(updatedBreakdown);
    onSaveRecord(updatedRecord);
  };

  const handleStatusChange = (nextStatus: PayrollStatus) => {
    const updatedBreakdown: CalculatedPayrollBreakdown = {
      ...breakdown,
      status: nextStatus
    };
    onUpdateBreakdown(updatedBreakdown);
    const updatedRecord = convertBreakdownToPayrollRecord(updatedBreakdown);
    onSaveRecord(updatedRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-5xl w-full p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto my-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-extrabold text-lg text-black">
                {staff.fullName}
              </h3>
              <span className="font-mono text-xs text-gray-400 font-bold">
                ({staff.id})
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase border ${
                  breakdown.status === 'Finalized'
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : breakdown.status === 'Ready for Approval'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {breakdown.status === 'Finalized' && <Lock className="w-2.5 h-2.5" />}
                {breakdown.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {staff.position} • {staff.department} • Pay Scheme: <span className="font-bold text-gray-800">{staff.salaryType} (Base: {currencySymbol}{Number(staff.basicSalary || 0).toLocaleString()})</span>
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60 inline-flex">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Pay Period: <strong>{breakdown.payPeriodStart}</strong> to <strong>{breakdown.payPeriodEnd}</strong> (Pay Date: {breakdown.payDate})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {!isFinalized && (
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleStatusChange('Draft')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                    breakdown.status === 'Draft'
                      ? 'bg-white text-black shadow-2xs font-extrabold'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('Ready for Approval')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                    breakdown.status === 'Ready for Approval'
                      ? 'bg-purple-600 text-white shadow-2xs font-extrabold'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  Ready for Approval
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* High-Level Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200/80">
            <span className="block text-[10px] font-mono uppercase font-bold text-gray-500">Regular Payable Time</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-extrabold font-mono text-black">{breakdown.regularPayableHours}</span>
              <span className="text-[10px] font-mono text-gray-500">/ {breakdown.scheduledHours} hrs</span>
            </div>
            <span className="text-[9px] font-mono text-gray-400">Actual Logged: {breakdown.actualHours} hrs</span>
          </div>

          <div className="p-3 bg-red-50/60 rounded-2xl border border-red-200/70">
            <span className="block text-[10px] font-mono uppercase font-bold text-red-800">Late &amp; Undertime</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-extrabold font-mono text-red-600">
                {breakdown.lateMinutes}m late
              </span>
              <span className="text-xs font-mono text-red-500">/ {breakdown.undertimeMinutes}m early</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-red-700">
              Deduction: -{currencySymbol}{(breakdown.lateDeduction + breakdown.undertimeDeduction).toFixed(2)}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80">
            <span className="block text-[10px] font-mono uppercase font-bold text-emerald-800">Approved Overtime</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-extrabold font-mono text-emerald-700">{breakdown.approvedOvertimeHours}</span>
              <span className="text-[10px] font-mono text-emerald-600">hrs payable</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-800">
              +{currencySymbol}{breakdown.overtimePay.toFixed(2)} (125% rate)
            </span>
          </div>

          <div className="p-3 bg-blue-900 text-white rounded-2xl shadow-xs">
            <span className="block text-[10px] font-mono uppercase font-bold text-blue-200">Net Take-Home Pay</span>
            <div className="text-xl font-extrabold font-mono text-white mt-1">
              {currencySymbol}{breakdown.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] font-mono text-blue-200">
              Gross: {currencySymbol}{breakdown.grossPay.toFixed(2)} | Ded: -{currencySymbol}{breakdown.totalDeductions.toFixed(2)}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('breakdown')}
            className={`pb-2.5 px-3 text-xs font-mono font-bold uppercase transition-all cursor-pointer border-b-2 ${
              activeTab === 'breakdown'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            Attendance &amp; Shift Breakdown ({breakdown.dailyBreakdowns.length} Days)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adjustments')}
            className={`pb-2.5 px-3 text-xs font-mono font-bold uppercase transition-all cursor-pointer border-b-2 ${
              activeTab === 'adjustments'
                ? 'border-black text-black'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            Manual Adjustments &amp; Deductions ({breakdown.manualAdjustments.length})
          </button>
        </div>

        {/* TAB 1: ATTENDANCE BREAKDOWN */}
        {activeTab === 'breakdown' && (
          <div className="space-y-4">
            <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-600 space-y-1">
              <div className="font-bold text-gray-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Shift Attendance Payroll Rule Engine:
              </div>
              <ul className="list-disc list-inside text-[11px] text-gray-500 space-y-0.5 ml-1">
                <li><strong>Early Clock-in:</strong> Punches prior to scheduled shift start (e.g. 6:00 AM) do not start payable hours early. Payable starts at scheduled start. Raw attendance remains unmodified.</li>
                <li><strong>Grace Period (15 mins):</strong> Clocks-in within grace (e.g. 8:15 AM) incur 0 late deduction. Clocks-in after grace (e.g. 8:16 AM) incur actual late minutes from scheduled start (16 mins).</li>
                <li><strong>Early Clock-out:</strong> Departures before shift end incur undertime deduction based on hourly rate.</li>
                <li><strong>Overtime:</strong> Hours worked beyond shift end require approval in the Overtime Approval Station. Only <strong>Approved</strong> overtime is payable in payroll.</li>
              </ul>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] uppercase font-bold text-gray-500">
                      <th className="py-2.5 px-3">Date / Day</th>
                      <th className="py-2.5 px-3">Scheduled Shift</th>
                      <th className="py-2.5 px-3">Actual Clock In</th>
                      <th className="py-2.5 px-3">Actual Clock Out</th>
                      <th className="py-2.5 px-3 text-center">Regular Payable</th>
                      <th className="py-2.5 px-3 text-center">Late</th>
                      <th className="py-2.5 px-3 text-center">Undertime</th>
                      <th className="py-2.5 px-3 text-center">Candidate OT</th>
                      <th className="py-2.5 px-3 text-center">Approved OT</th>
                      <th className="py-2.5 px-3">Status Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                    {breakdown.dailyBreakdowns.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-400">
                          No attendance records found for this employee in the selected pay period.
                        </td>
                      </tr>
                    ) : (
                      breakdown.dailyBreakdowns.map((day, idx) => (
                        <tr key={`${day.date}-${idx}`} className="hover:bg-gray-50/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-gray-900">{day.date}</div>
                            <div className="text-[10px] text-gray-400">{day.dayOfWeek}</div>
                          </td>
                          <td className="py-2.5 px-3 text-gray-700">
                            {day.scheduledShiftStart} - {day.scheduledShiftEnd}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`font-bold ${day.isLate ? 'text-red-600' : 'text-gray-900'}`}>
                              {day.actualClockIn || '—'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`font-bold ${day.isEarlyDeparture ? 'text-amber-700' : 'text-gray-900'}`}>
                              {day.actualClockOut || <span className="text-gray-400 italic">Open Shift</span>}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-950">
                            {day.regularPayableHours} hrs
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {day.lateMinutes > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                                {day.lateMinutes}m
                              </span>
                            ) : day.isWithinGracePeriod ? (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]" title="Within 15m Grace Period">
                                Grace (0m)
                              </span>
                            ) : (
                              <span className="text-gray-400">0m</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {day.undertimeMinutes > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                {day.undertimeMinutes}m
                              </span>
                            ) : (
                              <span className="text-gray-400">0m</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-600">
                            {day.candidateOvertimeHours > 0 ? `${day.candidateOvertimeHours}h` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {day.approvedOvertimeHours > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                                {day.approvedOvertimeHours}h
                              </span>
                            ) : day.candidateOvertimeHours > 0 ? (
                              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-bold text-[10px]">
                                0h ({day.overtimeStatus})
                              </span>
                            ) : (
                              <span className="text-gray-400">0h</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[10px] text-gray-500">
                            {day.summary}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Earnings & Deductions Summary Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Earnings Table */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-mono font-bold uppercase text-black flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Earnings Breakdown
                  </span>
                  <span className="text-xs font-mono font-extrabold text-emerald-700">
                    Gross: {currencySymbol}{breakdown.grossPay.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Basic Salary / Base Pay:</span>
                    <span className="font-bold text-gray-900">{currencySymbol}{breakdown.basicPay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Approved Overtime Pay:</span>
                    <span className="font-bold text-emerald-700">+{currencySymbol}{breakdown.overtimePay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Standard Allowances:</span>
                    <span className="font-bold text-gray-900">{currencySymbol}{breakdown.allowances.toFixed(2)}</span>
                  </div>
                  {breakdown.manualEarnings > 0 && (
                    <div className="flex justify-between items-center text-blue-700">
                      <span>Manual Adjustment Earnings:</span>
                      <span className="font-bold">+{currencySymbol}{breakdown.manualEarnings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex justify-between items-center font-bold text-sm text-gray-900">
                    <span>Total Gross Earnings:</span>
                    <span className="font-extrabold">{currencySymbol}{breakdown.grossPay.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-xs font-mono font-bold uppercase text-black flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    Deductions Breakdown
                  </span>
                  <span className="text-xs font-mono font-extrabold text-red-600">
                    Total: -{currencySymbol}{breakdown.totalDeductions.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Late Arrival ({breakdown.lateMinutes} mins):</span>
                    <span className="font-bold text-red-600">-{currencySymbol}{breakdown.lateDeduction.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Early Departure ({breakdown.undertimeMinutes} mins):</span>
                    <span className="font-bold text-red-600">-{currencySymbol}{breakdown.undertimeDeduction.toFixed(2)}</span>
                  </div>
                  {breakdown.statutoryDeductions.map(d => (
                    <div key={d.id} className="flex justify-between items-center text-gray-600">
                      <span>{d.name}:</span>
                      <span className="font-bold text-gray-800">-{currencySymbol}{d.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {breakdown.manualDeductions > 0 && (
                    <div className="flex justify-between items-center text-red-700">
                      <span>Manual Deductions:</span>
                      <span className="font-bold">-{currencySymbol}{breakdown.manualDeductions.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex justify-between items-center font-bold text-sm text-red-600">
                    <span>Total Deductions:</span>
                    <span className="font-extrabold">-{currencySymbol}{breakdown.totalDeductions.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL ADJUSTMENTS */}
        {activeTab === 'adjustments' && (
          <div className="space-y-5">
            {isFinalized ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs font-mono text-amber-900">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>This payroll record is Finalized. Adjustments cannot be added or deleted here.</span>
              </div>
            ) : (
              <form onSubmit={handleAddAdjustment} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-black flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-black" />
                    Add Controlled Manual Adjustment
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">
                    Recorded with your admin name &amp; timestamp
                  </span>
                </div>

                {adjError && (
                  <div className="p-2 bg-red-100 text-red-700 text-xs rounded-xl font-mono">
                    {adjError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Adjustment Type</label>
                    <select
                      value={adjType}
                      onChange={e => {
                        const nextType = e.target.value as 'earning' | 'deduction';
                        setAdjType(nextType);
                        if (nextType === 'earning') setAdjCategory('Additional Earning');
                        else setAdjCategory('Manual Deduction');
                      }}
                      className="w-full p-2 bg-white border border-gray-200 focus:border-black rounded-xl"
                    >
                      <option value="earning">Additional Earning (+)</option>
                      <option value="deduction">Manual Deduction (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                    <select
                      value={adjCategory}
                      onChange={e => setAdjCategory(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 focus:border-black rounded-xl"
                    >
                      {adjType === 'earning' ? (
                        <>
                          <option value="Additional Earning">Additional Earning</option>
                          <option value="Bonus / Commission">Bonus / Commission</option>
                          <option value="Approved Overtime Adjustment">Approved Overtime Adjustment</option>
                          <option value="Reimbursement">Reimbursement</option>
                          <option value="Other Earning">Other Earning</option>
                        </>
                      ) : (
                        <>
                          <option value="Manual Deduction">Manual Deduction</option>
                          <option value="Cash Advance / Loan">Cash Advance / Loan</option>
                          <option value="Disciplinary / Damage">Disciplinary / Damage</option>
                          <option value="Tax Withholding Adjustment">Tax Withholding Adjustment</option>
                          <option value="Other Deduction">Other Deduction</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={adjAmount}
                      onChange={e => setAdjAmount(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 focus:border-black rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Action</label>
                    <button
                      type="submit"
                      className="w-full py-2 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase transition-colors cursor-pointer"
                    >
                      Apply Adjustment
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Reason / Notes *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Performance incentive, special bonus, uniform deposit reimbursement..."
                    value={adjReason}
                    onChange={e => setAdjReason(e.target.value)}
                    className="w-full p-2 bg-white border border-gray-200 focus:border-black rounded-xl text-xs font-mono"
                  />
                </div>
              </form>
            )}

            {/* List of Adjustments */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-mono font-bold uppercase text-gray-700">
                Applied Manual Adjustments ({breakdown.manualAdjustments.length})
              </div>
              <div className="divide-y divide-gray-100">
                {breakdown.manualAdjustments.length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-gray-400">
                    No manual adjustments applied to this employee's payroll.
                  </div>
                ) : (
                  breakdown.manualAdjustments.map(adj => (
                    <div key={adj.id} className="p-3.5 flex items-center justify-between text-xs font-mono hover:bg-gray-50/60 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              adj.type === 'earning'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {adj.type === 'earning' ? '+ Earning' : '- Deduction'}
                          </span>
                          <span className="font-bold text-gray-900">{adj.category || 'Adjustment'}</span>
                          <span className="text-[10px] text-gray-400">
                            by {adj.adminName} on {adj.timestamp ? new Date(adj.timestamp).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-[11px]">{adj.reason}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-extrabold text-sm ${
                            adj.type === 'earning' ? 'text-emerald-700' : 'text-red-600'
                          }`}
                        >
                          {adj.type === 'earning' ? '+' : '-'}{currencySymbol}{Number(adj.amount).toFixed(2)}
                        </span>
                        {!isFinalized && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdjustment(adj.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Adjustment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <div className="text-xs font-mono text-gray-500">
            Calculated Net: <strong className="text-emerald-700 font-extrabold text-sm">{currencySymbol}{breakdown.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
          >
            Done Reviewing
          </button>
        </div>

      </div>
    </div>
  );
}
