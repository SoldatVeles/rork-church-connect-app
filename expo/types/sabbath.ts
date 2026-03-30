// --- Enums / Union Types ---

export type SabbathStatus = 'draft' | 'published' | 'cancelled';

export type SabbathRole =
  | 'first_part_leader'
  | 'lesson_presenter'
  | 'second_part_leader'
  | 'sermon_speaker';

export type SabbathAssignmentStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'replacement_suggested'
  | 'reassigned';

export type SabbathAttendanceStatus = 'attending' | 'not_attending';

// --- Core Types ---

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
  status: SabbathAssignmentStatus;
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
  status: SabbathAttendanceStatus;
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

// --- View / Model Types ---

export interface SabbathGroupInfo {
  id: string;
  name: string;
}

export interface SabbathDetailView {
  sabbath: Sabbath;
  group: SabbathGroupInfo;
  assignments: SabbathAssignment[];
  attendance: SabbathAttendance[];
  myAttendanceStatus: SabbathAttendanceStatus | null;
  attendingCount: number | null;
  isHomeChurch: boolean;
  isAssignedUser: boolean;
  canManage: boolean;
  canRespondAttendance: boolean;
  canRespondAssignment: boolean;
  shouldShowAttendees: boolean;
  shouldShowAssignments: boolean;
}

export interface UpcomingResponsibilityItem {
  sabbath_id: string;
  sabbath_date: string;
  group_id: string;
  group_name: string;
  role: SabbathRole;
  assignment_status: SabbathAssignmentStatus;
  is_home_church: boolean;
}

export interface SabbathWithGroup {
  sabbath: Sabbath;
  group: SabbathGroupInfo;
}

export interface SabbathDateGroup {
  date: string;
  label: string;
  sabbaths: SabbathWithGroup[];
}

// --- Label Mappings ---

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

export const ASSIGNMENT_STATUS_LABELS: Record<SabbathAssignmentStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  replacement_suggested: 'Replacement Suggested',
  reassigned: 'Reassigned',
};

export const ATTENDANCE_STATUS_LABELS: Record<SabbathAttendanceStatus, string> = {
  attending: 'Attending',
  not_attending: 'Not Attending',
};

export const ALL_ROLES: SabbathRole[] = [
  'first_part_leader',
  'lesson_presenter',
  'second_part_leader',
  'sermon_speaker',
];
