import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Lock,
  RefreshCw,
  Eye,
  Sliders,
  ChevronDown,
  ChevronRight,
  Download,
  Plus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Check,
  User
} from 'lucide-react';
import {
  StaffMember,
  AttendanceRecord,
  PayrollRecord,
  PayrollStatus,
  AuthUser
} from '../types';
import {
  PayPeriodOption,
  generateStandardPayPeriods,
  calculateStaffPeriodPayroll,
  convertBreakdownToPayrollRecord,
  CalculatedPayrollBreakdown
} from '../utils/payrollCalculator';
import PayrollDetailReviewModal from './PayrollDetailReviewModal';
import PayrollFinalizeModal from './PayrollFinalizeModal';

interface PayrollCalculationReviewProps {
  staff: StaffMember[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  onSavePayroll: (record: PayrollRecord) => void;
  onSavePayrollBatch?: (records: PayrollRecord[]) => void;
  currencySymbol?: string;
  currentUser?: AuthUser | null;
}

export default function PayrollCalculationReview({
  staff = [],
  attendance = [],
  payroll = [],
  onSavePayroll,
  onSavePayrollBatch,
  currencySymbol = '₱',
  currentUser
}: PayrollCalculationReviewProps) {
  // Pay Period options
  const standardPeriods = useMemo(() => generateStandardPayPeriods(), []);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(standardPeriods[0]?.id || '');
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false);
  const [customStart, setCustomStart] = useState<string>(standardPeriods[0]?.startDate || '');
  const [customEnd, setCustomEnd] = useState<string>(standardPeriods[0]?.endDate || '');
  const [customPayDate, setCustomPayDate] = useState<string>(standardPeriods[0]?.payDate || '');

  // Derived effective dates
  const selectedPeriod = useMemo(() => {
    return standardPeriods.find(p => p.id === selectedPeriodId) || standardPeriods[0];
  }, [standardPeriods, selectedPeriodId]);

  const effectiveStart = isCustomPeriod ? customStart : (selectedPeriod?.startDate || '');
  const effectiveEnd = isCustomPeriod ? customEnd : (selectedPeriod?.endDate || '');
  const effectivePayDate = isCustomPeriod ? customPayDate : (selectedPeriod?.payDate || '');
  const effectivePeriodLabel = isCustomPeriod
    ? `${customStart} to ${customEnd}`
    : (selectedPeriod?.label || `${effectiveStart} to ${effectiveEnd}`);

  // Table filters & search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Active review employee breakdown
  const [selectedBreakdown, setSelectedBreakdown] = useState<CalculatedPayrollBreakdown | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string>('');

  // Active staff list
  const activeStaff = useMemo(() => {
    return staff.filter(s => s.status === 'Active');
  }, [staff]);

  // Departments list for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    staff.forEach(s => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [staff]);

  /**
   * Check if there are already existing payroll records for this period in the database.
   */
  const existingRecordsInPeriod = useMemo(() => {
    return payroll.filter(
      p => p.payPeriodStart === effectiveStart && p.payPeriodEnd === effectiveEnd
    );
  }, [payroll, effectiveStart, effectiveEnd]);

  // Are all active employees in this period finalized?
  const isPeriodFinalized = useMemo(() => {
    if (existingRecordsInPeriod.length === 0) return false;
    return existingRecordsInPeriod.every(p => p.status === 'Finalized');
  }, [existingRecordsInPeriod]);

  // Has any finalized records?
  const hasSomeFinalized = useMemo(() => {
    return existingRecordsInPeriod.some(p => p.status === 'Finalized');
  }, [existingRecordsInPeriod]);

