/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search } from 'lucide-react';

export interface EmojiItem {
  emoji: string;
  name: string;
  category: 'popular' | 'smileys' | 'gestures' | 'work' | 'symbols';
  keywords: string[];
}

export const EMOJI_CATALOG: EmojiItem[] = [
  // POPULAR / QUICK
  { emoji: '👍', name: 'Thumbs Up', category: 'popular', keywords: ['like', 'approve', 'yes', 'good', 'agree', 'thumb'] },
  { emoji: '❤️', name: 'Red Heart', category: 'popular', keywords: ['love', 'like', 'heart', 'favorite'] },
  { emoji: '🔥', name: 'Fire', category: 'popular', keywords: ['lit', 'hot', 'flame', 'awesome', 'great'] },
  { emoji: '🎉', name: 'Party Popper', category: 'popular', keywords: ['celebrate', 'tada', 'congrats', 'party', 'done'] },
  { emoji: '😂', name: 'Face with Tears of Joy', category: 'popular', keywords: ['laugh', 'funny', 'haha', 'lol', 'cry'] },
  { emoji: '👏', name: 'Clapping Hands', category: 'popular', keywords: ['applause', 'praise', 'bravo', 'clap'] },
  { emoji: '✅', name: 'Check Mark', category: 'popular', keywords: ['done', 'complete', 'approved', 'ok', 'yes', 'verified'] },
  { emoji: '🙌', name: 'Raising Hands', category: 'popular', keywords: ['hooray', 'celebration', 'praise', 'hands'] },
  { emoji: '✨', name: 'Sparkles', category: 'popular', keywords: ['magic', 'shine', 'clean', 'new', 'special'] },
  { emoji: '💯', name: 'Hundred Points', category: 'popular', keywords: ['perfect', 'score', '100', 'full'] },
  { emoji: '🚀', name: 'Rocket', category: 'popular', keywords: ['launch', 'fast', 'speed', 'ship', 'deploy'] },
  { emoji: '👀', name: 'Eyes', category: 'popular', keywords: ['look', 'see', 'review', 'check', 'watching'] },
  { emoji: '💬', name: 'Speech Balloon', category: 'popular', keywords: ['comment', 'chat', 'message', 'talk'] },
  { emoji: '💡', name: 'Light Bulb', category: 'popular', keywords: ['idea', 'tip', 'solution', 'smart'] },
  { emoji: '🤝', name: 'Handshake', category: 'popular', keywords: ['deal', 'agreement', 'partner', 'welcome'] },
  { emoji: '🙏', name: 'Folded Hands', category: 'popular', keywords: ['please', 'thank you', 'thanks', 'pray', 'hope'] },

  // SMILEYS & EMOTION
  { emoji: '😀', name: 'Grinning Face', category: 'smileys', keywords: ['smile', 'happy', 'grin'] },
  { emoji: '😃', name: 'Grinning Face with Big Eyes', category: 'smileys', keywords: ['smile', 'happy', 'joy'] },
  { emoji: '😄', name: 'Grinning Face with Smiling Eyes', category: 'smileys', keywords: ['happy', 'laugh', 'pleased'] },
  { emoji: '😁', name: 'Beaming Face with Smiling Eyes', category: 'smileys', keywords: ['grin', 'teeth', 'proud'] },
  { emoji: '😆', name: 'Grinning Squinting Face', category: 'smileys', keywords: ['laugh', 'lol', 'haha'] },
  { emoji: '😅', name: 'Grinning Face with Sweat', category: 'smileys', keywords: ['relief', 'whew', 'close'] },
  { emoji: '🤣', name: 'Rolling on the Floor Laughing', category: 'smileys', keywords: ['rofl', 'hilarious', 'laugh'] },
  { emoji: '🙂', name: 'Slightly Smiling Face', category: 'smileys', keywords: ['smile', 'ok', 'pleasant'] },
  { emoji: '😉', name: 'Winking Face', category: 'smileys', keywords: ['wink', 'flirt', 'joke', 'playful'] },
  { emoji: '😊', name: 'Smiling Face with Smiling Eyes', category: 'smileys', keywords: ['blush', 'warm', 'friendly', 'happy'] },
  { emoji: '😇', name: 'Smiling Face with Halo', category: 'smileys', keywords: ['angel', 'innocent', 'good'] },
  { emoji: '🥰', name: 'Smiling Face with Hearts', category: 'smileys', keywords: ['love', 'adore', 'fond'] },
  { emoji: '😍', name: 'Heart Eyes', category: 'smileys', keywords: ['love', 'crush', 'beautiful'] },
  { emoji: '🤩', name: 'Star-Struck', category: 'smileys', keywords: ['stars', 'excited', 'impressed'] },
  { emoji: '😘', name: 'Face Blowing a Kiss', category: 'smileys', keywords: ['kiss', 'affection'] },
  { emoji: '😋', name: 'Face Savoring Food', category: 'smileys', keywords: ['delicious', 'yum', 'taste'] },
  { emoji: '😜', name: 'Winking Face with Tongue', category: 'smileys', keywords: ['tongue', 'joke', 'crazy'] },
  { emoji: '🤪', name: 'Zany Face', category: 'smileys', keywords: ['wild', 'silly', 'party'] },
  { emoji: '😎', name: 'Smiling Face with Sunglasses', category: 'smileys', keywords: ['cool', 'boss', 'done'] },
  { emoji: '🥳', name: 'Partying Face', category: 'smileys', keywords: ['party', 'celebrate', 'birthday'] },
  { emoji: '😏', name: 'Smirking Face', category: 'smileys', keywords: ['smirk', 'clever'] },
  { emoji: '🤔', name: 'Thinking Face', category: 'smileys', keywords: ['think', 'ponder', 'wonder', 'hmm'] },
  { emoji: '🤫', name: 'Shushing Face', category: 'smileys', keywords: ['quiet', 'secret', 'shh'] },
  { emoji: '🫡', name: 'Saluting Face', category: 'smileys', keywords: ['salute', 'yes sir', 'roger', 'understood'] },
  { emoji: '🤐', name: 'Zipper-Mouth Face', category: 'smileys', keywords: ['silent', 'quiet'] },
  { emoji: '🤨', name: 'Face with Raised Eyebrow', category: 'smileys', keywords: ['skeptical', 'doubt'] },
  { emoji: '😐', name: 'Neutral Face', category: 'smileys', keywords: ['meh', 'straight'] },
  { emoji: '😑', name: 'Expressionless Face', category: 'smileys', keywords: ['blank', 'unimpressed'] },
  { emoji: '😶', name: 'Face Without Mouth', category: 'smileys', keywords: ['mute', 'speechless'] },
  { emoji: '🙄', name: 'Face with Rolling Eyes', category: 'smileys', keywords: ['eyeroll', 'whatever'] },
  { emoji: '😬', name: 'Grimacing Face', category: 'smileys', keywords: ['awkward', 'oops', 'nervous'] },
  { emoji: '😮‍💨', name: 'Face Exhaling', category: 'smileys', keywords: ['sigh', 'relief', 'tired'] },
  { emoji: '😴', name: 'Sleeping Face', category: 'smileys', keywords: ['sleep', 'zzz', 'night'] },
  { emoji: '😷', name: 'Face with Medical Mask', category: 'smileys', keywords: ['sick', 'mask'] },
  { emoji: '🤯', name: 'Exploding Head', category: 'smileys', keywords: ['mindblown', 'shock', 'wow'] },
  { emoji: '😮', name: 'Face with Open Mouth', category: 'smileys', keywords: ['surprise', 'wow'] },
  { emoji: '😲', name: 'Astonished Face', category: 'smileys', keywords: ['gasp', 'shocked'] },
  { emoji: '😳', name: 'Flushed Face', category: 'smileys', keywords: ['blush', 'embarrassed'] },
  { emoji: '🥺', name: 'Pleading Face', category: 'smileys', keywords: ['puppy eyes', 'begging', 'please'] },
  { emoji: '😢', name: 'Crying Face', category: 'smileys', keywords: ['sad', 'tear', 'upset'] },
  { emoji: '😭', name: 'Loudly Crying Face', category: 'smileys', keywords: ['sob', 'tears', 'crying'] },
  { emoji: '😱', name: 'Face Screaming in Fear', category: 'smileys', keywords: ['scream', 'scared', 'shock'] },
  { emoji: '😤', name: 'Face with Steam From Nose', category: 'smileys', keywords: ['triumph', 'proud', 'determined'] },
  { emoji: '😡', name: 'Enraged Face', category: 'smileys', keywords: ['angry', 'mad', 'red'] },

  // GESTURES & PEOPLE
  { emoji: '👎', name: 'Thumbs Down', category: 'gestures', keywords: ['dislike', 'no', 'bad'] },
  { emoji: '👌', name: 'OK Hand', category: 'gestures', keywords: ['ok', 'perfect', 'fine'] },
  { emoji: '✌️', name: 'Victory Hand', category: 'gestures', keywords: ['peace', 'v', 'two'] },
  { emoji: '🤞', name: 'Crossed Fingers', category: 'gestures', keywords: ['luck', 'hopeful'] },
  { emoji: '🫰', name: 'Hand with Index Finger and Thumb Crossed', category: 'gestures', keywords: ['love', 'money', 'kpop'] },
  { emoji: '🤟', name: 'Love-You Gesture', category: 'gestures', keywords: ['love', 'rock'] },
  { emoji: '🤘', name: 'Sign of the Horns', category: 'gestures', keywords: ['rock on', 'party'] },
  { emoji: '🤙', name: 'Call Me Hand', category: 'gestures', keywords: ['shaka', 'call', 'hang loose'] },
  { emoji: '👈', name: 'Backhand Index Pointing Left', category: 'gestures', keywords: ['point', 'left'] },
  { emoji: '👉', name: 'Backhand Index Pointing Right', category: 'gestures', keywords: ['point', 'right'] },
  { emoji: '👆', name: 'Backhand Index Pointing Up', category: 'gestures', keywords: ['point', 'up'] },
  { emoji: '👇', name: 'Backhand Index Pointing Down', category: 'gestures', keywords: ['point', 'down'] },
  { emoji: '☝️', name: 'Index Pointing Up', category: 'gestures', keywords: ['one', 'attention'] },
  { emoji: '✋', name: 'Raised Hand', category: 'gestures', keywords: ['stop', 'high five', 'hand'] },
  { emoji: '👋', name: 'Waving Hand', category: 'gestures', keywords: ['hello', 'hi', 'bye', 'wave'] },
  { emoji: '👐', name: 'Open Hands', category: 'gestures', keywords: ['open', 'hug'] },
  { emoji: '✍️', name: 'Writing Hand', category: 'gestures', keywords: ['write', 'note', 'signing'] },
  { emoji: '💪', name: 'Flexed Biceps', category: 'gestures', keywords: ['strong', 'power', 'muscle', 'tough'] },
  { emoji: '🗣️', name: 'Speaking Head', category: 'gestures', keywords: ['talk', 'announcement', 'voice'] },
  { emoji: '👤', name: 'Bust in Silhouette', category: 'gestures', keywords: ['user', 'person', 'profile'] },
  { emoji: '👥', name: 'Busts in Silhouette', category: 'gestures', keywords: ['team', 'group', 'people'] },

  // PRODUCTION & WORK
  { emoji: '🖨️', name: 'Printer', category: 'work', keywords: ['print', 'printing', 'press', 'job', 'dtf'] },
  { emoji: '📦', name: 'Package', category: 'work', keywords: ['box', 'parcel', 'shipment', 'delivery', 'order'] },
  { emoji: '✂️', name: 'Scissors', category: 'work', keywords: ['cut', 'trim', 'cutting', 'sewing'] },
  { emoji: '🎨', name: 'Artist Palette', category: 'work', keywords: ['art', 'design', 'color', 'artwork'] },
  { emoji: '📐', name: 'Triangular Ruler', category: 'work', keywords: ['ruler', 'measure', 'dimensions', 'size'] },
  { emoji: '📏', name: 'Straight Ruler', category: 'work', keywords: ['measure', 'length', 'scale'] },
  { emoji: '🏷️', name: 'Label', category: 'work', keywords: ['tag', 'price', 'brand', 'label'] },
  { emoji: '📄', name: 'Page Facing Up', category: 'work', keywords: ['file', 'doc', 'proof', 'specs'] },
  { emoji: '📑', name: 'Bookmark Tabs', category: 'work', keywords: ['tabs', 'docs', 'order sheet'] },
  { emoji: '📝', name: 'Memo', category: 'work', keywords: ['note', 'notes', 'instruction', 'memo'] },
  { emoji: '📋', name: 'Clipboard', category: 'work', keywords: ['list', 'checklist', 'task', 'job sheet'] },
  { emoji: '📁', name: 'File Folder', category: 'work', keywords: ['folder', 'files', 'assets'] },
  { emoji: '📊', name: 'Bar Chart', category: 'work', keywords: ['chart', 'analytics', 'stats', 'growth'] },
  { emoji: '📈', name: 'Chart Increasing', category: 'work', keywords: ['progress', 'up', 'sales'] },
  { emoji: '📌', name: 'Pushpin', category: 'work', keywords: ['pin', 'important', 'notice', 'highlight'] },
  { emoji: '📎', name: 'Paperclip', category: 'work', keywords: ['attachment', 'clip', 'link'] },
  { emoji: '🧵', name: 'Thread', category: 'work', keywords: ['thread', 'embroidery', 'sewing', 'stitch'] },
  { emoji: '🪡', name: 'Sewing Needle', category: 'work', keywords: ['needle', 'embroidery', 'garment'] },
  { emoji: '👕', name: 'T-Shirt', category: 'work', keywords: ['shirt', 'apparel', 'clothing', 'garment'] },
  { emoji: '🧢', name: 'Billed Cap', category: 'work', keywords: ['hat', 'cap', 'headwear'] },
  { emoji: '💻', name: 'Laptop', category: 'work', keywords: ['computer', 'tech', 'online'] },
  { emoji: '🖥️', name: 'Desktop Computer', category: 'work', keywords: ['screen', 'pc', 'workstation'] },
  { emoji: '📱', name: 'Mobile Phone', category: 'work', keywords: ['phone', 'sms', 'call', 'client'] },
  { emoji: '⏱️', name: 'Stopwatch', category: 'work', keywords: ['time', 'timer', 'rush', 'deadline'] },
  { emoji: '⏰', name: 'Alarm Clock', category: 'work', keywords: ['clock', 'urgent', 'time', 'alert'] },
  { emoji: '⏳', name: 'Hourglass Not Done', category: 'work', keywords: ['pending', 'waiting', 'process'] },
  { emoji: '⌛', name: 'Hourglass Done', category: 'work', keywords: ['finished', 'due', 'time'] },
  { emoji: '🔔', name: 'Bell', category: 'work', keywords: ['notify', 'alert', 'reminder'] },
  { emoji: '🔨', name: 'Hammer', category: 'work', keywords: ['tool', 'build', 'fix'] },
  { emoji: '🔧', name: 'Wrench', category: 'work', keywords: ['tool', 'repair', 'maintenance'] },
  { emoji: '🛠️', name: 'Hammer and Wrench', category: 'work', keywords: ['tools', 'hardware', 'custom'] },
  { emoji: '⚙️', name: 'Gear', category: 'work', keywords: ['settings', 'machinery', 'setup'] },
  { emoji: '🚚', name: 'Delivery Truck', category: 'work', keywords: ['truck', 'courier', 'shipping', 'dispatched'] },
  { emoji: '🚛', name: 'Articulated Lorry', category: 'work', keywords: ['freight', 'cargo', 'bulk'] },

  // CELEBRATION & SYMBOLS
  { emoji: '🎊', name: 'Confetti Ball', category: 'symbols', keywords: ['celebration', 'party', 'congrats'] },
  { emoji: '⭐', name: 'Star', category: 'symbols', keywords: ['favorite', 'gold', 'rating'] },
  { emoji: '🌟', name: 'Glowing Star', category: 'symbols', keywords: ['shine', 'highlight', 'special'] },
  { emoji: '💥', name: 'Collision', category: 'symbols', keywords: ['boom', 'impact', 'burst'] },
  { emoji: '🎯', name: 'Direct Hit', category: 'symbols', keywords: ['target', 'goal', 'bullseye', 'exact'] },
  { emoji: '🏆', name: 'Trophy', category: 'symbols', keywords: ['winner', 'champion', 'first', 'award'] },
  { emoji: '🥇', name: '1st Place Medal', category: 'symbols', keywords: ['gold', 'first', 'top'] },
  { emoji: '🧡', name: 'Orange Heart', category: 'symbols', keywords: ['heart', 'orange'] },
  { emoji: '💛', name: 'Yellow Heart', category: 'symbols', keywords: ['heart', 'yellow'] },
  { emoji: '💚', name: 'Green Heart', category: 'symbols', keywords: ['heart', 'green'] },
  { emoji: '💙', name: 'Blue Heart', category: 'symbols', keywords: ['heart', 'blue'] },
  { emoji: '💜', name: 'Purple Heart', category: 'symbols', keywords: ['heart', 'purple'] },
  { emoji: '🖤', name: 'Black Heart', category: 'symbols', keywords: ['heart', 'black'] },
  { emoji: '🤍', name: 'White Heart', category: 'symbols', keywords: ['heart', 'white'] },
  { emoji: '💔', name: 'Broken Heart', category: 'symbols', keywords: ['heartbreak', 'sad'] },
  { emoji: '✔️', name: 'Check Mark', category: 'symbols', keywords: ['check', 'done', 'tick'] },
  { emoji: '❌', name: 'Cross Mark', category: 'symbols', keywords: ['no', 'cancel', 'error', 'wrong'] },
  { emoji: '⚠️', name: 'Warning', category: 'symbols', keywords: ['caution', 'alert', 'notice', 'urgent'] },
  { emoji: '🚫', name: 'Prohibited', category: 'symbols', keywords: ['forbidden', 'stop', 'no'] },
  { emoji: '🛑', name: 'Stop Sign', category: 'symbols', keywords: ['stop', 'halt', 'octagonal'] },
  { emoji: '❓', name: 'Question Mark', category: 'symbols', keywords: ['help', 'ask', 'inquiry'] },
  { emoji: '❗', name: 'Exclamation Mark', category: 'symbols', keywords: ['important', 'attention', 'urgent'] },
  { emoji: '🟢', name: 'Green Circle', category: 'symbols', keywords: ['ready', 'online', 'approved', 'green'] },
  { emoji: '🟡', name: 'Yellow Circle', category: 'symbols', keywords: ['in progress', 'pending', 'yellow'] },
  { emoji: '🔴', name: 'Red Circle', category: 'symbols', keywords: ['stopped', 'blocked', 'red', 'critical'] },
  { emoji: '🔵', name: 'Blue Circle', category: 'symbols', keywords: ['info', 'blue', 'standard'] },
  { emoji: '💭', name: 'Thought Balloon', category: 'symbols', keywords: ['thinking', 'cloud', 'idea'] }
];

