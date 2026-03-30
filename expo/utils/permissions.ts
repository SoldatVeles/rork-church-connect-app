import type { UserRole } from '@/types/user';
import type { User } from '@/types/user';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  visitor: 0,
  member: 1,
  pastor: 2,
  church_leader: 3,
  admin: 4,
};

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isChurchLeaderLevel(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'church_leader' || user.role === 'admin';
}

export function isPastorLevel(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'pastor' ||
    user.role === 'church_leader' ||
    user.role === 'admin'
  );
}

export function isMemberOrAbove(user: User | null | undefined): boolean {
  if (!user) return false;
  return getRoleLevel(user.role) >= ROLE_HIERARCHY.member;
}

export function canViewAllData(user: User | null | undefined): boolean {
  return isAdmin(user);
}

export function canManageChurchContent(user: User | null | undefined): boolean {
  return isPastorLevel(user);
}

export function canDeleteChurchContent(user: User | null | undefined): boolean {
  return isChurchLeaderLevel(user);
}

export function canManageUsers(user: User | null | undefined): boolean {
  return isChurchLeaderLevel(user);
}

export function canAccessAdminPanel(user: User | null | undefined): boolean {
  return isChurchLeaderLevel(user);
}
