import type {
  Sabbath,
  SabbathRole,
  SabbathStatus,
  SabbathAssignmentStatus,
  SabbathDateGroup,
  SabbathWithGroup,
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
    existingDates.map((d) => toDateString(parseSabbathDate(d)))
  );

  let candidate = getNextSaturday(fromDate);

  while (existing.has(toDateString(candidate))) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return candidate;
}

export function isUpcomingSabbath(date: string, today?: Date): boolean {
  const sabbathDate = parseSabbathDate(date);
  const reference = today ? new Date(today) : new Date();

  sabbathDate.setHours(0, 0, 0, 0);
  reference.setHours(0, 0, 0, 0);

  return sabbathDate >= reference;
}

// --- Formatting ---

export function formatSabbathDate(date: string, locale?: string): string {
  const d = parseSabbathDate(date);

  return d.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatSabbathShortDate(date: string, locale?: string): string {
  const d = parseSabbathDate(date);

  return d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

// --- Grouping / Sorting ---

export function groupSabbathsByDate(
  items: SabbathWithGroup[],
  locale?: string
): SabbathDateGroup[] {
  const sorted = [...items].sort(
    (a, b) =>
      parseSabbathDate(a.sabbath.sabbath_date).getTime() -
      parseSabbathDate(b.sabbath.sabbath_date).getTime()
  );

  const groups = new Map<string, SabbathWithGroup[]>();

  for (const item of sorted) {
    const key = toDateString(parseSabbathDate(item.sabbath.sabbath_date));
    const existing = groups.get(key);

    if (existing) {
      existing.push(item);
    } else {
      groups.set(key, [item]);
    }
  }

  return Array.from(groups.entries()).map(([dateKey, groupItems]) => ({
    date: dateKey,
    label: formatSabbathDate(dateKey, locale),
    sabbaths: groupItems,
  }));
}

export function sortSabbathsByDateAscending(sabbaths: Sabbath[]): Sabbath[] {
  return [...sabbaths].sort(
    (a, b) =>
      parseSabbathDate(a.sabbath_date).getTime() -
      parseSabbathDate(b.sabbath_date).getTime()
  );
}

export function sortResponsibilitiesByDateAscending(
  items: UpcomingResponsibilityItem[]
): UpcomingResponsibilityItem[] {
  return [...items].sort(
    (a, b) =>
      parseSabbathDate(a.sabbath_date).getTime() -
      parseSabbathDate(b.sabbath_date).getTime()
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

export function shouldShowSabbathAssignments(
  status: SabbathStatus,
  isMemberView: boolean
): boolean {
  if (status === 'published') return true;
  if (status === 'cancelled') return !isMemberView;
  if (status === 'draft') return !isMemberView;

  return false;
}

export function shouldShowAttendees(
  isHomeChurch: boolean,
  status: SabbathStatus
): boolean {
  return isHomeChurch && status === 'published';
}

// --- Internal Helpers ---

function parseSabbathDate(date: string): Date {
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(date);

  if (dateOnlyMatch) {
    return new Date(`${date}T12:00:00`);
  }

  return new Date(date);
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}