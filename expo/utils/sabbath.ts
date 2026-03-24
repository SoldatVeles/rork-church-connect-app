import type {
  Sabbath,
  SabbathRole,
  SabbathStatus,
  SabbathAssignmentStatus,
  SabbathDateGroup,
  UpcomingResponsibilityItem,
} from '@/types/sabbath';
import {
  ROLE_LABELS,
  STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
} from '@/types/sabbath';

// --- Date Logic ---

const SATURDAY = 6;

export function isSaturday(date: Date): boolean {
  return date.getDay() === SATURDAY;
}

export function getNextSaturday(fromDate?: Date): Date {
  const base = fromDate ? new Date(fromDate) : new Date();
  base.setHours(0, 0, 0, 0);
  const daysUntilSaturday = (SATURDAY - base.getDay() + 7) % 7;
  const offset = daysUntilSaturday === 0 ? 7 : daysUntilSaturday;
  base.setDate(base.getDate() + offset);
  return base;
}

export function getNextUnplannedSaturday(
  existingDates: string[],
  fromDate?: Date
): Date {
  const existing = new Set(
    existingDates.map((d) => toDateString(new Date(d)))
  );
  let candidate = getNextSaturday(fromDate);
  while (existing.has(toDateString(candidate))) {
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate;
}

export function isUpcomingSabbath(date: string, today?: Date): boolean {
  const sabbathDate = new Date(date);
  const reference = today ? new Date(today) : new Date();
  sabbathDate.setHours(0, 0, 0, 0);
  reference.setHours(0, 0, 0, 0);
  return sabbathDate >= reference;
}

// --- Formatting ---

export function formatSabbathDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatSabbathShortDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// --- Grouping / Sorting ---

export function groupSabbathsByDate(sabbaths: Sabbath[]): SabbathDateGroup[] {
  const sorted = sortSabbathsByDateAscending(sabbaths);
  const groups = new Map<string, Sabbath[]>();

  for (const sabbath of sorted) {
    const key = toDateString(new Date(sabbath.sabbath_date));
    const existing = groups.get(key);
    if (existing) {
      existing.push(sabbath);
    } else {
      groups.set(key, [sabbath]);
    }
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    date: dateKey,
    label: formatSabbathDate(dateKey),
    sabbaths: items,
  }));
}

export function sortSabbathsByDateAscending(sabbaths: Sabbath[]): Sabbath[] {
  return [...sabbaths].sort(
    (a, b) =>
      new Date(a.sabbath_date).getTime() - new Date(b.sabbath_date).getTime()
  );
}

export function sortResponsibilitiesByDateAscending(
  items: UpcomingResponsibilityItem[]
): UpcomingResponsibilityItem[] {
  return [...items].sort(
    (a, b) =>
      new Date(a.sabbath_date).getTime() - new Date(b.sabbath_date).getTime()
  );
}

// --- Display Helpers ---

export function getSabbathRoleLabel(role: SabbathRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getSabbathStatusLabel(status: SabbathStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getAssignmentStatusLabel(
  status: SabbathAssignmentStatus
): string {
  return ASSIGNMENT_STATUS_LABELS[status] ?? status;
}

// --- Visibility Helpers ---

export function isPublishedSabbath(status: SabbathStatus): boolean {
  return status === 'published';
}

export function isCancelledSabbath(status: SabbathStatus): boolean {
  return status === 'cancelled';
}

/**
 * Cancelled sabbaths should not expose assignments to normal members.
 * Draft sabbaths hide assignments from everyone except managers.
 */
export function shouldShowSabbathAssignments(
  status: SabbathStatus,
  isMemberView: boolean
): boolean {
  if (status === 'published') return true;
  if (status === 'cancelled') return !isMemberView;
  if (status === 'draft') return !isMemberView;
  return false;
}

/**
 * Attendees are only visible for published sabbaths within the user's home church.
 */
export function shouldShowAttendees(
  isHomeChurch: boolean,
  status: SabbathStatus
): boolean {
  return isHomeChurch && status === 'published';
}

// --- Internal Helpers ---

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
