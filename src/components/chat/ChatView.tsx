/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Users, Building, MessageSquare, Info, ShieldCheck } from 'lucide-react';
import {
  ChatConversation,
  ChatMessage,
  AuthUser,
  CompanyProfile,
  StaffMember,
  StaffAccount,
  SystemSettings
} from '../../types';
import ChatConversationList from './ChatConversationList';
import ChatMessageItem from './ChatMessageItem';
import ChatMessageComposer from './ChatMessageComposer';
import NewChatModal from './NewChatModal';
import UserAvatar from '../UserAvatar';
import {
  getCurrentChatUserId,
  getCurrentChatUserDisplayName,
  getCurrentChatUserAvatar,
  filterConversationsForUser,
  formatChatDateHeader,
  getConversationDisplayTitle,
  getConversationDisplayAvatar,
  resolveParticipantInfo
} from '../../utils/chatUtils';

export interface ChatViewProps {
  conversations: ChatConversation[];
  messages: ChatMessage[];
  loggedInUser?: AuthUser | null;
  currentUser?: AuthUser | null;
  activeCompany?: CompanyProfile | null;
  companies: CompanyProfile[];
  staff?: StaffMember[];
  staffMembers?: StaffMember[];
  staffAccounts: StaffAccount[];
  systemSettings?: SystemSettings;
  onSendMessage: (conversationId: string, text: string) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onCreateConversation: (newConv: ChatConversation) => void;
  onMarkRead: (conversationId: string) => void;
  initialConversationId?: string;
  onBackToApp?: () => void;
  onActiveConversationChange?: (id: string | null) => void;
}

