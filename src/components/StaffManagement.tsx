/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  StaffMember,
  StaffAccount,
  StaffAccountStatus,
  PayrollRecord,
  AttendanceRecord,
  PayrollDeductionItem,
  SalaryType,
  EmploymentStatus,
  StaffStatus,
  PayrollStatus,
  SystemSettings
} from '../types';
import {
  generateStaffId,
  generatePayrollId,
  generateStaffAccountId,
  generateTemporaryPassword
} from '../data/initialFinance';
import { normalizeAttendanceDate, cleanClockOut } from '../utils/attendanceUtils';
import {
  Users,
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Calendar,
  Briefcase,
  Building,
  CreditCard,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  Percent,
  Check,
  Key,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Lock,
  Eye,
  EyeOff,
  CheckCheck,
  KeyRound,
  Shield,
  RefreshCw
} from 'lucide-react';

interface StaffManagementProps {
  staff: StaffMember[];
  payroll: PayrollRecord[];
  attendance?: AttendanceRecord[];
  staffAccounts?: StaffAccount[];
  onSaveStaff: (staff: StaffMember) => void;
  onSaveStaffBatch?: (staffList: StaffMember[]) => void;
  onDeleteStaff?: (staffId: string) => void;
  onSaveStaffAccount?: (account: StaffAccount) => void;
  onDeleteStaffAccount?: (accountId: string) => void;
  onSavePayroll: (record: PayrollRecord) => void;
  onSavePayrollBatch?: (records: PayrollRecord[]) => void;
  onDeletePayroll?: (payrollId: string) => void;
  systemSettings: SystemSettings;
  currencySymbol?: string;
}