  /**
   * Master calculations map: calculate or load for each active staff member.
   * CRITICAL RULE: If a record was already 'Finalized' historically, preserve its exact values!
   * Do NOT automatically recalculate or overwrite finalized records.
   */
  const calculatedBreakdowns: CalculatedPayrollBreakdown[] = useMemo(() => {
    return activeStaff.map(emp => {
      const existing = existingRecordsInPeriod.find(p => p.staffId === emp.id);

      // If existing record is Finalized, construct a breakdown reflecting the finalized values
      if (existing && existing.status === 'Finalized') {
        const freshBreakdown = calculateStaffPeriodPayroll(
          emp,
          effectiveStart,
          effectiveEnd,
          effectivePayDate,
          attendance,
          existing
        );

        // Lock values to the historical snapshot
        return {
          ...freshBreakdown,
          basicPay: existing.basicPay,
          grossPay: existing.grossPay,
          totalDeductions: existing.totalDeductions,
          netPay: existing.netPay,
          status: 'Finalized',
          scheduledHours: existing.scheduledHours ?? freshBreakdown.scheduledHours,
          actualHours: existing.actualHours ?? freshBreakdown.actualHours,
          regularPayableHours: existing.regularHours ?? freshBreakdown.regularPayableHours,
          lateMinutes: existing.lateMinutes ?? freshBreakdown.lateMinutes,
          undertimeMinutes: existing.undertimeMinutes ?? freshBreakdown.undertimeMinutes,
          lateDeduction: existing.lateDeduction ?? freshBreakdown.lateDeduction,
          undertimeDeduction: existing.undertimeDeduction ?? freshBreakdown.undertimeDeduction,
          approvedOvertimeHours: existing.approvedOvertimeHours ?? freshBreakdown.approvedOvertimeHours,
          overtimePay: existing.overtimePay ?? freshBreakdown.overtimePay,
          manualAdjustments: existing.manualAdjustments || freshBreakdown.manualAdjustments
        };
      }

      // Fresh calculation for draft / ready for approval
      return calculateStaffPeriodPayroll(
        emp,
        effectiveStart,
        effectiveEnd,
        effectivePayDate,
        attendance,
        existing
      );
    });
  }, [activeStaff, existingRecordsInPeriod, effectiveStart, effectiveEnd, effectivePayDate, attendance]);

