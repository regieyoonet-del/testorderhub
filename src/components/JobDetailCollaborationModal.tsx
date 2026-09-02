/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Job,
  JobStatus,
  CompanyProfile,
  Order,
  AuthUser,
  JobColumn,
  JobItemColumn
} from '../types';
import {
  X,
  MessageSquare,
  FileText,
  Clock,
  Layers,
  ExternalLink,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Tag,
  User
} from 'lucide-react';
import JobCommentsSection from './JobCommentsSection';

interface JobDetailCollaborationModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  companies: CompanyProfile[];
  orders: Order[];
  onSaveJob: (job: Job, immediate?: boolean) => void;
  onUpdateJobStatus?: (jobId: string, status: JobStatus) => void;
  onSelectOrder?: (order: Order) => void;
  currencySymbol?: string;
  currentUser?: AuthUser;
  appsScriptUrl?: string;
}

export default function JobDetailCollaborationModal({
  job,
  isOpen,
  onClose,
  companies,
  orders,
  onSaveJob,
  onUpdateJobStatus,
  onSelectOrder,
  currencySymbol = '₱',
  currentUser,
  appsScriptUrl
}: JobDetailCollaborationModalProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'items' | 'specs' | 'activity'>('comments');

  if (!isOpen || !job) return null;

  const linkedOrder = (job.orderId || job.orderNumber)
    ? orders.find(o => o.id === job.orderId || (job.orderNumber && o.orderNumber === job.orderNumber))
    : undefined;

  const totalQuantity = (job.items || []).reduce((acc, item) => {
    let itemTotal = 0;
    const sizes = ['col-sub-onesize', 'col-sub-xs', 'col-sub-s', 'col-sub-m', 'col-sub-l', 'col-sub-xl', 'col-sub-2xl', 'col-sub-3xl', 'col-sub-4xl'];
    for (const sz of sizes) {
      itemTotal += Number(item.values[sz] || 0);
    }
    return acc + (itemTotal > 0 ? itemTotal : Number(item.values['col-sub-total-qty'] || 0));
  }, 0);

  const totalAmount = (job.items || []).reduce((acc, item) => {
    let itemQty = 0;
    const sizes = ['col-sub-onesize', 'col-sub-xs', 'col-sub-s', 'col-sub-m', 'col-sub-l', 'col-sub-xl', 'col-sub-2xl', 'col-sub-3xl', 'col-sub-4xl'];
    for (const sz of sizes) {
      itemQty += Number(item.values[sz] || 0);
    }
    const unitPrice = Number(item.values['col-sub-amount-piece'] || 0);
    return acc + (itemQty * unitPrice);
  }, 0);

  const commentsCount = job.comments?.length || 0;
  const itemsCount = job.items?.length || 0;
  const activitiesCount = job.activities?.length || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
      id={`job-collaboration-modal-${job.id}`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-white border-2 border-black rounded-[28px] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="bg-neutral-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <span className="font-mono font-black text-sm bg-white text-black px-2.5 py-1 rounded-lg">
              {job.id}
            </span>
            <div>
              <h3 className="font-sans font-black text-base text-white flex items-center gap-2">
                {job.values['col-job-name'] || 'Untitled Job'}
                {job.source === 'Company Order' && (
                  <span className="font-mono text-[10px] font-bold text-blue-300 bg-blue-900/60 border border-blue-400/40 px-2 py-0.5 rounded">
                    Order {job.orderNumber || 'Linked'}
                  </span>
                )}
                {job.source === 'Manual' && (
                  <span className="font-mono text-[10px] font-bold text-gray-300 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
                    Manual Job
                  </span>
                )}
              </h3>
              <p className="font-mono text-xs text-gray-400 flex items-center gap-2">
                <span>{job.companyName || 'No Company'}</span>
                <span>•</span>
                <span>Type: {job.values['col-job-type'] || 'Screen Print'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status Selector */}
            <select
              value={job.status}
              onChange={e => {
                const newStatus = e.target.value as JobStatus;
                if (onUpdateJobStatus) {
                  onUpdateJobStatus(job.id, newStatus);
                } else {
                  onSaveJob({ ...job, status: newStatus, values: { ...job.values, 'col-status': newStatus }, updatedAt: new Date().toISOString() }, true);
                }
              }}
              className={`font-mono text-xs font-bold px-3 py-1.5 rounded-xl border cursor-pointer focus:outline-none ${
                job.status === 'Completed'
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : job.status === 'In Production'
                  ? 'bg-blue-500 text-white border-blue-600'
                  : job.status === 'Ready for Production'
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-gray-800 text-white border-gray-700'
              }`}
            >
              {['Pending', 'Ready for Production', 'In Production', 'Quality Check', 'Completed', 'Cancelled'].map(st => (
                <option key={st} value={st} className="bg-neutral-900 text-white">{st}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
              id="btn-close-job-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 py-2.5 bg-gray-50 border-b border-gray-200 font-mono text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
              activeTab === 'comments'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comments & Team Updates</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeTab === 'comments' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {commentsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
              activeTab === 'items'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Production Items ({itemsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
              activeTab === 'specs'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Job Specs & Order Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
              activeTab === 'activity'
                ? 'bg-black text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Activity Log ({activitiesCount})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: COMMENTS & TEAM COLLABORATION */}
          {activeTab === 'comments' && (
            <JobCommentsSection
              job={job}
              currentUser={currentUser}
              appsScriptUrl={appsScriptUrl}
              onSaveJob={onSaveJob}
            />
          )}

          {/* TAB 2: PRODUCTION ITEMS */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs font-bold text-gray-900 uppercase">
                  Production Garments & Breakdown
                </h4>
                <div className="font-mono text-xs bg-gray-100 px-3 py-1 rounded-xl">
                  Total: <strong className="text-black">{totalQuantity} pcs</strong> • Total Billing: <strong className="text-emerald-700">{currencySymbol} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {(job.items && job.items.length > 0) ? (
                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-100 font-mono text-[10px] text-gray-600 uppercase border-b border-gray-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Design Name</th>
                        <th className="py-2.5 px-3">Brand</th>
                        <th className="py-2.5 px-3">Garment</th>
                        <th className="py-2.5 px-3">SKU / Colour</th>
                        <th className="py-2.5 px-3 text-center">Total Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {job.items.map((it, idx) => {
                        let itQty = 0;
                        const sizes = ['col-sub-onesize', 'col-sub-xs', 'col-sub-s', 'col-sub-m', 'col-sub-l', 'col-sub-xl', 'col-sub-2xl', 'col-sub-3xl', 'col-sub-4xl'];
                        for (const sz of sizes) {
                          itQty += Number(it.values[sz] || 0);
                        }
                        const finalQty = itQty > 0 ? itQty : Number(it.values['col-sub-total-qty'] || 0);
                        const unitPrice = Number(it.values['col-sub-amount-piece'] || 0);
                        const itAmt = finalQty * unitPrice;

                        return (
                          <tr key={it.id || idx} className="hover:bg-gray-50 font-mono text-xs">
                            <td className="py-2.5 px-3 text-gray-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-gray-900">{it.values['col-sub-design'] || '-'}</td>
                            <td className="py-2.5 px-3 text-gray-700">{it.values['col-sub-brand'] || '-'}</td>
                            <td className="py-2.5 px-3 text-gray-700">{it.values['col-sub-garment'] || '-'}</td>
                            <td className="py-2.5 px-3 text-gray-500">
                              {it.values['col-sub-sku'] ? `${it.values['col-sub-sku']} / ` : ''}{it.values['col-sub-colour'] || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-extrabold text-black">{finalQty}</td>
                            <td className="py-2.5 px-3 text-right text-gray-700">
                              {currencySymbol} {unitPrice.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                              {currencySymbol} {itAmt.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="font-mono text-xs text-gray-400 text-center py-8">No production sub-items added yet.</p>
              )}
            </div>
          )}

          {/* TAB 3: SPECS & ORDER INFO */}
          {activeTab === 'specs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <h5 className="font-bold text-gray-900 uppercase text-[11px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-600" />
                  Job Information
                </h5>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Job ID:</span>
                    <strong className="text-black">{job.id}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Job Name:</span>
                    <strong className="text-black">{job.values['col-job-name'] || '-'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Company:</span>
                    <strong className="text-black">{job.companyName || '-'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Job Type:</span>
                    <strong className="text-black">{job.values['col-job-type'] || 'Screen Print'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Priority:</span>
                    <strong className="text-black">{job.values['col-priority'] || 'Normal'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200">
                    <span className="text-gray-500">Designer:</span>
                    <strong className="text-black">{job.values['col-designer'] || 'Unassigned'}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Target Due Date:</span>
                    <strong className="text-black">{job.values['col-due-date'] || 'Not set'}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                <h5 className="font-bold text-gray-900 uppercase text-[11px] flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                  Artwork & Linked Order
                </h5>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-500 text-[10px] block mb-1">Artwork URL / Drive Link:</span>
                    {job.values['col-artwork-link'] ? (
                      <a
                        href={job.values['col-artwork-link'].startsWith('http') ? job.values['col-artwork-link'] : `https://${job.values['col-artwork-link']}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-black text-white px-3 py-1.5 rounded-xl font-bold text-[11px] hover:bg-neutral-800 transition-colors"
                      >
                        <span>Open Artwork Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-gray-400 italic">No artwork link specified.</p>
                    )}
                  </div>

                  {linkedOrder && (
                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <span className="text-gray-500 text-[10px] block">Linked Order:</span>
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200">
                        <div>
                          <strong className="text-black font-bold block">{linkedOrder.orderNumber}</strong>
                          <span className="text-gray-500 text-[10px]">{linkedOrder.companyName} • {linkedOrder.contactPerson}</span>
                        </div>
                        {onSelectOrder && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectOrder(linkedOrder);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            View Order
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITY LOG */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              {(job.activities && job.activities.length > 0) ? (
                <div className="space-y-2 font-mono text-xs">
                  {job.activities.map((act, idx) => (
                    <div key={act.id || idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start space-x-3">
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                          <span className="font-bold text-gray-800">{act.user}</span>
                          <span>{new Date(act.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-900 font-medium">{act.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-xs text-gray-400 text-center py-8">No logged activity yet.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
