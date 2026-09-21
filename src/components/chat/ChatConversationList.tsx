/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Users, User, Building, MessageSquare } from 'lucide-react';
import {
  ChatConversation,
  ChatMessage,
  CompanyProfile,
  StaffMember,
  StaffAccount
} from '../../types';
import UserAvatar from '../UserAvatar';
import {
  getConversationDisplayTitle,
  getConversationDisplayAvatar,
  getConversationUnreadCount,
  formatChatTimestamp
} from '../../utils/chatUtils';

export interface ChatConversationListProps {
  conversations: ChatConversation[];
  messages: ChatMessage[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewChatModal: () => void;
  currentUserId: string;
  currentUserRole: 'admin' | 'staff' | 'client';
  companies: CompanyProfile[];
  staff: StaffMember[];
  staffAccounts: StaffAccount[];
}

export default function ChatConversationList({
  conversations,
  messages,
  activeConversationId,
  onSelectConversation,
  onOpenNewChatModal,
  currentUserId,
  currentUserRole,
  companies = [],
  staff = [],
  staffAccounts = []
}: ChatConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'direct' | 'group' | 'client'>('all');

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Type filter
      if (filterTab === 'direct' && conv.type !== 'direct') return false;
      if (filterTab === 'group' && conv.type !== 'group') return false;
      if (filterTab === 'client' && conv.type !== 'client_admin') return false;

      // Search filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const title = getConversationDisplayTitle(conv, currentUserId, companies, staff, staffAccounts).toLowerCase();
      const lastMsg = (conv.lastMessageText || '').toLowerCase();

      return title.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, filterTab, searchQuery, currentUserId, companies, staff, staffAccounts]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80 lg:w-96 shrink-0 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Messages & Chat</h1>
            <p className="text-[10px] text-gray-400 font-mono">
              {currentUserRole === 'admin' ? 'Studio & Client Channels' : 'Team Hub'}
            </p>
          </div>
        </div>

        {currentUserRole !== 'client' && (
          <button
            type="button"
            onClick={onOpenNewChatModal}
            className="p-1.5 rounded-xl bg-black text-white hover:bg-gray-800 transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer shadow-2xs"
            title="Start new conversation or create group"
            id="btn-open-new-chat-modal"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">New</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-black text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('direct')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              filterTab === 'direct'
                ? 'bg-black text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <User className="w-3 h-3" />
            Direct
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('group')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              filterTab === 'group'
                ? 'bg-black text-white shadow-2xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-3 h-3" />
            Channels
          </button>
          {currentUserRole === 'admin' && (
            <button
              type="button"
              onClick={() => setFilterTab('client')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filterTab === 'client'
                  ? 'bg-black text-white shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Building className="w-3 h-3" />
              Clients
            </button>
          )}
        </div>
      </div>

      {/* Conversation Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 font-mono flex flex-col items-center gap-2">
            <MessageSquare className="w-8 h-8 text-gray-200" />
            <span>No conversations found</span>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isSelected = activeConversationId === conv.id;
            const title = getConversationDisplayTitle(conv, currentUserId, companies, staff, staffAccounts);
            const avatarUrl = getConversationDisplayAvatar(conv, currentUserId, companies, staff, staffAccounts);
            const unreadCount = getConversationUnreadCount(conv.id, messages, currentUserId);

            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-black'
                    : 'hover:bg-gray-50/80 border-l-4 border-transparent'
                }`}
                id={`btn-conversation-${conv.id}`}
              >
                {/* Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  {conv.type === 'group' ? (
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                  ) : conv.type === 'client_admin' ? (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={title} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  ) : (
                    <UserAvatar
                      name={title}
                      profilePictureUrl={avatarUrl}
                      size={40}
                    />
                  )}
                </div>

                {/* Info & Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-gray-900 truncate">
                      {title}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-1">
                      {formatChatTimestamp(conv.lastMessageTimestamp || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] text-gray-500 truncate font-sans">
                      {conv.lastMessageText ? (
                        <>
                          {conv.type === 'group' && conv.lastMessageSenderName && (
                            <span className="font-semibold text-gray-700">
                              {conv.lastMessageSenderName}:{' '}
                            </span>
                          )}
                          {conv.lastMessageText}
                        </>
                      ) : (
                        <span className="italic text-gray-400">No messages yet</span>
                      )}
                    </p>

                    {unreadCount > 0 && (
                      <span className="shrink-0 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
