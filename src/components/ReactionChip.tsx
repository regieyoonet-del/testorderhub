/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

interface ReactionChipProps {
  commentId: string;
  emoji: string;
  users: string[];
  currentUserId: string;
  hasReacted: boolean;
  onToggleReaction: (commentId: string, emoji: string) => void;
  getUserDisplayName: (userId: string) => string;
  isOpen: boolean;
  onTogglePopover: () => void;
  onClosePopover: () => void;
}

/**
 * Formats reactor names according to specification:
 * - 1 reactor: "❤️ Regie"
 * - 2-3 reactors: "👍 Regie, Chris, Jon"
 * - 4+ reactors: "👍 Regie, Chris, Jon + X more"
 */
export function formatReactorSummary(
  emoji: string,
  reactorNames: string[],
  maxVisible: number = 3
): string {
  if (!reactorNames || reactorNames.length === 0) return emoji;
  const total = reactorNames.length;
  if (total <= maxVisible) {
    return `${emoji} ${reactorNames.join(', ')}`;
  }
  const visible = reactorNames.slice(0, maxVisible).join(', ');
  const remaining = total - maxVisible;
  return `${emoji} ${visible} + ${remaining} more`;
}

export const ReactionChip: React.FC<ReactionChipProps> = ({
  commentId,
  emoji,
  users,
  currentUserId,
  hasReacted,
  onToggleReaction,
  getUserDisplayName,
  isOpen,
  onTogglePopover,
  onClosePopover
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const chipContainerRef = useRef<HTMLDivElement | null>(null);

  // Position adjustments to prevent clipping near viewport edges
  const [horizontalAlign, setHorizontalAlign] = useState<'left' | 'right'>('left');
  const [verticalPlacement, setVerticalPlacement] = useState<'top' | 'bottom'>('top');

  // Distinct unique users and ordered names (current user first if reacted)
  const uniqueUserIds: string[] = Array.from(new Set<string>(users));
  const count = uniqueUserIds.length;

  const sortedUserIds: string[] = [...uniqueUserIds].sort((a: string, b: string) => {
    const isACurrent = a === currentUserId;
    const isBCurrent = b === currentUserId;
    if (isACurrent) return -1;
    if (isBCurrent) return 1;
    return a.localeCompare(b);
  });

  const resolvedNames: string[] = sortedUserIds.map(getUserDisplayName);
  const summaryText = formatReactorSummary(emoji, resolvedNames, 3);

  const shouldShowPopover = (isHovered || isOpen) && count > 0;

  // Handle boundary detection whenever popover becomes visible
  useLayoutEffect(() => {
    if (!shouldShowPopover || !popoverRef.current || !chipContainerRef.current) return;

    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Check horizontal bounds
    if (popoverRect.right > viewportWidth - 16) {
      setHorizontalAlign('right');
    } else {
      setHorizontalAlign('left');
    }

    // Check vertical bounds (if near top of container or screen, place below chip)
    if (popoverRect.top < 50) {
      setVerticalPlacement('bottom');
    } else {
      setVerticalPlacement('top');
    }
  }, [shouldShowPopover]);

  // Handle mouse hover with slight debounce to prevent jitter
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={chipContainerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      id={`chip-reaction-wrapper-${commentId}-${emoji}`}
    >
      {/* Reaction Chip */}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono transition-all select-none ${
          hasReacted
            ? 'bg-blue-50 border border-blue-300 text-blue-900 font-semibold hover:bg-blue-100 shadow-2xs'
            : 'bg-gray-100/90 border border-gray-200 text-gray-700 font-medium hover:bg-gray-200/70 hover:text-black shadow-2xs'
        }`}
        id={`chip-reaction-${commentId}-${emoji}`}
      >
        {/* Emoji: Direct toggle interaction */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleReaction(commentId, emoji);
          }}
          className="text-xs leading-none hover:scale-110 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
          title={hasReacted ? `Remove reaction (${emoji})` : `React with ${emoji}`}
          id={`btn-react-emoji-toggle-${commentId}-${emoji}`}
        >
          {emoji}
        </button>

        {/* Count: On mobile/touch tap opens reactor names popup; clicking emoji toggles reaction */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const nativeEvent = e.nativeEvent as PointerEvent | MouseEvent;
            const isTouch =
              ('pointerType' in nativeEvent && nativeEvent.pointerType === 'touch') ||
              (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0));

            if (isTouch) {
              onTogglePopover();
            } else {
              // On desktop mouse, clicking count toggles/pins popover as well, while clicking emoji toggles reaction
              onTogglePopover();
            }
          }}
          className="text-[11px] leading-none font-bold cursor-pointer hover:opacity-80 flex items-center justify-center"
          title={`View who reacted with ${emoji}`}
          id={`btn-react-count-${commentId}-${emoji}`}
        >
          {count}
        </button>
      </div>

      {/* Reactor Names Popover (Desktop Hover & Mobile Tap) */}
      {shouldShowPopover && (
        <div
          ref={popoverRef}
          className={`absolute z-50 pointer-events-auto bg-gray-900/95 backdrop-blur-xs text-white text-xs rounded-xl shadow-xl px-2.5 py-1.5 min-w-max max-w-[280px] sm:max-w-[340px] border border-gray-800 animate-in fade-in zoom-in-95 duration-100 ${
            verticalPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${
            horizontalAlign === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'
          }`}
          role="tooltip"
          id={`popover-reactors-${commentId}-${emoji}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Reactor Summary line */}
          <div className="flex items-center gap-1.5 leading-snug font-sans">
            <span className="text-gray-100 font-semibold break-words text-left">
              {summaryText}
            </span>
          </div>

          {/* Quick toggle option for touch users & clear affordance */}
          <div className="pt-1 mt-1 border-t border-gray-800 flex items-center justify-between gap-2 text-[10px] font-sans">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleReaction(commentId, emoji);
              }}
              className={`px-1.5 py-0.5 rounded font-mono font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                hasReacted
                  ? 'bg-blue-900/70 text-blue-200 hover:bg-blue-800 border border-blue-700/60'
                  : 'bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white border border-gray-700'
              }`}
              id={`btn-popover-toggle-${commentId}-${emoji}`}
            >
              {hasReacted ? '✓ You reacted (tap to remove)' : `+ React with ${emoji}`}
            </button>

            {isOpen && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClosePopover();
                }}
                className="text-gray-400 hover:text-gray-200 cursor-pointer ml-auto"
                title="Dismiss"
              >
                Close
              </button>
            )}
          </div>

          {/* Popover Arrow */}
          <div
            className={`absolute border-4 border-transparent ${
              verticalPlacement === 'top'
                ? 'top-full border-t-gray-900/95 -mt-1'
                : 'bottom-full border-b-gray-900/95 -mb-1'
            } ${
              horizontalAlign === 'right' ? 'right-3' : 'left-3'
            }`}
          />
        </div>
      )}
    </div>
  );
};

export default ReactionChip;
