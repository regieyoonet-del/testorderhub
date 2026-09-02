/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Job, JobComment, AuthUser, JobActivity } from '../types';
import {
  MessageSquare,
  Send,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Clock,
  User,
  Shield,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { sheetsService } from '../lib/sheetsService';

interface JobCommentsSectionProps {
  job: Job;
  currentUser?: AuthUser;
  appsScriptUrl?: string;
  onSaveJob: (job: Job, immediate?: boolean) => void;
  className?: string;
}

const QUICK_INSTRUCTION_TEMPLATES = [
  { label: 'Updated Artwork', text: '🎨 Please use the updated artwork attached to this job.' },
  { label: 'Logo 10% Smaller', text: '📏 Customer requested the logo to be 10% smaller.' },
  { label: 'Use 43s Mesh', text: '🕸️ Use 43s mesh for this screen print.' },
  { label: 'Waiting Approval', text: '⏳ Waiting for customer approval before production.' },
  { label: 'Proof Confirmed', text: '✅ Final mock proof approved by customer.' },
  { label: 'Special Polybag', text: '📦 Pack individually in polybags with size stickers.' },
  { label: 'Rush Order', text: '⚠️ Rush order: prioritize printing and QC today.' },
];

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) {
      const mins = Math.max(1, Math.floor(diffSec / 60));
      return `${mins}m ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function JobCommentsSection({
  job,
  currentUser,
  appsScriptUrl,
  onSaveJob,
  className = ''
}: JobCommentsSectionProps) {
  const [commentInput, setCommentInput] = useState('');
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const comments = job.comments || [];

  // Determine active author identity
  const currentAuthorName =
    currentUser?.name ||
    currentUser?.username ||
    (currentUser?.role === 'admin' ? 'Admin' : 'Staff');
  const currentRole = currentUser?.role || 'admin';
  const currentUserId =
    currentUser?.staffId ||
    currentUser?.accountId ||
    currentUser?.id ||
    currentUser?.role ||
    'usr-current';

  const handlePostComment = async (textToPost?: string) => {
    const text = (textToPost || commentInput).trim();
    if (!text || isPosting) return;

    setIsPosting(true);

    const nowIso = new Date().toISOString();
    const commentId = `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newComment: JobComment = {
      id: commentId,
      jobId: job.id,
      userId: currentUserId,
      userName: `${currentAuthorName} (${currentRole.toUpperCase()})`,
      comment: text,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const newActivity: JobActivity = {
      id: `act-${Date.now()}`,
      jobId: job.id,
      user: currentAuthorName,
      action: `Added comment: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
      timestamp: nowIso
    };

    const updatedJob: Job = {
      ...job,
      comments: [...comments, newComment],
      activities: [newActivity, ...(job.activities || [])],
      updatedAt: nowIso
    };

    // Save locally and sync job to Google Sheets
    onSaveJob(updatedJob, true);

    // Save directly to dedicated JobComments sheet in background
    if (appsScriptUrl) {
      sheetsService.saveJobComment(appsScriptUrl, newComment).catch(err => {
        console.warn('Save job comment direct sync notice:', err);
      });
    }

    setCommentInput('');
    setIsPosting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    const targetComment = comments.find(c => c.id === commentId);
    const updatedComments = comments.filter(c => c.id !== commentId);

    const nowIso = new Date().toISOString();
    const newActivity: JobActivity = {
      id: `act-${Date.now()}`,
      jobId: job.id,
      user: currentAuthorName,
      action: `Deleted a comment`,
      timestamp: nowIso
    };

    const updatedJob: Job = {
      ...job,
      comments: updatedComments,
      activities: [newActivity, ...(job.activities || [])],
      updatedAt: nowIso
    };

    onSaveJob(updatedJob, true);

    if (appsScriptUrl) {
      sheetsService.deleteJobComment(appsScriptUrl, commentId).catch(err => {
        console.warn('Delete job comment direct sync notice:', err);
      });
    }
  };

  const handleCopyComment = (comment: JobComment) => {
    navigator.clipboard.writeText(comment.comment).then(() => {
      setCopiedCommentId(comment.id);
      setTimeout(() => setCopiedCommentId(null), 2000);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  };

  const handleQuickTemplateClick = (templateText: string) => {
    setCommentInput(prev => (prev ? `${prev}\n${templateText}` : templateText));
  };

  return (
    <div className={`space-y-4 ${className}`} id={`job-comments-section-${job.id}`}>
      {/* Header & Description */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-mono text-xs font-bold text-gray-900 flex items-center gap-1.5">
              Team Collaboration & Instructions
              <span className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {comments.length}
              </span>
            </h4>
            <p className="text-[11px] text-gray-500">
              Internal communication for production specs, artwork adjustments, and team notes.
            </p>
          </div>
        </div>

        <div className="font-mono text-[10px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
          Job ID: <strong className="text-black">{job.id}</strong>
        </div>
      </div>

      {/* Quick Instruction Templates */}
      <div className="space-y-1.5">
        <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-gray-500">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Quick Instruction Presets (Click to insert):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_INSTRUCTION_TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickTemplateClick(tmpl.text)}
              className="px-2.5 py-1 text-[10px] font-mono font-medium bg-gray-50 hover:bg-neutral-900 hover:text-white border border-gray-200 hover:border-black rounded-lg transition-all cursor-pointer text-gray-700 shadow-2xs active:scale-95"
            >
              {tmpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box: Monday.com style */}
      <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-3 sm:p-4 focus-within:border-black focus-within:bg-white transition-all shadow-2xs space-y-3">
        <div className="flex items-start space-x-3">
          {/* User Avatar */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none ${
              currentRole === 'admin'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-emerald-700 text-white shadow-xs'
            }`}
          >
            {currentAuthorName.charAt(0).toUpperCase()}
          </div>

          {/* Text Area */}
          <div className="flex-1 min-w-0">
            <textarea
              value={commentInput}
              onChange={e => setCommentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write an update, note, or production instruction for the team (Press Enter ↵ to post, Shift+Enter for new line)..."
              rows={2}
              className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none resize-y min-h-[56px] leading-relaxed"
              id={`textarea-comment-${job.id}`}
            />
          </div>
        </div>

        {/* Action bar below input */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/70">
          <div className="flex items-center space-x-2 text-[10px] font-mono text-gray-400">
            <span className="hidden sm:inline">Posting as:</span>
            <span className="font-bold text-gray-700">{currentAuthorName}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                currentRole === 'admin' ? 'bg-black text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {currentRole}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {commentInput.trim() && (
              <button
                type="button"
                onClick={() => setCommentInput('')}
                className="px-2.5 py-1 text-[10px] font-mono text-gray-500 hover:text-black cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => handlePostComment()}
              disabled={!commentInput.trim() || isPosting}
              className="inline-flex items-center space-x-1.5 bg-black hover:bg-neutral-800 disabled:bg-gray-300 text-white px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-95"
              id={`btn-post-comment-${job.id}`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPosting ? 'Posting...' : 'Post Update'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Thread */}
      <div className="space-y-3 pt-2">
        {comments.length === 0 ? (
          <div className="text-center py-8 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="font-mono text-xs font-bold text-gray-700">No comments or instructions yet</p>
            <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
              Start the team conversation for this job above to keep all production notes and client requests in one place.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {comments.map((cmt, idx) => {
              const isStaff = cmt.userName.toLowerCase().includes('staff');
              const isCurrentUser =
                cmt.userId === currentUserId ||
                cmt.userName.toLowerCase().startsWith(currentAuthorName.toLowerCase());
              const canDelete = isCurrentUser || currentRole === 'admin';

              return (
                <div
                  key={cmt.id || idx}
                  className="group bg-white hover:bg-gray-50/70 border border-gray-200 rounded-2xl p-3.5 transition-all shadow-2xs space-y-2"
                  id={`comment-card-${cmt.id}`}
                >
                  {/* Top row: Avatar + Name + Role + Time + Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-2xs ${
                          isStaff ? 'bg-emerald-700' : 'bg-neutral-900'
                        }`}
                      >
                        {cmt.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-gray-900 truncate">
                            {cmt.userName}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                              isStaff
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-800 border border-neutral-200'
                            }`}
                          >
                            {isStaff ? 'Staff' : 'Admin'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(cmt.createdAt)}
                      </span>

                      {/* Copy Action */}
                      <button
                        type="button"
                        onClick={() => handleCopyComment(cmt)}
                        className="p-1 text-gray-400 hover:text-black rounded-md hover:bg-gray-200/60 transition-colors cursor-pointer"
                        title="Copy comment text"
                      >
                        {copiedCommentId === cmt.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      {/* Delete Action */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(cmt.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="pl-9 text-xs text-gray-800 font-sans leading-relaxed whitespace-pre-wrap break-words">
                    {cmt.comment}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
