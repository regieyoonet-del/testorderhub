/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { cleanProfilePictureUrl } from '../utils/staffAvatarUtils';

export interface UserAvatarProps {
  name?: string;
  profilePictureUrl?: string;
  size?: number; // Approximate size in px, defaults to 28px
  className?: string;
  showBorder?: boolean;
  title?: string;
}

/**
 * Generate 1-2 character uppercase initials from a full name or username.
 * e.g. "John Smith" -> "JS", "Maria" -> "MA", "" -> "AM"
 */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'AM';
  const clean = name.trim().replace(/^@/, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AM';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

/**
 * Deterministic subtle color theme based on name hash.
 * Uses soft, elegant tones consistent with the ARH Print Hub palette.
 */
const AVATAR_THEMES = [
  { bg: 'bg-neutral-100 text-neutral-800 border-neutral-300' },
  { bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { bg: 'bg-amber-50 text-amber-900 border-amber-200' },
  { bg: 'bg-purple-50 text-purple-800 border-purple-200' },
  { bg: 'bg-rose-50 text-rose-800 border-rose-200' },
  { bg: 'bg-teal-50 text-teal-800 border-teal-200' },
  { bg: 'bg-slate-100 text-slate-800 border-slate-300' }
];

function getThemeForName(name?: string) {
  if (!name || !name.trim()) return AVATAR_THEMES[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_THEMES.length;
  return AVATAR_THEMES[index];
}

/**
 * Reusable User Avatar Component
 * Displays circular staff/admin profile picture from a standard image URL.
 * Falls back to initials if no URL is provided or if the image fails to load.
 */
export default function UserAvatar({
  name = '',
  profilePictureUrl,
  size = 28,
  className = '',
  showBorder = true,
  title
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const cleanUrl = useMemo(() => {
    return cleanProfilePictureUrl(profilePictureUrl) || '';
  }, [profilePictureUrl]);

  // Reset error and load state whenever cleanUrl changes
  useEffect(() => {
    setImageFailed(false);
    setHasLoaded(false);
  }, [cleanUrl]);

  const shouldAttemptImage = Boolean(cleanUrl && !imageFailed);
  const initials = getInitials(name);
  const theme = getThemeForName(name);

  // Calculate proportional font size (approx 36-38% of container diameter, min 9px)
  const fontSize = Math.max(9, Math.round(size * 0.38));

  const handleImageError = () => {
    console.warn(`[UserAvatar] Profile image failed to load for "${name || 'user'}"`, {
      name,
      account: title || name,
      failedUrl: cleanUrl
    });
    setImageFailed(true);
  };

  const handleImageLoad = () => {
    setHasLoaded(true);
  };

  const status = imageFailed
    ? 'failed'
    : hasLoaded
    ? 'loaded'
    : shouldAttemptImage
    ? 'loading'
    : 'no-url';

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`
      }}
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none ${
        showBorder ? 'border' : ''
      } ${
        shouldAttemptImage ? 'border-gray-200 bg-gray-50' : theme.bg
      } ${className}`}
      title={title || name || 'User Avatar'}
      data-avatar-name={name}
      data-avatar-status={status}
      data-avatar-src={cleanUrl || undefined}
    >
      {shouldAttemptImage ? (
        <>
          {/* Subtle initials placeholder while loading or as underlay */}
          {!hasLoaded && (
            <span
              style={{ fontSize: `${fontSize}px` }}
              className="absolute inset-0 flex items-center justify-center font-mono font-bold tracking-tight leading-none uppercase text-gray-400 select-none pointer-events-none"
            >
              {initials}
            </span>
          )}
          <img
            key={cleanUrl}
            src={cleanUrl}
            alt={name ? `${name}'s profile avatar` : 'Profile avatar'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`w-full h-full object-cover rounded-full transition-opacity duration-150 ${
              hasLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
            decoding="async"
          />
        </>
      ) : (
        <span
          style={{ fontSize: `${fontSize}px` }}
          className="font-mono font-bold tracking-tight leading-none uppercase"
        >
          {initials}
        </span>
      )}
    </div>
  );
}
