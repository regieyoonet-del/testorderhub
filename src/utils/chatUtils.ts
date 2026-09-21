/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthUser,
  CompanyProfile,
  StaffMember,
  StaffAccount,
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  SystemSettings
} from '../types';

/**
 * Normalizes the user ID for chat messaging across Admin, Staff, and Client roles.
 */
export function getCurrentChatUserId(
  user: AuthUser | null | undefined,
  activeCompany?: CompanyProfile | null
): string {
  if (!user) return 'anonymous';
  if (user.role === 'admin') {
    return 'admin';
  }
  if (user.role === 'client') {
    return user.companyId || activeCompany?.id || 'client';
  }
  // Staff
  return user.staffId || user.accountId || user.id || 'staff';
}

/**
 * Returns the human display name of the current user.
 */
export function getCurrentChatUserDisplayName(
  user: AuthUser | null | undefined,
  activeCompany?: CompanyProfile | null,
  staffList?: StaffMember[]
): string {
  if (!user) return 'Guest';
  if (user.role === 'admin') {
    return user.name || 'Admin';
  }
  if (user.role === 'client') {
    return activeCompany?.name || user.name || 'Client';
  }
  // Staff
  const matchedStaff = staffList?.find(s => s.id === user.staffId);
  return user.name || matchedStaff?.fullName || 'Staff Member';
}

/**
 * Resolves avatar URL for the current user.
 */
export function getCurrentChatUserAvatar(
  user: AuthUser | null | undefined,
  activeCompany?: CompanyProfile | null,
  staffList?: StaffMember[],
  staffAccounts?: StaffAccount[]
): string | undefined {
  if (!user) return undefined;
  if (user.role === 'admin') {
    return user.profilePictureUrl || user.avatarUrl || undefined;
  }
  if (user.role === 'client') {
    return activeCompany?.logoUrl || undefined;
  }
  // Staff
  const matchedStaff = staffList?.find(s => s.id === user.staffId);
  const matchedAcc = staffAccounts?.find(a => a.staffId === user.staffId || a.id === user.accountId);
  return (
    user.profilePictureUrl ||
    user.avatarUrl ||
    matchedStaff?.profilePictureUrl ||
    matchedStaff?.avatarUrl ||
    matchedAcc?.profilePictureUrl ||
    matchedAcc?.avatarUrl ||
    undefined
  );
}

/**
 * Resolves detailed participant metadata from an arbitrary participant ID.
 */
export function resolveParticipantInfo(
  participantId: string,
  companies: CompanyProfile[] = [],
  staff: StaffMember[] = [],
  staffAccounts: StaffAccount[] = [],
  systemSettings?: SystemSettings
): ChatParticipant {
  if (participantId === 'admin' || participantId.toLowerCase().includes('admin')) {
    return {
      id: 'admin',
      name: systemSettings?.hubName ? `${systemSettings.shortHubName || 'ARH'} Admin` : 'Admin',
      role: 'admin',
      avatarUrl: systemSettings?.logoUrl,
      email: systemSettings?.adminEmail
    };
  }

  // Check if it's a company
  const company = companies.find(c => c.id === participantId || c.username === participantId);
  if (company) {
    return {
      id: company.id,
      name: company.name,
      role: 'client',
      avatarUrl: company.logoUrl,
      email: company.contactEmail
    };
  }

  // Check if it's a staff member
  const staffMember = staff.find(s => s.id === participantId);
  const staffAcc = staffAccounts.find(a => a.staffId === participantId || a.id === participantId);

  if (staffMember || staffAcc) {
    return {
      id: participantId,
      name: staffMember?.fullName || staffAcc?.name || 'Staff Member',
      role: 'staff',
      avatarUrl: staffMember?.profilePictureUrl || staffMember?.avatarUrl || staffAcc?.profilePictureUrl || staffAcc?.avatarUrl,
      email: staffMember?.email || staffAcc?.email,
      department: staffMember?.department
    };
  }

  return {
    id: participantId,
    name: participantId,
    role: 'staff'
  };
}

/**
 * Strict role-based filtering for conversations.
 * - Client can ONLY see their own conversation with Admin (companyId matching).
 * - Staff can see direct chats they are a participant in, plus groups they belong to.
 * - Admin can see all conversations (internal + client support).
 */