export default function StaffManagement({
  staff = [],
  payroll = [],
  attendance = [],
  staffAccounts = [],
  onSaveStaff,
  onSaveStaffBatch,
  onDeleteStaff,
  onSaveStaffAccount,
  onDeleteStaffAccount,
  onSavePayroll,
  onSavePayrollBatch,
  onDeletePayroll,
  systemSettings,
  currencySymbol = 'Php'
}: StaffManagementProps) {
  const [activeSubTab, setActiveSubTab] = useState<'staff' | 'payroll'>('staff');

  // ----------------------------------------------------
  // STAFF DIRECTORY STATE & FILTERS
  // ----------------------------------------------------
  const [staffSearch, setStaffSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<StaffMember | null>(null);

  // Staff Form Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffFormData, setStaffFormData] = useState<Omit<StaffMember, 'id'>>({
    fullName: '',
    position: '',
    department: 'Production',
    employmentStatus: 'Full-Time',
    dateStarted: new Date().toISOString().slice(0, 10),
    salaryType: 'Monthly',
    basicSalary: 20000,
    allowances: 0,
    otherCompensation: 0,
    notes: '',
    status: 'Active'
  });

  // ----------------------------------------------------
  // STAFF ACCOUNT MANAGEMENT MODAL STATE
  // ----------------------------------------------------
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedStaffForAccount, setSelectedStaffForAccount] = useState<StaffMember | null>(null);
  const [accountFormData, setAccountFormData] = useState({
    username: '',
    email: '',
    role: 'Staff' as 'Staff' | 'Admin',
    status: 'Active' as StaffAccountStatus,
    temporaryPassword: '',
    requirePasswordChange: true
  });
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [accountCopiedNotice, setAccountCopiedNotice] = useState(false);
  const [accountSuccessMsg, setAccountSuccessMsg] = useState<string | null>(null);
  const [accountErrorMsg, setAccountErrorMsg] = useState<string | null>(null);

  // ----------------------------------------------------
  // PAYROLL STATE & FILTERS
  // ----------------------------------------------------
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<string>('all');
  const [payrollMonthFilter, setPayrollMonthFilter] = useState<string>('all');

  // Payroll Form Modal
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<PayrollRecord | null>(null);
  const [payrollFormData, setPayrollFormData] = useState<Omit<PayrollRecord, 'id'>>({
    staffId: '',
    staffName: '',
    position: '',
    department: '',
    payPeriodStart: new Date().toISOString().slice(0, 10),
    payPeriodEnd: new Date().toISOString().slice(0, 10),
    payDate: new Date().toISOString().slice(0, 10),
    basicPay: 0,
    allowances: 0,
    otherEarnings: 0,
    grossPay: 0,
    deductions: 0,
    itemizedDeductions: [
      { id: 'ded-1', name: 'SSS / Social Security', amount: 0 },
      { id: 'ded-2', name: 'PhilHealth / Health Ins.', amount: 0 },
      { id: 'ded-3', name: 'Pag-IBIG / Housing Fund', amount: 0 },
      { id: 'ded-4', name: 'Withholding Tax', amount: 0 },
      { id: 'ded-5', name: 'Cash Advance / Other', amount: 0 }
    ],
    totalDeductions: 0,
    netPay: 0,
    status: 'Draft',
    notes: ''
  });

  // Batch Payroll Generation Modal
  const [isBatchPayrollModalOpen, setIsBatchPayrollModalOpen] = useState(false);
  const [batchPayPeriodStart, setBatchPayPeriodStart] = useState(new Date().toISOString().slice(0, 8) + '01');
  const [batchPayPeriodEnd, setBatchPayPeriodEnd] = useState(new Date().toISOString().slice(0, 8) + '15');
  const [batchPayDate, setBatchPayDate] = useState(new Date().toISOString().slice(0, 8) + '15');
  const [batchPeriodType, setBatchPeriodType] = useState<'semi_monthly_1' | 'semi_monthly_2' | 'monthly'>('semi_monthly_1');

  // Departments List derived from existing staff
  const departments = useMemo(() => {
    const set = new Set<string>(['Production', 'Design / Creative', 'Sales & Account Management', 'Administration', 'Logistics']);
    staff.forEach(s => {
      if (s.department && s.department.trim()) {
        set.add(s.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [staff]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const q = staffSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.position.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);

      const matchesDept = departmentFilter === 'all' || s.department.toLowerCase() === departmentFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staff, staffSearch, departmentFilter, statusFilter]);

  // Filtered Payroll
  const filteredPayroll = useMemo(() => {
    return payroll.filter(p => {
      const q = payrollSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        p.staffName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.position || '').toLowerCase().includes(q) ||
        (p.department || '').toLowerCase().includes(q);

      const matchesStatus = payrollStatusFilter === 'all' || p.status === payrollStatusFilter;
      const matchesMonth = payrollMonthFilter === 'all' || p.payDate.startsWith(payrollMonthFilter);

      return matchesSearch && matchesStatus && matchesMonth;
    }).sort((a, b) => new Date(b.payDate).getTime() - new Date(a.payDate).getTime());
  }, [payroll, payrollSearch, payrollStatusFilter, payrollMonthFilter]);

  // Payroll Metrics
  const payrollStats = useMemo(() => {
    const totalGross = filteredPayroll.reduce((sum, p) => sum + (p.grossPay || 0), 0);
    const totalDeductions = filteredPayroll.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
    const totalNet = filteredPayroll.reduce((sum, p) => sum + (p.netPay || 0), 0);
    const activeStaffCount = staff.filter(s => s.status === 'Active').length;
    const monthlyStaffPayrollCommitment = staff
      .filter(s => s.status === 'Active')
      .reduce((sum, s) => {
        let monthly = s.basicSalary || 0;
        if (s.salaryType === 'Daily') monthly = s.basicSalary * 26;
        if (s.salaryType === 'Hourly') monthly = s.basicSalary * 8 * 26;
        return sum + monthly + (s.allowances || 0) + (s.otherCompensation || 0);
      }, 0);

    return {
      totalGross,
      totalDeductions,
      totalNet,
      activeStaffCount,
      monthlyStaffPayrollCommitment
    };
  }, [filteredPayroll, staff]);

  // ----------------------------------------------------
  // STAFF CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenNewStaff = () => {
    setEditingStaff(null);
    setStaffFormData({
      fullName: '',
      position: '',
      department: 'Production',
      employmentStatus: 'Full-Time',
      dateStarted: new Date().toISOString().slice(0, 10),
      salaryType: 'Monthly',
      basicSalary: 20000,
      allowances: 0,
      otherCompensation: 0,
      notes: '',
      status: 'Active'
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (member: StaffMember) => {
    setEditingStaff(member);
    setStaffFormData({
      fullName: member.fullName,
      position: member.position,
      department: member.department,
      employmentStatus: member.employmentStatus,
      dateStarted: member.dateStarted || new Date().toISOString().slice(0, 10),
      salaryType: member.salaryType,
      basicSalary: member.basicSalary || 0,
      allowances: member.allowances || 0,
      otherCompensation: member.otherCompensation || 0,
      notes: member.notes || '',
      status: member.status
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.fullName.trim()) {
      alert('Please enter employee full name.');
      return;
    }

    const newOrUpdated: StaffMember = {
      id: editingStaff ? editingStaff.id : generateStaffId(staff),
      fullName: staffFormData.fullName.trim(),
      position: staffFormData.position.trim(),
      department: staffFormData.department.trim(),
      employmentStatus: staffFormData.employmentStatus,
      dateStarted: staffFormData.dateStarted,
      salaryType: staffFormData.salaryType,
      basicSalary: Number(staffFormData.basicSalary) || 0,
      allowances: Number(staffFormData.allowances) || 0,
      otherCompensation: Number(staffFormData.otherCompensation) || 0,
      notes: staffFormData.notes?.trim() || '',
      status: staffFormData.status,
      createdAt: editingStaff?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveStaff(newOrUpdated);
    setIsStaffModalOpen(false);
    setEditingStaff(null);
  };

  const handleToggleStaffStatus = (member: StaffMember) => {
    const updated: StaffMember = {
      ...member,
      status: member.status === 'Active' ? 'Inactive' : 'Active',
      updatedAt: new Date().toISOString()
    };
    onSaveStaff(updated);
  };

  // ----------------------------------------------------
  // STAFF ACCOUNT / AUTHENTICATION HANDLERS
  // ----------------------------------------------------
  const findStaffAccount = (memberId: string): StaffAccount | undefined => {
    return staffAccounts.find(a => a.staffId === memberId || a.id === `SA-${memberId.replace('STF-', '')}`);
  };

  const handleOpenAccountModal = (member: StaffMember) => {
    setSelectedStaffForAccount(member);
    setAccountSuccessMsg(null);
    setAccountErrorMsg(null);
    setAccountCopiedNotice(false);
    setShowAccountPassword(false);

    const existing = findStaffAccount(member.id);
    if (existing) {
      setAccountFormData({
        username: existing.username || '',
        email: existing.email || '',
        role: existing.role || 'Staff',
        status: existing.status || 'Active',
        temporaryPassword: existing.temporaryPassword || existing.passcode || '',
        requirePasswordChange: existing.mustChangePassword ?? false
      });
    } else {
      // Suggest clean unique username based on full name
      const nameParts = member.fullName.trim().toLowerCase().split(/\s+/);
      const firstName = nameParts[0] || 'staff';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      let baseUsername = lastName ? `${firstName}.${lastName}`.replace(/[^a-z0-9.]/g, '') : firstName.replace(/[^a-z0-9]/g, '');
      
      // Ensure uniqueness
      let candidate = baseUsername;
      let counter = 1;
      while (staffAccounts.some(a => a.username.toLowerCase() === candidate.toLowerCase())) {
        candidate = `${baseUsername}${counter}`;
        counter++;
      }

      const generatedTemp = generateTemporaryPassword('ARH');
      setAccountFormData({
        username: candidate,
        email: `${candidate}@arhprint.com`,
        role: 'Staff',
        status: 'Active',
        temporaryPassword: generatedTemp,
        requirePasswordChange: true
      });
    }

    setIsAccountModalOpen(true);
  };

  const handleGenerateNewTempPass = () => {
    const freshPass = generateTemporaryPassword('ARH');
    setAccountFormData(prev => ({
      ...prev,
      temporaryPassword: freshPass,
      requirePasswordChange: true
    }));
    setShowAccountPassword(true);
  };

  const handleSaveAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForAccount) return;

    setAccountSuccessMsg(null);
    setAccountErrorMsg(null);

    const cleanedUsername = accountFormData.username.trim().toLowerCase();
    if (!cleanedUsername) {
      setAccountErrorMsg('Please provide a unique login username or identifier.');
      return;
    }

    const existingAccount = findStaffAccount(selectedStaffForAccount.id);

    // Check username collisions
    const collision = staffAccounts.find(
      a => a.username.toLowerCase() === cleanedUsername && (!existingAccount || a.id !== existingAccount.id)
    );
    if (collision) {
      setAccountErrorMsg(`The username "${cleanedUsername}" is already taken by ${collision.name} (${collision.staffId}). Please choose another.`);
      return;
    }

    const passcode = accountFormData.temporaryPassword.trim();
    if (!passcode) {
      setAccountErrorMsg('Please specify or generate a temporary password for this account.');
      return;
    }

    const accountToSave: StaffAccount = {
      id: existingAccount ? existingAccount.id : generateStaffAccountId(staffAccounts),
      staffId: selectedStaffForAccount.id,
      name: selectedStaffForAccount.fullName,
      username: cleanedUsername,
      passcode: passcode,
      role: accountFormData.role,
      status: accountFormData.status,
      mustChangePassword: accountFormData.requirePasswordChange,
      temporaryPassword: accountFormData.requirePasswordChange ? passcode : undefined,
      email: accountFormData.email.trim() || undefined,
      createdAt: existingAccount?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: existingAccount?.lastLogin
    };

    if (onSaveStaffAccount) {
      onSaveStaffAccount(accountToSave);
      setAccountSuccessMsg(`Staff account for ${selectedStaffForAccount.fullName} saved successfully.`);
    }
  };

  const handleToggleAccountStatus = () => {
    if (!selectedStaffForAccount) return;
    const existing = findStaffAccount(selectedStaffForAccount.id);
    if (!existing || !onSaveStaffAccount) return;

    const nextStatus: StaffAccountStatus = existing.status === 'Active' ? 'Suspended' : 'Active';
    const updated: StaffAccount = {
      ...existing,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    setAccountFormData(prev => ({ ...prev, status: nextStatus }));
    onSaveStaffAccount(updated);
    setAccountSuccessMsg(
      nextStatus === 'Suspended'
        ? `Account for ${selectedStaffForAccount.fullName} is now SUSPENDED. Login is disabled. Historical records remain intact.`
        : `Account for ${selectedStaffForAccount.fullName} is now ACTIVE.`
    );
  };

  const handleResetAccountPassword = () => {
    if (!selectedStaffForAccount) return;
    const existing = findStaffAccount(selectedStaffForAccount.id);
    if (!existing || !onSaveStaffAccount) return;

    const freshTemp = generateTemporaryPassword('ARH');
    const updated: StaffAccount = {
      ...existing,
      passcode: freshTemp,
      temporaryPassword: freshTemp,
      mustChangePassword: true,
      updatedAt: new Date().toISOString()
    };

    setAccountFormData(prev => ({
      ...prev,
      temporaryPassword: freshTemp,
      requirePasswordChange: true
    }));
    setShowAccountPassword(true);
    onSaveStaffAccount(updated);
    setAccountSuccessMsg(`New temporary password issued for ${selectedStaffForAccount.fullName}. Please copy and provide it to the staff member.`);
  };

  const handleRevokeAccount = () => {
    if (!selectedStaffForAccount) return;
    const existing = findStaffAccount(selectedStaffForAccount.id);
    if (!existing || !onDeleteStaffAccount) return;

    if (
      window.confirm(
        `Are you sure you want to revoke the login account for ${selectedStaffForAccount.fullName} (${selectedStaffForAccount.id})?\n\nNOTE: The employee profile, attendance logs, payroll records, and job history will NOT be deleted.`
      )
    ) {
      onDeleteStaffAccount(existing.id);
      setIsAccountModalOpen(false);
      setSelectedStaffForAccount(null);
    }
  };

  const handleCopyAccountCredentials = () => {
    if (!selectedStaffForAccount) return;
    const creds = [
      `=========================================`,
      `ARH APPAREL - STAFF PORTAL LOGIN ACCESS`,
      `=========================================`,
      `Employee Name: ${selectedStaffForAccount.fullName}`,
      `Staff ID:      ${selectedStaffForAccount.id}`,
      `Position:      ${selectedStaffForAccount.position} (${selectedStaffForAccount.department})`,
      `Portal Role:   ${accountFormData.role}`,
      `-----------------------------------------`,
      `Username:      ${accountFormData.username.trim().toLowerCase()}`,
      `Temp Password: ${accountFormData.temporaryPassword.trim()}`,
      `Security Note: You will be asked to set your new permanent password on your first login.`,
      `=========================================`
    ].join('\n');

    navigator.clipboard.writeText(creds).then(() => {
      setAccountCopiedNotice(true);
      setTimeout(() => setAccountCopiedNotice(false), 3500);
    });
  };

  // ----------------------------------------------------
  // QUALIFYING ATTENDANCE HELPER FOR PAYROLL
  // ----------------------------------------------------
  const computeQualifyingAttendance = (
    staffId: string,
    periodStart: string,
    periodEnd: string,
    records: AttendanceRecord[]
  ) => {
    if (!staffId) {
      return { qualifyingDays: 0, qualifyingHours: 0, qualifyingDates: [] as string[], incompletePunches: 0 };
    }

    const staffAtt = records.filter(a => {
      const sIdMatch = (a.staffId || '').trim().toLowerCase() === staffId.trim().toLowerCase();
      const normDate = normalizeAttendanceDate(a.date);
      const isAfterStart = !periodStart || normDate >= periodStart;
      const isBeforeEnd = !periodEnd || normDate <= periodEnd;
      return sIdMatch && isAfterStart && isBeforeEnd;
    });

    // Map to deduplicate by calendar shift date (date field on attendance record)
    const dateHoursMap = new Map<string, number>();
    const processedRecordIds = new Set<string>();
    let incompleteCount = 0;

    for (const rec of staffAtt) {
      if (rec.id && processedRecordIds.has(rec.id)) continue;
      if (rec.id) processedRecordIds.add(rec.id);

      // Absent and Leave records do not count toward worked days/hours
      if (rec.status === 'Absent' || rec.status === 'Leave') {
        continue;
      }

      const clockOut = cleanClockOut(rec.clockOut);
      const hasClockOut = Boolean(clockOut);
      const hours = Number(rec.totalHours) || 0;

      // Active clock-in without clock-out or missing clock-out does NOT automatically count
      if (!hasClockOut || rec.status === 'Missing Clock Out') {
        incompleteCount++;
        continue;
      }

      // Valid completed workday shift
      if (hours > 0 && (rec.status === 'Present' || rec.status === 'Late' || hasClockOut)) {
        const normD = normalizeAttendanceDate(rec.date);
        const existing = dateHoursMap.get(normD) || 0;
        dateHoursMap.set(normD, existing + hours);
      }
    }

    const qualifyingDays = dateHoursMap.size;
    let totalHours = 0;
    dateHoursMap.forEach(h => {
      totalHours += h;
    });

    return {
      qualifyingDays,
      qualifyingHours: Number(totalHours.toFixed(2)),
      qualifyingDates: Array.from(dateHoursMap.keys()).sort(),
      incompletePunches: incompleteCount
    };
  };

  // ----------------------------------------------------
  // PAYROLL CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenNewPayroll = (preSelectedStaff?: StaffMember) => {
    setEditingPayroll(null);
    const targetStaff = preSelectedStaff || staff.find(s => s.status === 'Active') || staff[0];

    const periodStart = new Date().toISOString().slice(0, 8) + '01';
    const periodEnd = new Date().toISOString().slice(0, 8) + '15';
    const payDate = new Date().toISOString().slice(0, 8) + '15';

    let basicPay = 0;
    let daysWorked: number | undefined;
    let hoursWorked: number | undefined;
    let autoNotes = '';

    if (targetStaff) {
      const qual = computeQualifyingAttendance(targetStaff.id, periodStart, periodEnd, attendance);
      if (targetStaff.salaryType === 'Daily') {
        daysWorked = qual.qualifyingDays;
        basicPay = Math.round((targetStaff.basicSalary || 0) * daysWorked);
        autoNotes = daysWorked > 0
          ? `Daily Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × ${daysWorked} days (Attendance verified)`
          : `Daily Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × 0 days (0 qualifying attendance days recorded in period)`;
      } else if (targetStaff.salaryType === 'Hourly') {
        hoursWorked = qual.qualifyingHours;
        basicPay = Math.round((targetStaff.basicSalary || 0) * hoursWorked);
        autoNotes = hoursWorked > 0
          ? `Hourly Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × ${hoursWorked} hrs (Attendance verified)`
          : `Hourly Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × 0 hrs (0 qualifying attendance hours recorded in period)`;
      } else {
        basicPay = Math.round((targetStaff.basicSalary || 0) / 2);
        autoNotes = `Semi-Monthly cut-off salary (1st - 15th)`;
      }
    }

    const allowances = targetStaff && targetStaff.salaryType === 'Monthly' ? Math.round((targetStaff.allowances || 0) / 2) : 0;
    const otherEarnings = targetStaff && targetStaff.salaryType === 'Monthly' ? Math.round((targetStaff.otherCompensation || 0) / 2) : 0;
    const gross = basicPay + allowances + otherEarnings;

    const initialDeductions: PayrollDeductionItem[] = [
      { id: 'ded-1', name: 'SSS Contribution', amount: basicPay > 0 ? Math.round(basicPay * 0.045) : 0 },
      { id: 'ded-2', name: 'PhilHealth Contribution', amount: basicPay > 0 ? Math.round(basicPay * 0.02) : 0 },
      { id: 'ded-3', name: 'Pag-IBIG Fund', amount: basicPay > 0 ? 100 : 0 },
      { id: 'ded-4', name: 'Withholding Tax', amount: 0 }
    ];
    const totDed = initialDeductions.reduce((sum, d) => sum + d.amount, 0);

    setPayrollFormData({
      staffId: targetStaff ? targetStaff.id : '',
      staffName: targetStaff ? targetStaff.fullName : '',
      position: targetStaff ? targetStaff.position : '',
      department: targetStaff ? targetStaff.department : '',
      payPeriodStart: periodStart,
      payPeriodEnd: periodEnd,
      payDate: payDate,
      salaryType: targetStaff?.salaryType,
      rateSnapshot: targetStaff?.basicSalary,
      daysWorked,
      hoursWorked,
      basicPay,
      allowances,
      otherEarnings,
      grossPay: gross,
      deductions: totDed,
      itemizedDeductions: initialDeductions,
      totalDeductions: totDed,
      netPay: Math.max(0, gross - totDed),
      status: 'Draft',
      notes: autoNotes
    });
    setIsPayrollModalOpen(true);
  };

  const handleOpenEditPayroll = (record: PayrollRecord) => {
    setEditingPayroll(record);
    setPayrollFormData({
      staffId: record.staffId,
      staffName: record.staffName,
      position: record.position || '',
      department: record.department || '',
      payPeriodStart: record.payPeriodStart,
      payPeriodEnd: record.payPeriodEnd,
      payDate: record.payDate,
      salaryType: record.salaryType,
      rateSnapshot: record.rateSnapshot,
      daysWorked: record.daysWorked,
      hoursWorked: record.hoursWorked,
      basicPay: record.basicPay,
      allowances: record.allowances,
      otherEarnings: record.otherEarnings,
      grossPay: record.grossPay,
      deductions: record.deductions,
      itemizedDeductions: record.itemizedDeductions && record.itemizedDeductions.length > 0
        ? record.itemizedDeductions
        : [{ id: 'ded-1', name: 'General Deductions', amount: record.deductions || 0 }],
      totalDeductions: record.totalDeductions,
      netPay: record.netPay,
      status: record.status,
      notes: record.notes || ''
    });
    setIsPayrollModalOpen(true);
  };

  const handleStaffSelectInPayroll = (staffId: string) => {
    const targetStaff = staff.find(s => s.id === staffId);
    if (!targetStaff) return;

    let basicPay = 0;
    let daysWorked: number | undefined;
    let hoursWorked: number | undefined;
    let autoNotes = '';

    const qual = computeQualifyingAttendance(
      staffId,
      payrollFormData.payPeriodStart,
      payrollFormData.payPeriodEnd,
      attendance
    );

    if (targetStaff.salaryType === 'Daily') {
      daysWorked = qual.qualifyingDays;
      basicPay = Math.round((targetStaff.basicSalary || 0) * daysWorked);
      autoNotes = daysWorked > 0
        ? `Daily Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × ${daysWorked} days (Attendance verified)`
        : `Daily Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × 0 days (0 qualifying attendance days recorded in period)`;
    } else if (targetStaff.salaryType === 'Hourly') {
      hoursWorked = qual.qualifyingHours;
      basicPay = Math.round((targetStaff.basicSalary || 0) * hoursWorked);
      autoNotes = hoursWorked > 0
        ? `Hourly Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × ${hoursWorked} hrs (Attendance verified)`
        : `Hourly Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × 0 hrs (0 qualifying attendance hours recorded in period)`;
    } else {
      basicPay = Math.round((targetStaff.basicSalary || 0) / 2);
      autoNotes = `Semi-Monthly cut-off salary`;
    }

    const allowances = targetStaff.salaryType === 'Monthly' ? Math.round((targetStaff.allowances || 0) / 2) : 0;
    const otherEarnings = targetStaff.salaryType === 'Monthly' ? Math.round((targetStaff.otherCompensation || 0) / 2) : 0;
    const gross = basicPay + allowances + otherEarnings;
    const currentTotDed = (payrollFormData.itemizedDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    setPayrollFormData(prev => ({
      ...prev,
      staffId: targetStaff.id,
      staffName: targetStaff.fullName,
      position: targetStaff.position,
      department: targetStaff.department,
      salaryType: targetStaff.salaryType,
      rateSnapshot: targetStaff.basicSalary,
      daysWorked,
      hoursWorked,
      basicPay,
      allowances,
      otherEarnings,
      grossPay: gross,
      totalDeductions: currentTotDed,
      netPay: Math.max(0, gross - currentTotDed),
      notes: autoNotes || prev.notes
    }));
  };

  const handleSyncAttendanceToPayrollForm = () => {
    if (!payrollFormData.staffId) return;
    const targetStaff = staff.find(s => s.id === payrollFormData.staffId);
    if (!targetStaff) return;

    const qual = computeQualifyingAttendance(
      payrollFormData.staffId,
      payrollFormData.payPeriodStart,
      payrollFormData.payPeriodEnd,
      attendance
    );

    let basic = 0;
    let daysWorked: number | undefined;
    let hoursWorked: number | undefined;
    let notes = '';

    if (targetStaff.salaryType === 'Daily') {
      daysWorked = qual.qualifyingDays;
      basic = Math.round((targetStaff.basicSalary || 0) * daysWorked);
      notes = daysWorked > 0
        ? `Daily Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × ${daysWorked} days (Attendance synced)`
        : `Daily Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × 0 days (0 qualifying attendance days recorded)`;
    } else if (targetStaff.salaryType === 'Hourly') {
      hoursWorked = qual.qualifyingHours;
      basic = Math.round((targetStaff.basicSalary || 0) * hoursWorked);
      notes = hoursWorked > 0
        ? `Hourly Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × ${hoursWorked} hrs (Attendance synced)`
        : `Hourly Rate: ₱${targetStaff.basicSalary?.toLocaleString()} × 0 hrs (0 qualifying attendance hours recorded)`;
    } else {
      basic = Math.round((targetStaff.basicSalary || 0) / 2);
      notes = `Semi-Monthly cut-off salary`;
    }

    const gross = basic + (Number(payrollFormData.allowances) || 0) + (Number(payrollFormData.otherEarnings) || 0);
    const totalDed = (payrollFormData.itemizedDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    setPayrollFormData(prev => ({
      ...prev,
      daysWorked,
      hoursWorked,
      basicPay: basic,
      grossPay: gross,
      netPay: Math.max(0, gross - totalDed),
      notes: notes
    }));
  };

  const handleDaysWorkedChange = (days: number) => {
    const rate = Number(payrollFormData.rateSnapshot) || 0;
    const basic = Math.max(0, Math.round(rate * days));
    const gross = basic + (Number(payrollFormData.allowances) || 0) + (Number(payrollFormData.otherEarnings) || 0);
    const totalDed = (payrollFormData.itemizedDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    setPayrollFormData(prev => ({
      ...prev,
      daysWorked: days,
      basicPay: basic,
      grossPay: gross,
      netPay: Math.max(0, gross - totalDed),
      notes: `Daily Rate: ₱${rate.toLocaleString()} × ${days} days (Manual override)`
    }));
  };

  const handleHoursWorkedChange = (hours: number) => {
    const rate = Number(payrollFormData.rateSnapshot) || 0;
    const basic = Math.max(0, Math.round(rate * hours));
    const gross = basic + (Number(payrollFormData.allowances) || 0) + (Number(payrollFormData.otherEarnings) || 0);
    const totalDed = (payrollFormData.itemizedDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    setPayrollFormData(prev => ({
      ...prev,
      hoursWorked: hours,
      basicPay: basic,
      grossPay: gross,
      netPay: Math.max(0, gross - totalDed),
      notes: `Hourly Rate: ₱${rate.toLocaleString()} × ${hours} hrs (Manual override)`
    }));
  };

  const handleDeductionChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    const list = [...(payrollFormData.itemizedDeductions || [])];
    if (field === 'amount') {
      list[index].amount = Number(value) || 0;
    } else {
      list[index].name = String(value);
    }

    const totalDed = list.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const gross = (Number(payrollFormData.basicPay) || 0) + (Number(payrollFormData.allowances) || 0) + (Number(payrollFormData.otherEarnings) || 0);

    setPayrollFormData(prev => ({
      ...prev,
      itemizedDeductions: list,
      totalDeductions: totalDed,
      deductions: totalDed,
      grossPay: gross,
      netPay: gross - totalDed
    }));
  };

  const handleAddDeductionRow = () => {
    const list = [...(payrollFormData.itemizedDeductions || [])];
    list.push({ id: `ded-${Date.now()}`, name: 'Other Deduction', amount: 0 });
    setPayrollFormData(prev => ({
      ...prev,
      itemizedDeductions: list
    }));
  };

  const handleRemoveDeductionRow = (index: number) => {
    const list = [...(payrollFormData.itemizedDeductions || [])].filter((_, i) => i !== index);
    const totalDed = list.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const gross = (Number(payrollFormData.basicPay) || 0) + (Number(payrollFormData.allowances) || 0) + (Number(payrollFormData.otherEarnings) || 0);

    setPayrollFormData(prev => ({
      ...prev,
      itemizedDeductions: list,
      totalDeductions: totalDed,
      deductions: totalDed,
      netPay: gross - totalDed
    }));
  };

  const handleEarningsChange = (field: 'basicPay' | 'allowances' | 'otherEarnings', val: number) => {
    const updated = {
      ...payrollFormData,
      [field]: val
    };
    const gross = (Number(updated.basicPay) || 0) + (Number(updated.allowances) || 0) + (Number(updated.otherEarnings) || 0);
    const totalDed = (updated.itemizedDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    setPayrollFormData(prev => ({
      ...prev,
      [field]: val,
      grossPay: gross,
      totalDeductions: totalDed,
      netPay: gross - totalDed
    }));
  };

  const handleSavePayrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollFormData.staffId || !payrollFormData.staffName) {
      alert('Please select an employee for this payroll record.');
      return;
    }

    const gross = (Number(payrollFormData.basicPay) || 0) + (Number(payrollFormData.allowances) || 0) + (Number(payrollFormData.otherEarnings) || 0);
    const totalDed = (payrollFormData.itemizedDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const net = gross - totalDed;

    const record: PayrollRecord = {
      id: editingPayroll ? editingPayroll.id : generatePayrollId(payroll),
      staffId: payrollFormData.staffId,
      staffName: payrollFormData.staffName,
      position: payrollFormData.position,
      department: payrollFormData.department,
      payPeriodStart: payrollFormData.payPeriodStart,
      payPeriodEnd: payrollFormData.payPeriodEnd,
      payDate: payrollFormData.payDate,
      salaryType: payrollFormData.salaryType,
      rateSnapshot: payrollFormData.rateSnapshot,
      daysWorked: payrollFormData.daysWorked,
      hoursWorked: payrollFormData.hoursWorked,
      basicPay: Number(payrollFormData.basicPay) || 0,
      allowances: Number(payrollFormData.allowances) || 0,
      otherEarnings: Number(payrollFormData.otherEarnings) || 0,
      grossPay: gross,
      deductions: totalDed,
      itemizedDeductions: payrollFormData.itemizedDeductions,
      totalDeductions: totalDed,
      netPay: net,
      status: payrollFormData.status,
      notes: payrollFormData.notes?.trim() || '',
      createdAt: editingPayroll?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSavePayroll(record);
    setIsPayrollModalOpen(false);
    setEditingPayroll(null);
  };

  const handleQuickPayrollStatusChange = (record: PayrollRecord, nextStatus: PayrollStatus) => {
    const updated: PayrollRecord = {
      ...record,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    onSavePayroll(updated);
  };

  // ----------------------------------------------------
  // BATCH GENERATE PAYROLL FOR ALL ACTIVE EMPLOYEES
  // ----------------------------------------------------
  const handleGenerateBatchPayroll = () => {
    const activeStaff = staff.filter(s => s.status === 'Active');
    if (activeStaff.length === 0) {
      alert('No active employees found to generate payroll for.');
      return;
    }

    const divider = batchPeriodType === 'monthly' ? 1 : 2;
    const newRecords: PayrollRecord[] = [];

    activeStaff.forEach((emp, index) => {
      let basic = 0;
      let daysWorked: number | undefined;
      let hoursWorked: number | undefined;
      const notesArr: string[] = [`${batchPeriodType.replace(/_/g, ' ').toUpperCase()} batch run`];

      const qual = computeQualifyingAttendance(
        emp.id,
        batchPayPeriodStart,
        batchPayPeriodEnd,
        attendance
      );

      if (emp.salaryType === 'Daily') {
        daysWorked = qual.qualifyingDays;
        basic = Math.round((emp.basicSalary || 0) * daysWorked);
        if (daysWorked > 0) {
          notesArr.push(`Daily: ₱${emp.basicSalary?.toLocaleString()} × ${daysWorked} days (Attendance verified)`);
        } else {
          notesArr.push(`Daily: ₱${emp.basicSalary?.toLocaleString()} × 0 days (0 qualifying attendance days)`);
        }
        if (qual.incompletePunches > 0) {
          notesArr.push(`${qual.incompletePunches} unclosed shift(s) excluded`);
        }
      } else if (emp.salaryType === 'Hourly') {
        hoursWorked = qual.qualifyingHours;
        basic = Math.round((emp.basicSalary || 0) * hoursWorked);
        if (hoursWorked > 0) {
          notesArr.push(`Hourly: ₱${emp.basicSalary?.toLocaleString()} × ${hoursWorked} hrs (Attendance verified)`);
        } else {
          notesArr.push(`Hourly: ₱${emp.basicSalary?.toLocaleString()} × 0 hrs (0 qualifying attendance hours)`);
        }
        if (qual.incompletePunches > 0) {
          notesArr.push(`${qual.incompletePunches} unclosed shift(s) excluded`);
        }
      } else {
        basic = Math.round((emp.basicSalary || 0) / divider);
        notesArr.push(`Monthly cut-off salary`);
      }

      const allow = emp.salaryType === 'Monthly' ? Math.round((emp.allowances || 0) / divider) : 0;
      const other = emp.salaryType === 'Monthly' ? Math.round((emp.otherCompensation || 0) / divider) : 0;
      const gross = basic + allow + other;

      // Deductions calculated only if basic > 0
      const dedList: PayrollDeductionItem[] = [
        { id: `ded-sss-${emp.id}`, name: 'SSS Contribution', amount: basic > 0 ? Math.round(basic * 0.045) : 0 },
        { id: `ded-ph-${emp.id}`, name: 'PhilHealth', amount: basic > 0 ? Math.round(basic * 0.02) : 0 },
        { id: `ded-pagibig-${emp.id}`, name: 'Pag-IBIG', amount: basic > 0 ? 100 : 0 }
      ];
      const totDed = dedList.reduce((sum, d) => sum + d.amount, 0);

      newRecords.push({
        id: `PR-${batchPayDate.replace(/-/g, '')}-${String(payroll.length + index + 1).padStart(3, '0')}`,
        staffId: emp.id,
        staffName: emp.fullName,
        position: emp.position,
        department: emp.department,
        payPeriodStart: batchPayPeriodStart,
        payPeriodEnd: batchPayPeriodEnd,
        payDate: batchPayDate,
        salaryType: emp.salaryType,
        rateSnapshot: emp.basicSalary,
        daysWorked,
        hoursWorked,
        basicPay: basic,
        allowances: allow,
        otherEarnings: other,
        grossPay: gross,
        deductions: totDed,
        itemizedDeductions: dedList,
        totalDeductions: totDed,
        netPay: gross - totDed,
        status: 'Draft',
        notes: notesArr.join(' | '),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });

    if (onSavePayrollBatch) {
      onSavePayrollBatch(newRecords);
    } else {
      newRecords.forEach(r => onSavePayroll(r));
    }

    setIsBatchPayrollModalOpen(false);
    alert(`Generated ${newRecords.length} payroll draft records for period ${batchPayPeriodStart} to ${batchPayPeriodEnd}. You can now review and finalize them.`);
  };

  // ----------------------------------------------------
  // DOWNLOADABLE PAYSLIP PDF GENERATOR (jsPDF)
  // ----------------------------------------------------
  const handleDownloadPayslip = (record: PayrollRecord) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = '#000000';
    const hubName = systemSettings?.hubName || 'ARH Print Hub';
    const hubAddress = systemSettings?.companyAddress || 'Main Workshop & Production Studio';
    const hubTagline = systemSettings?.companyTagline || 'Custom Corporate Apparel & Promotional Merchandise';
    const hubTaxId = systemSettings?.taxId ? `TIN: ${systemSettings.taxId}` : '';

    // Header Background
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 38, 'F');

    // Hub Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(hubName.toUpperCase(), 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text(hubTagline, 14, 22);
    doc.text(`${hubAddress} ${hubTaxId ? '| ' + hubTaxId : ''}`, 14, 28);

    // Document Title Banner
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(14, 44, 182, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL EMPLOYEE PAYSLIP / SALARY VOUCHER', 18, 53);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`VOUCHER REF: ${record.id}`, 145, 53);

    // Employee & Pay Period Details Grid
    let currentY = 66;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, currentY, 182, 34, 2, 2, 'FD');

    // Left Column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('EMPLOYEE NAME:', 18, currentY + 8);
    doc.text('EMPLOYEE ID:', 18, currentY + 16);
    doc.text('POSITION:', 18, currentY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(record.staffName, 55, currentY + 8);
    doc.text(record.staffId, 55, currentY + 16);
    doc.text(record.position || 'Staff Member', 55, currentY + 24);

    // Right Column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('DEPARTMENT:', 115, currentY + 8);
    doc.text('PAY PERIOD:', 115, currentY + 16);
    doc.text('PAY DATE:', 115, currentY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(record.department || 'Production', 145, currentY + 8);
    doc.text(`${record.payPeriodStart} to ${record.payPeriodEnd}`, 145, currentY + 16);
    doc.text(record.payDate, 145, currentY + 24);

    // ---------------- EARNINGS & DEDUCTIONS BREAKDOWN ----------------
    currentY += 42;

    // Two Columns: Earnings (Left) & Deductions (Right)
    const colWidth = 88;
    const colLeftX = 14;
    const colRightX = 108;

    // Header Boxes
    doc.setFillColor(248, 250, 252);
    doc.rect(colLeftX, currentY, colWidth, 8, 'F');
    doc.rect(colRightX, currentY, colWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('GROSS EARNINGS & ALLOWANCES', colLeftX + 4, currentY + 5.5);
    doc.text('AMOUNT', colLeftX + colWidth - 20, currentY + 5.5);

    doc.text('ITEMIZED DEDUCTIONS', colRightX + 4, currentY + 5.5);
    doc.text('AMOUNT', colRightX + colWidth - 20, currentY + 5.5);

    // Earnings Items
    let earnY = currentY + 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const printLine = (label: string, amt: number, x: number, y: number) => {
      doc.text(label, x + 4, y);
      doc.text(`${currencySymbol} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x + colWidth - 4, y, { align: 'right' });
    };

    let basicLabel = 'Basic Salary Pay';
    if (record.salaryType === 'Daily' && record.daysWorked) {
      basicLabel = `Basic Pay (${record.daysWorked} days)`;
    } else if (record.salaryType === 'Hourly' && record.hoursWorked) {
      basicLabel = `Basic Pay (${record.hoursWorked} hrs)`;
    }

    printLine(basicLabel, record.basicPay, colLeftX, earnY);
    earnY += 7;
    if (record.allowances > 0) {
      printLine('Allowances (Transpo/Meal)', record.allowances, colLeftX, earnY);
      earnY += 7;
    }
    if (record.otherEarnings > 0) {
      printLine('Overtime / Other Earnings', record.otherEarnings, colLeftX, earnY);
      earnY += 7;
    }

    // Deductions Items
    let dedY = currentY + 14;
    const deductionsList = record.itemizedDeductions && record.itemizedDeductions.length > 0
      ? record.itemizedDeductions
      : [{ id: 'ded-gen', name: 'General Deductions', amount: record.deductions || 0 }];

    deductionsList.forEach(d => {
      if (d.amount > 0) {
        printLine(d.name, d.amount, colRightX, dedY);
        dedY += 7;
      }
    });

    if (deductionsList.every(d => d.amount === 0)) {
      doc.setTextColor(148, 163, 184);
      doc.text('No deductions applied', colRightX + 4, dedY);
      doc.setTextColor(15, 23, 42);
      dedY += 7;
    }

    // Subtotal Dividers
    const maxY = Math.max(earnY, dedY) + 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(colLeftX, maxY, colLeftX + colWidth, maxY);
    doc.line(colRightX, maxY, colRightX + colWidth, maxY);

    // Totals Rows
    doc.setFont('helvetica', 'bold');
    printLine('TOTAL GROSS PAY', record.grossPay, colLeftX, maxY + 7);
    printLine('TOTAL DEDUCTIONS', record.totalDeductions, colRightX, maxY + 7);

    // NET TAKE HOME PAY BOX
    const netY = maxY + 20;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(14, netY, 182, 18, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text('NET TAKE-HOME SALARY PAY:', 22, netY + 11.5);

    doc.setFontSize(13);
    doc.text(
      `${currencySymbol} ${record.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      190,
      netY + 12,
      { align: 'right' }
    );

    // Payment Status Stamp
    const stampY = netY + 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`DISBURSEMENT STATUS: [ ${record.status.toUpperCase()} ]`, 14, stampY);
    if (record.notes) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Notes: ${record.notes}`, 14, stampY + 6);
    }

    // Signature Area
    const sigY = stampY + 28;
    doc.setDrawColor(203, 213, 225);
    doc.line(20, sigY, 85, sigY);
    doc.line(125, sigY, 190, sigY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Prepared by / Finance Officer', 52, sigY + 5, { align: 'center' });
    doc.text('Employee Signature & Acknowledgment', 157, sigY + 5, { align: 'center' });

    // Footer
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by ${hubName} Financial & Staff System on ${new Date().toLocaleDateString()} | Confidential Record`,
      105,
      285,
      { align: 'center' }
    );

    doc.save(`Payslip_${record.staffName.replace(/[^a-zA-Z0-9]/g, '_')}_${record.payPeriodStart}_${record.id}.pdf`);
  };

  return (
    <div className="space-y-6 font-sans text-left" id="admin-staff-management-container">
      {/* Top Header & Section Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-extrabold uppercase text-black tracking-wider flex items-center gap-2">
            <Users className="w-5 h-5 text-black" />
            Staff &amp; Payroll Management
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            Manage employee directory, compensation profiles, and process verified pay stubs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'staff'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-200/60'
            }`}
            id="tab-staff-directory"
          >
            <Users className="w-3.5 h-3.5" />
            Staff Directory ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('payroll')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'payroll'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-gray-200/60'
            }`}
            id="tab-payroll-records"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Payroll &amp; Payslips ({payroll.length})
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Active Staff</span>
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-2xl font-extrabold text-black font-mono">{payrollStats.activeStaffCount}</h4>
            <p className="text-[10px] text-gray-500 font-mono">{staff.length - payrollStats.activeStaffCount} inactive / archived</p>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Monthly Payroll Run-rate</span>
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {payrollStats.monthlyStaffPayrollCommitment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-gray-500 font-mono">Estimated active base + allowances</p>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Total Net Disbursed</span>
            <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {payrollStats.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-gray-500 font-mono">Across {filteredPayroll.length} recorded vouchers</p>
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-400">Total Deductions Held</span>
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-amber-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h4 className="text-2xl font-extrabold text-black font-mono">
              {currencySymbol} {payrollStats.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] text-gray-500 font-mono">SSS, PhilHealth, Pag-IBIG &amp; taxes</p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: STAFF DIRECTORY                               */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={e => setStaffSearch(e.target.value)}
                  placeholder="Search staff by name, position, ID..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono bg-white"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono bg-white"
              >
                <option value="all">All Status</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleOpenNewStaff}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-black hover:bg-neutral-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              id="add-staff-btn"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>

          {/* Staff Table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] uppercase font-bold text-gray-500">
                    <th className="py-3 px-4">Staff ID &amp; Name</th>
                    <th className="py-3 px-4">Position &amp; Dept</th>
                    <th className="py-3 px-4">Employment</th>
                    <th className="py-3 px-4 text-right">Compensation Rate</th>
                    <th className="py-3 px-4 text-center">Account Access</th>
                    <th className="py-3 px-4 text-center">HR Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-mono text-xs">
                        No employees found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(member => {
                      const account = findStaffAccount(member.id);
                      return (
                        <tr key={member.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-black text-sm">{member.fullName}</div>
                            <div className="font-mono text-[10px] text-gray-400">{member.id}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-gray-900">{member.position}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{member.department}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                              {member.employmentStatus}
                            </span>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              Since {member.dateStarted || 'N/A'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            <div className="font-bold text-black">
                              {currencySymbol} {member.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-gray-400 font-normal"> / {member.salaryType.toLowerCase()}</span>
                            </div>
                            {(member.allowances > 0 || member.otherCompensation > 0) && (
                              <div className="text-[10px] text-emerald-600">
                                +{currencySymbol} {(member.allowances + member.otherCompensation).toLocaleString(undefined, { minimumFractionDigits: 2 })} allow.
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {account ? (
                              <div className="inline-flex flex-col items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAccountModal(member)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer border ${
                                    account.status === 'Active'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                                      : account.status === 'Suspended'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                                  }`}
                                  title="Click to manage staff account & security"
                                >
                                  {account.status === 'Active' ? (
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                  )}
                                  <span>@{account.username}</span>
                                  <span className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase ${
                                    account.status === 'Active' ? 'bg-emerald-200/60 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
                                  }`}>
                                    {account.status}
                                  </span>
                                </button>
                                {account.mustChangePassword && (
                                  <span className="text-[9px] font-mono font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    Temp Pass Pending
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenAccountModal(member)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-gray-50 hover:bg-black hover:text-white text-gray-600 border border-gray-200 transition-all cursor-pointer shadow-2xs"
                                title="Set up login account for this staff member"
                              >
                                <Key className="w-3 h-3 text-amber-500" />
                                <span>+ Set Up Account</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(member)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase cursor-pointer border transition-colors ${
                                member.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                              }`}
                              title="Click to toggle HR employee status"
                            >
                              {member.status === 'Active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                              {member.status}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAccountModal(member)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  account
                                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                    : 'text-gray-500 hover:text-black hover:bg-gray-100'
                                }`}
                                title={account ? "Manage Login Account" : "Set Up Login Account"}
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenNewPayroll(member)}
                                className="px-2.5 py-1 bg-gray-100 hover:bg-black hover:text-white text-gray-700 rounded-lg font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                title="Create payroll record for this staff"
                              >
                                + Pay
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(member)}
                                className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Edit Employee Profile"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteStaff && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to remove ${member.fullName} (${member.id})?\n\nNote: If this employee has a login account, you may want to revoke or suspend the account as well.`)) {
                                      onDeleteStaff(member.id);
                                    }
                                  }}
                                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: PAYROLL & PAYSLIPS                            */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-gray-200">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={payrollSearch}
                  onChange={e => setPayrollSearch(e.target.value)}
                  placeholder="Search payroll by staff, position, ID..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono"
                />
              </div>

              <select
                value={payrollStatusFilter}
                onChange={e => setPayrollStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 focus:border-black rounded-xl focus:outline-none font-mono bg-white"
              >
                <option value="all">All Pay Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Reviewed">Reviewed</option>
                <option value="Finalized">Finalized</option>
                <option value="Paid">Paid</option>
                <option value="Voided">Voided</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsBatchPayrollModalOpen(true)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                id="batch-payroll-btn"
              >
                <Calendar className="w-3.5 h-3.5" />
                Batch Run
              </button>

              <button
                type="button"
                onClick={() => handleOpenNewPayroll()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-black hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                id="create-payroll-btn"
              >
                <Plus className="w-4 h-4" />
                Create Payroll
              </button>
            </div>
          </div>

          {/* Payroll Records Table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] uppercase font-bold text-gray-500">
                    <th className="py-3 px-4">Payroll ID &amp; Employee</th>
                    <th className="py-3 px-4">Pay Period &amp; Date</th>
                    <th className="py-3 px-4 text-right">Gross Pay</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Net Take-Home</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayroll.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 font-mono text-xs">
                        No payroll records found. Click "+ Create Payroll" or "Batch Run" to generate records.
                      </td>
                    </tr>
                  ) : (
                    filteredPayroll.map(record => (
                      <tr key={record.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-black text-sm">{record.staffName}</div>
                          <div className="font-mono text-[10px] text-gray-400 flex items-center gap-1">
                            <span>{record.id}</span>
                            <span>•</span>
                            <span>{record.position || 'Staff'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          <div className="text-gray-900 font-medium">
                            {record.payPeriodStart} to {record.payPeriodEnd}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Pay Date: {record.payDate}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          {currencySymbol} {record.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-red-600 font-medium">
                          -{currencySymbol} {record.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-700 text-sm">
                          {currencySymbol} {record.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border ${
                              record.status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : record.status === 'Finalized'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : record.status === 'Reviewed'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadPayslip(record)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-black text-white hover:bg-neutral-800 rounded-lg font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer shadow-2xs"
                              title="Download PDF Payslip"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditPayroll(record)}
                              className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit Payroll"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {onDeletePayroll && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete payroll record ${record.id}?`)) {
                                    onDeletePayroll(record.id);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Payroll Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT STAFF MEMBER                       */}
      {/* ---------------------------------------------------- */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold uppercase text-base text-black flex items-center gap-2">
                <Users className="w-4 h-4" />
                {editingStaff ? `Edit Employee (${editingStaff.id})` : 'Add New Employee'}
              </h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaffSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={staffFormData.fullName}
                    onChange={e => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Position / Title</label>
                  <input
                    type="text"
                    value={staffFormData.position}
                    onChange={e => setStaffFormData({ ...staffFormData, position: e.target.value })}
                    placeholder="e.g. Master Screen Printer"
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Department</label>
                  <input
                    type="text"
                    list="dept-list"
                    value={staffFormData.department}
                    onChange={e => setStaffFormData({ ...staffFormData, department: e.target.value })}
                    placeholder="e.g. Production"
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                  />
                  <datalist id="dept-list">
                    {departments.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Employment Status</label>
                  <select
                    value={staffFormData.employmentStatus}
                    onChange={e => setStaffFormData({ ...staffFormData, employmentStatus: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Probationary">Probationary</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Date Started</label>
                  <input
                    type="date"
                    value={staffFormData.dateStarted}
                    onChange={e => setStaffFormData({ ...staffFormData, dateStarted: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Salary Schedule Type</label>
                  <select
                    value={staffFormData.salaryType}
                    onChange={e => setStaffFormData({ ...staffFormData, salaryType: e.target.value as SalaryType })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Monthly">Monthly Salary</option>
                    <option value="Daily">Daily Rate</option>
                    <option value="Hourly">Hourly Rate</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                    Basic Rate ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={staffFormData.basicSalary}
                    onChange={e => setStaffFormData({ ...staffFormData, basicSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Monthly Allowances ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={staffFormData.allowances}
                    onChange={e => setStaffFormData({ ...staffFormData, allowances: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Other Compensation ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={staffFormData.otherCompensation}
                    onChange={e => setStaffFormData({ ...staffFormData, otherCompensation: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Active Status</label>
                  <select
                    value={staffFormData.status}
                    onChange={e => setStaffFormData({ ...staffFormData, status: e.target.value as StaffStatus })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Active">Active (Eligible for Payroll)</option>
                    <option value="Inactive">Inactive / Archived</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Internal Notes / Role Specifications</label>
                  <textarea
                    rows={2}
                    value={staffFormData.notes}
                    onChange={e => setStaffFormData({ ...staffFormData, notes: e.target.value })}
                    placeholder="e.g. Lead workshop supervisor, machine certs..."
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs shadow-xs"
                >
                  {editingStaff ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: ADD / EDIT PAYROLL RECORD                     */}
      {/* ---------------------------------------------------- */}
      {isPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold uppercase text-base text-black flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                {editingPayroll ? `Edit Payroll Record (${editingPayroll.id})` : 'Create Payroll Record'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPayrollModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayrollSubmit} className="space-y-4 text-xs font-sans">
              {/* Staff Member Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Select Employee *</label>
                <select
                  required
                  value={payrollFormData.staffId}
                  onChange={e => handleStaffSelectInPayroll(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-bold focus:outline-none bg-white text-sm"
                >
                  <option value="">-- Choose Employee --</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.id}) — {s.position} [{s.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Pay Period & Pay Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Period Start</label>
                  <input
                    type="date"
                    required
                    value={payrollFormData.payPeriodStart}
                    onChange={e => setPayrollFormData({ ...payrollFormData, payPeriodStart: e.target.value })}
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Period End</label>
                  <input
                    type="date"
                    required
                    value={payrollFormData.payPeriodEnd}
                    onChange={e => setPayrollFormData({ ...payrollFormData, payPeriodEnd: e.target.value })}
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={payrollFormData.payDate}
                    onChange={e => setPayrollFormData({ ...payrollFormData, payDate: e.target.value })}
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-gray-700">
                    Gross Earnings Breakdown {payrollFormData.salaryType ? `(${payrollFormData.salaryType} Rate)` : ''}
                  </h4>
                  <div className="flex items-center gap-2">
                    {(payrollFormData.salaryType === 'Daily' || payrollFormData.salaryType === 'Hourly') && (
                      <button
                        type="button"
                        onClick={handleSyncAttendanceToPayrollForm}
                        className="text-[10px] bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 px-2 py-1 rounded-lg font-mono font-bold flex items-center gap-1 shadow-xs"
                        title="Re-calculate days/hours worked based on actual qualifying attendance records"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Sync from Attendance
                      </button>
                    )}
                    <span className="font-extrabold text-black font-mono text-xs">
                      Gross: {currencySymbol} {payrollFormData.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Daily / Hourly specifics */}
                {payrollFormData.salaryType === 'Daily' && (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-900 font-medium">Daily Rate:</span>
                      <span className="font-mono font-bold text-blue-950">
                        {currencySymbol} {(payrollFormData.rateSnapshot || 0).toLocaleString()} / day
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[9px] uppercase font-mono font-bold text-blue-900">
                          Qualifying Days Worked
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={payrollFormData.daysWorked ?? 0}
                          onChange={e => handleDaysWorkedChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-full p-2 bg-white border border-blue-200 rounded-lg font-mono font-bold text-xs focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-[9px] text-blue-700 font-mono mt-0.5">
                          0 attendance records = ₱0 basic pay. No assumed days.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-mono font-bold text-blue-900">
                          Calculated Basic Pay (Rate × Days)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={payrollFormData.basicPay}
                          onChange={e => handleEarningsChange('basicPay', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 bg-white border border-blue-200 rounded-lg font-mono font-bold text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {payrollFormData.salaryType === 'Hourly' && (
                  <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-900 font-medium">Hourly Rate:</span>
                      <span className="font-mono font-bold text-purple-950">
                        {currencySymbol} {(payrollFormData.rateSnapshot || 0).toLocaleString()} / hr
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[9px] uppercase font-mono font-bold text-purple-900">
                          Qualifying Hours Worked
                        </label>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={payrollFormData.hoursWorked ?? 0}
                          onChange={e => handleHoursWorkedChange(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full p-2 bg-white border border-purple-200 rounded-lg font-mono font-bold text-xs focus:outline-none focus:border-purple-500"
                        />
                        <p className="text-[9px] text-purple-700 font-mono mt-0.5">
                          0 attendance records = ₱0 basic pay. No assumed hours.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-mono font-bold text-purple-900">
                          Calculated Basic Pay (Rate × Hours)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={payrollFormData.basicPay}
                          onChange={e => handleEarningsChange('basicPay', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 bg-white border border-purple-200 rounded-lg font-mono font-bold text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {payrollFormData.salaryType === 'Monthly' && (
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-mono text-gray-500">Basic Pay (Semi-Monthly)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={payrollFormData.basicPay}
                        onChange={e => handleEarningsChange('basicPay', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-mono text-gray-500">Allowances</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={payrollFormData.allowances}
                      onChange={e => handleEarningsChange('allowances', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-mono text-gray-500">Overtime / Other</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={payrollFormData.otherEarnings}
                      onChange={e => handleEarningsChange('otherEarnings', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Itemized Deductions */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-gray-700">Itemized Deductions</h4>
                  <button
                    type="button"
                    onClick={handleAddDeductionRow}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-mono font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Deduction Item
                  </button>
                </div>

                <div className="space-y-2">
                  {(payrollFormData.itemizedDeductions || []).map((ded, idx) => (
                    <div key={ded.id || idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ded.name}
                        onChange={e => handleDeductionChange(idx, 'name', e.target.value)}
                        placeholder="Deduction Name"
                        className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium"
                      />
                      <div className="relative w-32 shrink-0">
                        <span className="absolute left-2.5 top-2 text-[10px] font-mono text-gray-400">{currencySymbol}</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={ded.amount}
                          onChange={e => handleDeductionChange(idx, 'amount', e.target.value)}
                          className="w-full p-2 pl-9 bg-white border border-gray-200 rounded-lg font-mono text-xs font-bold text-red-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDeductionRow(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-200 text-xs font-mono">
                  <span className="text-gray-600 font-bold mr-2">Total Deductions:</span>
                  <span className="text-red-600 font-bold">
                    {currencySymbol} {payrollFormData.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="bg-black text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold text-gray-300 block">Calculated Net Pay</span>
                  <span className="text-xs text-gray-400 font-mono">Gross Pay - Total Deductions</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-green-400">
                  {currencySymbol} {payrollFormData.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Payroll Status</label>
                  <select
                    value={payrollFormData.status}
                    onChange={e => setPayrollFormData({ ...payrollFormData, status: e.target.value as PayrollStatus })}
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                  >
                    <option value="Draft">Draft (In Review)</option>
                    <option value="Reviewed">Reviewed &amp; Approved</option>
                    <option value="Finalized">Finalized (Ready for Disbursement)</option>
                    <option value="Paid">Paid / Disbursed</option>
                    <option value="Voided">Voided</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Internal Notes / Payment Reference</label>
                  <input
                    type="text"
                    value={payrollFormData.notes}
                    onChange={e => setPayrollFormData({ ...payrollFormData, notes: e.target.value })}
                    placeholder="e.g. Bank transfer ref #, cash voucher..."
                    className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs shadow-xs"
                >
                  {editingPayroll ? 'Update Record' : 'Save Payroll Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: BATCH RUN PAYROLL                             */}
      {/* ---------------------------------------------------- */}
      {isBatchPayrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold uppercase text-base text-black flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Batch Payroll Generator
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchPayrollModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 font-mono">
              Auto-generate draft payroll records for all <strong className="text-black">{payrollStats.activeStaffCount} active staff members</strong> using their configured compensation rates.
            </p>

            <div className="space-y-3 text-xs font-sans">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Pay Frequency Mode</label>
                <select
                  value={batchPeriodType}
                  onChange={e => setBatchPeriodType(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 focus:border-black rounded-xl font-medium focus:outline-none bg-white"
                >
                  <option value="semi_monthly_1">Semi-Monthly: 1st Cut-off (1st - 15th)</option>
                  <option value="semi_monthly_2">Semi-Monthly: 2nd Cut-off (16th - End)</option>
                  <option value="monthly">Full Month (1st - End)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Start Date</label>
                  <input
                    type="date"
                    value={batchPayPeriodStart}
                    onChange={e => setBatchPayPeriodStart(e.target.value)}
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">End Date</label>
                  <input
                    type="date"
                    value={batchPayPeriodEnd}
                    onChange={e => setBatchPayPeriodEnd(e.target.value)}
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">Disbursement Pay Date</label>
                <input
                  type="date"
                  value={batchPayDate}
                  onChange={e => setBatchPayDate(e.target.value)}
                  className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBatchPayrollModalOpen(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 font-bold uppercase text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateBatchPayroll}
                className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs shadow-xs"
              >
                Generate {payrollStats.activeStaffCount} Vouchers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: STAFF ACCOUNT & LOGIN ACCESS MANAGEMENT       */}
      {/* ---------------------------------------------------- */}
      {isAccountModalOpen && selectedStaffForAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border-2 border-black shadow-2xl max-w-xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-black text-white rounded-xl">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold uppercase text-base text-black font-mono">
                      Staff Portal Account Access
                    </h3>
                    <p className="text-[11px] text-gray-500 font-sans">
                      Admin-controlled authentication credentials &amp; status
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAccountModalOpen(false);
                  setSelectedStaffForAccount(null);
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Linked Staff Member Profile Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-gray-400">Linked Staff Profile</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-gray-200 font-bold text-gray-700">
                  {selectedStaffForAccount.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-black text-sm">{selectedStaffForAccount.fullName}</div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    {selectedStaffForAccount.position} • {selectedStaffForAccount.department}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-gray-200/70 text-gray-800 font-bold">
                    HR: {selectedStaffForAccount.status}
                  </span>
                  {findStaffAccount(selectedStaffForAccount.id) ? (
                    <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border ${
                      findStaffAccount(selectedStaffForAccount.id)?.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      Account: {findStaffAccount(selectedStaffForAccount.id)?.status}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-500 border border-gray-200">
                      Account: Not Set Up
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications / Alerts */}
            {accountSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{accountSuccessMsg}</span>
              </div>
            )}
            {accountErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-medium">{accountErrorMsg}</span>
              </div>
            )}
            {accountCopiedNotice && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-medium">Credentials and instructions copied to clipboard! You can now send this securely to the employee.</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveAccountSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                    Login Username / ID *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 font-mono text-xs font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={accountFormData.username}
                      onChange={e => setAccountFormData({ ...accountFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      placeholder="e.g. maria.santos"
                      className="w-full pl-7 pr-3 py-2 border border-gray-200 focus:border-black rounded-xl font-mono font-bold text-black focus:outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 font-mono">Used for staff portal and kiosk login.</p>
                </div>

                {/* Login Email */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                    Staff Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={accountFormData.email}
                    onChange={e => setAccountFormData({ ...accountFormData, email: e.target.value })}
                    placeholder="e.g. maria@arhprint.com"
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono text-xs focus:outline-none"
                  />
                  <p className="text-[9px] text-gray-400 font-mono">For login &amp; automated notifications.</p>
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                    Portal Role Permission
                  </label>
                  <select
                    value={accountFormData.role}
                    onChange={e => setAccountFormData({ ...accountFormData, role: e.target.value as any })}
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono font-bold text-xs focus:outline-none bg-white"
                  >
                    <option value="Staff">Staff (Jobs, Attendance, Payslips)</option>
                    <option value="Admin">Admin (Full System Privileges)</option>
                  </select>
                </div>

                {/* Account Status */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-mono font-bold text-gray-600">
                    Account Status
                  </label>
                  <select
                    value={accountFormData.status}
                    onChange={e => setAccountFormData({ ...accountFormData, status: e.target.value as StaffAccountStatus })}
                    className="w-full p-2 border border-gray-200 focus:border-black rounded-xl font-mono font-bold text-xs focus:outline-none bg-white"
                  >
                    <option value="Active">Active (Permits Portal Login)</option>
                    <option value="Suspended">Suspended (Blocks Portal Login)</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Temporary Password & Security Card */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-[10px] uppercase font-mono font-bold text-black flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-gray-600" />
                    <span>Temporary Password / Passcode *</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNewTempPass}
                    className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
                  >
                    <Key className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showAccountPassword ? 'text' : 'password'}
                      required
                      value={accountFormData.temporaryPassword}
                      onChange={e => setAccountFormData({ ...accountFormData, temporaryPassword: e.target.value })}
                      placeholder="Enter temporary password..."
                      className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-300 focus:border-black rounded-xl font-mono font-bold text-xs text-black focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAccountPassword(!showAccountPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-black cursor-pointer"
                    >
                      {showAccountPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyAccountCredentials}
                    className="px-3 py-2.5 bg-gray-100 hover:bg-black hover:text-white text-gray-800 rounded-xl font-mono text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 border border-gray-300"
                    title="Copy full login credentials for this employee"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy Info</span>
                  </button>
                </div>

                {/* First login reset checkbox */}
                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={accountFormData.requirePasswordChange}
                    onChange={e => setAccountFormData({ ...accountFormData, requirePasswordChange: e.target.checked })}
                    className="w-4 h-4 text-black rounded border-gray-300 focus:ring-black"
                  />
                  <span className="font-medium text-[11px]">
                    Require staff member to set a new permanent password on first login
                  </span>
                </label>
              </div>

              {/* Security Advisory Note */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[10px] text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-700" />
                  <span>Separation of Profile &amp; Login Credentials</span>
                </div>
                <p className="text-amber-800">
                  Staff profile details (employment, payroll, and work history) remain preserved even if an account is suspended or removed. Plain-text passwords are never shown in public sheets or employee profile cards.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  {findStaffAccount(selectedStaffForAccount.id) && (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleAccountStatus}
                        className={`px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase cursor-pointer border transition-colors ${
                          accountFormData.status === 'Active'
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {accountFormData.status === 'Active' ? 'Suspend Account' : 'Reactivate Account'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetAccountPassword}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-[10px] font-mono font-bold uppercase cursor-pointer border border-gray-200"
                        title="Issue fresh temporary password"
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeAccount}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-[10px] font-mono font-bold uppercase cursor-pointer"
                        title="Revoke and delete login account credentials"
                      >
                        Revoke Access
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountModalOpen(false);
                      setSelectedStaffForAccount(null);
                    }}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-100 font-bold uppercase text-xs cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold uppercase text-xs shadow-xs cursor-pointer"
                  >
                    {findStaffAccount(selectedStaffForAccount.id) ? 'Save Account Changes' : 'Create Staff Account'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
