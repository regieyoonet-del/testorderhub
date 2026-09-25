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
 * Canonical identity is strictly based on stable account/company IDs, never browser/session state.
 */
export function getCurrentChatUserId(
  user: AuthUser | null | undefined,
  activeCompany?: CompanyProfile | null,
  staffList?: StaffMember[],
  staffAccounts?: StaffAccount[]
): string {
  if (!user) return 'anonymous';
  if (user.role === 'admin') {
    return 'admin';
  }
  if (user.role === 'client') {
    return user.companyId || activeCompany?.id || 'client';
  }

  // Staff: resolve stable Staff ID (e.g. STF-101 / staff_123)
  if (user.staffId && user.staffId.trim()) {
    return user.staffId.trim();
  }
  if (user.accountId && staffAccounts && staffAccounts.length > 0) {
    const matched = staffAccounts.find(a => a.id === user.accountId || a.staffId === user.accountId);
    if (matched?.staffId && matched.staffId.trim()) {
      return matched.staffId.trim();
    }
  }
  if (user.username && staffAccounts && staffAccounts.length > 0) {
    const matched = staffAccounts.find(a => a.username?.toLowerCase() === user.username?.toLowerCase());
    if (matched?.staffId && matched.staffId.trim()) {
      return matched.staffId.trim();
    }
  }
  if (user.name && staffList && staffList.length > 0) {
    const matched = staffList.find(s => s.fullName?.toLowerCase() === user.name?.toLowerCase());
    if (matched?.id && matched.id.trim()) {
      return matched.id.trim();
    }
  }
  return user.staffId || user.accountId || user.id || 'staff';
}

/**
 * Returns the human display name of the current user.
 * Admin display identity is strictly "ARH".
 */
