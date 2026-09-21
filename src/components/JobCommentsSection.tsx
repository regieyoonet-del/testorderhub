/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Job, JobComment, AuthUser, JobActivity, StaffMember, StaffAccount } from '../types';
import {
  MessageSquare,
  Send,
  Trash2,
  Copy,
  Check,
  Clock,
  User,
  Shield,
  Briefcase,
  AlertCircle,
  Reply,
  CornerDownRight,
  X,
  ChevronDown,
  ChevronUp,
  Smile,
  Loader2
} from 'lucide-react';
import { sheetsService } from '../lib/sheetsService';
import UserAvatar from './UserAvatar';
import { resolveCommentAuthor, getCleanCommenterName, resolveAccountManagerInfo } from '../utils/staffAvatarUtils';
import { renderCommentWithLinks } from '../utils/linkUtils';
import EmojiPickerPopover from './EmojiPickerPopover';
import ReactionChip from './ReactionChip';

export const ALLOWED_REACTIONS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🎉', label: 'Celebrate' }
] as const;

export type AllowedReactionEmoji = typeof ALLOWED_REACTIONS[number]['emoji'];

interface JobCommentsSectionProps {
  job: Job;
  currentUser?: AuthUser;
  appsScriptUrl?: string;
  onSaveJob: (job: Job, immediate?: boolean) => void;
  staff?: StaffMember[];
  staffAccounts?: StaffAccount[];
  className?: string;
}

interface ReplyTarget {
  commentId: string;
  rootParentId: string;
  authorName: string;
}

function parseCommentTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
}

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
  staff: propsStaff,
  staffAccounts: propsStaffAccounts,
  className = ''
}: JobCommentsSectionProps) {
  const [commentInput, setCommentInput] = useState('');
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Reply Composer State
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Main comment input ref and emoji picker state
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isMainEmojiPickerOpen, setIsMainEmojiPickerOpen] = useState(false);
  const [isReplyEmojiPickerOpen, setIsReplyEmojiPickerOpen] = useState(false);

  // Accurate cursor selection tracking across clicks and blur events
  const lastCommentSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const lastReplySelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const updateCommentSelection = () => {
    if (commentInputRef.current) {
      lastCommentSelectionRef.current = {
        start: commentInputRef.current.selectionStart ?? commentInput.length,
        end: commentInputRef.current.selectionEnd ?? commentInput.length
      };
    }
  };

  const updateReplySelection = () => {
    if (replyInputRef.current) {
      lastReplySelectionRef.current = {
        start: replyInputRef.current.selectionStart ?? replyInput.length,
        end: replyInputRef.current.selectionEnd ?? replyInput.length
      };
    }
  };

  const handleInsertMainEmoji = (emoji: string) => {
    const textarea = commentInputRef.current;
    const start = textarea?.selectionStart ?? lastCommentSelectionRef.current.start ?? commentInput.length;
    const end = textarea?.selectionEnd ?? lastCommentSelectionRef.current.end ?? commentInput.length;

    const nextValue = commentInput.substring(0, start) + emoji + commentInput.substring(end);
    setCommentInput(nextValue);

    const newCursor = start + emoji.length;
    lastCommentSelectionRef.current = { start: newCursor, end: newCursor };

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  const handleInsertReplyEmoji = (emoji: string) => {
    const textarea = replyInputRef.current;
    const start = textarea?.selectionStart ?? lastReplySelectionRef.current.start ?? replyInput.length;
    const end = textarea?.selectionEnd ?? lastReplySelectionRef.current.end ?? replyInput.length;

    const nextValue = replyInput.substring(0, start) + emoji + replyInput.substring(end);
    setReplyInput(nextValue);

    const newCursor = start + emoji.length;
    lastReplySelectionRef.current = { start: newCursor, end: newCursor };

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor);
      }
    });
  };

  // Local UI state for collapsing reply threads (expanded by default)
  const [collapsedCommentIds, setCollapsedCommentIds] = useState<Set<string>>(() => new Set());

  // Active reaction picker target (commentId or replyId)
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement | null>(null);

  // Active reactor names popover key (e.g. `${commentId}-${emoji}`) for mobile/tablet tap interaction
  const [activeReactorPopoverKey, setActiveReactorPopoverKey] = useState<string | null>(null);

  // In-app deletion confirmation state (reliable across iframes without browser window.confirm blocking)
  const [commentPendingDelete, setCommentPendingDelete] = useState<{
    id: string;
    isReply: boolean;
    commentText: string;
    replyCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!activeReactionPickerId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target as Node)
      ) {
        const targetElement = event.target as HTMLElement;
        if (targetElement.closest && targetElement.closest(`#btn-react-${activeReactionPickerId}`)) {
          return;
        }
        setActiveReactionPickerId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveReactionPickerId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeReactionPickerId]);

  // Listener to dismiss active reactor popover on outside click/tap or Escape
  useEffect(() => {
    if (!activeReactorPopoverKey) return;

    const handleDismissReactorPopover = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest && target.closest(`#chip-reaction-wrapper-${activeReactorPopoverKey}`)) {
        return;
      }
      setActiveReactorPopoverKey(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveReactorPopoverKey(null);
      }
    };

    document.addEventListener('mousedown', handleDismissReactorPopover);
    document.addEventListener('touchstart', handleDismissReactorPopover);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDismissReactorPopover);
      document.removeEventListener('touchstart', handleDismissReactorPopover);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeReactorPopoverKey]);

  const toggleThreadCollapse = (parentCommentId: string) => {
    setCollapsedCommentIds(prev => {
      const next = new Set(prev);
      if (next.has(parentCommentId)) {
        next.delete(parentCommentId);
      } else {
        next.add(parentCommentId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (replyTarget && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyTarget]);

  // Fallback to cached staff and accounts if props are not provided
  const staff = useMemo(() => {
    if (propsStaff && propsStaff.length > 0) return propsStaff;
    try {
      const cached = localStorage.getItem('rp_staff');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, [propsStaff]);

  const staffAccounts = useMemo(() => {
    if (propsStaffAccounts && propsStaffAccounts.length > 0) return propsStaffAccounts;
    try {
      const cached = localStorage.getItem('rp_staff_accounts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }, [propsStaffAccounts]);

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

  // Synchronously resolve current logged-in user profile picture
  const currentUserAuthorInfo = useMemo(() => {
    return resolveCommentAuthor(
      { userId: currentUserId, userName: currentAuthorName },
      staff,
      staffAccounts,
      currentUser
    );
  }, [currentUserId, currentAuthorName, staff, staffAccounts, currentUser]);

  // Sort top-level comments newest first (by timestamp, handling missing/invalid dates gracefully)
  const topLevelComments = useMemo(() => {
    const existingIds = new Set(comments.map(c => c.id));
    const top = comments.filter(c => !c.parentCommentId || !existingIds.has(c.parentCommentId));
    return [...top].sort((a, b) => parseCommentTimestamp(b.createdAt) - parseCommentTimestamp(a.createdAt));
  }, [comments]);

  // Group replies under their root parent comment, sorted chronologically (oldest first)
  const repliesByParentId = useMemo(() => {
    const existingIds = new Set(comments.map(c => c.id));
    const map = new Map<string, JobComment[]>();
    for (const cmt of comments) {
      if (cmt.parentCommentId && existingIds.has(cmt.parentCommentId)) {
        const list = map.get(cmt.parentCommentId) || [];
        list.push(cmt);
        map.set(cmt.parentCommentId, list);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => parseCommentTimestamp(a.createdAt) - parseCommentTimestamp(b.createdAt));
    }
    return map;
  }, [comments]);

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
    setIsMainEmojiPickerOpen(false);
    setIsPosting(false);
  };

  const handleStartReply = (comment: JobComment, displayName: string, rootParentId: string) => {
    // If the thread was collapsed, expand it so the composer and replies are visible
    setCollapsedCommentIds(prev => {
      if (!prev.has(rootParentId)) return prev;
      const next = new Set(prev);
      next.delete(rootParentId);
      return next;
    });
    setReplyTarget({
      commentId: comment.id,
      rootParentId,
      authorName: displayName
    });
    setReplyInput('');
    setIsReplyEmojiPickerOpen(false);
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
    setReplyInput('');
    setIsReplyEmojiPickerOpen(false);
  };

  const handlePostReply = async () => {
    if (!replyTarget) return;
    const text = replyInput.trim();
    if (!text || isPostingReply) return;

    setIsPostingReply(true);

    const nowIso = new Date().toISOString();
    const replyId = `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newReply: JobComment = {
      id: replyId,
      jobId: job.id,
      userId: currentUserId,
      userName: `${currentAuthorName} (${currentRole.toUpperCase()})`,
      comment: text,
      createdAt: nowIso,
      updatedAt: nowIso,
      parentCommentId: replyTarget.rootParentId
    };

    const newActivity: JobActivity = {
      id: `act-${Date.now()}`,
      jobId: job.id,
      user: currentAuthorName,
      action: `Replied to ${replyTarget.authorName}: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
      timestamp: nowIso
    };

    const updatedJob: Job = {
      ...job,
      comments: [...comments, newReply],
      activities: [newActivity, ...(job.activities || [])],
      updatedAt: nowIso
    };

    onSaveJob(updatedJob, true);

    if (appsScriptUrl) {
      sheetsService.saveJobComment(appsScriptUrl, newReply).catch(err => {
        console.warn('Save reply direct sync notice:', err);
      });
    }

    // Ensure the thread is expanded so the newly added reply is visible
    setCollapsedCommentIds(prev => {
      if (!prev.has(replyTarget.rootParentId)) return prev;
      const next = new Set(prev);
      next.delete(replyTarget.rootParentId);
      return next;
    });

    setReplyInput('');
    setReplyTarget(null);
    setIsReplyEmojiPickerOpen(false);
    setIsPostingReply(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, comment: JobComment) => {
    e.stopPropagation();
    e.preventDefault();
    const isReply = Boolean(comment.parentCommentId);
    const replies = repliesByParentId.get(comment.id) || [];
    setCommentPendingDelete({
      id: comment.id,
      isReply,
      commentText: comment.comment,
      replyCount: replies.length
    });
  };

  const handleDeleteComment = async (commentId: string, skipConfirm = false) => {
    const target = comments.find(c => c.id === commentId);
    if (!target) return;
    if (!skipConfirm) {
      const isReply = Boolean(target.parentCommentId);
      const replies = repliesByParentId.get(target.id) || [];
      setCommentPendingDelete({
        id: target.id,
        isReply,
        commentText: target.comment,
        replyCount: replies.length
      });
      return;
    }
    await executeDeleteComment(commentId);
  };

  const executeDeleteComment = async (commentId: string) => {
    const targetComment = comments.find(c => c.id === commentId);
    if (!targetComment) {
      setCommentPendingDelete(null);
      return;
    }

    setIsDeleting(true);

    const isReply = Boolean(targetComment.parentCommentId);
    const repliesToDelete = isReply ? [] : comments.filter(c => c.parentCommentId === commentId);

    // Filter out the target comment; if it's a top-level comment, also cascade-delete child replies
    const updatedComments = isReply
      ? comments.filter(c => c.id !== commentId)
      : comments.filter(c => c.id !== commentId && c.parentCommentId !== commentId);

    const nowIso = new Date().toISOString();
    const newActivity: JobActivity = {
      id: `act-${Date.now()}`,
      jobId: job.id,
      user: currentAuthorName,
      action: isReply ? 'Deleted a reply' : 'Deleted a comment',
      timestamp: nowIso
    };

    const updatedJob: Job = {
      ...job,
      comments: updatedComments,
      activities: [newActivity, ...(job.activities || [])],
      updatedAt: nowIso
    };

    // Update parent and application state immediately
    onSaveJob(updatedJob, true);

    // Synchronize deletion to Google Sheets JobComments sheet
    if (appsScriptUrl) {
      sheetsService.deleteJobComment(appsScriptUrl, commentId).catch(err => {
        console.warn('Delete job comment direct sync notice:', err);
      });
      for (const r of repliesToDelete) {
        sheetsService.deleteJobComment(appsScriptUrl, r.id).catch(err => {
          console.warn('Delete nested reply direct sync notice:', err);
        });
      }
    }

    // Clean up thread collapse state
    setCollapsedCommentIds(prev => {
      if (!prev.has(commentId)) return prev;
      const next = new Set(prev);
      next.delete(commentId);
      return next;
    });

    // Clean up reply target if deleting active thread
    if (replyTarget?.commentId === commentId || replyTarget?.rootParentId === commentId) {
      setReplyTarget(null);
      setReplyInput('');
    }

    // Dismiss active reaction picker if it was attached to the deleted comment/replies
    if (activeReactionPickerId === commentId || repliesToDelete.some(r => r.id === activeReactionPickerId)) {
      setActiveReactionPickerId(null);
    }

    setIsDeleting(false);
    setCommentPendingDelete(null);
  };

  const handleCopyComment = (comment: JobComment) => {
    navigator.clipboard.writeText(comment.comment).then(() => {
      setCopiedCommentId(comment.id);
      setTimeout(() => setCopiedCommentId(null), 2000);
    });
  };

  const getUserDisplayNameById = (userId: string): string => {
    // 1. Current user match
    const isCurrent =
      userId === currentUserId ||
      (currentUser && (
        (currentUser.id && userId.toLowerCase() === currentUser.id.toLowerCase()) ||
        (currentUser.staffId && userId.toLowerCase() === currentUser.staffId.toLowerCase()) ||
        (currentUser.accountId && userId.toLowerCase() === currentUser.accountId.toLowerCase()) ||
        (currentUser.username && userId.toLowerCase() === currentUser.username.toLowerCase()) ||
        (currentUser.email && userId.toLowerCase() === currentUser.email.toLowerCase())
      ));

    if (isCurrent) {
      const name = currentUser?.name || currentUser?.username || currentAuthorName || 'You';
      return getCleanCommenterName(name);
    }

    // 2. Staff member list
    const staffMember = staff.find(s =>
      (s.id && s.id.toLowerCase() === userId.toLowerCase()) ||
      (s.fullName && s.fullName.toLowerCase() === userId.toLowerCase()) ||
      (s.name && s.name.toLowerCase() === userId.toLowerCase())
    );
    if (staffMember?.name || staffMember?.fullName) {
      return getCleanCommenterName(staffMember.name || staffMember.fullName);
    }

    // 3. Staff accounts list
    const staffAcc = staffAccounts.find(a =>
      (a.accountId && a.accountId.toLowerCase() === userId.toLowerCase()) ||
      (a.staffId && a.staffId.toLowerCase() === userId.toLowerCase()) ||
      (a.id && a.id.toLowerCase() === userId.toLowerCase()) ||
      (a.username && a.username.toLowerCase() === userId.toLowerCase()) ||
      (a.name && a.name.toLowerCase() === userId.toLowerCase())
    );
    if (staffAcc?.name || staffAcc?.username) {
      return getCleanCommenterName(staffAcc.name || staffAcc.username);
    }

    // 4. resolveAccountManagerInfo
    const resolved = resolveAccountManagerInfo(userId, staff, staffAccounts, currentUser);
    if (resolved?.displayName && resolved.displayName !== 'Unassigned' && resolved.displayName !== userId) {
      return getCleanCommenterName(resolved.displayName);
    }

    // 5. Admin fallback
    if (userId.toLowerCase() === 'admin') return 'Admin';
    if (userId.toLowerCase() === 'usr-current') {
      return getCleanCommenterName(currentUser?.name || currentUser?.username || 'Admin');
    }

    return getCleanCommenterName(userId);
  };

  const formatReactionUsersTooltip = (users: string[], emoji: string): string => {
    const names = users.map(getUserDisplayNameById);
    const sorted = [...names].sort((a, b) => (a === currentAuthorName ? -1 : b === currentAuthorName ? 1 : a.localeCompare(b)));
    if (sorted.length === 1) {
      return `${sorted[0]} reacted with ${emoji}`;
    }
    if (sorted.length === 2) {
      return `${sorted[0]} and ${sorted[1]} reacted with ${emoji}`;
    }
    return `${sorted.slice(0, 2).join(', ')} and ${sorted.length - 2} other${sorted.length - 2 > 1 ? 's' : ''} reacted with ${emoji}`;
  };

  const handleToggleReaction = (commentId: string, emoji: string) => {
    if (!ALLOWED_REACTIONS.some(r => r.emoji === emoji)) return;

    const targetComment = comments.find(c => c.id === commentId);
    if (!targetComment) return;

    const existingReactions = targetComment.reactions || {};
    const existingUsers = existingReactions[emoji] || [];
    const hasReacted = existingUsers.includes(currentUserId);

    let updatedUsers: string[];
    if (hasReacted) {
      updatedUsers = existingUsers.filter(u => u !== currentUserId);
    } else {
      updatedUsers = [...existingUsers, currentUserId];
    }

    const updatedReactions: Record<string, string[]> = { ...existingReactions };
    if (updatedUsers.length > 0) {
      updatedReactions[emoji] = updatedUsers;
    } else {
      delete updatedReactions[emoji];
    }

    const updatedComment: JobComment = {
      ...targetComment,
      reactions: Object.keys(updatedReactions).length > 0 ? updatedReactions : undefined
    };

    const updatedComments = comments.map(c => (c.id === commentId ? updatedComment : c));

    const updatedJob: Job = {
      ...job,
      comments: updatedComments
    };

    onSaveJob(updatedJob, true);

    if (appsScriptUrl) {
      sheetsService.saveJobComment(appsScriptUrl, updatedComment).catch(err => {
        console.warn('Save job comment reaction sync notice:', err);
      });
    }

    setActiveReactionPickerId(null);
  };

  const renderReactionChips = (target: JobComment, indentClass = 'pl-9') => {
    const reactions = target.reactions;
    if (!reactions) return null;

    const activeEntries = Object.entries(reactions)
      .filter(([emoji, users]) => ALLOWED_REACTIONS.some(r => r.emoji === emoji) && Array.isArray(users) && users.length > 0);

    if (activeEntries.length === 0) return null;

    return (
      <div className={`${indentClass} flex flex-wrap items-center gap-1.5 pt-1`} id={`reactions-row-${target.id}`}>
        {activeEntries.map(([emoji, users]) => {
          const uniqueUsers = Array.from(new Set(users));
          const hasReacted = uniqueUsers.includes(currentUserId);
          const popoverKey = `${target.id}-${emoji}`;
          const isPopoverOpen = activeReactorPopoverKey === popoverKey;

          return (
            <ReactionChip
              key={emoji}
              commentId={target.id}
              emoji={emoji}
              users={uniqueUsers}
              currentUserId={currentUserId}
              hasReacted={hasReacted}
              onToggleReaction={handleToggleReaction}
              getUserDisplayName={getUserDisplayNameById}
              isOpen={isPopoverOpen}
              onTogglePopover={() => {
                setActiveReactorPopoverKey(prev => (prev === popoverKey ? null : popoverKey));
              }}
              onClosePopover={() => {
                setActiveReactorPopoverKey(null);
              }}
            />
          );
        })}
      </div>
    );
  };

  const renderReactButton = (target: JobComment) => {
    const isPickerOpen = activeReactionPickerId === target.id;

    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveReactionPickerId(prev => (prev === target.id ? null : target.id));
          }}
          className={`px-2 py-0.5 text-[11px] font-mono font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
            isPickerOpen
              ? 'bg-gray-200 text-black'
              : 'text-gray-500 hover:text-black hover:bg-gray-100'
          }`}
          title="Add reaction"
          id={`btn-react-${target.id}`}
        >
          <Smile className="w-3 h-3 text-gray-500" />
          <span>React</span>
        </button>

        {isPickerOpen && (
          <div
            ref={reactionPickerRef}
            className="absolute bottom-full left-0 mb-1.5 z-40 bg-white border border-gray-200 rounded-full shadow-lg px-2 py-1 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
            id={`reaction-picker-${target.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {ALLOWED_REACTIONS.map(({ emoji, label }) => {
              const hasReacted = Boolean(target.reactions?.[emoji]?.includes(currentUserId));
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleReaction(target.id, emoji);
                  }}
                  title={`${label} (${emoji})`}
                  className={`text-base p-1.5 rounded-full hover:scale-125 transition-transform cursor-pointer flex items-center justify-center leading-none ${
                    hasReacted
                      ? 'bg-blue-100 ring-1 ring-blue-400'
                      : 'hover:bg-gray-100'
                  }`}
                  id={`btn-react-emoji-${target.id}-${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostComment();
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePostReply();
    }
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

      {/* Input Box: Monday.com style */}
      <div className="bg-gray-50/80 border border-gray-200 rounded-2xl p-3 sm:p-4 focus-within:border-black focus-within:bg-white transition-all shadow-2xs space-y-3">
        <div className="flex items-start space-x-3">
          {/* User Avatar */}
          <UserAvatar
            name={currentUserAuthorInfo.displayName || currentAuthorName}
            profilePictureUrl={currentUserAuthorInfo.profilePictureUrl}
            size={32}
            className="shrink-0 mt-0.5 shadow-2xs"
            title={`Posting as ${currentUserAuthorInfo.displayName || currentAuthorName}`}
          />

          {/* Text Area */}
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={commentInputRef}
              value={commentInput}
              onChange={e => {
                setCommentInput(e.target.value);
                updateCommentSelection();
              }}
              onSelect={updateCommentSelection}
              onClick={updateCommentSelection}
              onKeyUp={updateCommentSelection}
              onKeyDown={handleKeyDown}
              placeholder="Write an update, note, or production instruction for the team (Press Enter ↵ to post, Shift+Enter for new line)..."
              rows={2}
              className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none resize-y min-h-[56px] leading-relaxed pr-8"
              id={`textarea-comment-${job.id}`}
            />

            {/* Emoji Button in Main Composer */}
            <div className="absolute top-0 right-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMainEmojiPickerOpen(prev => {
                    if (!prev) setIsReplyEmojiPickerOpen(false);
                    return !prev;
                  });
                }}
                className={`p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50/80 transition-colors cursor-pointer flex items-center justify-center ${
                  isMainEmojiPickerOpen ? 'bg-amber-100 text-amber-600 ring-1 ring-amber-300' : ''
                }`}
                title="Insert emoji"
                id={`btn-emoji-comment-${job.id}`}
              >
                <Smile className="w-4 h-4" />
              </button>

              <EmojiPickerPopover
                isOpen={isMainEmojiPickerOpen}
                onClose={() => setIsMainEmojiPickerOpen(false)}
                onSelectEmoji={handleInsertMainEmoji}
                placement="bottom"
                id={`emoji-picker-comment-${job.id}`}
                triggerId={`btn-emoji-comment-${job.id}`}
              />
            </div>
          </div>
        </div>

        {/* Action bar below input */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/70">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-gray-400">
            <span className="hidden sm:inline">Posting as:</span>
            <span className="font-bold text-gray-800">{currentAuthorName}</span>
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
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {topLevelComments.map((cmt, idx) => {
              const resolvedAuthor = resolveCommentAuthor(cmt, staff, staffAccounts, currentUser);
              const displayName = resolvedAuthor.displayName || getCleanCommenterName(cmt.userName);
              const isCurrentUser =
                Boolean(resolvedAuthor.isCurrentUser) ||
                cmt.userId === currentUserId ||
                displayName.toLowerCase() === currentAuthorName.toLowerCase() ||
                cmt.userName.toLowerCase().startsWith(currentAuthorName.toLowerCase());
              const canDelete = isCurrentUser || currentRole === 'admin';

              const replies = repliesByParentId.get(cmt.id) || [];
              const isReplyingToThisThread = replyTarget?.rootParentId === cmt.id;
              const isCollapsed = collapsedCommentIds.has(cmt.id);

              return (
                <div
                  key={cmt.id || `top-${idx}`}
                  className="bg-white hover:bg-gray-50/40 border border-gray-200 rounded-2xl p-3.5 transition-all shadow-2xs space-y-3"
                  id={`comment-card-${cmt.id}`}
                >
                  {/* Top row: Avatar + Name + Time + Delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <UserAvatar
                        name={displayName}
                        profilePictureUrl={resolvedAuthor.profilePictureUrl}
                        size={28}
                        className="shrink-0 shadow-2xs"
                        title={displayName}
                      />
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-gray-900 truncate block">
                          {displayName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1 mr-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(cmt.createdAt)}
                      </span>

                      {/* Delete Action */}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(e, cmt)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete comment"
                          id={`btn-delete-header-${cmt.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment Body */}
                  <div className="pl-9 text-xs text-gray-800 font-sans leading-relaxed whitespace-pre-wrap break-words">
                    {renderCommentWithLinks(cmt.comment)}
                  </div>

                  {/* Reaction Chips (Only displayed if any reaction exists) */}
                  {renderReactionChips(cmt, 'pl-9')}

                  {/* Comment Action Controls: [Toggle Replies] [Reply] [React] [Copy] [Delete] */}
                  <div className="pl-9 flex items-center gap-2 pt-0.5">
                    {/* Expand / Collapse Replies Toggle */}
                    {replies.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleThreadCollapse(cmt.id);
                        }}
                        className="px-2 py-0.5 text-[11px] font-mono font-semibold text-gray-500 hover:text-black rounded-md hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1"
                        title={isCollapsed ? `Show ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}` : `Hide ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                        id={`btn-toggle-replies-${cmt.id}`}
                      >
                        {isCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-500 transition-transform" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5 text-gray-500 transition-transform" />
                        )}
                        <span>
                          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      </button>
                    )}

                    {/* Reply Action */}
                    <button
                      type="button"
                      onClick={() => handleStartReply(cmt, displayName, cmt.id)}
                      className="px-2 py-0.5 text-[11px] font-mono font-semibold text-gray-500 hover:text-black rounded-md hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1"
                      title={`Reply to ${displayName}`}
                      id={`btn-reply-${cmt.id}`}
                    >
                      <Reply className="w-3 h-3" />
                      <span>Reply</span>
                    </button>

                    {/* React Action with popover picker */}
                    {renderReactButton(cmt)}

                    {/* Copy Action */}
                    <button
                      type="button"
                      onClick={() => handleCopyComment(cmt)}
                      className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-gray-500 hover:text-black rounded-md hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1"
                      title="Copy comment text"
                    >
                      {copiedCommentId === cmt.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy</span>
                    </button>

                    {/* Delete Action in action row */}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, cmt)}
                        className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1"
                        title="Delete comment"
                        id={`btn-delete-${cmt.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>

                  {/* Nested Replies List (Grouped under parent, sorted chronologically) */}
                  {replies.length > 0 && !isCollapsed && (
                    <div className="pl-5 sm:pl-7 border-l-2 border-gray-200/80 ml-4 space-y-2 pt-1">
                      {replies.map((reply, rIdx) => {
                        const replyAuthor = resolveCommentAuthor(reply, staff, staffAccounts, currentUser);
                        const replyDisplayName = replyAuthor.displayName || getCleanCommenterName(reply.userName);
                        const isReplyAuthor =
                          Boolean(replyAuthor.isCurrentUser) ||
                          reply.userId === currentUserId ||
                          replyDisplayName.toLowerCase() === currentAuthorName.toLowerCase() ||
                          reply.userName.toLowerCase().startsWith(currentAuthorName.toLowerCase());
                        const canDeleteReply = isReplyAuthor || currentRole === 'admin';

                        return (
                          <div
                            key={reply.id || `reply-${rIdx}`}
                            className="bg-gray-50/80 hover:bg-gray-100/70 border border-gray-200/70 rounded-xl p-2.5 sm:p-3 transition-all space-y-1.5 shadow-2xs"
                            id={`reply-card-${reply.id}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                <UserAvatar
                                  name={replyDisplayName}
                                  profilePictureUrl={replyAuthor.profilePictureUrl}
                                  size={24}
                                  className="shrink-0 shadow-2xs"
                                  title={replyDisplayName}
                                />
                                <span className="font-mono text-xs font-bold text-gray-900 truncate">
                                  {replyDisplayName}
                                </span>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0">
                                <span className="font-mono text-[10px] text-gray-400 flex items-center gap-1 mr-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatTimeAgo(reply.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Reply Body with URL Links */}
                            <div className="pl-8 text-xs text-gray-800 font-sans leading-relaxed whitespace-pre-wrap break-words">
                              {renderCommentWithLinks(reply.comment)}
                            </div>

                            {/* Reply Reaction Chips (Only displayed if any reaction exists) */}
                            {renderReactionChips(reply, 'pl-8')}

                            {/* Reply Action Controls: [Reply] [React] [Copy] [Delete] */}
                            <div className="pl-8 flex items-center gap-2 pt-0.5">
                              {/* Reply to this person */}
                              <button
                                type="button"
                                onClick={() => handleStartReply(reply, replyDisplayName, cmt.id)}
                                className="px-2 py-0.5 text-[11px] font-mono font-semibold text-gray-500 hover:text-black rounded-md hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1"
                                title={`Reply to ${replyDisplayName}`}
                                id={`btn-reply-${reply.id}`}
                              >
                                <Reply className="w-3 h-3" />
                                <span>Reply</span>
                              </button>

                              {/* React Action with popover picker */}
                              {renderReactButton(reply)}

                              {/* Copy */}
                              <button
                                type="button"
                                onClick={() => handleCopyComment(reply)}
                                className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-gray-500 hover:text-black rounded-md hover:bg-gray-100 transition-colors cursor-pointer flex items-center gap-1"
                                title="Copy reply text"
                                id={`btn-copy-${reply.id}`}
                              >
                                {copiedCommentId === reply.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>Copy</span>
                              </button>

                              {/* Delete */}
                              {canDeleteReply && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteClick(e, reply)}
                                  className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Delete reply"
                                  id={`btn-delete-${reply.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Reply Composer (Only shows under the targeted thread) */}
                  {isReplyingToThisThread && (
                    <div className="pl-5 sm:pl-7 border-l-2 border-blue-400/80 ml-4 pt-1">
                      <div className="bg-blue-50/40 border border-blue-200/80 rounded-xl p-3 space-y-2.5 shadow-2xs">
                        {/* Replying to indicator */}
                        <div className="flex items-center justify-between text-[11px] font-mono text-blue-900">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <CornerDownRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">
                              Replying to <strong className="text-black font-bold">{replyTarget.authorName}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCancelReply}
                            className="text-gray-400 hover:text-black p-0.5 rounded hover:bg-blue-100/50 transition-colors cursor-pointer"
                            title="Cancel reply"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-start space-x-2.5">
                          <UserAvatar
                            name={currentUserAuthorInfo.displayName || currentAuthorName}
                            profilePictureUrl={currentUserAuthorInfo.profilePictureUrl}
                            size={26}
                            className="shrink-0 mt-0.5 shadow-2xs"
                            title={`Replying as ${currentUserAuthorInfo.displayName || currentAuthorName}`}
                          />
                          <div className="flex-1 min-w-0 relative">
                            <textarea
                              ref={replyInputRef}
                              value={replyInput}
                              onChange={e => {
                                setReplyInput(e.target.value);
                                updateReplySelection();
                              }}
                              onSelect={updateReplySelection}
                              onClick={updateReplySelection}
                              onKeyUp={updateReplySelection}
                              onKeyDown={handleReplyKeyDown}
                              placeholder={`Write a reply to ${replyTarget.authorName} (Press Enter ↵ to send, Shift+Enter for new line)...`}
                              rows={2}
                              className="w-full bg-white border border-gray-200 focus:border-black rounded-lg p-2 pr-8 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none resize-y min-h-[50px] leading-relaxed shadow-2xs"
                              id={`textarea-reply-${cmt.id}`}
                            />

                            {/* Emoji Button in Reply Composer */}
                            <div className="absolute top-1.5 right-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsReplyEmojiPickerOpen(prev => {
                                    if (!prev) setIsMainEmojiPickerOpen(false);
                                    return !prev;
                                  });
                                }}
                                className={`p-1 rounded-md text-gray-400 hover:text-amber-500 hover:bg-amber-50/80 transition-colors cursor-pointer flex items-center justify-center ${
                                  isReplyEmojiPickerOpen ? 'bg-amber-100 text-amber-600 ring-1 ring-amber-300' : ''
                                }`}
                                title="Insert emoji"
                                id={`btn-emoji-reply-${cmt.id}`}
                              >
                                <Smile className="w-3.5 h-3.5" />
                              </button>

                              <EmojiPickerPopover
                                isOpen={isReplyEmojiPickerOpen}
                                onClose={() => setIsReplyEmojiPickerOpen(false)}
                                onSelectEmoji={handleInsertReplyEmoji}
                                placement="top"
                                id={`emoji-picker-reply-${cmt.id}`}
                                triggerId={`btn-emoji-reply-${cmt.id}`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelReply}
                            className="px-2.5 py-1 text-[11px] font-mono text-gray-500 hover:text-black cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handlePostReply}
                            disabled={!replyInput.trim() || isPostingReply}
                            className="inline-flex items-center space-x-1.5 bg-black hover:bg-neutral-800 disabled:bg-gray-300 text-white px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed active:scale-95"
                            id={`btn-submit-reply-${cmt.id}`}
                          >
                            <Send className="w-3 h-3" />
                            <span>{isPostingReply ? 'Replying...' : 'Reply'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Deleting Comment or Reply (Safe inside iframes and sandboxes) */}
      {commentPendingDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={(e) => {
            e.stopPropagation();
            if (!isDeleting) setCommentPendingDelete(null);
          }}
          id="delete-comment-confirm-backdrop"
        >
          <div
            className="bg-white rounded-2xl border-2 border-black max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            id="delete-comment-confirm-modal"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 shrink-0 border border-red-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="font-sans font-bold text-sm text-gray-950">
                  Delete {commentPendingDelete.isReply ? 'Reply' : 'Comment'}?
                </h3>
                <p className="font-sans text-xs text-gray-600 leading-relaxed">
                  {commentPendingDelete.replyCount > 0 ? (
                    <>
                      Are you sure you want to delete this comment and its{' '}
                      <strong>{commentPendingDelete.replyCount}</strong>{' '}
                      {commentPendingDelete.replyCount === 1 ? 'reply' : 'replies'}? This action cannot be undone.
                    </>
                  ) : (
                    <>
                      Are you sure you want to delete this {commentPendingDelete.isReply ? 'reply' : 'comment'}? This action cannot be undone.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Comment Preview Snippet */}
            {commentPendingDelete.commentText && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-700 italic font-sans max-h-20 overflow-y-auto break-words">
                &ldquo;{commentPendingDelete.commentText}&rdquo;
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1 font-mono text-xs">
              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentPendingDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-gray-300 hover:border-black font-semibold text-gray-700 hover:text-black transition-colors cursor-pointer disabled:opacity-50"
                id="btn-cancel-delete-comment"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  executeDeleteComment(commentPendingDelete.id);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                id="btn-confirm-delete-comment"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
