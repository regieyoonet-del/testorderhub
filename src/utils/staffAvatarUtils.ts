import { StaffMember, StaffAccount, AuthUser } from '../types';

/**
 * Normalizes and cleans profile picture URLs.
 * - Trims whitespace and strips surrounding quotes.
 * - Extracts URLs from formulas like =IMAGE("https://...") or =HYPERLINK("https://...", ...).
 * - Automatically converts Google Drive share/view URLs into direct high-resolution image stream URLs.
 * - Converts Dropbox dl=0 to raw=1.
 * - Validates standard http/https/data/blob schemes.
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

  // Convert Google Drive view or sharing links to direct thumbnail/image links
  // Pattern 1: drive.google.com/file/d/FILE_ID/view...
  // Pattern 2: drive.google.com/open?id=FILE_ID or drive.google.com/uc?id=FILE_ID
  const driveMatch =
    str.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    str.match(/drive\.google\.com\/(?:open|uc)\?(?:[^&]*&)*id=([a-zA-Z0-9_-]+)/i);

  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  // Convert Dropbox share links to raw direct image links
  if (str.includes('dropbox.com') && str.includes('dl=0')) {
    str = str.replace('dl=0', 'raw=1');
  }

  // Ensure it starts with valid image URL protocol
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(str)) {
    return str;
  }

  return undefined;
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
  const staffByName = staff.find(s => (s.fullName || '').trim().toLowerCase() === cleanLower);
  if (staffByName) {
    const linkedAcc = accounts.find(
      a => (a.staffId && a.staffId.toLowerCase() === staffByName.id.toLowerCase()) ||
           (a.name && a.name.trim().toLowerCase() === cleanLower)
    );
    return {
      displayName: staffByName.fullName,
      profilePictureUrl: extractAvatar(staffByName, linkedAcc),
      staffMember: staffByName,
      staffAccount: linkedAcc
    };
  }

  const accByName = accounts.find(a => (a.name || '').trim().toLowerCase() === cleanLower);
  if (accByName) {
    const linkedStaff = staff.find(
      s => (accByName.staffId && s.id.toLowerCase() === accByName.staffId.toLowerCase()) ||
           (s.fullName && s.fullName.trim().toLowerCase() === cleanLower)
    );
    return {
      displayName: accByName.name,
      profilePictureUrl: extractAvatar(linkedStaff, accByName),
      staffMember: linkedStaff,
      staffAccount: accByName
    };
  }

  // 4. Check by Username (e.g. "regie", "admin")
  const accByUsername = accounts.find(a => (a.username || '').trim().toLowerCase() === cleanLower);
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