export function getCurrentChatUserDisplayName(
  user: AuthUser | null | undefined,
  activeCompany?: CompanyProfile | null,
  staffList?: StaffMember[]
): string {
  if (!user) return 'Guest';
  if (user.role === 'admin') {
    return 'ARH';
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
 * ARH identity uses the configured hub logo.
 */
export function getCurrentChatUserAvatar(
  user: AuthUser | null | undefined,
  activeCompany?: CompanyProfile | null,
  staffList?: StaffMember[],
  staffAccounts?: StaffAccount[],
  systemSettings?: SystemSettings
): string | undefined {
  if (!user) return undefined;
  if (user.role === 'admin') {
    return systemSettings?.logoUrl || user.profilePictureUrl || user.avatarUrl || undefined;
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
 * Canonical Admin identity is always named "ARH" and uses the uploaded hub logo.
 */
export function resolveParticipantInfo(
  participantId: string,
  companies: CompanyProfile[] = [],
  staff: StaffMember[] = [],
  staffAccounts: StaffAccount[] = [],
  systemSettings?: SystemSettings
): ChatParticipant {
  const cleanId = String(participantId || '').trim().toLowerCase();
  if (cleanId === 'admin' || cleanId === 'arh') {
    return {
      id: 'admin',
      name: 'ARH',
      role: 'admin',
      avatarUrl: systemSettings?.logoUrl,
      email: systemSettings?.adminEmail
    };
  }

  // Check if it's a company
  const company = companies.find(c => c.id?.toLowerCase() === cleanId || c.username?.toLowerCase() === cleanId);
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
  const staffMember = staff.find(s => s.id?.toLowerCase() === cleanId);
  const staffAcc = staffAccounts.find(a => a.staffId?.toLowerCase() === cleanId || a.id?.toLowerCase() === cleanId);

  if (staffMember || staffAcc) {
    return {
      id: staffMember?.id || staffAcc?.staffId || participantId,
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
 * - Client can ONLY see their own conversation with ARH (companyId matching).
 * - Staff can see direct chats they are a participant in, plus groups they belong to.
 * - Admin/ARH can see all conversations (internal + client support).
 */
export function filterConversationsForUser(
  conversations: ChatConversation[],
  currentUserId: string,
  currentUserRole: 'admin' | 'staff' | 'client',
  currentCompanyId?: string
): ChatConversation[] {
  if (!Array.isArray(conversations)) return [];
  const normCurrent = String(currentUserId || '').trim().toLowerCase();

  if (currentUserRole === 'client') {
    const validCompanyId = String(currentCompanyId || currentUserId || '').trim().toLowerCase();
    return conversations.filter(c => {
      if (c.type !== 'client_admin') return false;
      const cCo = String(c.companyId || '').trim().toLowerCase();
      if (cCo === validCompanyId) return true;
      if (Array.isArray(c.participantIds)) {
        return c.participantIds.some(p => String(p).trim().toLowerCase() === validCompanyId);
      }
      return false;
    });
  }

  if (currentUserRole === 'staff') {
    return conversations.filter(c => {
      if (c.type === 'client_admin') return false;
      if (!Array.isArray(c.participantIds)) return false;
      return c.participantIds.some(p => {
        const normP = String(p).trim().toLowerCase();
        return normP === normCurrent;
      });
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
  const normUser = String(currentUserId).trim().toLowerCase();
  return messages.filter(
    m =>
      m.conversationId === conversationId &&
      String(m.senderId || '').trim().toLowerCase() !== normUser &&
      (!m.readBy || !m.readBy.some(r => String(r).trim().toLowerCase() === normUser))
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
  const normUser = String(currentUserId).trim().toLowerCase();

  return (messages || []).filter(
    m =>
      accessibleConvIds.has(m.conversationId) &&
      String(m.senderId || '').trim().toLowerCase() !== normUser &&
      (!m.readBy || !m.readBy.some(r => String(r).trim().toLowerCase() === normUser))
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
 * Returns a stable, deterministic direct conversation ID from two participant IDs.
 * Always produces the exact same conversation ID regardless of browser, device, or ordering.
 * e.g. "conv-direct-admin-stf-101"
 */
export function getCanonicalDirectConversationId(participantA: string, participantB: string): string {
  const normA = (participantA.toLowerCase() === 'arh' ? 'admin' : participantA).trim().toLowerCase();
  const normB = (participantB.toLowerCase() === 'arh' ? 'admin' : participantB).trim().toLowerCase();
  const sorted = [normA, normB].sort((a, b) => a.localeCompare(b));
  return `conv-direct-${sorted[0]}-${sorted[1]}`;
}

/**
 * Normalizes two participant IDs into an order-independent matching key.
 */
export function getDirectConversationKey(participantA: string, participantB: string): string {
  const normA = (participantA.toLowerCase() === 'arh' ? 'admin' : participantA).trim().toLowerCase();
  const normB = (participantB.toLowerCase() === 'arh' ? 'admin' : participantB).trim().toLowerCase();
  return [normA, normB].sort().join('__');
}

/**
 * Robust search to find if a direct conversation already exists between two participants.
 * Compares canonical participant IDs without relying on random UUIDs.
 */
export function findExistingDirectConversation(
  conversations: ChatConversation[],
  participantA: string,
  participantB: string
): ChatConversation | undefined {
  if (!Array.isArray(conversations)) return undefined;
  const targetKey = getDirectConversationKey(participantA, participantB);

  return conversations.find(c => {
    if (c.type !== 'direct') return false;
    if (!Array.isArray(c.participantIds) || c.participantIds.length !== 2) return false;
    return getDirectConversationKey(c.participantIds[0], c.participantIds[1]) === targetKey;
  });
}

/**
 * Resolves the display title for a conversation based on who is looking at it.
 * Admin side is always displayed as "ARH".
 */
export function getConversationDisplayTitle(
  conversation: ChatConversation,
  currentUserId: string,
  companies: CompanyProfile[] = [],
  staff: StaffMember[] = [],
  staffAccounts: StaffAccount[] = [],
  systemSettings?: SystemSettings
): string {
  if (conversation.type === 'group') {
    return conversation.title;
  }

  const normCurrent = String(currentUserId || '').trim().toLowerCase();
  const isCurrentAdmin = normCurrent === 'admin' || normCurrent === 'arh';

  if (conversation.type === 'client_admin') {
    // If the person looking is the client, other participant is ARH!
    if (!isCurrentAdmin) {
      return 'ARH';
    }
    // If ARH is looking, show the company business name!
    if (conversation.companyId) {
      const co = companies.find(c => c.id?.toLowerCase() === conversation.companyId?.toLowerCase());
      if (co) return co.name;
    }
    return conversation.title || 'Client Support';
  }

  // Direct conversation: find other participant
  const otherParticipantId = conversation.participantIds.find(
    id => String(id).trim().toLowerCase() !== normCurrent
  ) || conversation.participantIds[0];

  const info = resolveParticipantInfo(otherParticipantId, companies, staff, staffAccounts, systemSettings);
  return info.name;
}

/**
 * Resolves avatar for conversation list and headers.
 * Admin side uses the uploaded company/hub logo.
 */
export function getConversationDisplayAvatar(
  conversation: ChatConversation,
  currentUserId: string,
  companies: CompanyProfile[] = [],
  staff: StaffMember[] = [],
  staffAccounts: StaffAccount[] = [],
  systemSettings?: SystemSettings
): string | undefined {
  if (conversation.type === 'group') {
    return undefined; // groups use group icon
  }

  const normCurrent = String(currentUserId || '').trim().toLowerCase();
  const isCurrentAdmin = normCurrent === 'admin' || normCurrent === 'arh';

  if (conversation.type === 'client_admin') {
    // If client is looking, other participant is ARH!
    if (!isCurrentAdmin) {
      return systemSettings?.logoUrl;
    }
    // If ARH is looking, show the company logo!
    const co = companies.find(c => c.id?.toLowerCase() === conversation.companyId?.toLowerCase());
    return co?.logoUrl;
  }

  const otherParticipantId = conversation.participantIds.find(
    id => String(id).trim().toLowerCase() !== normCurrent
  ) || conversation.participantIds[0];

  const info = resolveParticipantInfo(otherParticipantId, companies, staff, staffAccounts, systemSettings);
  return info.avatarUrl;
}

export const SEED_CHAT_CONVERSATION_IDS = new Set<string>([
  'conv-group-studio-production'
]);

export const SEED_CHAT_MESSAGE_IDS = new Set<string>([
  'msg-grp-1', 'msg-grp-2', 'msg-grp-3',
  'msg-dir-1', 'msg-dir-2',
  'msg-client-1', 'msg-clt-1', 'msg-clt-2'
]);

/**
 * Deduplicates multiple conversations representing the same relationship (e.g. ARH ↔ staff_123 or ARH ↔ company_123).
 * Identifies canonical conversations and generates a redirect map for messages attached to redundant IDs.
 */
export function deduplicateAndMergeConversations(
  convs: ChatConversation[]
): { conversations: ChatConversation[]; redirectMap: Map<string, string> } {
  const redirectMap = new Map<string, string>();
  const directGroups = new Map<string, ChatConversation[]>();
  const clientGroups = new Map<string, ChatConversation[]>();
  const others: ChatConversation[] = [];

  convs.forEach(c => {
    if (!c || !c.id || SEED_CHAT_CONVERSATION_IDS.has(c.id)) return;

    if (c.type === 'direct' && Array.isArray(c.participantIds) && c.participantIds.length === 2) {
      const key = getDirectConversationKey(c.participantIds[0], c.participantIds[1]);
      if (!directGroups.has(key)) directGroups.set(key, []);
      directGroups.get(key)!.push(c);
    } else if (c.type === 'client_admin' && c.companyId) {
      const key = String(c.companyId).trim().toLowerCase();
      if (!clientGroups.has(key)) clientGroups.set(key, []);
      clientGroups.get(key)!.push(c);
    } else {
      others.push(c);
    }
  });

  const mergedConvs: ChatConversation[] = [...others];

  // Merge direct duplicates
  directGroups.forEach((group, key) => {
    if (group.length === 1) {
      mergedConvs.push(group[0]);
    } else {
      const [p1, p2] = key.split('__');
      const canonicalDefaultId = `conv-direct-${p1}-${p2}`;
      // Prefer deterministic canonical ID if already present, otherwise use the earliest conversation
      let canonical = group.find(c => c.id.toLowerCase() === canonicalDefaultId) || group[0];

      group.forEach(dup => {
        if (dup.id !== canonical.id) {
          redirectMap.set(dup.id, canonical.id);
          const dupTime = new Date(dup.lastMessageTimestamp || dup.updatedAt || 0).getTime();
          const canTime = new Date(canonical.lastMessageTimestamp || canonical.updatedAt || 0).getTime();
          if (dupTime > canTime) {
            canonical = {
              ...canonical,
              lastMessageText: dup.lastMessageText || canonical.lastMessageText,
              lastMessageTimestamp: dup.lastMessageTimestamp || canonical.lastMessageTimestamp,
              lastMessageSenderId: dup.lastMessageSenderId || canonical.lastMessageSenderId,
              lastMessageSenderName: dup.lastMessageSenderName || canonical.lastMessageSenderName,
              updatedAt: dup.updatedAt || canonical.updatedAt
            };
          }
        }
      });
      mergedConvs.push(canonical);
    }
  });

  // Merge client_admin duplicates
  clientGroups.forEach((group, companyId) => {
    if (group.length === 1) {
      mergedConvs.push(group[0]);
    } else {
      const canonicalDefaultId = `conv-client-${companyId}`;
      let canonical = group.find(c => c.id.toLowerCase() === canonicalDefaultId) || group[0];

      group.forEach(dup => {
        if (dup.id !== canonical.id) {
          redirectMap.set(dup.id, canonical.id);
          const dupTime = new Date(dup.lastMessageTimestamp || dup.updatedAt || 0).getTime();
          const canTime = new Date(canonical.lastMessageTimestamp || canonical.updatedAt || 0).getTime();
          if (dupTime > canTime) {
            canonical = {
              ...canonical,
              lastMessageText: dup.lastMessageText || canonical.lastMessageText,
              lastMessageTimestamp: dup.lastMessageTimestamp || canonical.lastMessageTimestamp,
              lastMessageSenderId: dup.lastMessageSenderId || canonical.lastMessageSenderId,
              lastMessageSenderName: dup.lastMessageSenderName || canonical.lastMessageSenderName,
              updatedAt: dup.updatedAt || canonical.updatedAt
            };
          }
        }
      });
      mergedConvs.push(canonical);
    }
  });

  return { conversations: mergedConvs, redirectMap };
}

/**
 * Reconciles conversations from server with local conversations state idempotently.
 * Enforces single conversation uniqueness for direct (Staff ↔ ARH) and client support chats.
 */
export function reconcileChatConversations(
  existingList: ChatConversation[],
  incomingList: ChatConversation[]
): ChatConversation[] {
  const incomingMap = new Map<string, ChatConversation>();
  incomingList.forEach(c => {
    if (c && c.id && !SEED_CHAT_CONVERSATION_IDS.has(c.id)) {
      incomingMap.set(c.id, c);
    }
  });

  // Merge existing conversations
  const merged = existingList
    .filter(c => c && c.id && !SEED_CHAT_CONVERSATION_IDS.has(c.id))
    .map(local => {
      const server = incomingMap.get(local.id);
      if (!server) {
        return local;
      }
      const localTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
      const serverTime = new Date(server.updatedAt || server.createdAt || 0).getTime();
      if (localTime > serverTime + 500) {
        return {
          ...server,
          ...local,
          lastMessageText: server.lastMessageText || local.lastMessageText,
          lastMessageTimestamp: server.lastMessageTimestamp || local.lastMessageTimestamp,
          lastMessageSenderId: server.lastMessageSenderId || local.lastMessageSenderId,
          lastMessageSenderName: server.lastMessageSenderName || local.lastMessageSenderName
        };
      }
      return {
        ...local,
        ...server,
        participantIds: server.participantIds?.length ? server.participantIds : local.participantIds
      };
    });

  // Add new conversations from incoming
  const existingIds = new Set(existingList.map(c => c.id));
  incomingList.forEach(inc => {
    if (inc && inc.id && !existingIds.has(inc.id) && !SEED_CHAT_CONVERSATION_IDS.has(inc.id)) {
      merged.push(inc);
    }
  });

  // Deduplicate and consolidate duplicate direct / client conversations
  const { conversations: deduplicated } = deduplicateAndMergeConversations(merged);

  return deduplicated.sort((a, b) => {
    const timeA = new Date(a.lastMessageTimestamp || a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.lastMessageTimestamp || b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Reconciles messages from server with local messages state idempotently.
 * Preserves optimistic messages in flight, synchronizes reactions & read receipts,
 * and seamlessly redirects messages from legacy duplicate conversations into canonical conversations.
 */
export function reconcileChatMessages(
  existingList: ChatMessage[],
  incomingList: ChatMessage[],
  redirectMap?: Map<string, string>
): ChatMessage[] {
  const isDeletedMessage = (m: any): boolean => {
    if (!m) return true;
    if (m.isDeleted) return true;
    if (m.deletedAt) return true;
    if (m.status === 'deleted') return true;
    return false;
  };

  const incomingMap = new Map<string, ChatMessage>();
  incomingList.forEach(m => {
    if (m && m.id) {
      const cleanId = String(m.id).trim();
      const cleanConvId = String(m.conversationId || '').trim();
      if (!SEED_CHAT_MESSAGE_IDS.has(cleanId) && !SEED_CHAT_CONVERSATION_IDS.has(cleanConvId) && !isDeletedMessage(m)) {
        incomingMap.set(cleanId, {
          ...m,
          id: cleanId,
          conversationId: cleanConvId
        });
      }
    }
  });

  const merged = existingList
    .filter(m => {
      if (!m || !m.id) return false;
      const cleanId = String(m.id).trim();
      const cleanConvId = String(m.conversationId || '').trim();
      if (SEED_CHAT_MESSAGE_IDS.has(cleanId) || SEED_CHAT_CONVERSATION_IDS.has(cleanConvId) || isDeletedMessage(m)) {
        return false;
      }
      return true;
    })
    .map(local => {
      const cleanLocalId = String(local.id).trim();
      const server = incomingMap.get(cleanLocalId);
      if (!server) {
        return {
          ...local,
          id: cleanLocalId,
          conversationId: String(local.conversationId || '').trim()
        };
      }

      const serverReactions = server.reactions || {};
      const localReactions = local.reactions || {};
      const mergedReactions: Record<string, string[]> = { ...serverReactions };

      Object.entries(localReactions).forEach(([emoji, userIds]) => {
        if (!mergedReactions[emoji]) {
          mergedReactions[emoji] = userIds;
        } else {
          mergedReactions[emoji] = Array.from(new Set([...mergedReactions[emoji], ...userIds]));
        }
      });

      const combinedReadBy = Array.from(new Set([...(local.readBy || []), ...(server.readBy || [])]));

      return {
        ...server,
        id: cleanLocalId,
        conversationId: String(server.conversationId || local.conversationId || '').trim(),
        reactions: Object.keys(serverReactions).length > 0 ? serverReactions : mergedReactions,
        readBy: combinedReadBy
      };
    });

  const existingIds = new Set(merged.map(m => String(m.id).trim()));
  incomingList.forEach(inc => {
    if (inc && inc.id && !isDeletedMessage(inc)) {
      const cleanId = String(inc.id).trim();
      const cleanConvId = String(inc.conversationId || '').trim();
      if (!existingIds.has(cleanId) && !SEED_CHAT_MESSAGE_IDS.has(cleanId) && !SEED_CHAT_CONVERSATION_IDS.has(cleanConvId)) {
        merged.push({
          ...inc,
          id: cleanId,
          conversationId: cleanConvId
        });
        existingIds.add(cleanId);
      }
    }
  });

  // Re-assign any messages from redirected duplicate conversation IDs into their canonical conversation
  const finalMessages = redirectMap && redirectMap.size > 0
    ? merged.map(m => {
        const cleanCId = String(m.conversationId).trim();
        for (const [oldId, canonId] of redirectMap.entries()) {
          if (cleanCId.toLowerCase() === oldId.toLowerCase()) {
            return { ...m, conversationId: canonId };
          }
        }
        return m;
      })
    : merged;

  return finalMessages.sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeA - timeB;
  });
}

