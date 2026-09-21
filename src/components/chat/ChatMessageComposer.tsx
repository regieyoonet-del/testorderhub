/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile } from 'lucide-react';
import EmojiPickerPopover from '../EmojiPickerPopover';

export interface ChatMessageComposerProps {
  onSendMessage: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  conversationId: string;
}

export default function ChatMessageComposer({
  onSendMessage,
  placeholder = 'Type a message...',
  disabled = false,
  conversationId
}: ChatMessageComposerProps) {
  const [text, setText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus when conversation changes
  useEffect(() => {
    setText('');
    setIsEmojiPickerOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [conversationId]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText(prev => prev + emoji);
      return;
    }

    const start = textarea.selectionStart ?? text.length;
    const end = textarea.selectionEnd ?? text.length;
    const nextText = text.substring(0, start) + emoji + text.substring(end);
    setText(nextText);

    // Reposition cursor after inserted emoji
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  return (
    <div className="relative border-t border-gray-200 bg-white p-3 sm:p-4 shrink-0" id="chat-composer-container">
      {/* Emoji Picker Popover */}
      {isEmojiPickerOpen && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <EmojiPickerPopover
            isOpen={isEmojiPickerOpen}
            onClose={() => setIsEmojiPickerOpen(false)}
            onSelectEmoji={handleSelectEmoji}
            placement="top"
            triggerId="btn-chat-composer-emoji"
          />
        </div>
      )}

      <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 focus-within:border-black focus-within:ring-1 focus-within:ring-black/10 transition-all">
        {/* Emoji Button */}
        <button
          type="button"
          id="btn-chat-composer-emoji"
          onClick={() => setIsEmojiPickerOpen(prev => !prev)}
          className={`p-2 rounded-xl text-gray-500 hover:text-black hover:bg-gray-200/60 transition-colors cursor-pointer shrink-0 ${
            isEmojiPickerOpen ? 'bg-gray-200 text-black' : ''
          }`}
          title="Insert Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 max-h-[120px] py-2 px-1 text-xs sm:text-sm bg-transparent border-0 focus:outline-none focus:ring-0 resize-none text-gray-900 placeholder:text-gray-400 leading-relaxed font-sans"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={`p-2 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer ${
            text.trim() && !disabled
              ? 'bg-black text-white hover:bg-gray-800 shadow-xs active:scale-95'
              : 'text-gray-300 bg-gray-100 cursor-not-allowed'
          }`}
          title="Send message (Enter)"
          id="btn-chat-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-gray-400 font-mono">
        <span>Press <kbd className="bg-gray-100 px-1 rounded text-gray-600">Enter</kbd> to send, <kbd className="bg-gray-100 px-1 rounded text-gray-600">Shift+Enter</kbd> for newline</span>
      </div>
    </div>
  );
}
