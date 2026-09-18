import { StaffMember, StaffAccount, AuthUser } from '../types';

/**
 * Normalizes and cleans profile picture URLs.
 * - Accepts any standard publicly accessible image URL (e.g. https://example.com/avatar.jpg).
 * - Trims whitespace and strips surrounding single or double quotes.
 * - Extracts image URLs if wrapped in Google Sheets formulas like =IMAGE("https://...") or =HYPERLINK("https://...", ...).
 * - Preserves standard http://, https://, data:image/, and blob: schemes without transforming the host.
 */
export function cleanProfilePictureUrl(val?: any): string | undefined {
  if (val === undefined || val === null) return undefined;
  let str = String(val).trim();
  if (!str || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return undefined;

  // Extract from Google Sheets formulas if present (e.g. =IMAGE("...") or =HYPERLINK("...", ...))
  const formulaMatch = str.match(/=(?:IMAGE|HYPERLINK)\s*\(\s*["']([^"']+)["']/i);
  if (formulaMatch && formulaMatch[1]) {
    str = formulaMatch[1].trim();
  }

  // Strip wrapping single or double quotes
  str = str.replace(/^["']|["']$/g, '').trim();

  // If user entered Kenneth's Imgur album link, map to direct image file
  if (str === 'https://imgur.com/a/jaIUEA2') {
    return 'https://i.imgur.com/KK0WsI3.jpg';
  }

  // If user entered a single-image Imgur page link without file extension, convert to direct image URL
  const imgurMatch = str.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/i);
  if (imgurMatch && imgurMatch[1] && !['a', 'gallery'].includes(imgurMatch[1].toLowerCase())) {
    str = `https://i.imgur.com/${imgurMatch[1]}.jpg`;
  }

  // Convert Dropbox share link to direct image link if dl=0
  if (str.includes('dropbox.com') && str.includes('dl=0')) {
    str = str.replace('dl=0', 'raw=1');
  }

  // Ensure it starts with a valid image URL scheme
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(str)) {
    return str;
  }

  return undefined;
}

/**
 * Returns candidate URLs for backwards compatibility.
 * Simply returns the clean profile picture URL if valid.
 */
export function getAvatarUrlCandidates(val?: any): string[] {
  const clean = cleanProfilePictureUrl(val);
  return clean ? [clean] : [];
}

/**
 * UI-only helper to display strictly the person's name by stripping out
 * parenthesized positions/roles such as (ADMIN), (STAFF), (admin), (staff)
 * or suffixes like "- Admin", "/ Staff".
 */
export function getCleanCommenterName(userName?: string): string {
  if (!userName) return 'Team Member';
  let cleaned = userName.replace(/\s*\([^)]*\)/g, '').trim();
  cleaned = cleaned.replace(/\s*[-–—/|:]\s*(admin|staff|manager|supervisor|operator|client|employee).*$/i, '').trim();
  return cleaned || userName.trim();
}

export interface ResolvedCommentAuthor {
  displayName: string;
  profilePictureUrl?: string;
  staffMember?: StaffMember;
  staffAccount?: StaffAccount;
  isCurrentUser?: boolean;
}

/**
 * Resolves a comment author to their corresponding user record and profile picture.
 *
 * Checks:
 * 1. Active logged-in user (currentUser) - ensures immediate reflection of profile picture changes
 *    without requiring a new login.
 * 2. User ID / Staff ID / Account ID (e.g. STF-101, SA-101)
 * 3. Clean full name (e.g. "Kenneth", "Regie Yoonet")
 * 4. Raw user name / username
 *
 * Supports cross-referencing between StaffMember and StaffAccount records.
 */
export function resolveCommentAuthor(
  comment: { userId?: string; userName?: string },
  staffList?: StaffMember[],
  staffAccountsList?: StaffAccount[],
  currentUser?: AuthUser
): ResolvedCommentAuthor {
  const rawUserName = (comment.userName || '').trim();
  const cleanName = getCleanCommenterName(rawUserName);
  const rawUserId = (comment.userId || '').trim();

  const staff = Array.isArray(staffList) ? staffList : [];
  const accounts = Array.isArray(staffAccountsList) ? staffAccountsList : [];

  const extractAvatar = (member?: StaffMember, account?: StaffAccount): string | undefined => {
    return (
      cleanProfilePictureUrl(member?.profilePictureUrl) ||
      cleanProfilePictureUrl(member?.avatarUrl) ||
      cleanProfilePictureUrl(account?.profilePictureUrl) ||
      cleanProfilePictureUrl(account?.avatarUrl)
    );
  };

  // 1. Check if the author matches the currently logged in user
  if (currentUser) {
    const currentNameMatch =
      Boolean(currentUser.name) && cleanName.toLowerCase() === (currentUser.name || '').trim().toLowerCase();
    const currentUsernameMatch =
      Boolean(currentUser.username) && cleanName.toLowerCase() === (currentUser.username || '').trim().toLowerCase();

    const isCurrentAdmin =
      currentUser.role === 'admin' &&
      (
        currentNameMatch ||
        currentUsernameMatch ||
        cleanName.toLowerCase() === 'admin' ||
        rawUserName.toLowerCase().startsWith('admin') ||
        ((!cleanName || cleanName === 'Team Member') && (rawUserId.toLowerCase() === 'admin' || rawUserId.toLowerCase() === 'usr-current'))
      );

    const isCurrentStaff =
      (Boolean(currentUser.staffId) && Boolean(rawUserId) && rawUserId.toLowerCase() === (currentUser.staffId || '').toLowerCase()) ||
      (Boolean(currentUser.accountId) && Boolean(rawUserId) && rawUserId.toLowerCase() === (currentUser.accountId || '').toLowerCase()) ||
      (Boolean(currentUser.id) && Boolean(rawUserId) && rawUserId.toLowerCase() === currentUser.id.toLowerCase()) ||
      currentNameMatch ||
      currentUsernameMatch;

    if (isCurrentAdmin || isCurrentStaff) {
      const staffMatch = staff.find(s =>
        (currentUser.staffId && s.id && s.id.toLowerCase() === currentUser.staffId.toLowerCase()) ||
        (currentUser.name && s.fullName && s.fullName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      );
      const accMatch = accounts.find(a =>
        (currentUser.accountId && a.id && a.id.toLowerCase() === currentUser.accountId.toLowerCase()) ||
        (currentUser.staffId && a.staffId && a.staffId.toLowerCase() === currentUser.staffId.toLowerCase()) ||
        (currentUser.username && a.username && a.username.toLowerCase() === currentUser.username.toLowerCase())
      );

      const activePicture =
        cleanProfilePictureUrl(currentUser.profilePictureUrl) ||
        cleanProfilePictureUrl(currentUser.avatarUrl) ||
        extractAvatar(staffMatch, accMatch);

      const effectiveName =
        (cleanName && cleanName !== 'Team Member' && cleanName.toLowerCase() !== 'admin')
          ? cleanName
          : (currentUser.name || currentUser.username || (currentUser.role === 'admin' ? 'Admin' : 'Staff'));

      return {
        displayName: effectiveName,
        profilePictureUrl: activePicture,
        staffMember: staffMatch,
        staffAccount: accMatch,
        isCurrentUser: true
      };
    }
  }

  // 2. Resolve by userId (e.g. STF-101, SA-101, username, etc.)
  if (rawUserId && rawUserId !== 'usr-current') {
    const res = resolveAccountManagerInfo(rawUserId, staff, accounts, currentUser);
    if (res.profilePictureUrl || (res.displayName && res.displayName !== 'Unassigned' && res.displayName !== rawUserId)) {
      return {
        displayName: (cleanName && cleanName !== 'Team Member') ? cleanName : (res.displayName || cleanName),
        profilePictureUrl: res.profilePictureUrl,
        staffMember: res.staffMember,
        staffAccount: res.staffAccount
      };
    }
  }

  // 3. Resolve by cleaned display name (e.g. "Kenneth", "Regie Yoonet")
  if (cleanName && cleanName !== 'Team Member') {
    const res = resolveAccountManagerInfo(cleanName, staff, accounts, currentUser);
    if (res.profilePictureUrl) {
      return {
        displayName: cleanName,
        profilePictureUrl: res.profilePictureUrl,
        staffMember: res.staffMember,
        staffAccount: res.staffAccount
      };
    }
  }

  // 4. Resolve by raw userName if distinct
  if (rawUserName && rawUserName !== cleanName) {
    const res = resolveAccountManagerInfo(rawUserName, staff, accounts, currentUser);
    if (res.profilePictureUrl) {
      return {
        displayName: cleanName || res.displayName,
        profilePictureUrl: res.profilePictureUrl,
        staffMember: res.staffMember,
        staffAccount: res.staffAccount
      };
    }
  }

  // 5. Fallback if user has no profile photo or is not matched in staff list
  return {
    displayName: cleanName || rawUserName || 'Team Member',
    profilePictureUrl: undefined
  };
}

export interface ResolvedAccountManager {
  displayName: string;
  profilePictureUrl?: string;
  staffMember?: StaffMember;
  staffAccount?: StaffAccount;
  isUnassigned?: boolean;
}

/**
 * Resolves an Account Manager identifier (which may be a Full Name, Staff ID,
 * Account ID, or Username) to its corresponding StaffMember / StaffAccount record
 * and retrieves the valid profilePictureUrl.
 *
 * Cross-references between StaffMember and StaffAccount so profile pictures
 * stored in either record are discovered.
 */
export function resolveAccountManagerInfo(
  identifier?: string,
  staffList?: StaffMember[],
  staffAccountsList?: StaffAccount[],
  currentUser?: AuthUser
): ResolvedAccountManager {
  if (!identifier || !identifier.trim() || identifier.trim().toLowerCase() === 'unassigned') {
    return {
      displayName: 'Unassigned',
      profilePictureUrl: undefined,
      isUnassigned: true
    };
  }

  const clean = identifier.trim();
  const cleanLower = clean.toLowerCase().replace(/^@/, '');
  const baseClean = clean
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*[-–—/|:]\s*(admin|staff|manager|supervisor|operator|client|employee).*$/i, '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');

  const staff = Array.isArray(staffList) ? staffList : [];
  const accounts = Array.isArray(staffAccountsList) ? staffAccountsList : [];

  // Helper to cross-reference and find best avatar URL from member + account pair
  const extractAvatar = (member?: StaffMember, account?: StaffAccount): string | undefined => {
    return (
      cleanProfilePictureUrl(member?.profilePictureUrl) ||
      cleanProfilePictureUrl(member?.avatarUrl) ||
      cleanProfilePictureUrl(account?.profilePictureUrl) ||
      cleanProfilePictureUrl(account?.avatarUrl)
    );
  };

  // 1. Check if identifier is Staff ID (e.g. STF-101)
  const staffById = staff.find(s => s.id && s.id.toLowerCase() === cleanLower);
  if (staffById) {
    const linkedAcc = accounts.find(
      a => (a.staffId && a.staffId.toLowerCase() === staffById.id.toLowerCase()) ||
           (a.name && a.name.trim().toLowerCase() === staffById.fullName.trim().toLowerCase())
    );
    return {
      displayName: staffById.fullName,
      profilePictureUrl: extractAvatar(staffById, linkedAcc),
      staffMember: staffById,
      staffAccount: linkedAcc
    };
  }

  // 2. Check if identifier is Account ID (e.g. SA-101) or matches staffId on an account
  const accById = accounts.find(
    a => (a.id && a.id.toLowerCase() === cleanLower) ||
         (a.staffId && a.staffId.toLowerCase() === cleanLower)
  );
  if (accById) {
    const linkedStaff = staff.find(
      s => (accById.staffId && s.id.toLowerCase() === accById.staffId.toLowerCase()) ||
           (s.fullName && s.fullName.trim().toLowerCase() === (accById.name || '').trim().toLowerCase())
    );
    return {
      displayName: accById.name || linkedStaff?.fullName || accById.username,
      profilePictureUrl: extractAvatar(linkedStaff, accById),
      staffMember: linkedStaff,
      staffAccount: accById
    };
  }

  // 3. Check by Full Name (case-insensitive)
  const staffByName = staff.find(s => {
    const n = (s.fullName || '').trim().toLowerCase();
    return n === cleanLower || (baseClean && n === baseClean);
  });
  if (staffByName) {
    const linkedAcc = accounts.find(
      a => (a.staffId && a.staffId.toLowerCase() === staffByName.id.toLowerCase()) ||
           (a.name && (a.name.trim().toLowerCase() === cleanLower || (baseClean && a.name.trim().toLowerCase() === baseClean)))
    );
    return {
      displayName: staffByName.fullName,
      profilePictureUrl: extractAvatar(staffByName, linkedAcc),
      staffMember: staffByName,
      staffAccount: linkedAcc
    };
  }

  const accByName = accounts.find(a => {
    const n = (a.name || '').trim().toLowerCase();
    return n === cleanLower || (baseClean && n === baseClean);
  });
  if (accByName) {
    const linkedStaff = staff.find(
      s => (accByName.staffId && s.id.toLowerCase() === accByName.staffId.toLowerCase()) ||
           (s.fullName && (s.fullName.trim().toLowerCase() === cleanLower || (baseClean && s.fullName.trim().toLowerCase() === baseClean)))
    );
    return {
      displayName: accByName.name,
      profilePictureUrl: extractAvatar(linkedStaff, accByName),
      staffMember: linkedStaff,
      staffAccount: accByName
    };
  }

  // 4. Check by Username (e.g. "regie", "admin")
  const accByUsername = accounts.find(a => {
    const u = (a.username || '').trim().toLowerCase();
    return u === cleanLower || (baseClean && u === baseClean);
  });
  if (accByUsername) {
    const linkedStaff = staff.find(
      s => (accByUsername.staffId && s.id.toLowerCase() === accByUsername.staffId.toLowerCase()) ||
           (s.fullName && s.fullName.trim().toLowerCase() === (accByUsername.name || '').trim().toLowerCase())
    );
    return {
      displayName: accByUsername.name || linkedStaff?.fullName || accByUsername.username,
      profilePictureUrl: extractAvatar(linkedStaff, accByUsername),
      staffMember: linkedStaff,
      staffAccount: accByUsername
    };
  }

  // 5. Check by Email
  const accByEmail = accounts.find(a => (a.email || '').trim().toLowerCase() === cleanLower);
  if (accByEmail) {
    const linkedStaff = staff.find(
      s => (accByEmail.staffId && s.id.toLowerCase() === accByEmail.staffId.toLowerCase()) ||
           (s.fullName && s.fullName.trim().toLowerCase() === (accByEmail.name || '').trim().toLowerCase())
    );
    return {
      displayName: accByEmail.name || linkedStaff?.fullName || accByEmail.username,
      profilePictureUrl: extractAvatar(linkedStaff, accByEmail),
      staffMember: linkedStaff,
      staffAccount: accByEmail
    };
  }

  // 6. Check if it refers to currentUser (e.g. Admin)
  if (currentUser) {
    const isCurrentAdmin =
      currentUser.role === 'admin' &&
      (cleanLower === 'admin' ||
       cleanLower === (currentUser.name || '').toLowerCase() ||
       cleanLower === (currentUser.username || '').toLowerCase());

    const isCurrentStaff =
      (currentUser.name && currentUser.name.toLowerCase() === cleanLower) ||
      (currentUser.username && currentUser.username.toLowerCase() === cleanLower) ||
      (currentUser.staffId && currentUser.staffId.toLowerCase() === cleanLower) ||
      (currentUser.accountId && currentUser.accountId.toLowerCase() === cleanLower);

    if (isCurrentAdmin || isCurrentStaff) {
      const pic = cleanProfilePictureUrl(currentUser.profilePictureUrl || currentUser.avatarUrl);
      return {
        displayName: currentUser.name || (currentUser.role === 'admin' ? 'Admin' : clean),
        profilePictureUrl: pic
      };
    }
  }

  // Fallback: Return original string as display name with no avatar
  return {
    displayName: clean,
    profilePictureUrl: undefined
  };
}
