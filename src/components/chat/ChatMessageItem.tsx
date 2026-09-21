/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Smile, Trash2 } from 'lucide-react';
import { ChatMessage } from '../../types';
import UserAvatar from '../UserAvatar';
import ReactionChip from '../ReactionChip';
import EmojiPickerPopover from '../EmojiPickerPopover';
import { formatChatTimestamp } from '../../utils/chatUtils';

export interface ChatMessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  currentUserId: string;
  currentUserDisplayName: string;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  canDelete?: boolean;
}

/**
 * Tokenizes plain text and turns standard web URLs into clickable, styled links.
 */
function renderMessageText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:opacity-80 break-all text-blue-600"
          onClick={e => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isCurrentUser,
  currentUserId,
  currentUserDisplayName,
  onToggleReaction,
  onDeleteMessage,
  canDelete = false
}) => {
  const [copied, setCopied] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [activeReactionPopoverEmoji, setActiveReactionPopoverEmoji] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSelectReaction = (emoji: string) => {
    onToggleReaction(message.id, emoji);
    setIsEmojiPickerOpen(false);
  };

  const reactions = message.reactions || {};
  const reactionEntries: [string, string[]][] = (Object.entries(reactions) as [string, string[]][]).filter(
    ([_, reactors]) => Array.isArray(reactors) && reactors.length > 0
  );

  // Quick top reaction emojis
  const QUICK_REACTIONS = ['👍', '❤️', '🔥', '🎉', '😂'];

  return (
    <div
      className={`group relative flex gap-3 px-4 py-2 transition-colors ${
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      } hover:bg-gray-50/50`}
      id={`chat-message-${message.id}`}
    >
      {/* Sender Avatar (only shown for other participants) */}
      {!isCurrentUser && (
        <div className="shrink-0 mt-0.5">
          <UserAvatar
            name={message.senderName}
            profilePictureUrl={message.senderAvatarUrl}
            size={34}
          />
        </div>
      )}

      {/* Message Content Container */}
      <div
        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
          isCurrentUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Sender Name & Meta Header */}
        <div
          className={`flex items-center gap-1.5 mb-1 text-[11px] font-mono ${
            isCurrentUser ? 'flex-row-reverse text-right' : 'flex-row text-left'
          }`}
        >
          {!isCurrentUser && (
            <span className="font-bold text-gray-900 font-sans">{message.senderName}</span>
          )}
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-semibold ${
              message.senderRole === 'admin'
                ? 'bg-black text-white'
                : message.senderRole === 'client'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {message.senderRole}
          </span>
          <span className="text-gray-400">{formatChatTimestamp(message.timestamp)}</span>
        </div>

        {/* Message Bubble */}
        <div className="relative group/bubble">
          <div
            className={`rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed break-words shadow-2xs ${
              isCurrentUser
                ? 'bg-black text-white rounded-tr-xs'
                : 'bg-white border border-gray-200 text-gray-900 rounded-tl-xs'
            }`}
          >
            {renderMessageText(message.text)}
          </div>

          {/* Hover Floating Action Bar */}
          <div
            className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 flex items-center bg-white border border-gray-300 rounded-full shadow-md px-1.5 py-0.5 gap-0.5 select-none ${
              isCurrentUser ? 'right-0 mr-1' : 'left-0 ml-1'
            }`}
          >
            {/* Quick Reactions */}
            <div className="hidden sm:flex items-center gap-0.5 pr-1 border-r border-gray-200">
              {QUICK_REACTIONS.slice(0, 3).map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onToggleReaction(message.id, emoji)}
                  className="hover:scale-125 transition-transform text-xs p-1 cursor-pointer"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reaction Picker Button */}
            <div className="relative">
              <button
                type="button"
                id={`btn-react-picker-${message.id}`}
                onClick={() => setIsEmojiPickerOpen(prev => !prev)}
                className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                title="Add reaction"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              {isEmojiPickerOpen && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50">
                  <EmojiPickerPopover
                    isOpen={isEmojiPickerOpen}
                    onClose={() => setIsEmojiPickerOpen(false)}
                    onSelectEmoji={handleSelectReaction}
                    placement="top"
                    triggerId={`btn-react-picker-${message.id}`}
                  />
                </div>
              )}
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Delete button (if permitted) */}
            {canDelete && onDeleteMessage && (
              <button
                type="button"
                onClick={() => onDeleteMessage(message.id)}
                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full cursor-pointer transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reaction Chips */}
        {reactionEntries.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1.5 ${
              isCurrentUser ? 'justify-end' : 'justify-start'
            }`}
          >
            {reactionEntries.map(([emoji, reactors]) => {
              const hasReacted =
                reactors.includes(currentUserId) ||
                reactors.includes(currentUserDisplayName);

              return (
                <ReactionChip
                  key={emoji}
                  commentId={message.id}
                  emoji={emoji}
                  users={reactors}
                  currentUserId={currentUserId}
                  hasReacted={hasReacted}
                  onToggleReaction={onToggleReaction}
                  getUserDisplayName={userId => {
                    if (userId === currentUserId || userId === currentUserDisplayName) {
                      return `${currentUserDisplayName} (You)`;
                    }
                    return userId;
                  }}
                  isOpen={activeReactionPopoverEmoji === emoji}
                  onTogglePopover={() => {
                    setActiveReactionPopoverEmoji(prev => (prev === emoji ? null : emoji));
                  }}
                  onClosePopover={() => setActiveReactionPopoverEmoji(null)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageItem;
