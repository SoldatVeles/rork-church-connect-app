export type SabbathStatus = 'draft' | 'published' | 'cancelled';
export type SabbathRole = 'first_part_leader' | 'lesson_presenter' | 'second_part_leader' | 'sermon_speaker';
export type AssignmentStatus = 'pending' | 'accepted' | 'declined' | 'replacement_suggested' | 'reassigned';
export type AttendanceStatus = 'attending' | 'not_attending';

export interface Sabbath {
  id: string;
  group_id: string;
  sabbath_date: string;
  status: SabbathStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  published_by: string | null;
  published_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SabbathAssignment {
  id: string;
  sabbath_id: string;
  role: SabbathRole;
  user_id: string | null;
  status: AssignmentStatus;
  decline_reason: string | null;
  suggested_user_id: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  suggested_user_name?: string;
}

export interface SabbathAttendance {
  id: string;
  sabbath_id: string;
  user_id: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface GroupPastor {
  id: string;
  group_id: string;
  user_id: string;
  created_at: string;
}

export const ROLE_LABELS: Record<SabbathRole, string> = {
  first_part_leader: 'First Part Leader',
  lesson_presenter: 'Lesson Presenter',
  second_part_leader: 'Second Part Leader',
  sermon_speaker: 'Sermon Speaker',
};

export const STATUS_LABELS: Record<SabbathStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  cancelled: 'Cancelled',
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  replacement_suggested: 'Replacement Suggested',
  reassigned: 'Reassigned',
};

export const ALL_ROLES: SabbathRole[] = [
  'first_part_leader',
  'lesson_presenter',
  'second_part_leader',
  'sermon_speaker',
];
