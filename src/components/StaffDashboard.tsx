/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import {
  StaffMember,
  StaffAccount,
  AttendanceRecord,
  PayrollRecord,
  Job,
  JobColumn,
  JobItemColumn,
  JobStatus,
  CompanyProfile,
  Order,
  SystemSettings,
  AuthUser
} from '../types';
import { generateAttendanceId } from '../data/initialFinance';
import {
  formatLocalDate,
  normalizeAttendanceDate,
  calculateElapsedDuration,
  isRecordActiveClockIn,
  cleanClockOut,
  cleanClockIn,
  parseClockInDate
} from '../utils/attendanceUtils';
import JobManagementBoard from './JobManagementBoard';
import {
  Clock,
  Calendar,
  FileText,
  Briefcase,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  Square,
  Download,
  Printer,
  ChevronRight,
  LogOut,
  Sparkles,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  Lock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Search,
  Filter,
  Check,
  Building,
  Mail,
  Phone,
  ArrowUpRight,
  LayoutGrid,
  Package,
  History,
  CheckCircle,
  Clock3,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

export type StaffPortalTab =
  | 'dashboard'
  | 'jobs'
  | 'orders'
  | 'attendance'
  | 'payslips'
  | 'work-history'
  | 'profile';

interface StaffDashboardProps {
  currentUser: AuthUser;
  staffMember?: StaffMember;
  staffAccount?: StaffAccount;
  attendanceRecords: AttendanceRecord[];
  payrollRecords: PayrollRecord[];
  jobs: Job[];
  jobColumns: JobColumn[];
  jobItemColumns: JobItemColumn[];
  companies?: CompanyProfile[];
  orders?: Order[];
  onClockIn: (staffId: string, staffName: string, notes?: string) => Promise<void> | void;
  onClockOut: (attendanceId: string, notes?: string) => Promise<void> | void;
  onUpdateAttendance?: (record: AttendanceRecord) => void;
  onSaveJob?: (job: Job) => void;
  onUpdateJobStatus?: (jobId: string, status: JobStatus) => void;
  onDeleteJob?: (jobId: string) => void;
  onUpdateStaffAccount?: (account: StaffAccount) => void;
  onUpdateStaffMember?: (staff: StaffMember) => void;
  onUpdateOrderStatus?: (orderId: string, status: string) => void;
  systemSettings: SystemSettings;
  currencySymbol?: string;
  onLogout: () => void;
  onSyncSheets?: () => Promise<void>;
  isSyncingSheets?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function StaffDashboard({
  currentUser,
  staffMember,
  staffAccount,
  attendanceRecords = [],
  payrollRecords = [],
  jobs = [],
  jobColumns = [],
  jobItemColumns = [],
  companies = [],
  orders = [],
  onClockIn,
  onClockOut,
  onUpdateAttendance,
  onSaveJob,
  onUpdateJobStatus,
  onDeleteJob,
  onUpdateStaffAccount,
  onUpdateStaffMember,
  onUpdateOrderStatus,
  systemSettings,
  currencySymbol = 'Php',
  onLogout,
  onSyncSheets,
  isSyncingSheets = false,
  activeTab: controlledActiveTab,
  onTabChange
}: StaffDashboardProps) {
  // Navigation tabs for Staff Portal (Dashboard, Job Management, Orders, Time & Attendance, Payslips, Work History, Account Settings)
  const [internalTab, setInternalTab] = useState<StaffPortalTab>('dashboard');
  
  const currentTab: StaffPortalTab = useMemo(() => {
    if (controlledActiveTab) {
      const validTabs: StaffPortalTab[] = ['dashboard', 'jobs', 'orders', 'attendance', 'payslips', 'work-history', 'profile'];
      if (validTabs.includes(controlledActiveTab as StaffPortalTab)) {
        return controlledActiveTab as StaffPortalTab;
      }
    }
    return internalTab;
  }, [controlledActiveTab, internalTab]);

  const handleSelectTab = (tab: StaffPortalTab) => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Real-time digital clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter attendance records strictly for this staff member
  const myAttendance = useMemo(() => {
    const sId = (currentUser.staffId || staffMember?.id || '').trim().toLowerCase();
    if (!sId) return [];
    return attendanceRecords
      .filter(r => (r.staffId || '').trim().toLowerCase() === sId)
      .sort((a, b) => {
        const dateA = normalizeAttendanceDate(a.date);
        const dateB = normalizeAttendanceDate(b.date);
        const timeB = parseClockInDate(b.clockIn || '00:00', dateB)?.getTime() || new Date(dateB).getTime() || 0;
        const timeA = parseClockInDate(a.clockIn || '00:00', dateA)?.getTime() || new Date(dateA).getTime() || 0;
        return timeB - timeA;
      });
  }, [attendanceRecords, currentUser.staffId, staffMember?.id]);

  // Today's attendance session - prioritizes actively ongoing clock-in session for today, then today's completed/existing record
  const todayAttendance = useMemo(() => {
    const todayLocal = formatLocalDate();
    const todayIso = new Date().toISOString().slice(0, 10);

    // 1. First priority: is there an active ongoing shift for this staff member today?
    const activeRecord = myAttendance.find(r => isRecordActiveClockIn(r, todayLocal));
    if (activeRecord) return activeRecord;

    // 2. Second priority: today's completed or existing shift
    return myAttendance.find(r => {
      const norm = normalizeAttendanceDate(r.date, '');
      return norm === todayLocal || norm === todayIso;
    });
  }, [myAttendance]);

  const isClockedIn = Boolean(isRecordActiveClockIn(todayAttendance));

  // Elapsed time for active shift (dynamically computed from stored Clock In timestamp)
  const [activeDuration, setActiveDuration] = useState<string>('00:00:00');
  useEffect(() => {
    if (!isClockedIn || !todayAttendance?.clockIn) {
      setActiveDuration('00:00:00');
      return;
    }

    const updateDuration = () => {
      const formatted = calculateElapsedDuration(todayAttendance.clockIn, todayAttendance.date);
      setActiveDuration(formatted);
    };

    updateDuration();
    const timer = setInterval(updateDuration, 1000);
    return () => clearInterval(timer);
  }, [isClockedIn, todayAttendance?.clockIn, todayAttendance?.date]);

  // Shift notes input state
  const [shiftNote, setShiftNote] = useState('');
  const [isClocking, setIsClocking] = useState(false);

  const handleClockInAction = async () => {
    if (isClocking) return;
    setIsClocking(true);
    try {
      const sId = currentUser.staffId || staffMember?.id || 'STF-UNKNOWN';
      const sName = currentUser.name || staffMember?.fullName || 'Staff Member';
      await onClockIn(sId, sName, shiftNote.trim() || undefined);
      setShiftNote('');
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOutAction = async () => {
    if (isClocking || !todayAttendance) return;
    setIsClocking(true);
    try {
      await onClockOut(todayAttendance.id, shiftNote.trim() || undefined);
      setShiftNote('');
    } finally {
      setIsClocking(false);
    }
  };

  // ----------------------------------------------------
  // ATTENDANCE STATS CALCULATION
  // ----------------------------------------------------
  const attendanceStats = useMemo(() => {
    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM

    // Start of current week (Monday)
    const dayOfWeek = now.getDay();
    const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    let weeklyHours = 0;
    let monthlyHours = 0;
    let monthlyDaysWorked = 0;
    let totalAllTimeHours = 0;

    myAttendance.forEach(rec => {
      const recDate = new Date(rec.date);
      const hours = Number(rec.totalHours) || 0;
      totalAllTimeHours += hours;

      if (recDate >= monday) {
        weeklyHours += hours;
      }
      if (rec.date.startsWith(currentMonthPrefix)) {
        monthlyHours += hours;
        if (rec.clockIn) {
          monthlyDaysWorked += 1;
        }
      }
    });

    return {
      todayHours: todayAttendance?.totalHours || 0,
      weeklyHours: Number(weeklyHours.toFixed(2)),
      monthlyHours: Number(monthlyHours.toFixed(2)),
      monthlyDaysWorked,
      totalAllTimeHours: Number(totalAllTimeHours.toFixed(2))
    };
  }, [myAttendance, todayAttendance]);

  // ----------------------------------------------------
  // PAYSLIPS STRICT ISOLATION FOR THIS STAFF MEMBER
  // ----------------------------------------------------
  const myPayslips = useMemo(() => {
    const sId = currentUser.staffId || staffMember?.id;
    if (!sId) return [];
    return payrollRecords
      .filter(p => p.staffId === sId)
      .sort((a, b) => new Date(b.payDate || b.payPeriodEnd).getTime() - new Date(a.payDate || a.payPeriodEnd).getTime());
  }, [payrollRecords, currentUser.staffId, staffMember?.id]);

  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // Generate and download PDF payslip
  const handleDownloadPayslipPDF = (rec: PayrollRecord) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const hubName = systemSettings.hubName || 'ARH Print Hub';
      const companyAddress = systemSettings.companyAddress || 'Philippine Production Studio';

      // Header Banner
      doc.setFillColor(17, 24, 39);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(hubName.toUpperCase(), 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(209, 213, 219);
      doc.text(`Official Employee Payslip • ${companyAddress}`, 14, 23);
      doc.text(`Payslip Reference: ${rec.id} • Status: ${(rec.status || 'Paid').toUpperCase()}`, 14, 29);

      // Staff Information Box
      doc.setFillColor(249, 250, 251);
      doc.rect(14, 44, 182, 32, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(14, 44, 182, 32, 'S');

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('EMPLOYEE NAME', 20, 52);
      doc.text('STAFF ID', 85, 52);
      doc.text('DEPARTMENT / ROLE', 140, 52);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(rec.staffName || staffMember?.fullName || 'Staff Member', 20, 59);
      doc.text(rec.staffId || 'STF-N/A', 85, 59);
      doc.text(`${rec.department || staffMember?.department || 'General'} / ${rec.position || staffMember?.position || 'Staff'}`, 140, 59);

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text('PAY PERIOD', 20, 68);
      doc.text('PAY DATE', 85, 68);
      doc.text('SALARY RATE SNAPSHOT', 140, 68);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text(`${rec.payPeriodStart} to ${rec.payPeriodEnd}`, 20, 73);
      doc.text(rec.payDate || 'N/A', 85, 73);
      const rateType = rec.salaryType || staffMember?.salaryType || 'Monthly';
      const rateVal = rec.rateSnapshot !== undefined ? rec.rateSnapshot : (staffMember?.basicSalary || rec.basicPay);
      doc.text(`${currencySymbol} ${rateVal.toLocaleString()} (${rateType})`, 140, 73);

      // Earnings Table
      let y = 86;
      doc.setFillColor(243, 244, 246);
      doc.rect(14, y, 88, 8, 'F');
      doc.rect(108, y, 88, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.text('EARNINGS', 18, y + 5.5);
      doc.text('AMOUNT', 84, y + 5.5);
      doc.text('DEDUCTIONS', 112, y + 5.5);
      doc.text('AMOUNT', 178, y + 5.5);

      y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Basic Pay', 18, y);
      doc.text(`${currencySymbol} ${rec.basicPay.toLocaleString()}`, 84, y);

      const itemized = rec.itemizedDeductions || [];
      const firstDed = itemized[0] || { name: 'Statutory / Standard', amount: rec.totalDeductions || rec.deductions || 0 };
      doc.text(firstDed.name, 112, y);
      doc.text(`${currencySymbol} ${firstDed.amount.toLocaleString()}`, 178, y);

      y += 6;
      doc.text('Allowances', 18, y);
      doc.text(`${currencySymbol} ${(rec.allowances || 0).toLocaleString()}`, 84, y);
      const secDed = itemized[1];
      if (secDed) {
        doc.text(secDed.name, 112, y);
        doc.text(`${currencySymbol} ${secDed.amount.toLocaleString()}`, 178, y);
      }

      y += 6;
      doc.text('Other Compensation / Bonus', 18, y);
      doc.text(`${currencySymbol} ${(rec.otherEarnings || 0).toLocaleString()}`, 84, y);
      const thirdDed = itemized[2];
      if (thirdDed) {
        doc.text(thirdDed.name, 112, y);
        doc.text(`${currencySymbol} ${thirdDed.amount.toLocaleString()}`, 178, y);
      }

      // Draw horizontal separator
      y += 12;
      doc.setDrawColor(209, 213, 219);
      doc.line(14, y, 196, y);

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TOTAL GROSS PAY', 18, y);
      doc.text(`${currencySymbol} ${rec.grossPay.toLocaleString()}`, 84, y);

      doc.text('TOTAL DEDUCTIONS', 112, y);
      doc.text(`${currencySymbol} ${(rec.totalDeductions || rec.deductions || 0).toLocaleString()}`, 178, y);

      // Net Pay Highlight Box
      y += 14;
      doc.setFillColor(17, 24, 39);
      doc.rect(14, y, 182, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text('NET TAKE-HOME PAY', 22, y + 9);
      doc.setFontSize(16);
      doc.text(`${currencySymbol} ${rec.netPay.toLocaleString()}`, 22, y + 17);

      doc.setFontSize(8);
      doc.setTextColor(209, 213, 219);
      doc.text('Direct deposit / cash disbursement finalized', 120, y + 13);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(`Generated securely by ${hubName} Staff Portal on ${new Date().toLocaleDateString()}`, 14, 280);

      doc.save(`Payslip_${rec.id}_${(rec.staffName || 'Staff').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // ----------------------------------------------------
  // PROFILE & CREDENTIALS UPDATE
  // ----------------------------------------------------
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [profileEmail, setProfileEmail] = useState(staffAccount?.email || staffMember?.email || '');
  const [profilePhone, setProfilePhone] = useState(staffAccount?.phone || staffMember?.phone || '');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showPasscodeToggle, setShowPasscodeToggle] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaveSuccess(false);

    if (newPasscode && newPasscode !== confirmPasscode) {
      setProfileError('Passcodes do not match.');
      return;
    }

    if (staffAccount && onUpdateStaffAccount) {
      const updatedAccount: StaffAccount = {
        ...staffAccount,
        passcode: newPasscode.trim() ? newPasscode.trim() : staffAccount.passcode,
        mustChangePassword: newPasscode.trim() ? false : staffAccount.mustChangePassword,
        temporaryPassword: newPasscode.trim() ? undefined : staffAccount.temporaryPassword,
        email: profileEmail.trim() || undefined,
        phone: profilePhone.trim() || undefined,
        updatedAt: new Date().toISOString()
      };
      onUpdateStaffAccount(updatedAccount);
    }

    if (staffMember && onUpdateStaffMember) {
      const updatedStaff: StaffMember = {
        ...staffMember,
        email: profileEmail.trim() || undefined,
        phone: profilePhone.trim() || undefined,
        updatedAt: new Date().toISOString()
      };
      onUpdateStaffMember(updatedStaff);
    }

    setProfileSaveSuccess(true);
    setNewPasscode('');
    setConfirmPasscode('');
    setTimeout(() => setProfileSaveSuccess(false), 4000);
  };

  // ----------------------------------------------------
  // JOBS ACCESS & RESTRICTED PERMISSIONS
  // ----------------------------------------------------
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [jobStatusFilter, setJobStatusFilter] = useState<string>('all');

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (jobStatusFilter !== 'all') {
      list = list.filter(j => j.status === jobStatusFilter);
    }
    if (jobSearchQuery.trim()) {
      const q = jobSearchQuery.toLowerCase();
      list = list.filter(j =>
        (j.id && j.id.toLowerCase().includes(q)) ||
        (j.orderNumber && j.orderNumber.toLowerCase().includes(q)) ||
        (j.companyName && j.companyName.toLowerCase().includes(q)) ||
        (j.values && Object.values(j.values).some(v => String(v).toLowerCase().includes(q)))
      );
    }
    return list;
  }, [jobs, jobStatusFilter, jobSearchQuery]);

  // Active jobs assigned or in production
  const activeJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'Pending' || j.status === 'Approved' || j.status === 'In Production');
  }, [jobs]);

  const completedJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'Completed');
  }, [jobs]);

  // ----------------------------------------------------
  // ORDERS FULFILLMENT & MANAGEMENT FOR STAFF
  // ----------------------------------------------------
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderStatusFilter !== 'all') {
      list = list.filter(o => o.status === orderStatusFilter);
    }
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      list = list.filter(o =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.companyName && o.companyName.toLowerCase().includes(q)) ||
        (o.contactPerson && o.contactPerson.toLowerCase().includes(q)) ||
        (o.items && o.items.some(it => it.productName.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [orders, orderStatusFilter, orderSearchQuery]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter(o => o.status === 'Pending' || o.status === 'Processing' || o.status === 'Pending Approval').length;
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Top Header Profile Banner */}
      <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center font-mono text-2xl font-black shadow-inner shrink-0">
              {(currentUser.name || staffMember?.fullName || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black">
                  {currentUser.name || staffMember?.fullName || 'Staff Member'}
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase">
                  Active Staff
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-500 font-sans mt-1">
                {staffMember?.position || 'Staff Specialist'} • {staffMember?.department || 'Operations'} • ID: {currentUser.staffId || staffMember?.id || 'STF-101'}
              </p>
            </div>
          </div>

          {/* Quick Realtime Clock & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-center font-mono">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Philippine Time</div>
              <div className="text-lg font-black text-black">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            {onSyncSheets && (
              <button
                onClick={() => onSyncSheets()}
                disabled={isSyncingSheets}
                className="bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-2xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                title="Sync latest records from cloud"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sync Cloud</span>
              </button>
            )}

            <button
              onClick={onLogout}
              className="bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-2xl border border-black transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Temporary Password Change Advisory Banner */}
      {staffAccount?.mustChangePassword && currentTab !== 'profile' && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-200 text-amber-900 rounded-xl shrink-0 font-bold">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase font-mono text-amber-900">
                Action Required: Set Permanent Password
              </h3>
              <p className="text-xs text-amber-800 font-sans mt-0.5">
                You are currently logged in with a temporary admin-issued password. Please create your personalized permanent password in Account Settings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleSelectTab('profile')}
            className="px-4 py-2.5 bg-amber-900 hover:bg-black text-white font-mono text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer shrink-0"
          >
            Update Password Now
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD OVERVIEW & QUICK PUNCH STATION */}
      {/* ========================================================================= */}
      {currentTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  Today's Shift Hours
                </span>
                <Clock className="w-4 h-4 text-black" />
              </div>
              <div className="text-3xl font-black font-mono text-black">
                {isClockedIn ? activeDuration : `${todayAttendance?.totalHours || 0} hrs`}
              </div>
              <div className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                <span>{isClockedIn ? 'Clocked In (Active)' : todayAttendance?.clockOut ? 'Shift Completed' : 'Not Clocked In'}</span>
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  Active Print Jobs
                </span>
                <Briefcase className="w-4 h-4 text-black" />
              </div>
              <div className="text-3xl font-black font-mono text-black">
                {activeJobs.length}
              </div>
              <div className="text-[11px] font-medium text-gray-500">
                {jobs.length} Total Jobs on Studio Board
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  Pending Production Orders
                </span>
                <Package className="w-4 h-4 text-black" />
              </div>
              <div className="text-3xl font-black font-mono text-black">
                {pendingOrdersCount}
              </div>
              <div className="text-[11px] font-medium text-gray-500">
                {orders.length} Total Orders Recorded
              </div>
            </div>

            <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                  Issued Payslips
                </span>
                <FileText className="w-4 h-4 text-black" />
              </div>
              <div className="text-3xl font-black font-mono text-black">
                {myPayslips.length}
              </div>
              <div className="text-[11px] font-medium text-gray-500">
                Latest: {myPayslips[0]?.payDate || myPayslips[0]?.payPeriodEnd || 'N/A'}
              </div>
            </div>
          </div>

          {/* Quick Clock-In Station & Active Jobs Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Clock Station */}
            <div className={`border-2 rounded-[28px] p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6 ${
              isClockedIn ? 'bg-emerald-50/70 border-emerald-500' : 'bg-white border-black'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black uppercase tracking-tight text-black flex items-center gap-2">
                    <Clock3 className="w-5 h-5 text-black" />
                    <span>Quick Punch Station</span>
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                    isClockedIn ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isClockedIn ? 'Active Shift' : 'Idle'}
                  </span>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 text-center shadow-inner space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                    {isClockedIn ? 'Shift Timer' : "Today's Logged Hours"}
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-black">
                    {isClockedIn ? activeDuration : `${todayAttendance?.totalHours || 0} hrs`}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    {todayAttendance?.clockIn ? `Time-In: ${todayAttendance.clockIn}` : 'No time-in logged today'}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div>
                {!isClockedIn ? (
                  <button
                    onClick={handleClockInAction}
                    disabled={isClocking || (todayAttendance && !!todayAttendance.clockOut)}
                    className="w-full bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl border border-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isClocking ? 'Recording Time-In...' : todayAttendance?.clockOut ? 'Shift Finished For Today' : 'Clock In Now'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleClockOutAction}
                    disabled={isClocking}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl border border-red-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>{isClocking ? 'Recording Time-Out...' : 'Clock Out (End Shift)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Jobs in Progress */}
            <div className="lg:col-span-2 bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-black flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-black" />
                    <span>Active Production Jobs</span>
                  </h3>
                  <p className="text-xs text-gray-500 font-sans mt-0.5">
                    Current stage workflow jobs needing attention
                  </p>
                </div>

                <button
                  onClick={() => handleSelectTab('jobs')}
                  className="text-xs font-bold font-mono text-black hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Jobs</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {activeJobs.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <div className="text-xs font-black uppercase text-black">No Active Urgent Jobs</div>
                  <div className="text-[11px] text-gray-500">All current print production tasks are up to date!</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {activeJobs.slice(0, 5).map(j => (
                    <div
                      key={j.id}
                      className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-black">{j.id}</span>
                          <span className="text-[10px] font-mono text-gray-400 truncate">
                            {j.companyName || j.orderNumber || 'Production'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 truncate mt-0.5">
                          {j.values ? Object.values(j.values).filter(Boolean).slice(0, 2).join(' • ') : 'Standard Print Task'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                          j.status === 'In Production'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : j.status === 'Approved'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : j.status === 'Shipped'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {j.status}
                        </span>
                        {onUpdateJobStatus && (
                          <button
                            onClick={() => onUpdateJobStatus(j.id, j.status === 'Pending' ? 'Approved' : j.status === 'Approved' ? 'In Production' : 'Completed')}
                            className="bg-black hover:bg-neutral-800 text-white p-1.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer"
                            title="Advance Status"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: JOB MANAGEMENT & TASKS */}
      {/* ========================================================================= */}
      {currentTab === 'jobs' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-black">
                  Production Job Board
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Track active print jobs, specs, proofs, and update workflow statuses
                </p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={jobSearchQuery}
                    onChange={(e) => setJobSearchQuery(e.target.value)}
                    placeholder="Search jobs, companies..."
                    className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:bg-white focus:border-black focus:outline-none transition-all"
                  />
                </div>

                <select
                  value={jobStatusFilter}
                  onChange={(e) => setJobStatusFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="In Production">In Production</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
            </div>

            {/* Render Job Management Board */}
            <div className="pt-2">
              <JobManagementBoard
                jobs={filteredJobs}
                jobColumns={jobColumns}
                jobItemColumns={jobItemColumns}
                companies={companies}
                orders={orders}
                onSaveJob={onSaveJob || (() => {})}
                onUpdateJobStatus={onUpdateJobStatus || (() => {})}
                onDeleteJob={onDeleteJob || (() => {})}
                currencySymbol={currencySymbol}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUCTION ORDERS FULFILLMENT */}
      {/* ========================================================================= */}
      {currentTab === 'orders' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-black">
                  Production Orders
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Internal production queue, fulfillment verification, and delivery status updates
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Search order #, customer, item..."
                    className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:bg-white focus:border-black focus:outline-none transition-all"
                  />
                </div>

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-black focus:outline-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Production">Production</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending Approval">Pending Approval</option>
                </select>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center space-y-3">
                <Package className="w-8 h-8 text-gray-400 mx-auto" />
                <h4 className="text-sm font-black text-black uppercase">No Orders Found</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  There are no orders matching your current search or status filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Order #</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Client / Contact</th>
                      <th className="p-4">Items / Qty</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-black whitespace-nowrap">
                          {ord.orderNumber || ord.id}
                        </td>
                        <td className="p-4 font-mono text-gray-600 whitespace-nowrap">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-black">{ord.companyName || 'Standard Client'}</div>
                          <div className="text-[11px] text-gray-500">{ord.contactPerson || ord.contactEmail || '—'}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-800">
                            {ord.items?.length || 0} item{(ord.items?.length || 0) === 1 ? '' : 's'}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate max-w-xs">
                            {ord.items?.map(it => `${it.productName} (${it.quantity})`).join(', ') || 'No line items'}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {onUpdateOrderStatus ? (
                            <select
                              value={ord.status || 'Pending'}
                              onChange={(e) => onUpdateOrderStatus(ord.id, e.target.value)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase border cursor-pointer ${
                                ord.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : ord.status === 'Processing' || ord.status === 'Production'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Production">Production</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                              ord.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {ord.status || 'Pending'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedOrderForView(ord)}
                            className="bg-gray-100 hover:bg-black hover:text-white text-black font-bold text-[11px] uppercase tracking-wider py-2 px-3 rounded-xl border border-gray-300 hover:border-black transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TIME & ATTENDANCE TRACKING */}
      {/* ========================================================================= */}
      {currentTab === 'attendance' && (
        <div className="space-y-6">
          {/* Main Clock-In Action Card & Live Timer */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Clock-In Widget */}
            <div className={`lg:col-span-2 border-2 rounded-[28px] p-6 sm:p-8 shadow-sm transition-all ${
              isClockedIn ? 'bg-emerald-50/70 border-emerald-500' : 'bg-white border-black'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                    <h2 className="text-lg font-black uppercase tracking-tight text-black">
                      {isClockedIn ? 'Shift In Progress' : 'Time Clock Station'}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500 font-sans mt-0.5">
                    {isClockedIn
                      ? `Clocked in today at ${todayAttendance?.clockIn}`
                      : 'Record your daily shift start and completion accurately'}
                  </p>
                </div>

                {/* Status Badge */}
                <div className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider self-start ${
                  isClockedIn ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {isClockedIn ? 'Clocked In' : todayAttendance?.clockOut ? 'Shift Completed' : 'Not Clocked In'}
                </div>
              </div>

              {/* Timer Display */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 text-center shadow-inner">
                <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-gray-400 mb-1">
                  {isClockedIn ? 'Current Shift Duration' : "Today's Work Summary"}
                </div>
                <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-black">
                  {isClockedIn ? activeDuration : `${todayAttendance?.totalHours || 0} hrs`}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-2">
                  {todayAttendance?.clockIn && `Time-In: ${todayAttendance.clockIn}`}
                  {todayAttendance?.clockOut && ` • Time-Out: ${todayAttendance.clockOut}`}
                </div>
              </div>

              {/* Optional Shift Notes */}
              <div className="space-y-2 mb-6">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-500 tracking-wider">
                  Shift Notes / Production Work Logs (Optional)
                </label>
                <input
                  type="text"
                  value={shiftNote}
                  onChange={(e) => setShiftNote(e.target.value)}
                  placeholder="e.g. Master screen prep, DTF transfer runs, morning machine warm-up..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-black focus:bg-white focus:border-black focus:outline-none transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!isClockedIn ? (
                  <button
                    onClick={handleClockInAction}
                    disabled={isClocking || (todayAttendance && !!todayAttendance.clockOut)}
                    className="flex-1 bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl border border-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isClocking ? 'Recording Time-In...' : todayAttendance?.clockOut ? 'Shift Finished For Today' : 'Clock In Now'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleClockOutAction}
                    disabled={isClocking}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest py-4 px-6 rounded-2xl border border-red-700 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>{isClocking ? 'Recording Time-Out...' : 'Clock Out (End Shift)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Summary Hours Metrics Card */}
            <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-black mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Attendance Metrics</span>
                </h3>

                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                      Hours This Week
                    </div>
                    <div className="text-2xl font-black text-black font-mono mt-1">
                      {attendanceStats.weeklyHours} <span className="text-xs text-gray-500 font-sans font-bold">hrs</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                      Hours This Month
                    </div>
                    <div className="text-2xl font-black text-black font-mono mt-1">
                      {attendanceStats.monthlyHours} <span className="text-xs text-gray-500 font-sans font-bold">hrs</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                      Days Worked This Month
                    </div>
                    <div className="text-2xl font-black text-black font-mono mt-1">
                      {attendanceStats.monthlyDaysWorked} <span className="text-xs text-gray-500 font-sans font-bold">days</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 font-sans leading-relaxed">
                Attendance logs are automatically synchronized with the studio management system for payroll accounting.
              </div>
            </div>
          </div>

          {/* Attendance History Table Card */}
          <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-black">
                  My Attendance Logs
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Full record of your recorded shift timestamps and hours
                </p>
              </div>

              <div className="text-xs font-mono font-bold text-gray-500">
                {myAttendance.length} Total Sessions
              </div>
            </div>

            {myAttendance.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center space-y-3">
                <Clock className="w-8 h-8 text-gray-400 mx-auto" />
                <h4 className="text-sm font-black text-black uppercase">No Attendance Records Yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click the "Clock In" button above when you begin your shift to start recording your work logs.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Time-In</th>
                      <th className="p-4">Time-Out</th>
                      <th className="p-4 text-right">Total Hours</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Work Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myAttendance.map((rec) => {
                      const displayDate = normalizeAttendanceDate(rec.date);
                      const displayIn = cleanClockIn(rec.clockIn);
                      const displayOut = cleanClockOut(rec.clockOut);
                      return (
                        <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="p-4 font-mono font-bold text-black whitespace-nowrap">
                            {displayDate}
                          </td>
                          <td className="p-4 font-mono text-emerald-700 font-bold whitespace-nowrap">
                            {displayIn || '—'}
                          </td>
                          <td className="p-4 font-mono text-gray-700 font-bold whitespace-nowrap">
                            {displayOut || (
                              <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                In Progress
                              </span>
                            )}
                          </td>
                        <td className="p-4 font-mono font-black text-black text-right whitespace-nowrap">
                          {Number(rec.totalHours) > 0 ? `${Number(rec.totalHours).toFixed(2)} hrs` : '—'}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                            rec.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : rec.status === 'Late'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            {rec.status || 'Present'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 max-w-xs truncate text-[11px]">
                          {rec.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MY PAYSLIPS & COMPENSATION */}
      {/* ========================================================================= */}
      {currentTab === 'payslips' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight text-black">
                  My Official Payslips
                </h3>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  Review and download your finalized wage disbursements and itemized deductions
                </p>
              </div>

              <div className="text-xs font-mono font-bold text-gray-500">
                {myPayslips.length} Issued Records
              </div>
            </div>

            {myPayslips.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center space-y-3">
                <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                <h4 className="text-sm font-black text-black uppercase">No Payslips Issued Yet</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  When payroll is calculated and finalized by the studio administration, your itemized payslips will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myPayslips.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white border-2 border-black rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
                          {rec.id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          rec.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : rec.status === 'Finalized'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {rec.status}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-gray-500">
                        Pay Period: <span className="text-black">{rec.payPeriodStart} to {rec.payPeriodEnd}</span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-gray-500">
                          <span>Gross Earnings</span>
                          <span className="font-mono text-black">{currencySymbol} {rec.grossPay.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-gray-500">
                          <span>Total Deductions</span>
                          <span className="font-mono text-red-600">
                            - {currencySymbol} {(rec.totalDeductions || rec.deductions || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-black pt-2 border-t border-gray-100">
                          <span>Net Pay</span>
                          <span className="font-mono text-emerald-700">{currencySymbol} {rec.netPay.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setSelectedPayslip(rec)}
                        className="flex-1 bg-gray-100 hover:bg-black hover:text-white text-black font-bold text-xs uppercase tracking-wider py-2.5 px-3 rounded-xl border border-gray-300 hover:border-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Breakdown</span>
                      </button>

                      <button
                        onClick={() => handleDownloadPayslipPDF(rec)}
                        className="bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider p-2.5 rounded-xl border border-black transition-all flex items-center justify-center cursor-pointer shadow-xs"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: WORK HISTORY & PERFORMANCE */}
      {/* ========================================================================= */}
      {currentTab === 'work-history' && (
        <div className="space-y-6">
          {/* Work Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border-2 border-black rounded-[28px] p-6 shadow-sm">
              <div className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">
                Total All-Time Logged Hours
              </div>
              <div className="text-3xl font-black font-mono text-black mt-2">
                {attendanceStats.totalAllTimeHours} <span className="text-sm font-sans text-gray-500">hrs</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all recorded punch sessions</p>
            </div>

            <div className="bg-white border-2 border-black rounded-[28px] p-6 shadow-sm">
              <div className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">
                Completed Studio Jobs
              </div>
              <div className="text-3xl font-black font-mono text-black mt-2">
                {completedJobs.length} <span className="text-sm font-sans text-gray-500">jobs</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Finished production job board runs</p>
            </div>

            <div className="bg-white border-2 border-black rounded-[28px] p-6 shadow-sm">
              <div className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">
                Total Attendance Shifts
              </div>
              <div className="text-3xl font-black font-mono text-black mt-2">
                {myAttendance.length} <span className="text-sm font-sans text-gray-500">shifts</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Logged work day sessions</p>
            </div>
          </div>

          {/* Completed Jobs History Table */}
          <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Completed Job History</span>
              </h3>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                Record of completed print production jobs
              </p>
            </div>

            {completedJobs.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center space-y-2">
                <Briefcase className="w-8 h-8 text-gray-400 mx-auto" />
                <div className="text-xs font-black uppercase text-black">No Completed Jobs Yet</div>
                <div className="text-[11px] text-gray-500">Jobs marked as 'Completed' on the board will be recorded here.</div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="p-4">Job ID</th>
                      <th className="p-4">Order / Company</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {completedJobs.map(j => (
                      <tr key={j.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4 font-mono font-bold text-black">{j.id}</td>
                        <td className="p-4">
                          <div className="font-bold text-black">{j.companyName || 'Internal Job'}</div>
                          <div className="text-[11px] font-mono text-gray-500">{j.orderNumber || '—'}</div>
                        </td>
                        <td className="p-4 text-gray-600">
                          {j.values ? Object.values(j.values).filter(Boolean).join(' • ') : 'Standard Production Run'}
                        </td>
                        <td className="p-4">
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: PROFILE & SECURITY SETTINGS */}
      {/* ========================================================================= */}
      {currentTab === 'profile' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Staff Details Summary */}
            <div className="bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm space-y-6">
              <h3 className="text-base font-black uppercase tracking-tight text-black flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Employment Information</span>
              </h3>

              <div className="space-y-4 text-xs font-sans">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-gray-400">Position / Role</div>
                  <div className="font-bold text-black text-sm">{staffMember?.position || 'Print Specialist'}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-gray-400">Department</div>
                  <div className="font-bold text-black text-sm">{staffMember?.department || 'Production'}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-gray-400">Employment Status</div>
                  <div className="font-bold text-black text-sm">{staffMember?.employmentStatus || 'Full-Time'}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-gray-400">Pay Type & Basic Rate</div>
                  <div className="font-bold text-black text-sm">
                    {currencySymbol} {staffMember?.basicSalary?.toLocaleString() || 0} ({staffMember?.salaryType || 'Monthly'})
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-1">
                  <div className="text-[10px] font-mono font-bold uppercase text-gray-400">Date Started</div>
                  <div className="font-bold text-black text-sm">{staffMember?.dateStarted || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Profile & Security Update Form */}
            <div className="lg:col-span-2 bg-white border-2 border-black rounded-[28px] p-6 sm:p-8 shadow-sm">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-black flex items-center gap-2">
                    <Lock className="w-5 h-5 text-black" />
                    <span>Security & Account Preferences</span>
                  </h3>
                  <p className="text-xs text-gray-500 font-sans mt-0.5">
                    Update your staff login passcode and contact email address
                  </p>
                </div>

                {profileError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-4 text-xs font-mono rounded-2xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSaveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 text-xs font-mono rounded-2xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Account credentials and profile updated successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-400">
                      Login Username
                    </label>
                    <input
                      type="text"
                      disabled
                      value={staffAccount?.username || currentUser.username || 'staff'}
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-400">
                      Staff ID
                    </label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.staffId || staffMember?.id || 'STF-101'}
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 cursor-not-allowed font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-400">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="e.g. name@arhprint.com"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-black focus:bg-white focus:border-black focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-mono font-bold text-gray-400">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="e.g. +63 917 000 0000"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-black focus:bg-white focus:border-black focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <h4 className="text-xs font-black uppercase text-black font-mono tracking-wider">
                    Change Staff Passcode
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono font-bold text-gray-400">
                        New Passcode (Leave blank to keep unchanged)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPasscodeToggle ? 'text' : 'password'}
                          value={newPasscode}
                          onChange={(e) => setNewPasscode(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-10 py-3 text-xs font-mono font-bold text-black focus:bg-white focus:border-black focus:outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasscodeToggle(!showPasscodeToggle)}
                          className="absolute right-3 text-gray-400 hover:text-black cursor-pointer"
                        >
                          {showPasscodeToggle ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-mono font-bold text-gray-400">
                        Confirm New Passcode
                      </label>
                      <input
                        type={showPasscodeToggle ? 'text' : 'password'}
                        value={confirmPasscode}
                        onChange={(e) => setConfirmPasscode(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-black focus:bg-white focus:border-black focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="bg-black hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl border border-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Account Settings</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ORDER DETAILS MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedOrderForView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={() => setSelectedOrderForView(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-black max-w-2xl w-full p-6 sm:p-8 rounded-[32px] relative z-10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-black">
                    Order {selectedOrderForView.orderNumber || selectedOrderForView.id}
                  </h3>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    Client: {selectedOrderForView.companyName || 'Direct'} • Placed: {new Date(selectedOrderForView.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrderForView(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Order Info Banner */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Contact</span>
                  <span className="font-bold text-black">{selectedOrderForView.contactPerson || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Email / Phone</span>
                  <span className="font-semibold text-gray-700">{selectedOrderForView.contactEmail || selectedOrderForView.contactNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Status</span>
                  <span className="font-mono font-bold text-black">{selectedOrderForView.status}</span>
                </div>
                {selectedOrderForView.deliveryAddress && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Delivery Address</span>
                    <span className="font-medium text-gray-700">{selectedOrderForView.deliveryAddress}</span>
                  </div>
                )}
                {selectedOrderForView.notes && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Production Notes</span>
                    <span className="font-medium text-amber-900 bg-amber-50 p-2 rounded-lg block border border-amber-200">{selectedOrderForView.notes}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono font-bold uppercase text-gray-400">Line Items & Specs</div>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 font-mono text-[10px] uppercase text-gray-500 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3">Variant / Custom</th>
                        <th className="p-3 text-right">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrderForView.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-bold text-black">{it.productName}</td>
                          <td className="p-3 text-gray-600 text-[11px]">
                            {[
                              it.selectedSize ? `Size: ${it.selectedSize}` : null,
                              it.selectedColor ? `Color: ${it.selectedColor}` : null,
                              it.customDetails ? Object.entries(it.customDetails).map(([k, v]) => `${k}: ${v}`).join(', ') : null
                            ].filter(Boolean).join(' • ') || 'Standard'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-black">{it.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Update Quick Action */}
              {onUpdateOrderStatus && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <span className="text-xs font-mono font-bold uppercase text-gray-500">Update Production Status:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onUpdateOrderStatus(selectedOrderForView.id, 'Processing');
                        setSelectedOrderForView({ ...selectedOrderForView, status: 'Processing' });
                      }}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer"
                    >
                      Set Processing
                    </button>
                    <button
                      onClick={() => {
                        onUpdateOrderStatus(selectedOrderForView.id, 'Completed');
                        setSelectedOrderForView({ ...selectedOrderForView, status: 'Completed' });
                      }}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer"
                    >
                      Set Completed
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* PAYSLIP DETAIL MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedPayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
              onClick={() => setSelectedPayslip(null)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-black max-w-xl w-full p-6 sm:p-8 rounded-[32px] relative z-10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-black">
                    Official Payslip Breakdown
                  </h3>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    Reference: {selectedPayslip.id} • {selectedPayslip.payPeriodStart} to {selectedPayslip.payPeriodEnd}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Staff Snapshot Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs font-sans">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Staff Member</span>
                  <span className="font-bold text-black">{selectedPayslip.staffName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Pay Date</span>
                  <span className="font-bold text-black">{selectedPayslip.payDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Department / Role</span>
                  <span className="font-semibold text-gray-700">
                    {selectedPayslip.department || staffMember?.department || 'General'} / {selectedPayslip.position || staffMember?.position || 'Staff'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Rate Snapshot</span>
                  <span className="font-mono font-bold text-black">
                    {currencySymbol} {(selectedPayslip.rateSnapshot !== undefined ? selectedPayslip.rateSnapshot : (staffMember?.basicSalary || selectedPayslip.basicPay)).toLocaleString()} ({selectedPayslip.salaryType || staffMember?.salaryType || 'Monthly'})
                  </span>
                </div>
              </div>

              {/* Itemized Earnings & Deductions */}
              <div className="space-y-4">
                {/* Earnings Section */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase font-bold text-gray-400">Earnings</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {selectedPayslip.salaryType === 'Daily' && selectedPayslip.daysWorked
                          ? `Basic Pay (${selectedPayslip.daysWorked} days)`
                          : selectedPayslip.salaryType === 'Hourly' && selectedPayslip.hoursWorked
                          ? `Basic Pay (${selectedPayslip.hoursWorked} hrs)`
                          : 'Basic Pay'}
                      </span>
                      <span className="font-mono font-bold text-black">{currencySymbol} {selectedPayslip.basicPay.toLocaleString()}</span>
                    </div>
                    {Number(selectedPayslip.allowances) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Allowances</span>
                        <span className="font-mono font-bold text-black">{currencySymbol} {Number(selectedPayslip.allowances).toLocaleString()}</span>
                      </div>
                    )}
                    {Number(selectedPayslip.otherEarnings) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Other Earnings / Bonus</span>
                        <span className="font-mono font-bold text-black">{currencySymbol} {Number(selectedPayslip.otherEarnings).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-black pt-2 border-t border-gray-200">
                      <span>Total Gross Pay</span>
                      <span className="font-mono">{currencySymbol} {selectedPayslip.grossPay.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="space-y-2">
                  <div className="text-[11px] font-mono uppercase font-bold text-gray-400">Itemized Deductions</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 text-xs">
                    {selectedPayslip.itemizedDeductions && selectedPayslip.itemizedDeductions.length > 0 ? (
                      selectedPayslip.itemizedDeductions.map(ded => (
                        <div key={ded.id} className="flex justify-between">
                          <span className="text-gray-600">{ded.name}</span>
                          <span className="font-mono font-bold text-red-600">
                            - {currencySymbol} {ded.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Deductions</span>
                        <span className="font-mono font-bold text-red-600">
                          - {currencySymbol} {(selectedPayslip.totalDeductions || selectedPayslip.deductions || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-black pt-2 border-t border-gray-200">
                      <span>Total Deductions</span>
                      <span className="font-mono text-red-600">
                        - {currencySymbol} {(selectedPayslip.totalDeductions || selectedPayslip.deductions || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Box */}
                <div className="bg-black text-white rounded-2xl p-5 flex items-center justify-between shadow-md">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Net Take-Home Pay</div>
                    <div className="text-2xl font-black font-mono mt-0.5">
                      {currencySymbol} {selectedPayslip.netPay.toLocaleString()}
                    </div>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase">
                    {selectedPayslip.status}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPayslip(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs uppercase px-5 py-3 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPayslipPDF(selectedPayslip)}
                  className="bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl border border-black flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
