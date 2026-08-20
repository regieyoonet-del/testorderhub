/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Job,
  JobColumn,
  JobItem,
  JobItemColumn,
  JobStatus,
  CompanyProfile,
  Order,
  JobActivity,
  JobFieldType
} from '../types';
import {
  DEFAULT_JOB_COLUMNS,
  DEFAULT_JOB_ITEM_COLUMNS,
  SIZE_COLUMN_IDS,
  calculateSubItemTotalQty,
  calculateSubItemTotalAmount,
  calculateJobTotals,
  generateJobId
} from '../data/initialJobs';
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  Settings,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Trash2,
  Copy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Building2,
  Layers,
  X,
  Edit3,
  MoreHorizontal,
  ChevronUp,
  History,
  Link as LinkIcon,
  Check,
  Eye,
  EyeOff,
  Move
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JobManagementBoardProps {
  jobs: Job[];
  jobColumns?: JobColumn[];
  jobItemColumns?: JobItemColumn[];
  companies: CompanyProfile[];
  orders: Order[];
  onSaveJob: (job: Job) => void;
  onUpdateJobStatus: (jobId: string, status: JobStatus) => void;
  onDeleteJob: (jobId: string) => void;
  onSaveJobsBatch?: (jobs: Job[]) => void;
  onSaveJobColumns?: (columns: JobColumn[]) => void;
  onSaveJobItemColumns?: (columns: JobItemColumn[]) => void;
  onSelectOrder?: (order: Order) => void;
  currencySymbol?: string;
  highlightJobId?: string;
}

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string; border: string; badgeBg: string; textColor: string }> = {
  'Pending': {
    label: 'Pending',
    color: 'bg-neutral-500',
    bg: 'bg-neutral-50/50',
    border: 'border-neutral-200',
    badgeBg: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    textColor: 'text-neutral-700'
  },
  'Approved': {
    label: 'Approved',
    color: 'bg-purple-600',
    bg: 'bg-purple-50/30',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
    textColor: 'text-purple-700'
  },
  'In Production': {
    label: 'In Production',
    color: 'bg-amber-500',
    bg: 'bg-amber-50/30',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    textColor: 'text-amber-700'
  },
  'Shipped': {
    label: 'Shipped',
    color: 'bg-blue-500',
    bg: 'bg-blue-50/30',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
    textColor: 'text-blue-700'
  },
  'Completed': {
    label: 'Completed',
    color: 'bg-emerald-600',
    bg: 'bg-emerald-50/30',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    textColor: 'text-emerald-700'
  },
  'Canceled': {
    label: 'Canceled',
    color: 'bg-rose-500',
    bg: 'bg-rose-50/30',
    border: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
    textColor: 'text-rose-700'
  }
};

const ALL_STATUSES: JobStatus[] = [
  'Pending',
  'Approved',
  'In Production',
  'Shipped',
  'Completed',
  'Canceled'
];