export default function ChatView({
  conversations = [],
  messages = [],
  loggedInUser,
  currentUser,
  activeCompany,
  companies = [],
  staff = [],
  staffMembers = [],
  staffAccounts = [],
  systemSettings,
  onSendMessage,
  onToggleReaction,
  onDeleteMessage,
  onCreateConversation,
  onMarkRead,
  initialConversationId,
  onBackToApp,
  onActiveConversationChange
}: ChatViewProps) {
  const effectiveUser = loggedInUser || currentUser || null;
  const effectiveStaff = staff && staff.length > 0 ? staff : staffMembers;
  const currentUserId = getCurrentChatUserId(effectiveUser, activeCompany, effectiveStaff, staffAccounts);
  const currentUserDisplayName = getCurrentChatUserDisplayName(effectiveUser, activeCompany, effectiveStaff);
  const currentUserRole: 'admin' | 'staff' | 'client' =
    effectiveUser?.role === 'admin' ? 'admin' : effectiveUser?.role === 'client' ? 'client' : 'staff';

  // Filter accessible conversations
  const accessibleConversations = useMemo(() => {
    return filterConversationsForUser(
      conversations,
      currentUserId,
      currentUserRole,
      activeCompany?.id || effectiveUser?.companyId
    );
  }, [conversations, currentUserId, currentUserRole, activeCompany, effectiveUser]);

  // Selected conversation state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (initialConversationId && accessibleConversations.some(c => c.id === initialConversationId)) {
      return initialConversationId;
    }
    return accessibleConversations.length > 0 ? accessibleConversations[0].id : null;
  });

  // New Chat Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Active conversation object
  const activeConversation = useMemo(() => {
    return accessibleConversations.find(c => c.id === activeConversationId) || null;
  }, [accessibleConversations, activeConversationId]);

  // Messages for active conversation
  const activeMessages = useMemo(() => {
    if (!activeConversationId) return [];
    return messages
      .filter(m => m.conversationId === activeConversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, activeConversationId]);

  // Mark as read when active conversation changes or new messages arrive
  useEffect(() => {
    if (activeConversationId) {
      onMarkRead(activeConversationId);
    }
  }, [activeConversationId, activeMessages.length]);

  // Notify parent of active conversation selection for targeted polling
  useEffect(() => {
    onActiveConversationChange?.(activeConversationId);
  }, [activeConversationId, onActiveConversationChange]);

  // Scroll to bottom on conversation change or new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversationId, activeMessages.length]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { dateHeader: string; messages: ChatMessage[] }[] = [];
    let currentDateHeader = '';
    let currentGroup: ChatMessage[] = [];

    activeMessages.forEach(msg => {
      const header = formatChatDateHeader(msg.timestamp);
      if (header !== currentDateHeader) {
        if (currentGroup.length > 0) {
          groups.push({ dateHeader: currentDateHeader, messages: currentGroup });
        }
        currentDateHeader = header;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ dateHeader: currentDateHeader, messages: currentGroup });
    }

    return groups;
  }, [activeMessages]);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setShowChannelInfo(false);
  };

  const handleSendMessage = (text: string) => {
    if (!activeConversationId) return;
    onSendMessage(activeConversationId, text);
  };

  // Resolve active conversation display details
  const activeTitle = activeConversation
    ? getConversationDisplayTitle(activeConversation, currentUserId, companies, staff, staffAccounts, systemSettings)
    : '';
  const activeAvatar = activeConversation
    ? getConversationDisplayAvatar(activeConversation, currentUserId, companies, staff, staffAccounts, systemSettings)
    : undefined;

  // Resolved participants for active conversation
  const activeParticipants = useMemo(() => {
    if (!activeConversation) return [];
    return activeConversation.participantIds.map(id =>
      resolveParticipantInfo(id, companies, staff, staffAccounts, systemSettings)
    );
  }, [activeConversation, companies, staff, staffAccounts, systemSettings]);

  const conversationCompany = useMemo(() => {
    if (!activeConversation?.companyId) return null;
    return companies.find(c => c.id?.toLowerCase() === activeConversation.companyId?.toLowerCase()) || null;
  }, [activeConversation, companies]);

  return (
    <div
      className="flex h-[calc(100vh-64px)] max-h-[920px] bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden relative"
      id="chat-main-container"
    >
      {/* LEFT: Conversation List */}
      <div
        className={`${
          activeConversationId ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 h-full shrink-0`}
      >
        <ChatConversationList
          conversations={accessibleConversations}
          messages={messages}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          companies={companies}
          staff={staff}
          staffAccounts={staffAccounts}
        />
      </div>

      {/* RIGHT: Active Chat Thread */}
      <div
        className={`${
          !activeConversationId ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col h-full bg-neutral-50/50 min-w-0`}
      >
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="h-16 px-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                  title="Back to conversations"
                  id="btn-chat-mobile-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                  {activeConversation.type === 'group' ? (
                    <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                  ) : activeConversation.type === 'client_admin' ? (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {activeAvatar ? (
                        <img src={activeAvatar} alt={activeTitle} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  ) : (
                    <UserAvatar
                      name={activeTitle}
                      profilePictureUrl={activeAvatar}
                      size={40}
                    />
                  )}
                </div>

                {/* Title & Subtitle */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900 truncate">
                      {activeTitle}
                    </h2>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider font-mono font-semibold ${
                        activeConversation.type === 'group'
                          ? 'bg-neutral-800 text-white'
                          : activeConversation.type === 'client_admin'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {activeConversation.type === 'group'
                        ? 'Channel'
                        : activeConversation.type === 'client_admin'
                        ? 'Client Support'
                        : 'Direct'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 truncate font-mono">
                    {activeConversation.type === 'group'
                      ? `${activeParticipants.length} team members`
                      : activeConversation.type === 'client_admin'
                      ? (currentUserRole === 'admin' && conversationCompany?.contactPerson
                          ? `Contact: ${conversationCompany.contactPerson} • Client Support`
                          : 'Secure Support Channel • ARH')
                      : 'End-to-End Team Chat'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {activeConversation.type === 'group' && (
                  <button
                    type="button"
                    onClick={() => setShowChannelInfo(prev => !prev)}
                    className={`p-2 rounded-xl text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer ${
                      showChannelInfo ? 'bg-gray-100 text-black' : ''
                    }`}
                    title="Channel Info & Members"
                    id="btn-channel-info-toggle"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Channel Info Drawer (if toggled) */}
            {showChannelInfo && activeConversation.type === 'group' && (
              <div className="p-4 bg-gray-50 border-b border-gray-200 text-xs animate-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900 font-mono uppercase tracking-wider text-[11px]">
                    Channel Members ({activeParticipants.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowChannelInfo(false)}
                    className="text-gray-400 hover:text-black text-[11px] font-mono cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                  {activeParticipants.map(p => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1 shadow-2xs"
                    >
                      <UserAvatar name={p.name} profilePictureUrl={p.avatarUrl} size={20} />
                      <span className="font-medium text-gray-800 text-[11px]">{p.name}</span>
                      <span className="text-[9px] text-gray-400 font-mono">({p.role})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4">
              {groupedMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 mb-1">No messages yet</p>
                  <p className="text-xs max-w-sm font-mono text-gray-400">
                    Send a message below to start this conversation. All messages are synchronized directly with your team.
                  </p>
                </div>
              ) : (
                groupedMessages.map(group => (
                  <div key={group.dateHeader} className="space-y-1">
                    {/* Date Divider */}
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-gray-200/80 text-gray-600 text-[10px] font-mono font-semibold px-3 py-0.5 rounded-full shadow-2xs select-none">
                        {group.dateHeader}
                      </div>
                    </div>

                    {/* Messages in Group */}
                    {group.messages.map(msg => (
                      <ChatMessageItem
                        key={msg.id}
                        message={msg}
                        isCurrentUser={msg.senderId === currentUserId}
                        currentUserId={currentUserId}
                        currentUserDisplayName={currentUserDisplayName}
                        onToggleReaction={onToggleReaction}
                        onDeleteMessage={onDeleteMessage}
                        canDelete={msg.senderId === currentUserId || currentUserRole === 'admin'}
                      />
                    ))}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Composer */}
            <ChatMessageComposer
              conversationId={activeConversation.id}
              onSendMessage={handleSendMessage}
              placeholder={`Message ${activeTitle}...`}
            />
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-3">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-bold text-gray-800 mb-1">Select a Conversation</h3>
            <p className="text-xs max-w-xs font-mono text-gray-400">
              Choose an existing chat from the left panel or click New to start a conversation.
            </p>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        staffList={staff}
        staffAccounts={staffAccounts}
        companies={companies}
        existingConversations={accessibleConversations}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={conv => {
          onCreateConversation(conv);
          setActiveConversationId(conv.id);
        }}
      />
    </div>
  );
}
