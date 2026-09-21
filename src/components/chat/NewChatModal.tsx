/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, Search, Users, User, Building, Plus, Check } from 'lucide-react';
import {
  StaffMember,
  StaffAccount,
  CompanyProfile,
  ChatConversation
} from '../../types';
import UserAvatar from '../UserAvatar';

export interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserRole: 'admin' | 'staff' | 'client';
  staffList: StaffMember[];
  staffAccounts: StaffAccount[];
  companies: CompanyProfile[];
  existingConversations: ChatConversation[];
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: (newConv: ChatConversation) => void;
}

export default function NewChatModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserRole,
  staffList = [],
  staffAccounts = [],
  companies = [],
  existingConversations = [],
  onSelectConversation,
  onCreateConversation
}: NewChatModalProps) {
  const [modalTab, setModalTab] = useState<'direct' | 'group' | 'client'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState('');

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      setModalTab('direct');
      setSearchQuery('');
      setGroupTitle('');
      setSelectedStaffIds([]);
      setGroupError('');
    }
  }, [isOpen]);

  // Combined staff directory
  const availableStaff = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string; department?: string; avatarUrl?: string }>();

    staffList.forEach(s => {
      if (s.id && s.id !== currentUserId) {
        map.set(s.id, {
          id: s.id,
          name: s.fullName,
          email: s.email,
          department: s.department,
          avatarUrl: s.profilePictureUrl || s.avatarUrl
        });
      }
    });

    staffAccounts.forEach(a => {
      const targetId = a.staffId || a.id;
      if (targetId && targetId !== currentUserId && !map.has(targetId)) {
        map.set(targetId, {
          id: targetId,
          name: a.name,
          email: a.email,
          department: a.role,
          avatarUrl: a.profilePictureUrl || a.avatarUrl
        });
      }
    });

    return Array.from(map.values());
  }, [staffList, staffAccounts, currentUserId]);

  // Filtered staff based on search query
  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableStaff;
    return availableStaff.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [availableStaff, searchQuery]);

  // Filtered companies for Admin client support tab
  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q))
    );
  }, [companies, searchQuery]);

  if (!isOpen) return null;

  // Handler for starting a direct conversation
  const handleStartDirectChat = (targetId: string, targetName: string) => {
    // Check if direct conversation already exists between these two
    const existing = existingConversations.find(c => {
      if (c.type !== 'direct') return false;
      return (
        c.participantIds.length === 2 &&
        c.participantIds.includes(currentUserId) &&
        c.participantIds.includes(targetId)
      );
    });

    if (existing) {
      onSelectConversation(existing.id);
      onClose();
      return;
    }

    const newConv: ChatConversation = {
      id: `conv-dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'direct',
      title: targetName,
      participantIds: [currentUserId, targetId],
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreateConversation(newConv);
    onClose();
  };

  // Handler for starting a client support conversation (Admin only)
  const handleStartClientChat = (company: CompanyProfile) => {
    const existing = existingConversations.find(c => {
      if (c.type !== 'client_admin') return false;
      return c.companyId === company.id || c.participantIds.includes(company.id);
    });

    if (existing) {
      onSelectConversation(existing.id);
      onClose();
      return;
    }

    const newConv: ChatConversation = {
      id: `conv-client-${company.id}-${Date.now()}`,
      type: 'client_admin',
      title: company.name,
      companyId: company.id,
      participantIds: ['admin', company.id],
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreateConversation(newConv);
    onClose();
  };

  // Handler for creating a group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const title = groupTitle.trim();
    if (!title) {
      setGroupError('Please enter a channel or group name.');
      return;
    }
    if (selectedStaffIds.length === 0) {
      setGroupError('Please select at least one staff participant.');
      return;
    }

    const participantIds = Array.from(new Set([currentUserId, ...selectedStaffIds]));

    const newConv: ChatConversation = {
      id: `conv-grp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'group',
      title,
      participantIds,
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreateConversation(newConv);
    onClose();
  };

  const toggleSelectStaffForGroup = (id: string) => {
    setGroupError('');
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      id="modal-new-chat-backdrop"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border-2 border-black w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        id="modal-new-chat-container"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Start Conversation</h2>
              <p className="text-xs text-gray-500 font-mono">Connect directly or collaborate in channels</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-200/60 transition-colors cursor-pointer"
            id="btn-close-new-chat-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        {currentUserRole === 'admin' && (
          <div className="flex border-b border-gray-200 px-5 pt-3 bg-white gap-2">
            <button
              type="button"
              onClick={() => setModalTab('direct')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                modalTab === 'direct'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Direct Message
            </button>
            <button
              type="button"
              onClick={() => setModalTab('group')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                modalTab === 'group'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              New Group / Channel
            </button>
            <button
              type="button"
              onClick={() => setModalTab('client')}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                modalTab === 'client'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Client Support
            </button>
          </div>
        )}

        {/* Search Bar for lists */}
        {modalTab !== 'group' && (
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={modalTab === 'client' ? 'Search client companies...' : 'Search staff directory...'}
                className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl pl-9 pr-4 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Tab Content: DIRECT CHAT */}
        {modalTab === 'direct' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-2">
            {/* If current user is staff, offer direct chat with Admin */}
            {currentUserRole === 'staff' && (
              <button
                type="button"
                onClick={() => handleStartDirectChat('admin', 'Admin')}
                className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 flex items-center gap-3 transition-all cursor-pointer group"
                id="btn-chat-with-admin"
              >
                <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ADM
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 group-hover:text-black">
                      ARH Admin / Management
                    </span>
                    <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-mono uppercase">
                      Admin
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">Official admin management & dispatch</p>
                </div>
              </button>
            )}

            {filteredStaff.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 font-mono">
                No matching staff members found
              </div>
            ) : (
              filteredStaff.map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleStartDirectChat(member.id, member.name)}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 flex items-center gap-3 transition-all cursor-pointer group"
                  id={`btn-new-chat-staff-${member.id}`}
                >
                  <UserAvatar
                    name={member.name}
                    profilePictureUrl={member.avatarUrl}
                    size={36}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 group-hover:text-black truncate">
                        {member.name}
                      </span>
                      {member.department && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                          {member.department}
                        </span>
                      )}
                    </div>
                    {member.email && (
                      <p className="text-[11px] text-gray-400 font-mono truncate">{member.email}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Tab Content: CREATE GROUP (Admin Only) */}
        {modalTab === 'group' && (
          <form onSubmit={handleCreateGroup} className="flex-1 flex flex-col overflow-hidden p-5">
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Channel / Group Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={groupTitle}
                  onChange={e => {
                    setGroupTitle(e.target.value);
                    setGroupError('');
                  }}
                  placeholder="e.g. Studio Production Floor, Screen Prep Team"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {groupError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 font-mono">
                  {groupError}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-800">
                    Select Participants ({selectedStaffIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStaffIds.length === availableStaff.length) {
                        setSelectedStaffIds([]);
                      } else {
                        setSelectedStaffIds(availableStaff.map(s => s.id));
                      }
                    }}
                    className="text-[11px] font-mono text-blue-600 hover:underline cursor-pointer"
                  >
                    {selectedStaffIds.length === availableStaff.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="max-h-[220px] overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {availableStaff.map(member => {
                    const isSelected = selectedStaffIds.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => toggleSelectStaffForGroup(member.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar
                            name={member.name}
                            profilePictureUrl={member.avatarUrl}
                            size={30}
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 truncate">{member.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono truncate">{member.department || 'Staff'}</p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-black border-black text-white' : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-black rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-black text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer shadow-xs"
              >
                Create Group
              </button>
            </div>
          </form>
        )}

        {/* Tab Content: CLIENT SUPPORT (Admin Only) */}
        {modalTab === 'client' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-2">
            {filteredCompanies.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400 font-mono">
                No matching client companies found
              </div>
            ) : (
              filteredCompanies.map(company => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => handleStartClientChat(company)}
                  className="w-full text-left p-2.5 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 flex items-center gap-3 transition-all cursor-pointer group"
                  id={`btn-new-chat-client-${company.id}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 group-hover:text-black truncate">
                        {company.name}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                        Client
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">
                      {company.contactPerson || company.contactEmail || `@${company.username}`}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
