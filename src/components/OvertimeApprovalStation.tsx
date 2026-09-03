import React, { useState } from 'react';
import { StaffMember, AttendanceRecord } from '../types';
import {
  calculateShiftAttendancePayroll,
  getStaffShiftConfig,
  formatMinutesToTime12
} from '../utils/payrollShiftUtils';
import { normalizeAttendanceDate } from '../utils/attendanceUtils';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  CheckCheck,
  Edit3,
  Calendar,
  User,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface OvertimeApprovalStationProps {
  staff: StaffMember[];
  attendance: AttendanceRecord[];
  onSaveAttendance?: (record: AttendanceRecord) => void;
  onSaveAttendanceBatch?: (records: AttendanceRecord[]) => void;
}

export default function OvertimeApprovalStation({
  staff,
  attendance,
  onSaveAttendance,
  onSaveAttendanceBatch
}: OvertimeApprovalStationProps) {
  const [filterStaffId, setFilterStaffId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [adjustingRecordId, setAdjustingRecordId] = useState<string | null>(null);
  const [adjustedHours, setAdjustedHours] = useState<number>(0);
  const [adminNote, setAdminNote] = useState<string>('');

  // Map staff lookup
  const staffMap = new Map<string, StaffMember>();
  staff.forEach(s => staffMap.set(s.id, s));

  // Find all attendance items that have overtime (either saved or computed)
  const overtimeItems = attendance
    .map(att => {
      const member = staffMap.get(att.staffId) || staff.find(s => s.fullName.toLowerCase() === att.staffName.toLowerCase());
      const calc = calculateShiftAttendancePayroll(att, member);
      
      const hasOvertime = calc.overtimeHours > 0 || (att.overtimeHours && att.overtimeHours > 0);
      if (!hasOvertime) return null;

      const currentStatus = att.overtimeStatus || calc.overtimeStatus;
      const otHours = att.overtimeHours ?? calc.overtimeHours;
      const approvedHrs = att.overtimeApprovedHours ?? (currentStatus === 'Approved' ? otHours : 0);

      return {
        record: att,
        member,
        calc,
        effectiveOvertimeHours: otHours,
        effectiveStatus: currentStatus,
        effectiveApprovedHours: approvedHrs
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.record.date.localeCompare(a.record.date));

  // Apply filters
  const filteredItems = overtimeItems.filter(item => {
    if (filterStaffId !== 'ALL' && item.record.staffId !== filterStaffId) return false;
    if (filterStatus !== 'ALL' && item.effectiveStatus !== filterStatus) return false;
    return true;
  });

  const pendingCount = overtimeItems.filter(i => i.effectiveStatus === 'Pending').length;
  const approvedCount = overtimeItems.filter(i => i.effectiveStatus === 'Approved').length;
  const rejectedCount = overtimeItems.filter(i => i.effectiveStatus === 'Rejected').length;

  const handleApprove = (item: typeof overtimeItems[0], customHours?: number) => {
    if (!onSaveAttendance) return;
    const hoursToApprove = customHours !== undefined ? customHours : item.effectiveOvertimeHours;

    const updatedRecord: AttendanceRecord = {
      ...item.record,
      overtimeStatus: 'Approved',
      overtimeHours: item.effectiveOvertimeHours,
      overtimeApprovedHours: hoursToApprove,
      overtimeReviewedBy: 'Admin',
      overtimeNotes: adminNote || item.record.overtimeNotes || 'Approved by Admin',
      updatedAt: new Date().toISOString()
    };

    onSaveAttendance(updatedRecord);
    setAdjustingRecordId(null);
    setAdminNote('');
  };

  const handleReject = (item: typeof overtimeItems[0]) => {
    if (!onSaveAttendance) return;

    const updatedRecord: AttendanceRecord = {
      ...item.record,
      overtimeStatus: 'Rejected',
      overtimeHours: item.effectiveOvertimeHours,
      overtimeApprovedHours: 0,
      overtimeReviewedBy: 'Admin',
      overtimeNotes: adminNote || item.record.overtimeNotes || 'Overtime rejected by Admin',
      updatedAt: new Date().toISOString()
    };

    onSaveAttendance(updatedRecord);
    setAdjustingRecordId(null);
    setAdminNote('');
  };

  const handleResetToPending = (item: typeof overtimeItems[0]) => {
    if (!onSaveAttendance) return;

    const updatedRecord: AttendanceRecord = {
      ...item.record,
      overtimeStatus: 'Pending',
      overtimeApprovedHours: 0,
      overtimeReviewedBy: undefined,
      updatedAt: new Date().toISOString()
    };

    onSaveAttendance(updatedRecord);
  };

  const handleApproveAllPending = () => {
    const pendings = overtimeItems.filter(i => i.effectiveStatus === 'Pending');
    if (pendings.length === 0) return;

    if (onSaveAttendanceBatch) {
      const updatedBatch = pendings.map(i => ({
        ...i.record,
        overtimeStatus: 'Approved' as const,
        overtimeHours: i.effectiveOvertimeHours,
        overtimeApprovedHours: i.effectiveOvertimeHours,
        overtimeReviewedBy: 'Admin',
        overtimeNotes: 'Batch approved by Admin',
        updatedAt: new Date().toISOString()
      }));
      onSaveAttendanceBatch(updatedBatch);
    } else if (onSaveAttendance) {
      pendings.forEach(i => {
        handleApprove(i);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Cards & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('Pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'Pending'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-amber-900">Pending Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-mono font-black text-amber-950 mt-1">{pendingCount}</div>
          <p className="text-[11px] text-amber-800/80 font-medium mt-0.5">Awaiting Admin decision</p>
        </div>

        <div
          onClick={() => setFilterStatus('Approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'Approved'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-900">Approved OT</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-black text-emerald-950 mt-1">{approvedCount}</div>
          <p className="text-[11px] text-emerald-800/80 font-medium mt-0.5">Included in Payroll</p>
        </div>

        <div
          onClick={() => setFilterStatus('Rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'Rejected'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-rose-900">Rejected OT</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-mono font-black text-rose-950 mt-1">{rejectedCount}</div>
          <p className="text-[11px] text-rose-800/80 font-medium mt-0.5">Excluded from pay</p>
        </div>

        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            filterStatus === 'ALL'
              ? 'bg-black text-white border-black shadow-xs'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono font-bold uppercase ${filterStatus === 'ALL' ? 'text-gray-300' : 'text-gray-500'}`}>
              Total Logs
            </span>
            <Clock className={`w-4 h-4 ${filterStatus === 'ALL' ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <div className={`text-2xl font-mono font-black mt-1 ${filterStatus === 'ALL' ? 'text-white' : 'text-black'}`}>
            {overtimeItems.length}
          </div>
          <p className={`text-[11px] font-medium mt-0.5 ${filterStatus === 'ALL' ? 'text-gray-300' : 'text-gray-500'}`}>
            Overtime events detected
          </p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono font-bold">
            <Filter className="w-3.5 h-3.5 text-black" />
            Filter Staff:
          </div>
          <select
            value={filterStaffId}
            onChange={e => setFilterStaffId(e.target.value)}
            className="p-2 border border-gray-200 rounded-xl text-xs font-mono font-medium focus:outline-none focus:border-black bg-white"
          >
            <option value="ALL">All Staff Members ({staff.length})</option>
            {staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.fullName} ({s.id})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {(['ALL', 'Pending', 'Approved', 'Rejected'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  filterStatus === st
                    ? 'bg-black text-white shadow-xs'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        {pendingCount > 0 && onSaveAttendance && (
          <button
            type="button"
            onClick={handleApproveAllPending}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Approve All {pendingCount} Pending OT
          </button>
        )}
      </div>

      {/* Overtime Records List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-10 text-center space-y-2">
            <Clock className="w-8 h-8 text-gray-300 mx-auto" />
            <h4 className="font-mono font-bold uppercase text-sm text-gray-700">No Overtime Records Found</h4>
            <p className="text-xs text-gray-400 font-sans max-w-md mx-auto">
              {filterStatus === 'Pending'
                ? 'All logged overtime hours have already been reviewed and processed.'
                : 'No attendance logs matched your current filters.'}
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const shiftCfg = getStaffShiftConfig(item.member);
            const isAdjusting = adjustingRecordId === item.record.id;

            return (
              <div
                key={item.record.id}
                className="bg-white border border-gray-200 hover:border-gray-300 rounded-2xl p-4 shadow-xs space-y-3 transition-all"
              >
                {/* Record Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
                      {(item.member?.fullName || item.record.staffName || 'S').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-black">
                          {item.member?.fullName || item.record.staffName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-bold">
                          {item.record.staffId || 'Staff'}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-sans flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span>{item.record.date}</span>
                        <span>•</span>
                        <span>{item.member?.position || 'Employee'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {item.effectiveStatus === 'Pending' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Pending Approval (+{item.effectiveOvertimeHours.toFixed(2)} hrs)
                      </span>
                    )}
                    {item.effectiveStatus === 'Approved' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Approved ({item.effectiveApprovedHours.toFixed(2)} hrs payable)
                      </span>
                    )}
                    {item.effectiveStatus === 'Rejected' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Rejected (0 hrs)
                      </span>
                    )}
                  </div>
                </div>

                {/* Calculation Detail Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50/80 rounded-xl p-3 text-xs font-mono">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Scheduled Shift</span>
                    <span className="font-bold text-black">
                      {shiftCfg.shiftStartTime} – {shiftCfg.shiftEndTime}
                    </span>
                    <span className="text-[10px] text-gray-500 block">({shiftCfg.gracePeriodMinutes}m grace period)</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Actual Logged Punch</span>
                    <span className="font-bold text-black">
                      In: {item.record.clockIn || '--:--'} • Out: {item.record.clockOut || '--:--'}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      Elapsed: {(item.record.totalHours || 0).toFixed(2)} hrs
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Regular Payable</span>
                    <span className="font-bold text-black">
                      {item.calc.regularHours.toFixed(2)} hrs
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      {item.calc.lateMinutes > 0 ? `${item.calc.lateMinutes}m late deduction` : 'On time'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Overtime Beyond Shift</span>
                    <span className="font-bold text-amber-900 text-sm">
                      +{item.effectiveOvertimeHours.toFixed(2)} hrs
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      {item.record.overtimeNotes || 'Beyond scheduled cutoff'}
                    </span>
                  </div>
                </div>

                {/* Adjust Hours Form (if open) */}
                {isAdjusting && (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 space-y-2 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-900 uppercase text-[11px]">
                        Adjust Approved Overtime Hours
                      </span>
                      <button
                        type="button"
                        onClick={() => setAdjustingRecordId(null)}
                        className="text-gray-400 hover:text-black font-bold text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-600">Hours to Pay:</label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max={item.effectiveOvertimeHours}
                          value={adjustedHours}
                          onChange={e => setAdjustedHours(parseFloat(e.target.value) || 0)}
                          className="w-20 p-1.5 border border-gray-300 rounded-lg font-mono font-bold text-xs bg-white text-center"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Optional note / reason for adjustment..."
                          value={adminNote}
                          onChange={e => setAdminNote(e.target.value)}
                          className="w-full p-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApprove(item, adjustedHours)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-mono font-bold uppercase text-xs"
                      >
                        Confirm &amp; Approve {adjustedHours.toFixed(2)}h
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                {onSaveAttendance && !isAdjusting && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-[11px] text-gray-400 font-mono">
                      {item.record.overtimeReviewedBy && (
                        <span>Reviewed by: <strong>{item.record.overtimeReviewedBy}</strong></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {item.effectiveStatus !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve ({item.effectiveOvertimeHours.toFixed(2)}h)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setAdjustingRecordId(item.record.id);
                          setAdjustedHours(item.effectiveOvertimeHours);
                          setAdminNote('');
                        }}
                        className="px-3 py-1.5 bg-white border border-gray-200 hover:border-black text-gray-700 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Adjust Hours
                      </button>

                      {item.effectiveStatus !== 'Rejected' && (
                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-mono font-bold uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      )}

                      {item.effectiveStatus !== 'Pending' && (
                        <button
                          type="button"
                          onClick={() => handleResetToPending(item)}
                          className="px-2.5 py-1.5 text-gray-400 hover:text-black text-xs font-mono font-bold uppercase"
                          title="Reset to Pending"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
