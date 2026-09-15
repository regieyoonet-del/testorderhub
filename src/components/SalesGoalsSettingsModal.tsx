/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Target,
  CheckCircle2,
  AlertTriangle,
  Divide,
  Save,
  Trash2,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { SalesGoalRecord } from '../types';
import { validateSalesGoal, splitAnnualGoalEqually } from '../utils/salesGoalCalculations';
import { formatCurrency } from '../utils/financeCalculations';

export interface SalesGoalsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesGoals: SalesGoalRecord[];
  onSaveSalesGoal: (goal: SalesGoalRecord) => Promise<boolean | void>;
  onDeleteSalesGoal?: (year: number) => Promise<boolean | void>;
  defaultYear?: number;
  initialYear?: number;
  currencySymbol?: string;
  isSyncing?: boolean;
}

export const SalesGoalsSettingsModal: React.FC<SalesGoalsSettingsModalProps> = ({
  isOpen,
  onClose,
  salesGoals,
  onSaveSalesGoal,
  onDeleteSalesGoal,
  defaultYear,
  initialYear,
  currencySymbol = '₱',
  isSyncing = false
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear || initialYear || currentYear);

  // Year choices: available from sales goals + surrounding years
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>([
      currentYear - 2,
      currentYear - 1,
      currentYear,
      currentYear + 1,
      currentYear + 2
    ]);
    salesGoals.forEach(g => {
      if (g.year) yearSet.add(g.year);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [salesGoals, currentYear]);

  // Form State
  const [annualGoal, setAnnualGoal] = useState<number>(6000000);
  const [q1Goal, setQ1Goal] = useState<number>(1500000);
  const [q2Goal, setQ2Goal] = useState<number>(1500000);
  const [q3Goal, setQ3Goal] = useState<number>(1500000);
  const [q4Goal, setQ4Goal] = useState<number>(1500000);
  const [notes, setNotes] = useState<string>('');
  const [isCustomYearInput, setIsCustomYearInput] = useState(false);
  const [customYearText, setCustomYearText] = useState('');

  // Status & Feedback
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load existing goal data whenever selectedYear or salesGoals changes
  useEffect(() => {
    if (!isOpen) return;
    const existing = salesGoals.find(g => g.year === selectedYear);
    if (existing) {
      setAnnualGoal(existing.annualGoal || 0);
      setQ1Goal(existing.q1Goal || 0);
      setQ2Goal(existing.q2Goal || 0);
      setQ3Goal(existing.q3Goal || 0);
      setQ4Goal(existing.q4Goal || 0);
      setNotes(existing.notes || '');
    } else {
      // Default template for a new year
      setAnnualGoal(6000000);
      setQ1Goal(1500000);
      setQ2Goal(1500000);
      setQ3Goal(1500000);
      setQ4Goal(1500000);
      setNotes(`Target sales goal for calendar year ${selectedYear}`);
    }
    setStatusMessage(null);
    setConfirmDelete(false);
  }, [selectedYear, salesGoals, isOpen]);

  // Sync defaultYear prop when modal opens
  useEffect(() => {
    if (isOpen && defaultYear) {
      setSelectedYear(defaultYear);
    }
  }, [isOpen, defaultYear]);

  // Validation
  const validation = useMemo(() => {
    return validateSalesGoal(annualGoal, q1Goal, q2Goal, q3Goal, q4Goal);
  }, [annualGoal, q1Goal, q2Goal, q3Goal, q4Goal]);

  const existingRecord = useMemo(() => {
    return salesGoals.find(g => g.year === selectedYear);
  }, [salesGoals, selectedYear]);

  // Split equally handler
  const handleSplitEqually = () => {
    const split = splitAnnualGoalEqually(annualGoal);
    setQ1Goal(split.q1);
    setQ2Goal(split.q2);
    setQ3Goal(split.q3);
    setQ4Goal(split.q4);
    setStatusMessage({
      type: 'success',
      text: `Split ${formatCurrency(annualGoal, currencySymbol)} equally across all four quarters.`
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Auto-balance remainder to Q4
  const handleBalanceRemainderToQ4 = () => {
    const currentQ13 = (Number(q1Goal) || 0) + (Number(q2Goal) || 0) + (Number(q3Goal) || 0);
    const neededForQ4 = Math.max(0, annualGoal - currentQ13);
    setQ4Goal(neededForQ4);
    setStatusMessage({
      type: 'success',
      text: `Adjusted Q4 Sales Goal to ${formatCurrency(neededForQ4, currencySymbol)} to match Annual Sales Goal.`
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) {
      setStatusMessage({
        type: 'error',
        text: validation.errorMessage || 'Cannot save invalid sales goals.'
      });
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage(null);

      const record: SalesGoalRecord = {
        id: existingRecord?.id || `SG-${selectedYear}`,
        year: selectedYear,
        annualGoal: Number(annualGoal),
        q1Goal: Number(q1Goal),
        q2Goal: Number(q2Goal),
        q3Goal: Number(q3Goal),
        q4Goal: Number(q4Goal),
        notes: notes.trim(),
        createdAt: existingRecord?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin'
      };

      await onSaveSalesGoal(record);
      setStatusMessage({
        type: 'success',
        text: `Sales Goals for ${selectedYear} saved and synced successfully!`
      });
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save Sales Goals. Please check your connection.'
      });
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!onDeleteSalesGoal || !existingRecord) return;
    try {
      setIsSaving(true);
      await onDeleteSalesGoal(selectedYear);
      setStatusMessage({
        type: 'success',
        text: `Sales Goals for ${selectedYear} deleted.`
      });
      setTimeout(() => {
        setIsSaving(false);
        setConfirmDelete(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setIsSaving(false);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to delete Sales Goals.'
      });
    }
  };

  const handleApplyCustomYear = () => {
    const yr = parseInt(customYearText.trim(), 10);
    if (!isNaN(yr) && yr >= 2020 && yr <= 2040) {
      setSelectedYear(yr);
      setIsCustomYearInput(false);
      setCustomYearText('');
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a valid year between 2020 and 2040.'
      });
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto"
      id="sales-goals-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sales-goals-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border-2 border-black flex flex-col max-h-[92vh] sm:max-h-[88vh] my-auto overflow-hidden animate-fade-in">
        {/* Pinned Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4.5 border-b border-neutral-800 bg-neutral-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 id="sales-goals-modal-title" className="text-base font-bold tracking-tight text-white leading-snug">
                Management Sales Goals Settings
              </h2>
              <p className="text-xs text-neutral-400">
                Configure annual and quarterly target quotas for pacing & performance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors focus:outline-none cursor-pointer"
            aria-label="Close dialog"
            id="close-sales-goals-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container with Scrollable Body and Pinned Footer */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
            {/* Year Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                  Target Year
                </label>
                {existingRecord ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Configured in Google Sheets
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Info className="w-3 h-3" /> New Goal Setup
                  </span>
                )}
              </div>

              {/* Year Buttons / Tabs - Fully visible with generous spacing and touch targets */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {availableYears.map(yr => {
                  const isSelected = yr === selectedYear;
                  const isConfigured = salesGoals.some(g => g.year === yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`px-3.5 py-1.5 min-h-[36px] text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer select-none ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                          : isConfigured
                          ? 'bg-white text-neutral-800 border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50'
                          : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-white hover:text-neutral-800'
                      }`}
                      id={`year-tab-${yr}`}
                    >
                      <span>{yr}</span>
                      {isConfigured && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Goal saved in Google Sheets" />
                      )}
                    </button>
                  );
                })}

                {isCustomYearInput ? (
                  <div className="flex items-center gap-1.5 ml-0.5">
                    <input
                      type="number"
                      min="2020"
                      max="2040"
                      value={customYearText}
                      onChange={e => setCustomYearText(e.target.value)}
                      placeholder="YYYY"
                      className="w-20 px-2.5 py-1.5 min-h-[36px] text-xs font-mono font-bold border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomYear}
                      className="px-3 py-1.5 min-h-[36px] text-xs font-bold bg-neutral-900 text-white rounded-xl hover:bg-black transition-colors cursor-pointer"
                    >
                      Set
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomYearInput(false)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
                      aria-label="Cancel custom year"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCustomYearInput(true)}
                    className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl border border-dashed border-neutral-300 transition-colors cursor-pointer"
                    id="add-custom-year-btn"
                  >
                    + Other Year
                  </button>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                Each year is persisted independently in the <code className="font-mono text-[10px] bg-neutral-100 px-1 py-0.5 rounded border border-neutral-200">SalesGoals</code> Google Sheet. Modifying {selectedYear} will never alter other years.
              </p>
            </div>

            {/* Annual Sales Goal Input */}
            <div className="bg-neutral-50/80 border border-neutral-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  Annual Sales Goal ({selectedYear})
                </label>
                <button
                  type="button"
                  onClick={handleSplitEqually}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition-colors shadow-2xs cursor-pointer"
                  id="split-annual-goal-btn"
                >
                  <Divide className="w-3.5 h-3.5" />
                  Split Annual Goal Equally (25% each)
                </button>
              </div>

              {/* Annual Amount Input with ample left padding for PHP/₱ prefix */}
              <div className="relative flex items-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold text-sm pointer-events-none select-none tracking-tight">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={annualGoal === 0 ? '' : annualGoal}
                  onChange={e => setAnnualGoal(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full pl-16 pr-4 py-2.5 bg-white border border-neutral-300 rounded-xl font-mono text-base font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all shadow-2xs"
                  id="annual-sales-goal-input"
                  required
                />
              </div>
              <p className="text-[11px] text-neutral-500">
                Formatted: <span className="font-semibold text-neutral-800 font-mono">{formatCurrency(annualGoal, currencySymbol)}</span>
              </p>
            </div>

            {/* Quarterly Sales Goals Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Quarterly Breakdown (Must sum to Annual Goal)
                </label>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Q1 + Q2 + Q3 + Q4 = {formatCurrency(validation.quarterTotal, currencySymbol)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Q1 */}
                <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs focus-within:border-neutral-900 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-800">Q1 Sales Goal</span>
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase">Jan - Mar</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold text-xs pointer-events-none select-none tracking-tight">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={q1Goal === 0 ? '' : q1Goal}
                      onChange={e => setQ1Goal(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-14 pr-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                      id="q1-sales-goal-input"
                    />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-neutral-400 font-mono">
                    {annualGoal > 0 ? `${((q1Goal / annualGoal) * 100).toFixed(1)}% of annual` : '0%'}
                  </div>
                </div>

                {/* Q2 */}
                <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs focus-within:border-neutral-900 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-800">Q2 Sales Goal</span>
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase">Apr - Jun</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold text-xs pointer-events-none select-none tracking-tight">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={q2Goal === 0 ? '' : q2Goal}
                      onChange={e => setQ2Goal(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-14 pr-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                      id="q2-sales-goal-input"
                    />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-neutral-400 font-mono">
                    {annualGoal > 0 ? `${((q2Goal / annualGoal) * 100).toFixed(1)}% of annual` : '0%'}
                  </div>
                </div>

                {/* Q3 */}
                <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs focus-within:border-neutral-900 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-800">Q3 Sales Goal</span>
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase">Jul - Sep</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold text-xs pointer-events-none select-none tracking-tight">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={q3Goal === 0 ? '' : q3Goal}
                      onChange={e => setQ3Goal(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-14 pr-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                      id="q3-sales-goal-input"
                    />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-neutral-400 font-mono">
                    {annualGoal > 0 ? `${((q3Goal / annualGoal) * 100).toFixed(1)}% of annual` : '0%'}
                  </div>
                </div>

                {/* Q4 */}
                <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs focus-within:border-neutral-900 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-neutral-800">Q4 Sales Goal</span>
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase">Oct - Dec</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold text-xs pointer-events-none select-none tracking-tight">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={q4Goal === 0 ? '' : q4Goal}
                      onChange={e => setQ4Goal(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full pl-14 pr-3 py-2 border border-neutral-300 rounded-lg font-mono text-xs font-bold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white"
                      id="q4-sales-goal-input"
                    />
                  </div>
                  <div className="mt-1 text-right text-[10px] text-neutral-400 font-mono">
                    {annualGoal > 0 ? `${((q4Goal / annualGoal) * 100).toFixed(1)}% of annual` : '0%'}
                  </div>
                </div>
              </div>

              {/* Live Validation Bar */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  validation.isValid
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50/80 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {validation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs">
                    {validation.isValid ? (
                      <div>
                        <p className="font-bold">Quarterly goals balance perfectly with Annual Goal.</p>
                        <p className="text-emerald-700 text-[11px] font-mono">
                          Q1 + Q2 + Q3 + Q4 = {formatCurrency(validation.quarterTotal, currencySymbol)} (100% matched)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold">Validation Issue:</p>
                        <p className="text-[11px] mt-0.5">{validation.errorMessage}</p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={handleBalanceRemainderToQ4}
                            className="text-[11px] font-semibold bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            Auto-Adjust Q4 to Balance
                          </button>
                          <button
                            type="button"
                            onClick={handleSplitEqually}
                            className="text-[11px] font-semibold bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            Split Annual Goal Equally
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / Strategy */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Strategy / Executive Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g., Focus on expanding corporate uniform accounts, promo packages, and commercial print contracts."
                className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none bg-white"
                id="sales-goal-notes-input"
              />
            </div>

            {/* Status Message Notification */}
            {statusMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-100 text-rose-900 border border-rose-200'
                }`}
              >
                {statusMessage.text}
              </div>
            )}
          </div>

          {/* Pinned Modal Footer Controls */}
          <div className="px-5 py-4 sm:px-6 sm:py-4 border-t border-gray-200 bg-neutral-50/95 flex items-center justify-between shrink-0 flex-wrap gap-2">
            <div>
              {existingRecord && onDeleteSalesGoal && (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-rose-600 font-bold">Confirm delete {selectedYear}?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="px-2.5 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    id="delete-sales-goal-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete {selectedYear} Goal
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 min-h-[38px] text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                id="cancel-sales-goal-btn"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!validation.isValid || isSaving || isSyncing}
                className={`inline-flex items-center gap-2 px-5 py-2 min-h-[38px] text-xs font-bold text-white rounded-xl transition-all shadow-md ${
                  validation.isValid && !isSaving && !isSyncing
                    ? 'bg-neutral-900 hover:bg-black active:scale-95 cursor-pointer'
                    : 'bg-neutral-400 cursor-not-allowed opacity-60'
                }`}
                id="save-sales-goal-btn"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving to Google Sheets...' : `Save ${selectedYear} Sales Goal`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SalesGoalsSettingsModal;