export function filterConversationsForUser(
  conversations: ChatConversation[],
  currentUserId: string,
  currentUserRole: 'admin' | 'staff' | 'client',
  currentCompanyId?: string
): ChatConversation[] {
  if (!Array.isArray(conversations)) return [];

  if (currentUserRole === 'client') {
    const validCompanyId = currentCompanyId || currentUserId;
    return conversations.filter(c => {
      if (c.type !== 'client_admin') return false;
      return c.companyId === validCompanyId || c.participantIds.includes(validCompanyId);
    });
  }

  if (currentUserRole === 'staff') {
    return conversations.filter(c => {
      // Staff only sees chats they participate in (direct staff chats, staff groups, staff-admin direct)
      // Client support conversations are reserved for Admin
      if (c.type === 'client_admin') return false;
      return c.participantIds.includes(currentUserId);
    });
  }

  // Admin sees all
  return conversations;
}

/**
 * Calculates unread count for a given conversation for the current user.
 */
export function getConversationUnreadCount(
  conversationId: string,
  messages: ChatMessage[],
  currentUserId: string
): number {
  if (!Array.isArray(messages) || !currentUserId) return 0;
  return messages.filter(
    m =>
      m.conversationId === conversationId &&
      m.senderId !== currentUserId &&
      (!m.readBy || !m.readBy.includes(currentUserId))
  ).length;
}

/**
 * Calculates total unread count across all accessible conversations for a user.
 */
export function getTotalUnreadCount(
  conversations: ChatConversation[],
  messages: ChatMessage[],
  currentUserId: string,
  currentUserRole: 'admin' | 'staff' | 'client',
  currentCompanyId?: string
): number {
  const accessibleConvs = filterConversationsForUser(
    conversations,
    currentUserId,
    currentUserRole,
    currentCompanyId
  );
  const accessibleConvIds = new Set(accessibleConvs.map(c => c.id));

  return (messages || []).filter(
    m =>
      accessibleConvIds.has(m.conversationId) &&
      m.senderId !== currentUserId &&
      (!m.readBy || !m.readBy.includes(currentUserId))
  ).length;
}

/**
 * Formats a timestamp into a friendly time string (e.g., "10:45 AM" or "Yesterday").
 */
export function formatChatTimestamp(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (isToday) {
    return timeStr;
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  const isCurrentYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: isCurrentYear ? undefined : 'numeric'
  });

  return `${dateStr} • ${timeStr}`;
}

/**
 * Formats date headers for chat message groups.
 */
export function formatChatDateHeader(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Previous Messages';

  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Resolves the display title for a conversation based on who is looking at it.
 */
export function getConversationDisplayTitle(
  conversation: ChatConversation,
  currentUserId: string,
  companies: CompanyProfile[] = [],
  staff: StaffMember[] = [],
  staffAccounts: StaffAccount[] = []
): string {
  if (conversation.type === 'group') {
    return conversation.title;
  }

  if (conversation.type === 'client_admin') {
    if (conversation.companyId) {
      const co = companies.find(c => c.id === conversation.companyId);
      if (co) return co.name;
    }
    return conversation.title || 'Client Support';
  }

  // Direct conversation: find other participant
  const otherParticipantId = conversation.participantIds.find(id => id !== currentUserId) || conversation.participantIds[0];
  const info = resolveParticipantInfo(otherParticipantId, companies, staff, staffAccounts);
  return info.name;
}

/**
 * Resolves avatar for conversation list.
 */
export function getConversationDisplayAvatar(
  conversation: ChatConversation,
  currentUserId: string,
  companies: CompanyProfile[] = [],
  staff: StaffMember[] = [],
  staffAccounts: StaffAccount[] = []
): string | undefined {
  if (conversation.type === 'group') {
    return undefined; // groups use group icon
  }

  if (conversation.type === 'client_admin') {
    const co = companies.find(c => c.id === conversation.companyId);
    return co?.logoUrl;
  }

  const otherParticipantId = conversation.participantIds.find(id => id !== currentUserId) || conversation.participantIds[0];
  const info = resolveParticipantInfo(otherParticipantId, companies, staff, staffAccounts);
  return info.avatarUrl;
}