export const EMOJI_CATEGORIES: { id: EmojiItem['category']; label: string; icon: string }[] = [
  { id: 'popular', label: 'Popular', icon: '⚡' },
  { id: 'smileys', label: 'Smileys', icon: '😊' },
  { id: 'gestures', label: 'Gestures', icon: '👋' },
  { id: 'work', label: 'Production', icon: '🖨️' },
  { id: 'symbols', label: 'Symbols', icon: '🎉' }
];

export interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  placement?: 'top' | 'bottom';
  className?: string;
  id?: string;
  triggerId?: string;
}

export default function EmojiPickerPopover({
  isOpen,
  onClose,
  onSelectEmoji,
  placement = 'bottom',
  className = '',
  id,
  triggerId
}: EmojiPickerPopoverProps) {
  const [activeCategory, setActiveCategory] = useState<EmojiItem['category']>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        if (triggerId && target.closest && target.closest(`#${triggerId}`)) {
          return;
        }
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerId]);

  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return EMOJI_CATALOG.filter(item => item.category === activeCategory);
    }
    return EMOJI_CATALOG.filter(item => {
      if (item.name.toLowerCase().includes(q)) return true;
      if (item.emoji.includes(q)) return true;
      return item.keywords.some(k => k.includes(q));
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  const placementClasses =
    placement === 'top'
      ? 'bottom-full right-0 mb-2'
      : 'top-full right-0 mt-2';

  return (
    <div
      ref={popoverRef}
      className={`absolute ${placementClasses} z-50 bg-white border-2 border-black rounded-2xl shadow-xl p-2.5 w-[280px] sm:w-[300px] max-w-[calc(100vw-24px)] animate-in fade-in zoom-in-95 duration-100 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
      id={id || 'emoji-picker-popover'}
    >
      {/* Header with Search & Close */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-gray-100">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji..."
            className="w-full bg-gray-50 border border-gray-200 focus:border-black rounded-lg pl-7 pr-6 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          title="Close emoji picker (Esc)"
          id="btn-close-emoji-picker"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Tabs (shown when not searching) */}
      {!searchQuery && (
        <div className="flex items-center justify-between gap-1 py-1.5 border-b border-gray-100">
          {EMOJI_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-1 py-1 px-1 rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-2xs font-bold scale-102'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
                title={cat.label}
                id={`tab-emoji-cat-${cat.id}`}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="py-2 max-h-[160px] overflow-y-auto pr-0.5">
        {filteredEmojis.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400 font-mono">
            No matching emojis found
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {filteredEmojis.map((item) => (
              <button
                key={item.emoji + item.name}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEmoji(item.emoji);
                }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 active:scale-95 flex items-center justify-center text-lg transition-transform cursor-pointer leading-none"
                title={`${item.name} (${item.emoji})`}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] font-mono text-gray-400">
        <span>Click to insert at cursor</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
}
