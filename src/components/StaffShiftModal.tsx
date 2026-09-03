import React, { useState, useEffect } from 'react';
import { StaffMember } from '../types';
import {
  DAYS_OF_WEEK,
  getStaffShiftConfig,
  formatMinutesToTime12,
  parseTimeToMinutes,
  normalizeTo24H
} from '../utils/payrollShiftUtils';
import {
  Clock,
  Calendar,
  ShieldCheck,
  Coffee,
  X,
  Check,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';

interface StaffShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember;
  onSaveShift: (updatedStaff: StaffMember) => void;
}

export default function StaffShiftModal({
  isOpen,
  onClose,
  staff,
  onSaveShift
}: StaffShiftModalProps) {
  const currentConfig = getStaffShiftConfig(staff);

  const [shiftStartTime, setShiftStartTime] = useState(currentConfig.shiftStartTime);
  const [shiftEndTime, setShiftEndTime] = useState(currentConfig.shiftEndTime);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(currentConfig.gracePeriodMinutes);
  const [breakMinutes, setBreakMinutes] = useState(currentConfig.breakMinutes);
  const [workingDays, setWorkingDays] = useState<string[]>(currentConfig.workingDays);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (staff) {
      const cfg = getStaffShiftConfig(staff);
      setShiftStartTime(cfg.shiftStartTime);
      setShiftEndTime(cfg.shiftEndTime);
      setGracePeriodMinutes(cfg.gracePeriodMinutes);
      setBreakMinutes(cfg.breakMinutes);
      setWorkingDays(cfg.workingDays);
      setSavedSuccess(false);
    }
  }, [staff, isOpen]);

  if (!isOpen || !staff) return null;

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter(d => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const applyPresetDays = (preset: 'mon-fri' | 'mon-sat' | 'all') => {
    if (preset === 'mon-fri') {
      setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    } else if (preset === 'mon-sat') {
      setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    } else if (preset === 'all') {
      setWorkingDays([...DAYS_OF_WEEK]);
    }
  };

  const startMins = parseTimeToMinutes(shiftStartTime) ?? 480;
  let endMins = parseTimeToMinutes(shiftEndTime) ?? 1020;
  if (endMins <= startMins) endMins += 1440;
  const spanMins = endMins - startMins;
  const netMins = Math.max(0, spanMins - (breakMinutes || 0));
  const dailyRegularHours = (netMins / 60).toFixed(2);
  const graceCutoffMins = startMins + (gracePeriodMinutes || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedStaff: StaffMember = {
      ...staff,
      shiftStartTime: normalizeTo24H(shiftStartTime, '08:00'),
      shiftEndTime: normalizeTo24H(shiftEndTime, '17:00'),
      workingDays: workingDays.length > 0 ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      gracePeriodMinutes: Math.max(0, parseInt(String(gracePeriodMinutes), 10) || 15),
      breakMinutes: Math.max(0, parseInt(String(breakMinutes), 10) || 60),
      updatedAt: new Date().toISOString()
    };

    onSaveShift(updatedStaff);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border-2 border-black shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-white rounded-2xl shadow-xs">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold uppercase text-base text-black font-mono tracking-tight">
                Staff Shift &amp; Attendance Rules
              </h3>
              <p className="text-xs text-gray-500 font-sans">
                Configure shift schedule, grace period, and payroll rules for <strong className="text-black font-semibold">{staff.fullName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Employee Card Banner */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black text-white font-mono font-bold text-sm flex items-center justify-center">
              {staff.fullName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold text-black">{staff.fullName}</div>
              <div className="text-[11px] text-gray-500 font-medium">
                {staff.position} • {staff.department} ({staff.id})
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              {staff.salaryType} Pay
            </span>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            Shift settings successfully saved! Future payroll calculations will apply this schedule.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Shift Time Window */}
          <div className="bg-neutral-50/70 border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase text-gray-700">
              <Clock className="w-4 h-4 text-black" />
              Scheduled Shift Hours
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Shift Start Time *
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={shiftStartTime}
                    onChange={e => setShiftStartTime(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 focus:border-black rounded-xl font-mono text-sm font-bold focus:outline-none bg-white"
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-mono">
                  Display: {formatMinutesToTime12(startMins)}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                  Shift End Time *
                </label>
                <div className="relative">
                  <input
                    type="time"
                    required
                    value={shiftEndTime}
                    onChange={e => setShiftEndTime(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 focus:border-black rounded-xl font-mono text-sm font-bold focus:outline-none bg-white"
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-mono">
                  Display: {formatMinutesToTime12(endMins)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-gray-600 pt-1 border-t border-gray-200">
              <span>Standard Scheduled Span:</span>
              <span className="font-bold text-black">{(spanMins / 60).toFixed(1)} hrs elapsed</span>
            </div>
          </div>

          {/* Grace Period & Unpaid Break */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Grace Period */}
            <div className="bg-neutral-50/70 border border-gray-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-black" />
                  Late Grace Period
                </label>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {gracePeriodMinutes} mins
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Clock-ins within this grace period incur <strong>no late deduction</strong>.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 10, 15, 30].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setGracePeriodMinutes(mins)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      gracePeriodMinutes === mins
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-black'
                    }`}
                  >
                    {mins === 0 ? 'None' : `${mins}m`}
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={gracePeriodMinutes}
                  onChange={e => setGracePeriodMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-16 p-1 text-center font-mono font-bold border border-gray-200 rounded-lg text-xs bg-white"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Cutoff: {formatMinutesToTime12(graceCutoffMins)}
              </p>
            </div>

            {/* Unpaid Break */}
            <div className="bg-neutral-50/70 border border-gray-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-700 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-black" />
                  Meal / Lunch Break
                </label>
                <span className="text-[10px] font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                  {breakMinutes} mins
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Standard unpaid meal break deducted from full-day regular shifts.
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 30, 60].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setBreakMinutes(mins)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      breakMinutes === mins
                        ? 'bg-black text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-black'
                    }`}
                  >
                    {mins === 0 ? '0m' : `${mins}m`}
                  </button>
                ))}
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={breakMinutes}
                  onChange={e => setBreakMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-16 p-1 text-center font-mono font-bold border border-gray-200 rounded-lg text-xs bg-white"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                Net Regular Hours: {dailyRegularHours} hrs/day
              </p>
            </div>
          </div>

          {/* Working Days / Schedule */}
          <div className="bg-neutral-50/70 border border-gray-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] uppercase font-mono font-bold text-gray-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-black" />
                Working Days Schedule ({workingDays.length} days/wk)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyPresetDays('mon-fri')}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-gray-200 hover:border-black text-gray-700"
                >
                  Mon–Fri
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDays('mon-sat')}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-gray-200 hover:border-black text-gray-700"
                >
                  Mon–Sat
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetDays('all')}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-gray-200 hover:border-black text-gray-700"
                >
                  Daily
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 pt-1">
              {DAYS_OF_WEEK.map(day => {
                const isSelected = workingDays.includes(day);
                const shortLabel = day.slice(0, 3);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`py-2 px-1 rounded-xl text-center font-mono font-bold text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs'
                        : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Rule Calculation Preview */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-mono font-bold text-[11px] uppercase text-blue-950">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" />
              Automated Payroll Logic for {staff.fullName}
            </div>
            <ul className="space-y-1.5 text-[11px] text-blue-900 list-disc list-inside font-medium leading-relaxed">
              <li>
                <strong>Early arrivals (e.g. 6:00 AM)</strong>: Regular payable time starts strictly at{' '}
                <span className="font-mono font-bold text-black">{formatMinutesToTime12(startMins)}</span>. Actual attendance stays at 6:00 AM.
              </li>
              <li>
                <strong>Grace window (up to {formatMinutesToTime12(graceCutoffMins)})</strong>: Arriving within {gracePeriodMinutes} mins is counted as on-time with{' '}
                <span className="font-bold text-emerald-800">no late deduction</span>.
              </li>
              <li>
                <strong>After {formatMinutesToTime12(graceCutoffMins)}</strong>: Late deduction applies calculated from scheduled start ({formatMinutesToTime12(startMins)}).
              </li>
              <li>
                <strong>Punches past {formatMinutesToTime12(endMins)}</strong>: Automatically tagged as{' '}
                <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">Overtime Pending Approval</span> and excluded from pay until Admin approves.
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 font-bold uppercase text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs shadow-xs cursor-pointer flex items-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Save Shift Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
