/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChatConversation, ChatMessage } from '../types';

export const INITIAL_CHAT_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-group-studio-production',
    type: 'group',
    title: 'Studio Production & Press',
    participantIds: ['admin', 'STF-101'],
    lastMessageText: 'Screens for the new uniform batch are prepared and aligned! 👍',
    lastMessageTimestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    lastMessageSenderId: 'STF-101',
    lastMessageSenderName: 'Regie Santos',
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString()
  },
  {
    id: 'conv-direct-admin-stf101',
    type: 'direct',
    title: 'Regie Santos',
    participantIds: ['admin', 'STF-101'],
    lastMessageText: 'Great work on the weekend rush order, Regie. Inventory logs are updated.',
    lastMessageTimestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    lastMessageSenderId: 'admin',
    lastMessageSenderName: 'Admin',
    createdBy: 'admin',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 110 * 60 * 1000).toISOString()
  },
  {
    id: 'conv-client-co-1',
    type: 'client_admin',
    title: 'Paramount Studios',
    companyId: 'co-1',
    participantIds: ['admin', 'co-1'],
    lastMessageText: 'Hi ARH Print team! Can we double check the embroidery thread color for the jackets?',
    lastMessageTimestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    lastMessageSenderId: 'co-1',
    lastMessageSenderName: 'Paramount Studios',
    createdBy: 'co-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  // Group chat messages
  {
    id: 'msg-grp-1',
    conversationId: 'conv-group-studio-production',
    senderId: 'admin',
    senderName: 'Admin',
    senderRole: 'admin',
    text: 'Welcome to the Studio Production channel. All print press calibrations and schedule updates will be logged here.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    readBy: ['admin', 'STF-101'],
    reactions: { '🙌': ['Regie Santos', 'Admin'] }
  },
  {
    id: 'msg-grp-2',
    conversationId: 'conv-group-studio-production',
    senderId: 'STF-101',
    senderName: 'Regie Santos',
    senderRole: 'staff',
    text: 'Understood! We inspected the plastisol ink levels and mesh screens this morning.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
    readBy: ['admin', 'STF-101'],
    reactions: { '👍': ['Admin'] }
  },
  {
    id: 'msg-grp-3',
    conversationId: 'conv-group-studio-production',
    senderId: 'STF-101',
    senderName: 'Regie Santos',
    senderRole: 'staff',
    text: 'Screens for the new uniform batch are prepared and aligned! 👍',
    timestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    readBy: ['STF-101'],
    reactions: { '🔥': ['Admin'], '🚀': ['Regie Santos'] }
  },

  // Direct chat messages
  {
    id: 'msg-dir-1',
    conversationId: 'conv-direct-admin-stf101',
    senderId: 'STF-101',
    senderName: 'Regie Santos',
    senderRole: 'staff',
    text: 'Hi Admin, I submitted the updated supply replenishment report for emulsion fluid.',
    timestamp: new Date(Date.now() - 125 * 60 * 1000).toISOString(),
    readBy: ['admin', 'STF-101']
  },
  {
    id: 'msg-dir-2',
    conversationId: 'conv-direct-admin-stf101',
    senderId: 'admin',
    senderName: 'Admin',
    senderRole: 'admin',
    text: 'Great work on the weekend rush order, Regie. Inventory logs are updated.',
    timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    readBy: ['admin', 'STF-101'],
    reactions: { '🙏': ['Regie Santos'] }
  },

  // Client support messages
  {
    id: 'msg-clt-1',
    conversationId: 'conv-client-co-1',
    senderId: 'admin',
    senderName: 'ARH Support',
    senderRole: 'admin',
    text: 'Welcome to your direct support channel with ARH Print Hub! Feel free to ask questions about your orders, proofs, and delivery estimates.',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    readBy: ['admin', 'co-1']
  },
  {
    id: 'msg-clt-2',
    conversationId: 'conv-client-co-1',
    senderId: 'co-1',
    senderName: 'Paramount Studios',
    senderRole: 'client',
    text: 'Hi ARH Print team! Can we double check the embroidery thread color for the jackets?',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    readBy: ['co-1']
  }
];
