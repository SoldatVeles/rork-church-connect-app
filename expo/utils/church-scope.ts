import type { User } from '@/types/user';
import { isAdmin, isPastorLevel, isChurchLeaderLevel } from '@/utils/permissions';

export interface ChurchScopeContext {
  user: User | null | undefined;
  userHomeGroupId: string | null;
  pastorGroupIds: string[];
}

export function buildChurchScope(
  user: User | null | undefined,
  userHomeGroupId: string | null,
  pastorGroupIds: string[]
): ChurchScopeContext {
  return { user, userHomeGroupId, pastorGroupIds };
}

export function canViewGroupData(
  ctx: ChurchScopeContext,
  groupId: string
): boolean {
  if (isAdmin(ctx.user)) return true;
  if (ctx.userHomeGroupId === groupId) return true;
  if (ctx.pastorGroupIds.includes(groupId)) return true;
  return false;
}

export function canManageGroupData(
  ctx: ChurchScopeContext,
  groupId: string
): boolean {
  if (isAdmin(ctx.user)) return true;
  if (isChurchLeaderLevel(ctx.user)) return true;
  if (isPastorLevel(ctx.user) && ctx.pastorGroupIds.includes(groupId)) return true;
  return false;
}

export function canDeleteGroupContent(
  ctx: ChurchScopeContext,
  _groupId: string
): boolean {
  if (isAdmin(ctx.user)) return true;
  if (isChurchLeaderLevel(ctx.user)) return true;
  return false;
}

export function canManageSabbathForGroup(
  ctx: ChurchScopeContext,
  groupId: string
): boolean {
  if (isAdmin(ctx.user)) return true;
  if (ctx.pastorGroupIds.includes(groupId)) return true;
  return false;
}

export function canManageAnySabbath(ctx: ChurchScopeContext): boolean {
  if (isAdmin(ctx.user)) return true;
  if (ctx.pastorGroupIds.length > 0) return true;
  return false;
}

export function isUserHomeChurch(
  ctx: ChurchScopeContext,
  groupId: string
): boolean {
  return ctx.userHomeGroupId === groupId;
}

export function getVisibleGroupIds(ctx: ChurchScopeContext): string[] | 'all' {
  if (isAdmin(ctx.user)) return 'all';
  const ids = new Set<string>();
  if (ctx.userHomeGroupId) ids.add(ctx.userHomeGroupId);
  for (const gid of ctx.pastorGroupIds) ids.add(gid);
  return Array.from(ids);
}