export default function JobManagementBoard({
  jobs,
  jobColumns = DEFAULT_JOB_COLUMNS,
  jobItemColumns = DEFAULT_JOB_ITEM_COLUMNS,
  companies,
  orders,
  onSaveJob,
  onUpdateJobStatus,
  onDeleteJob,
  onSaveJobsBatch,
  onSaveJobColumns,
  onSaveJobItemColumns,
  onSelectOrder,
  currencySymbol = 'Php',
  highlightJobId
}: JobManagementBoardProps) {
  // ----------------------------------------------------
  // Local UI State
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'position' | 'inHand_asc' | 'inHand_desc' | 'name' | 'company' | 'date_added' | 'priority'>('position');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterJobType, setFilterJobType] = useState<string>('all');
  const [filterDesigner, setFilterDesigner] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);

  // Group collapsed states (Default: Pending, Approved, In Production expanded; Shipped, Completed, Canceled collapsed)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<JobStatus, boolean>>({
    'Pending': false,
    'Approved': false,
    'In Production': false,
    'Shipped': true,
    'Completed': true,
    'Canceled': true
  });

  // Expanded Jobs for Sub-items inspection
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (highlightJobId) s.add(highlightJobId);
    return s;
  });

  // Active tab inside expanded job ('items' | 'details' | 'activity')
  const [jobDetailTab, setJobDetailTab] = useState<Record<string, 'items' | 'details' | 'activity'>>({});

  // Drag and drop state for Jobs
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<JobStatus | null>(null);

  // Dynamic Columns State
  const [currentColumns, setCurrentColumns] = useState<JobColumn[]>(jobColumns);
  const [currentItemColumns, setCurrentItemColumns] = useState<JobItemColumn[]>(jobItemColumns);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [editingCustomCompanyJobId, setEditingCustomCompanyJobId] = useState<string | null>(null);

  // Synchronize when props update
  React.useEffect(() => {
    if (jobColumns && jobColumns.length > 0) {
      setCurrentColumns(jobColumns);
    }
  }, [jobColumns]);

  React.useEffect(() => {
    if (jobItemColumns && jobItemColumns.length > 0) {
      setCurrentItemColumns(jobItemColumns);
    }
  }, [jobItemColumns]);

  // When highlightJobId changes, expand that job and uncollapse its status group
  React.useEffect(() => {
    if (highlightJobId) {
      setExpandedJobIds(prev => new Set(prev).add(highlightJobId));
      const targetJob = jobs.find(j => j.id === highlightJobId);
      if (targetJob) {
        setCollapsedGroups(prev => ({ ...prev, [targetJob.status]: false }));
      }
    }
  }, [highlightJobId, jobs]);

  // ----------------------------------------------------
  // Overdue Check Helper
  // ----------------------------------------------------
  const isJobOverdue = (job: Job): boolean => {
    if (job.status === 'Completed' || job.status === 'Canceled') return false;
    const inHand = job.values['col-in-hand-date'];
    if (!inHand) return false;
    const inHandDate = new Date(inHand);
    if (isNaN(inHandDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inHandDate < today;
  };

  // ----------------------------------------------------
  // Filter & Search Logic
  // ----------------------------------------------------
  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return jobs.filter(job => {
      // 1. Search Query
      if (q) {
        const matchesId = job.id.toLowerCase().includes(q);
        const matchesCompany = (job.companyName || '').toLowerCase().includes(q) || (job.values['col-company'] || '').toLowerCase().includes(q);
        const matchesName = (job.values['col-job-name'] || '').toLowerCase().includes(q);
        const matchesOrderNo = (job.orderNumber || '').toLowerCase().includes(q);
        const matchesJobType = (job.values['col-job-type'] || '').toLowerCase().includes(q);
        const matchesDesigner = (job.values['col-designer'] || '').toLowerCase().includes(q);
        const matchesNotes = (job.values['col-notes'] || '').toLowerCase().includes(q);
        const matchesSubitems = (job.items || []).some(it =>
          Object.values(it.values || {}).some(val => String(val).toLowerCase().includes(q))
        );

        if (!matchesId && !matchesCompany && !matchesName && !matchesOrderNo && !matchesJobType && !matchesDesigner && !matchesNotes && !matchesSubitems) {
          return false;
        }
      }

      // 2. Status Filter
      if (filterStatus !== 'all' && job.status !== filterStatus) {
        return false;
      }

      // 3. Company Filter
      if (filterCompany !== 'all') {
        const cName = job.companyName || job.values['col-company'];
        if ((cName || '').toLowerCase() !== filterCompany.toLowerCase()) return false;
      }

      // 4. Job Type Filter
      if (filterJobType !== 'all') {
        const jType = job.values['col-job-type'];
        if ((jType || '').toLowerCase() !== filterJobType.toLowerCase()) return false;
      }

      // 5. Designer Filter
      if (filterDesigner !== 'all') {
        const designer = job.values['col-designer'];
        if ((designer || '').toLowerCase() !== filterDesigner.toLowerCase()) return false;
      }

      // 6. Priority Filter
      if (filterPriority !== 'all') {
        const prio = job.values['col-priority'];
        if ((prio || '').toLowerCase() !== filterPriority.toLowerCase()) return false;
      }

      // 7. Overdue Only Filter
      if (filterOverdueOnly && !isJobOverdue(job)) {
        return false;
      }

      return true;
    });
  }, [jobs, searchQuery, filterStatus, filterCompany, filterJobType, filterDesigner, filterPriority, filterOverdueOnly]);

  // Sort grouped jobs
  const sortedJobsByGroup = useMemo(() => {
    const grouped: Record<JobStatus, Job[]> = {
      'Pending': [],
      'Approved': [],
      'In Production': [],
      'Shipped': [],
      'Completed': [],
      'Canceled': []
    };

    filteredJobs.forEach(job => {
      if (grouped[job.status]) {
        grouped[job.status].push(job);
      } else {
        grouped['Pending'].push(job);
      }
    });

    // Apply sorting to each group
    Object.keys(grouped).forEach(st => {
      const status = st as JobStatus;
      grouped[status].sort((a, b) => {
        if (sortBy === 'inHand_asc') {
          const dA = new Date(a.values['col-in-hand-date'] || '9999-12-31').getTime();
          const dB = new Date(b.values['col-in-hand-date'] || '9999-12-31').getTime();
          return dA - dB;
        }
        if (sortBy === 'inHand_desc') {
          const dA = new Date(a.values['col-in-hand-date'] || '1970-01-01').getTime();
          const dB = new Date(b.values['col-in-hand-date'] || '1970-01-01').getTime();
          return dB - dA;
        }
        if (sortBy === 'name') {
          return String(a.values['col-job-name'] || '').localeCompare(String(b.values['col-job-name'] || ''));
        }
        if (sortBy === 'company') {
          return String(a.companyName || a.values['col-company'] || '').localeCompare(String(b.companyName || b.values['col-company'] || ''));
        }
        if (sortBy === 'date_added') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'priority') {
          const prioWeight: Record<string, number> = { 'Urgent': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
          return (prioWeight[b.values['col-priority']] || 0) - (prioWeight[a.values['col-priority']] || 0);
        }
        // Default: position
        return (a.position || 0) - (b.position || 0);
      });
    });

    return grouped;
  }, [filteredJobs, sortBy]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filterCompany !== 'all') c++;
    if (filterJobType !== 'all') c++;
    if (filterDesigner !== 'all') c++;
    if (filterPriority !== 'all') c++;
    if (filterStatus !== 'all') c++;
    if (filterOverdueOnly) c++;
    return c;
  }, [filterCompany, filterJobType, filterDesigner, filterPriority, filterStatus, filterOverdueOnly]);

  // ----------------------------------------------------
  // Handlers for Job & Sub-item Actions
  // ----------------------------------------------------
  const toggleGroup = (status: JobStatus) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const handleCellChange = (job: Job, columnId: string, value: any) => {
    const oldVal = job.values[columnId];
    if (oldVal === value) return;

    const updatedValues = { ...job.values, [columnId]: value };
    const now = new Date().toISOString();

    const activity: JobActivity = {
      id: `act-${Date.now()}`,
      jobId: job.id,
      user: 'Admin',
      action: `Edited ${currentColumns.find(c => c.id === columnId)?.name || columnId}`,
      oldValue: String(oldVal || ''),
      newValue: String(value || ''),
      timestamp: now
    };

    let newStatus = job.status;
    if (columnId === 'col-status' && ALL_STATUSES.includes(value)) {
      newStatus = value as JobStatus;
    }

    const updatedJob: Job = {
      ...job,
      status: newStatus,
      values: updatedValues,
      activities: [activity, ...(job.activities || [])],
      updatedAt: now
    };

    onSaveJob(updatedJob);

    if (columnId === 'col-status' && newStatus !== job.status) {
      onUpdateJobStatus(job.id, newStatus);
    }
  };

  // Drag and Drop handlers between status groups
  const handleDragStart = (e: React.DragEvent, jobId: string) => {
    e.dataTransfer.setData('text/plain', jobId);
    setDraggedJobId(jobId);
  };

  const handleDragOver = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: JobStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    const jobId = e.dataTransfer.getData('text/plain') || draggedJobId;
    setDraggedJobId(null);

    if (!jobId) return;
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob || targetJob.status === targetStatus) return;

    const now = new Date().toISOString();
    const activity: JobActivity = {
      id: `act-${Date.now()}`,
      jobId: targetJob.id,
      user: 'Admin',
      action: 'Status changed via drag & drop',
      oldValue: targetJob.status,
      newValue: targetStatus,
      timestamp: now
    };

    const updatedJob: Job = {
      ...targetJob,
      status: targetStatus,
      values: { ...targetJob.values, 'col-status': targetStatus },
      activities: [activity, ...(targetJob.activities || [])],
      updatedAt: now
    };

    onSaveJob(updatedJob);
    onUpdateJobStatus(targetJob.id, targetStatus);
  };

  // Sub-item Cell Change
  const handleSubItemCellChange = (job: Job, itemId: string, columnId: string, value: any) => {
    const updatedItems = (job.items || []).map(item => {
      if (item.id !== itemId) return item;

      const newVals = { ...item.values, [columnId]: value };

      // Auto-calculate Total Qty and Total Amount if size/numeric columns changed
      const calculatedQty = calculateSubItemTotalQty(newVals, currentItemColumns);
      newVals['col-sub-total-qty'] = calculatedQty;
      const unitPrice = Number(newVals['col-sub-amount-piece']) || 0;
      newVals['col-sub-total-amount'] = calculatedQty * unitPrice;

      return {
        ...item,
        values: newVals,
        updatedAt: new Date().toISOString()
      };
    });

    const updatedJob: Job = {
      ...job,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };

    onSaveJob(updatedJob);
  };

  // Add Sub-item to Job
  const handleAddSubItem = (job: Job) => {
    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const position = (job.items || []).length;

    const defaultValues: Record<string, any> = {
      'col-sub-design': `${job.values['col-job-name'] || 'New Print Item'} - Line ${position + 1}`,
      'col-sub-brand': '',
      'col-sub-garment': '',
      'col-sub-sku': '',
      'col-sub-colour': '',
      'col-sub-onesize': 0,
      'col-sub-xs': 0,
      'col-sub-s': 0,
      'col-sub-m': 0,
      'col-sub-l': 0,
      'col-sub-xl': 0,
      'col-sub-2xl': 0,
      'col-sub-3xl': 0,
      'col-sub-4xl': 0,
      'col-sub-total-qty': 0,
      'col-sub-amount-piece': 0.00,
      'col-sub-total-amount': 0.00
    };

    const newItem: JobItem = {
      id: newItemId,
      jobId: job.id,
      position,
      values: defaultValues,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedJob: Job = {
      ...job,
      items: [...(job.items || []), newItem],
      activities: [
        {
          id: `act-${Date.now()}`,
          jobId: job.id,
          user: 'Admin',
          action: 'Added sub-item',
          newValue: String(defaultValues['col-sub-design']),
          timestamp: new Date().toISOString()
        },
        ...(job.activities || [])
      ],
      updatedAt: new Date().toISOString()
    };

    onSaveJob(updatedJob);
  };

  // Duplicate Sub-item
  const handleDuplicateSubItem = (job: Job, itemToDup: JobItem) => {
    const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const position = (job.items || []).length;

    const duplicatedItem: JobItem = {
      ...itemToDup,
      id: newItemId,
      position,
      values: {
        ...itemToDup.values,
        'col-sub-design': `${itemToDup.values['col-sub-design'] || 'Item'} (Copy)`
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedJob: Job = {
      ...job,
      items: [...(job.items || []), duplicatedItem],
      activities: [
        {
          id: `act-${Date.now()}`,
          jobId: job.id,
          user: 'Admin',
          action: 'Duplicated sub-item',
          newValue: String(duplicatedItem.values['col-sub-design']),
          timestamp: new Date().toISOString()
        },
        ...(job.activities || [])
      ],
      updatedAt: new Date().toISOString()
    };

    onSaveJob(updatedJob);
  };

  // Delete Sub-item
  const handleDeleteSubItem = (job: Job, itemId: string) => {
    const updatedItems = (job.items || []).filter(it => it.id !== itemId);
    const updatedJob: Job = {
      ...job,
      items: updatedItems,
      activities: [
        {
          id: `act-${Date.now()}`,
          jobId: job.id,
          user: 'Admin',
          action: 'Deleted sub-item',
          timestamp: new Date().toISOString()
        },
        ...(job.activities || [])
      ],
      updatedAt: new Date().toISOString()
    };

    onSaveJob(updatedJob);
  };

  // ----------------------------------------------------
  // Manual Job Creation Form State
  // ----------------------------------------------------
  const [newJobForm, setNewJobForm] = useState({
    jobName: '',
    company: companies[0]?.name || '',
    isCustomCompany: false,
    customCompanyName: '',
    jobType: 'Screen Print',
    status: 'Pending' as JobStatus,
    inHandDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    artworkLink: '',
    designer: 'Regie',
    priority: 'Normal',
    notes: ''
  });

  const handleCreateManualJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const jobId = generateJobId(jobs);
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const resolvedCompany = newJobForm.isCustomCompany
      ? (newJobForm.customCompanyName.trim() || 'Custom Client')
      : (newJobForm.company || 'Direct Client');

    const matchedCo = companies.find(c => c.name.toLowerCase() === resolvedCompany.toLowerCase());

    const values: Record<string, any> = {
      'col-job-name': newJobForm.jobName.trim() || `Job for ${resolvedCompany}`,
      'col-company': resolvedCompany,
      'col-job-type': newJobForm.jobType,
      'col-status': newJobForm.status,
      'col-date-added': today,
      'col-in-hand-date': newJobForm.inHandDate,
      'col-artwork-link': newJobForm.artworkLink.trim(),
      'col-designer': newJobForm.designer,
      'col-priority': newJobForm.priority,
      'col-notes': newJobForm.notes.trim()
    };

    const initialItem: JobItem = {
      id: `item-${Date.now()}-1`,
      jobId,
      position: 0,
      values: {
        'col-sub-design': `${newJobForm.jobName || 'Custom Print'} - Item 1`,
        'col-sub-brand': '',
        'col-sub-garment': newJobForm.jobType,
        'col-sub-sku': '',
        'col-sub-colour': '',
        'col-sub-onesize': 0,
        'col-sub-xs': 0,
        'col-sub-s': 0,
        'col-sub-m': 0,
        'col-sub-l': 0,
        'col-sub-xl': 0,
        'col-sub-2xl': 0,
        'col-sub-3xl': 0,
        'col-sub-4xl': 0,
        'col-sub-total-qty': 0,
        'col-sub-amount-piece': 0.00,
        'col-sub-total-amount': 0.00
      },
      createdAt: now,
      updatedAt: now
    };

    const newJob: Job = {
      id: jobId,
      companyId: matchedCo?.id,
      companyName: resolvedCompany,
      source: 'Manual',
      status: newJobForm.status,
      position: 0,
      values,
      items: [initialItem],
      activities: [
        {
          id: `act-${Date.now()}`,
          jobId,
          user: 'Admin',
          action: 'Created manual production job',
          newValue: `${jobId} (${newJobForm.status})`,
          timestamp: now
        }
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: 'Admin'
    };

    onSaveJob(newJob);
    setIsAddJobModalOpen(false);
    // Expand the newly created job
    setExpandedJobIds(prev => new Set(prev).add(jobId));
    setCollapsedGroups(prev => ({ ...prev, [newJob.status]: false }));

    // Reset form
    setNewJobForm({
      jobName: '',
      company: companies[0]?.name || '',
      isCustomCompany: false,
      customCompanyName: '',
      jobType: 'Screen Print',
      status: 'Pending',
      inHandDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      artworkLink: '',
      designer: 'Regie',
      priority: 'Normal',
      notes: ''
    });
  };

  // ----------------------------------------------------
  // Custom Column Management Handlers
  // ----------------------------------------------------
  const [newColForm, setNewColForm] = useState<{ target: 'job' | 'subitem'; name: string; type: JobFieldType; optionsStr: string }>({
    target: 'job',
    name: '',
    type: 'text',
    optionsStr: ''
  });

  const handleAddCustomColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColForm.name.trim()) return;

    const colId = `col-custom-${Date.now()}`;
    const options = newColForm.optionsStr
      ? newColForm.optionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    if (newColForm.target === 'job') {
      const newCol: JobColumn = {
        id: colId,
        name: newColForm.name.trim(),
        type: newColForm.type,
        position: currentColumns.length,
        required: false,
        isSystemField: false,
        isHidden: false,
        options,
        createdDate: new Date().toISOString()
      };
      const updated = [...currentColumns, newCol];
      setCurrentColumns(updated);
      if (onSaveJobColumns) onSaveJobColumns(updated);
    } else {
      const newCol: JobItemColumn = {
        id: colId,
        name: newColForm.name.trim(),
        type: newColForm.type,
        position: currentItemColumns.length,
        required: false,
        isSystemField: false,
        isHidden: false,
        options
      };
      const updated = [...currentItemColumns, newCol];
      setCurrentItemColumns(updated);
      if (onSaveJobItemColumns) onSaveJobItemColumns(updated);
    }

    setNewColForm({ target: 'job', name: '', type: 'text', optionsStr: '' });
  };

  const handleToggleHideColumn = (colId: string, target: 'job' | 'subitem') => {
    if (target === 'job') {
      const updated = currentColumns.map(c => c.id === colId ? { ...c, isHidden: !c.isHidden } : c);
      setCurrentColumns(updated);
      if (onSaveJobColumns) onSaveJobColumns(updated);
    } else {
      const updated = currentItemColumns.map(c => c.id === colId ? { ...c, isHidden: !c.isHidden } : c);
      setCurrentItemColumns(updated);
      if (onSaveJobItemColumns) onSaveJobItemColumns(updated);
    }
  };

  const handleDeleteCustomColumn = (colId: string, target: 'job' | 'subitem') => {
    if (target === 'job') {
      const updated = currentColumns.filter(c => c.id !== colId || c.isSystemField);
      setCurrentColumns(updated);
      if (onSaveJobColumns) onSaveJobColumns(updated);
    } else {
      const updated = currentItemColumns.filter(c => c.id !== colId || c.isSystemField);
      setCurrentItemColumns(updated);
      if (onSaveJobItemColumns) onSaveJobItemColumns(updated);
    }
  };

  // Visible Columns
  const visibleJobColumns = useMemo(() => {
    return currentColumns.filter(c => !c.isHidden);
  }, [currentColumns]);

  const visibleItemColumns = useMemo(() => {
    return currentItemColumns.filter(c => !c.isHidden);
  }, [currentItemColumns]);

  return (
    <div className="w-full space-y-6 font-sans" id="job-management-root">
      {/* -------------------------------------------------------------------------------- */}
      {/* TOP CONTROLS & ACTION BAR */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Section Title & Global Search */}
        <div className="flex flex-wrap items-center gap-4 flex-1 min-w-[280px]">
          <div className="flex items-center space-x-2.5">
            <div className="bg-black text-white p-2.5 rounded-2xl flex items-center justify-center font-mono font-bold text-xs shadow-xs">
              JOBS
            </div>
            <div>
              <h2 className="text-base font-extrabold uppercase text-black leading-tight tracking-tight">
                Production Board
              </h2>
              <p className="text-[10px] text-gray-500 font-mono">
                {jobs.length} Total Jobs · {jobs.filter(j => j.status === 'In Production').length} In Production
              </p>
            </div>
          </div>

          {/* Global Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Job ID, name, company, order #, sub-items..."
              className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-black rounded-2xl pl-10 pr-9 py-2.5 text-xs focus:outline-none transition-all font-medium text-black placeholder:text-gray-400"
              id="job-global-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Controls (+ Add Job, Filter, Sort, Board Settings) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen(prev => !prev);
                setIsSortOpen(false);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                activeFiltersCount > 0
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-black'
              }`}
              id="job-filter-btn"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 bg-white text-black px-1.5 py-0.2 rounded-full text-[9px] font-extrabold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Filter Dropdown Panel */}
            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-72 bg-white border-2 border-black rounded-3xl p-4 shadow-xl z-30 space-y-3"
                  id="job-filter-panel"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <span className="text-xs font-extrabold uppercase text-black">Filter Jobs</span>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterCompany('all');
                          setFilterJobType('all');
                          setFilterDesigner('all');
                          setFilterPriority('all');
                          setFilterStatus('all');
                          setFilterOverdueOnly(false);
                        }}
                        className="text-[10px] font-mono text-red-600 hover:underline cursor-pointer"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Status */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-gray-500">Status</label>
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:border-black font-semibold text-black"
                    >
                      <option value="all">All Statuses</option>
                      {ALL_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Company */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-gray-500">Company</label>
                    <select
                      value={filterCompany}
                      onChange={e => setFilterCompany(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:border-black font-semibold text-black"
                    >
                      <option value="all">All Companies</option>
                      {Array.from(new Set([...companies.map(c => c.name), ...jobs.map(j => j.companyName || j.values['col-company']).filter(Boolean)])).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Job Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-gray-500">Job Type</label>
                    <select
                      value={filterJobType}
                      onChange={e => setFilterJobType(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:border-black font-semibold text-black"
                    >
                      <option value="all">All Job Types</option>
                      {['Screen Print', 'DTF', 'Sticker', 'Digital Print', 'Embroidery', 'Sublimation', 'Promotional Product', 'Other'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-gray-500">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={e => setFilterPriority(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:border-black font-semibold text-black"
                    >
                      <option value="all">All Priorities</option>
                      {['Urgent', 'High', 'Normal', 'Low'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Overdue Only Toggle */}
                  <label className="flex items-center space-x-2 pt-2 border-t border-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterOverdueOnly}
                      onChange={e => setFilterOverdueOnly(e.target.checked)}
                      className="rounded text-black focus:ring-black h-4 w-4"
                    />
                    <span className="text-xs font-mono font-bold text-rose-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Show Overdue Jobs Only
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sort Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSortOpen(prev => !prev);
                setIsFilterOpen(false);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl border border-gray-200 hover:border-black bg-white text-gray-700 text-xs font-mono font-bold transition-all cursor-pointer"
              id="job-sort-btn"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort</span>
            </button>

            {/* Sort Dropdown */}
            <AnimatePresence>
              {isSortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-56 bg-white border-2 border-black rounded-3xl p-3 shadow-xl z-30 space-y-1 font-mono text-xs"
                >
                  <div className="text-[10px] font-extrabold uppercase text-gray-400 px-2 py-1">Sort Options</div>
                  {[
                    { id: 'position', label: 'Default Board Position' },
                    { id: 'inHand_asc', label: 'In-Hand: Earliest First' },
                    { id: 'inHand_desc', label: 'In-Hand: Latest First' },
                    { id: 'priority', label: 'Priority: Highest First' },
                    { id: 'name', label: 'Job Name (A-Z)' },
                    { id: 'company', label: 'Company (A-Z)' },
                    { id: 'date_added', label: 'Date Added (Newest)' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.id as any);
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        sortBy === opt.id ? 'bg-black text-white font-bold' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Board Settings Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-2xl border border-gray-200 hover:border-black bg-white text-gray-700 text-xs font-mono font-bold transition-all cursor-pointer"
            id="job-board-settings-btn"
            title="Configure columns and board settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Board Settings</span>
          </button>

          {/* + Add Job Button */}
          <button
            type="button"
            onClick={() => setIsAddJobModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-black hover:bg-neutral-800 text-white font-sans text-xs uppercase tracking-wider font-extrabold shadow-sm transition-all active:scale-98 cursor-pointer"
            id="btn-add-job"
          >
            <Plus className="w-4 h-4" />
            <span>Add Job</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* COLLAPSIBLE STATUS GROUPS (MONDAY / AIRTABLE STYLE) */}
      {/* -------------------------------------------------------------------------------- */}
      <div className="space-y-6" id="job-status-groups-container">
        {ALL_STATUSES.map(status => {
          const groupJobs = sortedJobsByGroup[status] || [];
          const isCollapsed = collapsedGroups[status];
          const config = STATUS_CONFIG[status];
          const isDragTarget = dragOverStatus === status;

          return (
            <div
              key={status}
              onDragOver={e => handleDragOver(e, status)}
              onDrop={e => handleDrop(e, status)}
              className={`bg-white border-2 rounded-3xl transition-all overflow-hidden ${
                isDragTarget ? 'border-black ring-4 ring-black/10' : config.border
              }`}
              id={`status-group-${status.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {/* Group Header Bar */}
              <div
                onClick={() => toggleGroup(status)}
                className={`px-5 py-3.5 flex items-center justify-between cursor-pointer select-none border-b transition-colors ${
                  config.bg
                } ${config.border}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-gray-600 hover:text-black transition-transform">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`w-3 h-3 rounded-full ${config.color}`} />
                  <span className="font-sans text-xs font-black uppercase tracking-wider text-black">
                    {status}
                  </span>
                  <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs">
                    {groupJobs.length}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-[10px] font-mono text-gray-400">
                  <span>{isCollapsed ? 'Click to expand' : 'Drag jobs here to change status'}</span>
                </div>
              </div>

              {/* Group Table Content */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  {groupJobs.length === 0 ? (
                    <div className="p-8 text-center font-mono text-xs text-gray-400 bg-gray-50/50">
                      No jobs currently in <strong className="text-black font-extrabold">{status}</strong>. Drag jobs here or create a new job.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs min-w-[900px]">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] uppercase font-mono tracking-wider font-extrabold text-gray-500">
                          <th className="py-2.5 pl-4 pr-2 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 w-10 text-center"></th>
                          <th className="py-2.5 px-3 min-w-[180px] font-black text-black">Job ID & Name</th>
                          <th className="py-2.5 px-3 min-w-[140px]">Company</th>
                          <th className="py-2.5 px-3 min-w-[110px]">Job Type</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Status</th>
                          <th className="py-2.5 px-3 min-w-[100px]">In-Hand Date</th>
                          <th className="py-2.5 px-3 min-w-[90px]">Priority</th>
                          <th className="py-2.5 px-3 min-w-[90px]">Designer</th>
                          <th className="py-2.5 px-3 min-w-[90px]">Artwork</th>
                          <th className="py-2.5 px-3 min-w-[60px] text-right">Items</th>
                          <th className="py-2.5 px-3 min-w-[90px] text-right">Total Amount</th>
                          <th className="py-2.5 pr-4 pl-2 w-12 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-sans">
                        {groupJobs.map((job, idx) => {
                          const isExpanded = expandedJobIds.has(job.id);
                          const overdue = isJobOverdue(job);
                          const totals = calculateJobTotals(job.items || [], currentItemColumns);
                          const currentDetailTab = jobDetailTab[job.id] || 'items';

                          return (
                            <React.Fragment key={job.id}>
                              {/* Main Job Row */}
                              <tr
                                draggable
                                onDragStart={e => handleDragStart(e, job.id)}
                                className={`hover:bg-gray-50/80 transition-colors group cursor-pointer ${
                                  highlightJobId === job.id ? 'bg-amber-50/60 ring-2 ring-amber-400' : ''
                                } ${isExpanded ? 'bg-gray-50/40' : ''}`}
                                id={`job-row-${job.id}`}
                              >
                                {/* Drag Handle & Expand Chevron */}
                                <td className="py-3 pl-4 pr-1 text-center font-mono text-[10px] text-gray-400">
                                  <div className="flex items-center justify-center space-x-1">
                                    <Move className="w-3 h-3 text-gray-300 group-hover:text-gray-600 cursor-grab shrink-0" />
                                    <span>{idx + 1}</span>
                                  </div>
                                </td>

                                <td className="py-3 px-1 text-center">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      toggleJobExpanded(job.id);
                                    }}
                                    className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-200 transition-colors cursor-pointer"
                                    title={isExpanded ? 'Collapse Job Items' : 'Expand Job Items'}
                                    id={`btn-expand-job-${job.id}`}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-black" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>

                                {/* Job ID & Name (Inline Editable) */}
                                <td className="py-3 px-3">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono font-extrabold text-[10px] bg-black text-white px-2 py-0.5 rounded-md">
                                        {job.id}
                                      </span>
                                      {job.source === 'Company Order' && (
                                        <span
                                          onClick={e => {
                                            e.stopPropagation();
                                            if (job.orderId && onSelectOrder) {
                                              const ord = orders.find(o => o.id === job.orderId);
                                              if (ord) onSelectOrder(ord);
                                            }
                                          }}
                                          className="font-mono text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded hover:underline cursor-pointer"
                                          title="View linked company order"
                                        >
                                          {job.orderNumber || 'Order'}
                                        </span>
                                      )}
                                      {job.source === 'Manual' && (
                                        <span className="font-mono text-[9px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-1.5 py-0.2 rounded">
                                          Manual
                                        </span>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      value={job.values['col-job-name'] || ''}
                                      onChange={e => handleCellChange(job, 'col-job-name', e.target.value)}
                                      className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-black rounded-lg px-1.5 py-0.5 font-bold text-xs text-black focus:outline-none transition-colors"
                                      placeholder="Job Name..."
                                    />
                                  </div>
                                </td>

                                {/* Company (Dropdown Inline with custom option) */}
                                <td className="py-3 px-3">
                                  {editingCustomCompanyJobId === job.id ? (
                                    <input
                                      type="text"
                                      autoFocus
                                      defaultValue={job.companyName || job.values['col-company'] || ''}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          const customVal = (e.target as HTMLInputElement).value.trim();
                                          if (customVal) {
                                            const matchedCo = companies.find(c => c.name.toLowerCase() === customVal.toLowerCase());
                                            onSaveJob({
                                              ...job,
                                              companyId: matchedCo?.id || job.companyId,
                                              companyName: customVal,
                                              values: { ...job.values, 'col-company': customVal },
                                              updatedAt: new Date().toISOString()
                                            });
                                          }
                                          setEditingCustomCompanyJobId(null);
                                        } else if (e.key === 'Escape') {
                                          setEditingCustomCompanyJobId(null);
                                        }
                                      }}
                                      onBlur={e => {
                                        const customVal = e.target.value.trim();
                                        if (customVal) {
                                          const matchedCo = companies.find(c => c.name.toLowerCase() === customVal.toLowerCase());
                                          onSaveJob({
                                            ...job,
                                            companyId: matchedCo?.id || job.companyId,
                                            companyName: customVal,
                                            values: { ...job.values, 'col-company': customVal },
                                            updatedAt: new Date().toISOString()
                                          });
                                        }
                                        setEditingCustomCompanyJobId(null);
                                      }}
                                      className="w-full bg-white border border-black rounded-lg px-2 py-1 font-semibold text-xs text-black focus:outline-none shadow-xs"
                                      placeholder="Type company name..."
                                      id={`input-custom-co-${job.id}`}
                                    />
                                  ) : (
                                    <select
                                      value={job.companyName || job.values['col-company'] || ''}
                                      onChange={e => {
                                        const selName = e.target.value;
                                        if (selName === '__custom__') {
                                          setEditingCustomCompanyJobId(job.id);
                                          return;
                                        }
                                        const foundCo = companies.find(c => c.name === selName);
                                        const updatedVals = { ...job.values, 'col-company': selName };
                                        onSaveJob({
                                          ...job,
                                          companyId: foundCo?.id || job.companyId,
                                          companyName: selName,
                                          values: updatedVals,
                                          updatedAt: new Date().toISOString()
                                        });
                                      }}
                                      className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-black rounded-lg px-1.5 py-1 font-semibold text-xs text-gray-900 focus:outline-none transition-colors cursor-pointer"
                                    >
                                      {companies.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                      ))}
                                      {job.values['col-company'] && !companies.some(c => c.name === job.values['col-company']) && (
                                        <option value={job.values['col-company']}>{job.values['col-company']} (Custom)</option>
                                      )}
                                      <option value="__custom__">+ Enter Custom Company...</option>
                                    </select>
                                  )}
                                </td>

                                {/* Job Type (Dropdown Inline) */}
                                <td className="py-3 px-3">
                                  <select
                                    value={job.values['col-job-type'] || 'Screen Print'}
                                    onChange={e => handleCellChange(job, 'col-job-type', e.target.value)}
                                    className="bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-black rounded-lg px-1.5 py-1 font-mono text-[11px] text-gray-700 focus:outline-none transition-colors cursor-pointer"
                                  >
                                    {['Screen Print', 'DTF', 'Sticker', 'Digital Print', 'Embroidery', 'Sublimation', 'Promotional Product', 'Other'].map(t => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </td>

                                {/* Status (Pill Dropdown) */}
                                <td className="py-3 px-3">
                                  <select
                                    value={job.status}
                                    onChange={e => handleCellChange(job, 'col-status', e.target.value)}
                                    className={`font-mono text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all shadow-2xs ${
                                      STATUS_CONFIG[job.status]?.badgeBg || 'bg-gray-100 text-black border-gray-300'
                                    }`}
                                  >
                                    {ALL_STATUSES.map(st => (
                                      <option key={st} value={st}>{st}</option>
                                    ))}
                                  </select>
                                </td>

                                {/* In-Hand Date (Date Picker with Overdue indicator) */}
                                <td className="py-3 px-3">
                                  <div className="flex items-center space-x-1.5">
                                    <input
                                      type="date"
                                      value={job.values['col-in-hand-date'] || ''}
                                      onChange={e => handleCellChange(job, 'col-in-hand-date', e.target.value)}
                                      className={`font-mono text-[11px] bg-transparent hover:bg-white focus:bg-white border rounded-lg px-1.5 py-0.5 focus:outline-none transition-colors ${
                                        overdue
                                          ? 'border-rose-300 bg-rose-50 text-rose-800 font-extrabold'
                                          : 'border-transparent hover:border-gray-200 text-gray-700'
                                      }`}
                                    />
                                    {overdue && (
                                      <span
                                        className="shrink-0 text-rose-600"
                                        title="Overdue In-Hand Date!"
                                      >
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Priority (Pill) */}
                                <td className="py-3 px-3">
                                  <select
                                    value={job.values['col-priority'] || 'Normal'}
                                    onChange={e => handleCellChange(job, 'col-priority', e.target.value)}
                                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer focus:outline-none ${
                                      job.values['col-priority'] === 'Urgent'
                                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                                        : job.values['col-priority'] === 'High'
                                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                                        : job.values['col-priority'] === 'Low'
                                        ? 'bg-gray-50 border-gray-200 text-gray-600'
                                        : 'bg-blue-50 border-blue-200 text-blue-700'
                                    }`}
                                  >
                                    {['Urgent', 'High', 'Normal', 'Low'].map(p => (
                                      <option key={p} value={p}>{p}</option>
                                    ))}
                                  </select>
                                </td>

                                {/* Designer */}
                                <td className="py-3 px-3">
                                  <input
                                    type="text"
                                    value={job.values['col-designer'] || ''}
                                    onChange={e => handleCellChange(job, 'col-designer', e.target.value)}
                                    placeholder="Designer..."
                                    className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-black rounded-lg px-1.5 py-0.5 font-mono text-[11px] text-gray-800 focus:outline-none"
                                  />
                                </td>

                                {/* Artwork Link */}
                                <td className="py-3 px-3">
                                  {job.values['col-artwork-link'] ? (
                                    <a
                                      href={
                                        job.values['col-artwork-link'].startsWith('http')
                                          ? job.values['col-artwork-link']
                                          : `https://${job.values['col-artwork-link']}`
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 bg-neutral-900 hover:bg-black text-white px-2 py-1 rounded text-[10px] font-mono font-bold transition-all shadow-2xs"
                                    >
                                      <span>Artwork</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="Paste URL..."
                                      value=""
                                      onChange={e => handleCellChange(job, 'col-artwork-link', e.target.value)}
                                      className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-black rounded-lg px-1 py-0.5 font-mono text-[10px] text-gray-400 placeholder:text-gray-300 focus:outline-none"
                                    />
                                  )}
                                </td>

                                {/* Items Count */}
                                <td className="py-3 px-3 text-right font-mono text-xs font-bold text-gray-700">
                                  {totals.itemCount} ({totals.totalQuantity} pcs)
                                </td>

                                {/* Total Amount */}
                                <td className="py-3 px-3 text-right font-mono text-xs font-black text-black">
                                  {currencySymbol} {totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>

                                {/* Actions */}
                                <td className="py-3 pr-4 pl-2 text-center">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setJobToDelete(job);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete Job"
                                    id={`btn-delete-job-${job.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Row Content (Job Details, Sub-Items Monday Table, Activity Log) */}
                              {isExpanded && (
                                <tr className="bg-gray-50/70 border-b-2 border-gray-200">
                                  <td colSpan={13} className="p-4 md:p-6 space-y-4">
                                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
                                      {/* Sub-Header Tabs for Expanded Job */}
                                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                                        <div className="flex items-center space-x-2 font-mono text-xs">
                                          <button
                                            type="button"
                                            onClick={() => setJobDetailTab(prev => ({ ...prev, [job.id]: 'items' }))}
                                            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                              currentDetailTab === 'items'
                                                ? 'bg-black text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                          >
                                            Production Items ({job.items?.length || 0})
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setJobDetailTab(prev => ({ ...prev, [job.id]: 'details' }))}
                                            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                              currentDetailTab === 'details'
                                                ? 'bg-black text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                          >
                                            Job Details & Specs
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setJobDetailTab(prev => ({ ...prev, [job.id]: 'activity' }))}
                                            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                                              currentDetailTab === 'activity'
                                                ? 'bg-black text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                          >
                                            Activity Log ({job.activities?.length || 0})
                                          </button>
                                        </div>

                                        {/* Quick Totals Banner */}
                                        <div className="flex items-center space-x-4 font-mono text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                                          <div>
                                            <span className="text-gray-400 text-[10px] uppercase block leading-none">Total Qty</span>
                                            <strong className="text-black font-extrabold">{totals.totalQuantity} units</strong>
                                          </div>
                                          <div className="border-l border-gray-200 pl-3">
                                            <span className="text-gray-400 text-[10px] uppercase block leading-none">Total Billing</span>
                                            <strong className="text-emerald-700 font-extrabold">
                                              {currencySymbol} {totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>

                                      {/* TAB 1: SUB-ITEMS NESTED MONDAY TABLE */}
                                      {currentDetailTab === 'items' && (
                                        <div className="space-y-3">
                                          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
                                            <table className="w-full text-left border-collapse text-[11px] min-w-[1000px]">
                                              <thead>
                                                <tr className="bg-neutral-100 border-b border-gray-200 font-mono text-[9px] uppercase font-bold text-gray-600">
                                                  <th className="py-2 pl-3 pr-2 w-8 text-center">#</th>
                                                  <th className="py-2 px-2 min-w-[150px]">Design Name</th>
                                                  <th className="py-2 px-2 min-w-[100px]">Brand</th>
                                                  <th className="py-2 px-2 min-w-[120px]">Garment / Type</th>
                                                  <th className="py-2 px-2 min-w-[80px]">SKU</th>
                                                  <th className="py-2 px-2 min-w-[90px]">Colour</th>
                                                  {/* Size columns: One Size MUST appear BEFORE XS */}
                                                  <th className="py-2 px-1 text-center w-12 bg-amber-50/50">One Size</th>
                                                  <th className="py-2 px-1 text-center w-10">XS</th>
                                                  <th className="py-2 px-1 text-center w-10">S</th>
                                                  <th className="py-2 px-1 text-center w-10">M</th>
                                                  <th className="py-2 px-1 text-center w-10">L</th>
                                                  <th className="py-2 px-1 text-center w-10">XL</th>
                                                  <th className="py-2 px-1 text-center w-10">2XL</th>
                                                  <th className="py-2 px-1 text-center w-10">3XL</th>
                                                  <th className="py-2 px-1 text-center w-10">4XL</th>
                                                  <th className="py-2 px-2 text-center w-14 font-extrabold bg-gray-200/60 text-black">Total Qty</th>
                                                  <th className="py-2 px-2 min-w-[80px] text-right">Price/pc</th>
                                                  <th className="py-2 px-2 min-w-[90px] text-right font-extrabold bg-emerald-50/60 text-emerald-900">Total Amt</th>
                                                  <th className="py-2 pr-3 pl-2 w-14 text-center">Actions</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-gray-100 bg-white">
                                                {(job.items || []).map((item, subIdx) => {
                                                  const subQty = calculateSubItemTotalQty(item.values, currentItemColumns);
                                                  const subAmt = calculateSubItemTotalAmount(item.values, currentItemColumns);

                                                  return (
                                                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                                                      <td className="py-2 pl-3 pr-1 text-center font-mono text-[10px] text-gray-400">
                                                        {subIdx + 1}
                                                      </td>

                                                      {/* Design Name */}
                                                      <td className="py-1 px-1">
                                                        <input
                                                          type="text"
                                                          value={item.values['col-sub-design'] || ''}
                                                          onChange={e => handleSubItemCellChange(job, item.id, 'col-sub-design', e.target.value)}
                                                          className="w-full bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-black rounded px-1.5 py-1 font-bold text-black focus:outline-none"
                                                          placeholder="Design..."
                                                        />
                                                      </td>

                                                      {/* Brand */}
                                                      <td className="py-1 px-1">
                                                        <input
                                                          type="text"
                                                          value={item.values['col-sub-brand'] || ''}
                                                          onChange={e => handleSubItemCellChange(job, item.id, 'col-sub-brand', e.target.value)}
                                                          className="w-full bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-black rounded px-1.5 py-1 text-gray-700 focus:outline-none"
                                                          placeholder="Brand..."
                                                        />
                                                      </td>

                                                      {/* Garment / Type */}
                                                      <td className="py-1 px-1">
                                                        <input
                                                          type="text"
                                                          value={item.values['col-sub-garment'] || ''}
                                                          onChange={e => handleSubItemCellChange(job, item.id, 'col-sub-garment', e.target.value)}
                                                          className="w-full bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-black rounded px-1.5 py-1 text-gray-700 focus:outline-none"
                                                          placeholder="Garment..."
                                                        />
                                                      </td>

                                                      {/* SKU */}
                                                      <td className="py-1 px-1">
                                                        <input
                                                          type="text"
                                                          value={item.values['col-sub-sku'] || ''}
                                                          onChange={e => handleSubItemCellChange(job, item.id, 'col-sub-sku', e.target.value)}
                                                          className="w-full bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-black rounded px-1.5 py-1 font-mono text-[10px] text-gray-500 focus:outline-none"
                                                          placeholder="SKU..."
                                                        />
                                                      </td>

                                                      {/* Colour */}
                                                      <td className="py-1 px-1">
                                                        <input
                                                          type="text"
                                                          value={item.values['col-sub-colour'] || ''}
                                                          onChange={e => handleSubItemCellChange(job, item.id, 'col-sub-colour', e.target.value)}
                                                          className="w-full bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-black rounded px-1.5 py-1 text-gray-700 focus:outline-none"
                                                          placeholder="Colour..."
                                                        />
                                                      </td>

                                                      {/* ONE SIZE */}
                                                      <td className="py-1 px-0.5 bg-amber-50/30">
                                                        <input
                                                          type="number"
                                                          min="0"
                                                          value={item.values['col-sub-onesize'] ?? ''}
                                                          onChange={e => handleSubItemCellChange(job, item.id, 'col-sub-onesize', Number(e.target.value) || 0)}
                                                          className="w-full text-center bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-black rounded py-1 font-mono font-bold text-gray-800 focus:outline-none"
                                                          placeholder="-"
                                                        />
                                                      </td>

                                                      {/* XS through 4XL */}
                                                      {['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'].map(sz => (
                                                        <td key={sz} className="py-1 px-0.5">
                                                          <input
                                                            type="number"
                                                            min="0"
                                                            value={item.values[`col-sub-${sz}`] ?? ''}
                                                            onChange={e => handleSubItemCellChange(job, item.id, `col-sub-${sz}`, Number(e.target.value) || 0)}
                                                            className="w-full text-center bg-transparent hover:bg-white focus:bg-white border border-transparent focus:border-black rounded py-1 font-mono text-gray-700 focus:outline-none"
                                                            placeholder="-"
                                                          />
                                                        </td>
                                                      ))}

                                                      {/* Total Qty (Auto-calculated) */}
                                                      <td className="py-2 px-2 text-center font-mono font-extrabold bg-gray-100/60 text-black">
                                                        {subQty}
                                                      </td>

                                                      {/* Price / pc */}
                                                      <td className="py-1 px-1">
                                                        <input
                                                          type="number"
                                                          step="0.01"
                                                          min="0"
                                                          value={item.values['col-sub-amount-piece'] ?? ''}
                                                          onChange={e => handleSubItemCellChange(job, item.id, 'col-sub-amount-piece', Number(e.target.value) || 0)}
                                                          className="w-full text-right bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-black rounded px-1.5 py-1 font-mono text-gray-800 focus:outline-none"
                                                          placeholder="0.00"
                                                        />
                                                      </td>

                                                      {/* Total Amount (Auto-calculated) */}
                                                      <td className="py-2 px-2 text-right font-mono font-extrabold bg-emerald-50/40 text-emerald-900">
                                                        {currencySymbol} {subAmt.toFixed(2)}
                                                      </td>

                                                      {/* Duplicate / Delete actions */}
                                                      <td className="py-1 pr-3 pl-1 text-center">
                                                        <div className="flex items-center justify-center space-x-1">
                                                          <button
                                                            type="button"
                                                            onClick={e => {
                                                              e.stopPropagation();
                                                              handleDuplicateSubItem(job, item);
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-black rounded hover:bg-gray-100 transition-colors cursor-pointer"
                                                            title="Duplicate Sub-item line"
                                                            id={`btn-dup-subitem-${item.id}`}
                                                          >
                                                            <Copy className="w-3 h-3" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={e => {
                                                              e.stopPropagation();
                                                              handleDeleteSubItem(job, item.id);
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                            title="Delete Sub-item line"
                                                            id={`btn-del-subitem-${item.id}`}
                                                          >
                                                            <Trash2 className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>

                                          <div className="flex justify-between items-center pt-1">
                                            <button
                                              type="button"
                                              onClick={() => handleAddSubItem(job)}
                                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-gray-300 hover:border-black bg-white hover:bg-gray-50 font-mono text-xs font-bold text-black transition-all cursor-pointer shadow-2xs"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                              <span>Add Sub-item Line</span>
                                            </button>

                                            <div className="text-[11px] font-mono text-gray-500">
                                              Total: <strong className="text-black font-extrabold">{totals.totalQuantity} items</strong> · <strong className="text-emerald-700 font-extrabold">{currencySymbol} {totals.totalAmount.toFixed(2)}</strong>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* TAB 2: JOB DETAILS & SPECS */}
                                      {currentDetailTab === 'details' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                          <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <h4 className="font-extrabold uppercase text-[10px] text-gray-500 font-mono">Job & Client Metadata</h4>
                                            <div className="space-y-1 font-mono text-xs">
                                              <div><span className="text-gray-400">Job ID:</span> <strong className="text-black">{job.id}</strong></div>
                                              <div><span className="text-gray-400">Company:</span> <strong className="text-black">{job.companyName}</strong></div>
                                              <div><span className="text-gray-400">Source:</span> <strong className="text-black">{job.source}</strong></div>
                                              <div><span className="text-gray-400">Status:</span> <strong className="text-black">{job.status}</strong></div>
                                              <div><span className="text-gray-400">Created:</span> <strong className="text-black">{new Date(job.createdAt).toLocaleString()}</strong></div>
                                              {job.orderId && (
                                                <div><span className="text-gray-400">Linked Order ID:</span> <strong className="text-blue-600">{job.orderNumber || job.orderId}</strong></div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                            <h4 className="font-extrabold uppercase text-[10px] text-gray-500 font-mono">Production Notes & Specifications</h4>
                                            <textarea
                                              value={job.values['col-notes'] || ''}
                                              onChange={e => handleCellChange(job, 'col-notes', e.target.value)}
                                              rows={4}
                                              className="w-full bg-white border border-gray-200 focus:border-black rounded-lg p-2 text-xs text-black font-sans focus:outline-none"
                                              placeholder="Add internal production notes, ink pantones, machine specs, special finishing requirements..."
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* TAB 3: ACTIVITY LOG */}
                                      {currentDetailTab === 'activity' && (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                          {(job.activities && job.activities.length > 0) ? (
                                            <div className="space-y-1.5 font-mono text-[11px]">
                                              {job.activities.map(act => (
                                                <div key={act.id} className="flex items-start space-x-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                  <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                                                      <span className="font-bold text-gray-700">{act.user}</span>
                                                      <span>{new Date(act.timestamp).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-black font-medium">{act.action}</p>
                                                    {(act.oldValue || act.newValue) && (
                                                      <p className="text-[10px] text-gray-500">
                                                        {act.oldValue ? `"${act.oldValue}" → ` : ''}"{act.newValue}"
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="font-mono text-xs text-gray-400 text-center py-4">No logged activity yet.</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* MODAL: MANUAL JOB CREATION */}
      {/* -------------------------------------------------------------------------------- */}
      <AnimatePresence>
        {isAddJobModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsAddJobModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white border-2 border-black rounded-3xl p-6 shadow-2xl z-10 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="bg-black text-white p-2 rounded-xl font-mono text-xs font-bold">
                    NEW
                  </div>
                  <div>
                    <h3 className="font-extrabold uppercase text-base text-black">Create Manual Production Job</h3>
                    <p className="font-mono text-[10px] text-gray-500">Internal job ticket for production tracking</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddJobModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateManualJobSubmit} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1 md:col-span-2">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Job Name *</label>
                    <input
                      type="text"
                      required
                      value={newJobForm.jobName}
                      onChange={e => setNewJobForm({ ...newJobForm, jobName: e.target.value })}
                      placeholder="e.g. Acme Q3 Staff Polos & Lanyards"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Company Account *</label>
                      <button
                        type="button"
                        onClick={() => setNewJobForm(prev => ({ ...prev, isCustomCompany: !prev.isCustomCompany }))}
                        className="font-mono text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
                      >
                        {newJobForm.isCustomCompany ? '← Existing Account' : '+ Custom Company'}
                      </button>
                    </div>

                    {newJobForm.isCustomCompany ? (
                      <div>
                        <input
                          type="text"
                          required
                          value={newJobForm.customCompanyName}
                          onChange={e => setNewJobForm({ ...newJobForm, customCompanyName: e.target.value })}
                          placeholder="e.g. Acme Corp (Unregistered)"
                          className="w-full bg-amber-50/60 border border-amber-300 focus:border-black rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none"
                          autoFocus
                          id="input-modal-custom-company"
                        />
                        <span className="text-[9px] font-mono text-gray-500 block mt-0.5">For clients without an existing portal account</span>
                      </div>
                    ) : (
                      <select
                        value={newJobForm.company}
                        onChange={e => {
                          if (e.target.value === '__custom__') {
                            setNewJobForm({ ...newJobForm, isCustomCompany: true, customCompanyName: '' });
                          } else {
                            setNewJobForm({ ...newJobForm, company: e.target.value, isCustomCompany: false });
                          }
                        }}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none cursor-pointer"
                        id="select-modal-company"
                      >
                        {companies.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value="__custom__">+ Enter Custom Company Name...</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Job Type *</label>
                    <select
                      value={newJobForm.jobType}
                      onChange={e => setNewJobForm({ ...newJobForm, jobType: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none"
                    >
                      {['Screen Print', 'DTF', 'Sticker', 'Digital Print', 'Embroidery', 'Sublimation', 'Promotional Product', 'Other'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Initial Status</label>
                    <select
                      value={newJobForm.status}
                      onChange={e => setNewJobForm({ ...newJobForm, status: e.target.value as any })}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none font-mono"
                    >
                      {ALL_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">In-Hand Target Date *</label>
                    <input
                      type="date"
                      required
                      value={newJobForm.inHandDate}
                      onChange={e => setNewJobForm({ ...newJobForm, inHandDate: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-mono focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Priority</label>
                    <select
                      value={newJobForm.priority}
                      onChange={e => setNewJobForm({ ...newJobForm, priority: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none"
                    >
                      {['Urgent', 'High', 'Normal', 'Low'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Designer / Operator</label>
                    <input
                      type="text"
                      value={newJobForm.designer}
                      onChange={e => setNewJobForm({ ...newJobForm, designer: e.target.value })}
                      placeholder="e.g. Regie"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Artwork Link / URL (Optional)</label>
                    <input
                      type="url"
                      value={newJobForm.artworkLink}
                      onChange={e => setNewJobForm({ ...newJobForm, artworkLink: e.target.value })}
                      placeholder="https://drive.google.com/..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-mono focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="block font-mono uppercase font-bold text-[10px] text-gray-600">Production Notes</label>
                    <textarea
                      value={newJobForm.notes}
                      onChange={e => setNewJobForm({ ...newJobForm, notes: e.target.value })}
                      rows={3}
                      placeholder="Special ink mix, pantones, placement notes..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl p-2.5 text-xs text-black font-sans focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsAddJobModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-mono font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-black hover:bg-neutral-800 text-white font-sans text-xs uppercase tracking-wider font-extrabold shadow-sm"
                  >
                    Create Job
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------------------------- */}
      {/* MODAL: BOARD SETTINGS & CUSTOM COLUMNS */}
      {/* -------------------------------------------------------------------------------- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsSettingsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white border-2 border-black rounded-3xl p-6 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto font-sans"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="bg-black text-white p-2 rounded-xl font-mono text-xs font-bold">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold uppercase text-base text-black">Board & Column Customization</h3>
                    <p className="font-mono text-[10px] text-gray-500">Configure main Job columns and Sub-item columns</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 text-gray-400 hover:text-black rounded-xl hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Add Custom Column Form */}
              <form onSubmit={handleAddCustomColumn} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <span className="font-mono text-xs font-extrabold uppercase text-black block">Add Custom Column</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase block font-bold">Target Table</label>
                    <select
                      value={newColForm.target}
                      onChange={e => setNewColForm({ ...newColForm, target: e.target.value as any })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs focus:border-black font-semibold"
                    >
                      <option value="job">Main Job Row</option>
                      <option value="subitem">Sub-item Row</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase block font-bold">Column Name</label>
                    <input
                      type="text"
                      required
                      value={newColForm.name}
                      onChange={e => setNewColForm({ ...newColForm, name: e.target.value })}
                      placeholder="e.g. Machine Number"
                      className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs focus:border-black font-semibold text-black"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase block font-bold">Field Type</label>
                    <select
                      value={newColForm.type}
                      onChange={e => setNewColForm({ ...newColForm, type: e.target.value as any })}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs focus:border-black font-semibold"
                    >
                      <option value="text">Text</option>
                      <option value="long_text">Long Text</option>
                      <option value="number">Number</option>
                      <option value="currency">Currency</option>
                      <option value="dropdown">Dropdown</option>
                      <option value="date">Date</option>
                      <option value="person">Person</option>
                      <option value="company">Company</option>
                      <option value="link">Link</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                </div>

                {newColForm.type === 'dropdown' && (
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 uppercase block font-bold">Dropdown Options (Comma-separated)</label>
                    <input
                      type="text"
                      value={newColForm.optionsStr}
                      onChange={e => setNewColForm({ ...newColForm, optionsStr: e.target.value })}
                      placeholder="Option 1, Option 2, Option 3"
                      className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs focus:border-black font-mono text-black"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-black text-white font-mono text-xs font-bold hover:bg-neutral-800 transition-colors"
                  >
                    + Add Column
                  </button>
                </div>
              </form>

              {/* Main Job Columns List */}
              <div className="space-y-2">
                <span className="font-mono text-xs font-extrabold uppercase text-black block">Main Job Columns ({currentColumns.length})</span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {currentColumns.map(col => (
                    <div key={col.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-black">{col.name}</span>
                        <span className="text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.2 rounded">
                          {col.type}
                        </span>
                        {col.isSystemField && (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                            System
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleHideColumn(col.id, 'job')}
                          className="p-1 text-gray-500 hover:text-black rounded"
                          title={col.isHidden ? 'Unhide Column' : 'Hide Column'}
                        >
                          {col.isHidden ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-black" />}
                        </button>
                        {!col.isSystemField && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomColumn(col.id, 'job')}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete Column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-item Columns List */}
              <div className="space-y-2">
                <span className="font-mono text-xs font-extrabold uppercase text-black block">Sub-item Columns ({currentItemColumns.length})</span>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {currentItemColumns.map(col => (
                    <div key={col.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-black">{col.name}</span>
                        <span className="text-[10px] text-gray-500 bg-white border border-gray-200 px-1.5 py-0.2 rounded">
                          {col.type}
                        </span>
                        {col.calculation && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            Auto-calc ({col.calculation})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleHideColumn(col.id, 'subitem')}
                          className="p-1 text-gray-500 hover:text-black rounded"
                          title={col.isHidden ? 'Unhide Column' : 'Hide Column'}
                        >
                          {col.isHidden ? <EyeOff className="w-3.5 h-3.5 text-gray-400" /> : <Eye className="w-3.5 h-3.5 text-black" />}
                        </button>
                        {!col.isSystemField && !SIZE_COLUMN_IDS.includes(col.id) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomColumn(col.id, 'subitem')}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Delete Column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-black text-white font-mono text-xs font-bold hover:bg-neutral-800"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------------------------- */}
      {/* MODAL: DELETE JOB CONFIRMATION */}
      {/* -------------------------------------------------------------------------------- */}
      <AnimatePresence>
        {jobToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border-2 border-black rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-5"
              id="modal-delete-job-confirm"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-sans text-lg font-black text-black">Delete Production Job?</h3>
                  <p className="font-mono text-xs text-gray-600">
                    Are you sure you want to delete <strong className="text-black font-extrabold">{jobToDelete.id}</strong>?
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Job Name:</span>
                  <span className="font-bold text-black text-right truncate max-w-[200px]">
                    {jobToDelete.values['col-job-name'] || 'Untitled Job'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Company:</span>
                  <span className="font-bold text-black">{jobToDelete.companyName || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-bold text-black">{jobToDelete.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sub-Items:</span>
                  <span className="font-bold text-black">{jobToDelete.items?.length || 0} line items</span>
                </div>
              </div>

              <p className="text-[11px] font-mono text-red-600 font-medium">
                Warning: This action is permanent and will remove this job and all associated sub-items from your production board.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setJobToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:border-black font-mono text-xs font-bold text-gray-700 hover:text-black transition-colors cursor-pointer"
                  id="btn-cancel-delete-job"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = jobToDelete.id;
                    setJobToDelete(null);
                    onDeleteJob(idToDelete);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold transition-all shadow-sm active:scale-98 cursor-pointer"
                  id="btn-confirm-delete-job"
                >
                  Delete Job
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
