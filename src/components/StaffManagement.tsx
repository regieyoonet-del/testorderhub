/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import {
  StaffMember,
  PayrollRecord,
  PayrollDeductionItem,
  SalaryType,
  EmploymentStatus,
  StaffStatus,
  PayrollStatus,
  SystemSettings
} from '../types';
import {
  generateStaffId,
  generatePayrollId
} from '../data/initialFinance';
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
  Check
} from 'lucide-react';

interface StaffManagementProps {
  staff: StaffMember[];
  payroll: PayrollRecord[];
  onSaveStaff: (staff: StaffMember) => void;
  onSaveStaffBatch?: (staffList: StaffMember[]) => void;
  onDeleteStaff?: (staffId: string) => void;
  onSavePayroll: (record: PayrollRecord) => void;
  onSavePayrollBatch?: (records: PayrollRecord[]) => void;
  onDeletePayroll?: (payrollId: string) => void;
  systemSettings: SystemSettings;
  currencySymbol?: string;
}

export default function StaffManagement({
  staff = [],
  payroll = [],
  onSaveStaff,
  onSaveStaffBatch,
  onDeleteStaff,
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
  // PAYROLL CRUD HANDLERS
  // ----------------------------------------------------
  const handleOpenNewPayroll = (preSelectedStaff?: StaffMember) => {
    setEditingPayroll(null);
    const targetStaff = preSelectedStaff || staff.find(s => s.status === 'Active') || staff[0];

    const basicPay = targetStaff ? (targetStaff.salaryType === 'Monthly' ? (targetStaff.basicSalary / 2) : targetStaff.basicSalary) : 0;
    const allowances = targetStaff ? (targetStaff.allowances / 2) : 0;
    const otherEarnings = targetStaff ? (targetStaff.otherCompensation / 2) : 0;
    const gross = basicPay + allowances + otherEarnings;

    const initialDeductions: PayrollDeductionItem[] = [
      { id: 'ded-1', name: 'SSS Contribution', amount: 0 },
      { id: 'ded-2', name: 'PhilHealth Contribution', amount: 0 },
      { id: 'ded-3', name: 'Pag-IBIG Fund', amount: 0 },
      { id: 'ded-4', name: 'Withholding Tax', amount: 0 }
    ];

    setPayrollFormData({
      staffId: targetStaff ? targetStaff.id : '',
      staffName: targetStaff ? targetStaff.fullName : '',
      position: targetStaff ? targetStaff.position : '',
      department: targetStaff ? targetStaff.department : '',
      payPeriodStart: new Date().toISOString().slice(0, 8) + '01',
      payPeriodEnd: new Date().toISOString().slice(0, 8) + '15',
      payDate: new Date().toISOString().slice(0, 8) + '15',
      basicPay,
      allowances,
      otherEarnings,
      grossPay: gross,
      deductions: 0,
      itemizedDeductions: initialDeductions,
      totalDeductions: 0,
      netPay: gross,
      status: 'Draft',
      notes: ''
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

    const basicPay = targetStaff.salaryType === 'Monthly' ? (targetStaff.basicSalary / 2) : targetStaff.basicSalary;
    const allowances = targetStaff.allowances / 2;
    const otherEarnings = targetStaff.otherCompensation / 2;
    const gross = basicPay + allowances + otherEarnings;
    const currentTotDed = (payrollFormData.itemizedDeductions || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

    setPayrollFormData(prev => ({
      ...prev,
      staffId: targetStaff.id,
      staffName: targetStaff.fullName,
      position: targetStaff.position,
      department: targetStaff.department,
      basicPay,
      allowances,
      otherEarnings,
      grossPay: gross,
      totalDeductions: currentTotDed,
      netPay: gross - currentTotDed
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
      const basic = (emp.basicSalary || 0) / divider;
      const allow = (emp.allowances || 0) / divider;
      const other = (emp.otherCompensation || 0) / divider;
      const gross = basic + allow + other;

      // Estimated standard deduction presets (customizable later per record)
      const dedList: PayrollDeductionItem[] = [
        { id: `ded-sss-${emp.id}`, name: 'SSS Contribution', amount: Math.round(basic * 0.045) },
        { id: `ded-ph-${emp.id}`, name: 'PhilHealth', amount: Math.round(basic * 0.02) },
        { id: `ded-pagibig-${emp.id}`, name: 'Pag-IBIG', amount: 100 }
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
        basicPay: basic,
        allowances: allow,
        otherEarnings: other,
        grossPay: gross,
        deductions: totDed,
        itemizedDeductions: dedList,
        totalDeductions: totDed,
        netPay: gross - totDed,
        status: 'Draft',
        notes: `Generated from ${batchPeriodType.replace(/_/g, ' ').toUpperCase()} batch run`,
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

    printLine('Basic Salary Pay', record.basicPay, colLeftX, earnY);
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
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 font-mono text-xs">
                        No employees found matching the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(member => (
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
                          <button
                            type="button"
                            onClick={() => handleToggleStaffStatus(member)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase cursor-pointer border transition-colors ${
                              member.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200'
                            }`}
                            title="Click to toggle status"
                          >
                            {member.status === 'Active' ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {member.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
                              title="Edit Employee"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteStaff && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to remove ${member.fullName} (${member.id})?`)) {
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
                    ))
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
                <h4 className="text-[10px] uppercase font-mono font-bold text-gray-700 flex items-center justify-between">
                  <span>Gross Earnings Breakdown</span>
                  <span className="font-extrabold text-black font-mono text-xs">
                    Gross: {currencySymbol} {payrollFormData.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-mono text-gray-500">Basic Pay</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={payrollFormData.basicPay}
                      onChange={e => handleEarningsChange('basicPay', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
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
    </div>
  );
}