  // Filtered breakdowns for summary table
  const filteredBreakdowns = useMemo(() => {
    return calculatedBreakdowns.filter(b => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = b.staff.fullName.toLowerCase().includes(query);
        const matchesId = b.staff.id.toLowerCase().includes(query);
        const matchesPos = (b.staff.position || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesPos) return false;
      }

      // Status
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }

      // Department
      if (departmentFilter !== 'all' && b.staff.department !== departmentFilter) {
        return false;
      }

      return true;
    });
  }, [calculatedBreakdowns, searchTerm, statusFilter, departmentFilter]);

  // Overall totals across all active employees in period
  const periodTotals = useMemo(() => {
    const totalScheduledHours = calculatedBreakdowns.reduce((s, b) => s + b.scheduledHours, 0);
    const totalActualHours = calculatedBreakdowns.reduce((s, b) => s + b.actualHours, 0);
    const totalRegularHours = calculatedBreakdowns.reduce((s, b) => s + b.regularPayableHours, 0);
    const totalLateMins = calculatedBreakdowns.reduce((s, b) => s + b.lateMinutes, 0);
    const totalUndertimeMins = calculatedBreakdowns.reduce((s, b) => s + b.undertimeMinutes, 0);
    const totalApprovedOT = calculatedBreakdowns.reduce((s, b) => s + b.approvedOvertimeHours, 0);
    const totalBasicPay = calculatedBreakdowns.reduce((s, b) => s + b.basicPay, 0);
    const totalOTPay = calculatedBreakdowns.reduce((s, b) => s + b.overtimePay, 0);
    const totalOtherEarnings = calculatedBreakdowns.reduce((s, b) => s + b.otherEarnings, 0);
    const totalGross = calculatedBreakdowns.reduce((s, b) => s + b.grossPay, 0);
    const totalDed = calculatedBreakdowns.reduce((s, b) => s + b.totalDeductions, 0);
    const totalNet = calculatedBreakdowns.reduce((s, b) => s + b.netPay, 0);

    const countDraft = calculatedBreakdowns.filter(b => b.status === 'Draft').length;
    const countReady = calculatedBreakdowns.filter(b => b.status === 'Ready for Approval').length;
    const countFinalized = calculatedBreakdowns.filter(b => b.status === 'Finalized').length;

    return {
      totalScheduledHours,
      totalActualHours,
      totalRegularHours,
      totalLateMins,
      totalUndertimeMins,
      totalApprovedOT,
      totalBasicPay,
      totalOTPay,
      totalOtherEarnings,
      totalGross,
      totalDed,
      totalNet,
      countDraft,
      countReady,
      countFinalized
    };
  }, [calculatedBreakdowns]);

  // Handle open employee detail review
  const handleOpenReview = (breakdown: CalculatedPayrollBreakdown) => {
    setSelectedBreakdown(breakdown);
    setIsReviewModalOpen(true);
  };

  // Handle update from review modal
  const handleUpdateBreakdown = (updated: CalculatedPayrollBreakdown) => {
    setSelectedBreakdown(updated);
  };

  // Save all calculated drafts to persistent storage (Google Sheets + local state)
  const handleSaveAllDrafts = () => {
    const recordsToSave = calculatedBreakdowns.map(b => {
      const existing = existingRecordsInPeriod.find(p => p.staffId === b.staff.id);
      return convertBreakdownToPayrollRecord(b, existing);
    });

    if (onSavePayrollBatch) {
      onSavePayrollBatch(recordsToSave);
    } else {
      recordsToSave.forEach(r => onSavePayroll(r));
    }

    setSaveFeedback('All payroll calculations saved & synchronized successfully!');
    setTimeout(() => setSaveFeedback(''), 4000);
  };

  // Mark all as Ready for Approval
  const handleMarkAllReady = () => {
    if (isPeriodFinalized) return;
    const updated = calculatedBreakdowns.map(b => {
      const existing = existingRecordsInPeriod.find(p => p.staffId === b.staff.id);
      const rec = convertBreakdownToPayrollRecord({ ...b, status: 'Ready for Approval' }, existing);
      return rec;
    });

    if (onSavePayrollBatch) {
      onSavePayrollBatch(updated);
    } else {
      updated.forEach(r => onSavePayroll(r));
    }

    setSaveFeedback('All active employee payroll records marked Ready for Approval.');
    setTimeout(() => setSaveFeedback(''), 4000);
  };

  // Finalize payroll handler
  const handleConfirmFinalize = () => {
    const adminName = currentUser?.name || 'Administrator';
    const timestamp = new Date().toISOString();

    const finalizedRecords = calculatedBreakdowns.map(b => {
      const existing = existingRecordsInPeriod.find(p => p.staffId === b.staff.id);
      const rec = convertBreakdownToPayrollRecord({ ...b, status: 'Finalized' }, existing);
      return {
        ...rec,
        status: 'Finalized' as PayrollStatus,
        finalizedAt: timestamp,
        finalizedBy: adminName,
        updatedAt: timestamp
      };
    });

    if (onSavePayrollBatch) {
      onSavePayrollBatch(finalizedRecords);
    } else {
      finalizedRecords.forEach(r => onSavePayroll(r));
    }

    setIsFinalizeModalOpen(false);
    setSaveFeedback(`Payroll for ${effectivePeriodLabel} officially Finalized! Preserved as historical record.`);
    setTimeout(() => setSaveFeedback(''), 5000);
  };

  return (
    <div className="space-y-5 animate-fade-in" id="payroll-calculation-review-container">
      
      {/* ---------------------------------------------------- */}
      {/* SECTION 1: PAY PERIOD SELECTION & CONTROLS           */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-100 text-blue-900">
                <DollarSign className="w-5 h-5 text-blue-700" />
              </span>
              <h2 className="text-base font-extrabold text-black uppercase tracking-wide">
                Payroll Calculation &amp; Review
              </h2>
              {isPeriodFinalized ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase bg-blue-100 text-blue-900 border border-blue-300">
                  <Lock className="w-3 h-3 text-blue-700" />
                  Period Finalized
                </span>
              ) : periodTotals.countReady === calculatedBreakdowns.length && calculatedBreakdowns.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase bg-purple-100 text-purple-900 border border-purple-300">
                  <CheckCircle className="w-3 h-3 text-purple-700" />
                  Ready for Finalization
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                  Draft Mode
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-gray-500">
              Select a pay cut-off to calculate shift hours, grace period attendance, approved overtime, and net take-home pay.
            </p>
          </div>

          {/* Period Selection Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isCustomPeriod ? (
              <div className="space-y-1">
                <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Standard Cut-off Period</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-blue-600" />
                  <select
                    value={selectedPeriodId}
                    onChange={e => setSelectedPeriodId(e.target.value)}
                    className="pl-8 pr-8 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-mono font-bold text-gray-900 rounded-xl border border-gray-200 focus:border-black focus:outline-none cursor-pointer"
                  >
                    {standardPeriods.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Cut-off Start</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="p-1.5 bg-gray-50 text-xs font-mono font-bold rounded-xl border border-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Cut-off End</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="p-1.5 bg-gray-50 text-xs font-mono font-bold rounded-xl border border-gray-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] uppercase font-mono font-bold text-gray-400">Pay Date</label>
                  <input
                    type="date"
                    value={customPayDate}
                    onChange={e => setCustomPayDate(e.target.value)}
                    className="p-1.5 bg-gray-50 text-xs font-mono font-bold rounded-xl border border-gray-200"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsCustomPeriod(!isCustomPeriod)}
              className="mt-4 px-2.5 py-2 text-[10px] font-mono font-bold uppercase text-gray-500 hover:text-black rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {isCustomPeriod ? 'Use Standard' : 'Custom Dates'}
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-gray-700">
              Active Cut-off: <strong className="text-black">{effectivePeriodLabel}</strong> (Pay Date: {effectivePayDate})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isPeriodFinalized && (
              <>
                <button
                  type="button"
                  onClick={handleSaveAllDrafts}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                  title="Save drafts and synchronize to Cloud Sheets"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Save Draft Calculations
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllReady}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark All Ready
                </button>

                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-mono font-extrabold uppercase transition-colors shadow-xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Finalize Payroll
                </button>
              </>
            )}

            {isPeriodFinalized && (
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Finalized &amp; Preserved Historical Payroll</span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {saveFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-mono font-bold text-emerald-900 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* PERIOD SUMMARY METRICS                               */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="block text-[10px] font-mono uppercase font-bold text-gray-400">Total Staff</span>
          <div className="text-lg font-extrabold font-mono text-black mt-1">
            {calculatedBreakdowns.length} Active
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            {periodTotals.countFinalized} Finalized • {periodTotals.countDraft} Draft
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="block text-[10px] font-mono uppercase font-bold text-gray-400">Payable Regular Hrs</span>
          <div className="text-lg font-extrabold font-mono text-blue-950 mt-1">
            {periodTotals.totalRegularHours.toFixed(2)}h
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            Sched: {periodTotals.totalScheduledHours}h | Act: {periodTotals.totalActualHours.toFixed(1)}h
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="block text-[10px] font-mono uppercase font-bold text-emerald-800">Approved Overtime</span>
          <div className="text-lg font-extrabold font-mono text-emerald-700 mt-1">
            {periodTotals.totalApprovedOT.toFixed(2)}h
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-800">
            +{currencySymbol}{periodTotals.totalOTPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="block text-[10px] font-mono uppercase font-bold text-gray-400">Total Gross Pay</span>
          <div className="text-lg font-extrabold font-mono text-gray-900 mt-1">
            {currencySymbol}{periodTotals.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            Base: {currencySymbol}{periodTotals.totalBasicPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
          <span className="block text-[10px] font-mono uppercase font-bold text-red-800">Total Deductions</span>
          <div className="text-lg font-extrabold font-mono text-red-600 mt-1">
            -{currencySymbol}{periodTotals.totalDed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-mono text-red-600">
            Late ({periodTotals.totalLateMins}m) &amp; Undertime
          </span>
        </div>

        <div className="bg-blue-900 text-white p-3.5 rounded-2xl shadow-xs">
          <span className="block text-[10px] font-mono uppercase font-bold text-blue-200">Total Net Payout</span>
          <div className="text-lg font-extrabold font-mono text-white mt-1">
            {currencySymbol}{periodTotals.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-mono text-blue-200">
            Disbursement Total
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 2: PAYROLL SUMMARY TABLE                     */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs space-y-3">
        {/* Table Search & Filters Header */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search staff, position, or ID..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl font-mono focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl font-mono bg-white cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Ready for Approval">Ready for Approval</option>
              <option value="Finalized">Finalized</option>
            </select>

            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl font-mono bg-white cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="text-xs font-mono text-gray-400 self-end sm:self-center">
            Showing {filteredBreakdowns.length} of {calculatedBreakdowns.length} staff
          </div>
        </div>

        {/* Master Summary Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] uppercase font-bold text-gray-500">
                <th className="py-3 px-3.5">Employee &amp; Rate</th>
                <th className="py-3 px-3">Pay Period</th>
                <th className="py-3 px-3 text-center" title="Scheduled standard regular hours">Sched Hrs</th>
                <th className="py-3 px-3 text-center" title="Raw actual hours punched in Attendance">Actual Hrs</th>
                <th className="py-3 px-3 text-center" title="Regular payable hours (clamped to shift start, grace honored)">Reg Payable</th>
                <th className="py-3 px-3 text-center" title="Late arrival minutes past 15m grace">Late (min)</th>
                <th className="py-3 px-3 text-center" title="Early clock-out departure minutes">Undertime (min)</th>
                <th className="py-3 px-3 text-center" title="Approved overtime hours (pending/rejected = 0)">Approved OT</th>
                <th className="py-3 px-3 text-right">Basic Pay</th>
                <th className="py-3 px-3 text-right">OT Pay</th>
                <th className="py-3 px-3 text-right">Other Earn</th>
                <th className="py-3 px-3 text-right">Deductions</th>
                <th className="py-3 px-3 text-right">Gross Pay</th>
                <th className="py-3 px-3.5 text-right">Net Pay</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
              {filteredBreakdowns.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-gray-400 font-mono text-xs">
                    No staff payroll calculations match the current filters.
                  </td>
                </tr>
              ) : (
                filteredBreakdowns.map(b => (
                  <tr
                    key={b.staff.id}
                    onClick={() => handleOpenReview(b)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    {/* Employee Name */}
                    <td className="py-3.5 px-3.5">
                      <div className="font-bold text-black group-hover:text-blue-900 transition-colors">
                        {b.staff.fullName}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                        <span>{b.staff.id}</span>
                        <span>•</span>
                        <span>{b.staff.position || 'Staff'}</span>
                      </div>
                      <div className="text-[10px] text-blue-900 font-bold">
                        {b.staff.salaryType}: {currencySymbol}{Number(b.staff.basicSalary || 0).toLocaleString()}
                        {b.hourlyRate > 0 && <span className="text-gray-400 font-normal"> ({currencySymbol}{b.hourlyRate}/h)</span>}
                      </div>
                    </td>

                    {/* Pay Period */}
                    <td className="py-3.5 px-3 text-[10px] text-gray-600 whitespace-nowrap">
                      <div>{b.payPeriodStart}</div>
                      <div className="text-gray-400">to {b.payPeriodEnd}</div>
                    </td>

                    {/* Scheduled Hours */}
                    <td className="py-3.5 px-3 text-center text-gray-600">
                      {b.scheduledHours}h
                    </td>

                    {/* Actual Hours */}
                    <td className="py-3.5 px-3 text-center font-bold text-gray-900">
                      {b.actualHours}h
                    </td>

                    {/* Regular Payable Hours */}
                    <td className="py-3.5 px-3 text-center font-extrabold text-blue-950 bg-blue-50/50">
                      {b.regularPayableHours}h
                    </td>

                    {/* Late Minutes */}
                    <td className="py-3.5 px-3 text-center">
                      {b.lateMinutes > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                          {b.lateMinutes}m
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>

                    {/* Undertime Minutes */}
                    <td className="py-3.5 px-3 text-center">
                      {b.undertimeMinutes > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                          {b.undertimeMinutes}m
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>

                    {/* Approved Overtime */}
                    <td className="py-3.5 px-3 text-center">
                      {b.approvedOvertimeHours > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                          {b.approvedOvertimeHours}h
                        </span>
                      ) : b.candidateOvertimeHours > 0 ? (
                        <span className="px-1 py-0.5 rounded bg-gray-100 text-gray-400 font-bold text-[9px]" title="Overtime Pending/Rejected">
                          0h (Pending)
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>

                    {/* Basic Pay */}
                    <td className="py-3.5 px-3 text-right font-medium text-gray-800">
                      {currencySymbol}{b.basicPay.toFixed(2)}
                    </td>

                    {/* Overtime Pay */}
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                      {b.overtimePay > 0 ? `+${currencySymbol}${b.overtimePay.toFixed(2)}` : '—'}
                    </td>

                    {/* Other Earnings */}
                    <td className="py-3.5 px-3 text-right text-gray-600">
                      {b.otherEarnings > 0 ? `+${currencySymbol}${b.otherEarnings.toFixed(2)}` : '0.00'}
                    </td>

                    {/* Deductions */}
                    <td className="py-3.5 px-3 text-right font-bold text-red-600">
                      -{currencySymbol}{b.totalDeductions.toFixed(2)}
                    </td>

                    {/* Gross Pay */}
                    <td className="py-3.5 px-3 text-right font-bold text-gray-900">
                      {currencySymbol}{b.grossPay.toFixed(2)}
                    </td>

                    {/* Net Pay */}
                    <td className="py-3.5 px-3.5 text-right font-extrabold text-sm text-emerald-700 bg-emerald-50/40">
                      {currencySymbol}{b.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-mono text-[9px] font-extrabold uppercase border ${
                          b.status === 'Finalized'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : b.status === 'Ready for Approval'
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenReview(b)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3 h-3" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MODALS                                               */}
      {/* ---------------------------------------------------- */}
      {isReviewModalOpen && selectedBreakdown && (
        <PayrollDetailReviewModal
          breakdown={selectedBreakdown}
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedBreakdown(null);
          }}
          onUpdateBreakdown={handleUpdateBreakdown}
          onSaveRecord={onSavePayroll}
          currencySymbol={currencySymbol}
          currentUser={currentUser}
        />
      )}

      {isFinalizeModalOpen && (
        <PayrollFinalizeModal
          isOpen={isFinalizeModalOpen}
          onClose={() => setIsFinalizeModalOpen(false)}
          onConfirmFinalize={handleConfirmFinalize}
          payPeriodLabel={effectivePeriodLabel}
          payPeriodStart={effectiveStart}
          payPeriodEnd={effectiveEnd}
          payDate={effectivePayDate}
          breakdowns={calculatedBreakdowns}
          currencySymbol={currencySymbol}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}
