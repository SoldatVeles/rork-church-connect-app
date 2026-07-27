import { supabase } from '@/lib/supabase';

export type ChurchMember = {
  id: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  joinedAt: string;
  homeGroupId: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  name: string | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string;
  home_group_id: string | null;
};

export function getProfileDisplayName(
  profile: Partial<ProfileRow> | null | undefined,
  fallback = 'Church member'
): string {
  const candidates = [
    profile?.full_name,
    profile?.display_name,
    profile?.name,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim())?.trim() ?? fallback;
}

export async function resolveHomeGroupId(userId: string): Promise<string | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('home_group_id')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const homeGroupId = (profile as { home_group_id?: string | null } | null)?.home_group_id;
  if (homeGroupId) return homeGroupId;

  const { data: memberships, error: membershipsError } = await supabase
    .from('group_members')
    .select('group_id, added_at')
    .eq('user_id', userId)
    .order('added_at', { ascending: true })
    .limit(1);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  return (memberships?.[0] as { group_id?: string } | undefined)?.group_id ?? null;
}

export async function fetchAccessibleGroupIds(userId: string): Promise<string[]> {
  const [profileResult, membershipResult] = await Promise.all([
    supabase.from('profiles').select('home_group_id').eq('id', userId).maybeSingle(),
    supabase.from('group_members').select('group_id').eq('user_id', userId),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  const groupIds = new Set<string>();
  const homeGroupId = (profileResult.data as { home_group_id?: string | null } | null)?.home_group_id;
  if (homeGroupId) groupIds.add(homeGroupId);

  for (const membership of membershipResult.data ?? []) {
    const groupId = (membership as { group_id?: string }).group_id;
    if (groupId) groupIds.add(groupId);
  }

  return Array.from(groupIds);
}

export async function fetchChurchMembers(groupId: string): Promise<ChurchMember[]> {
  const [linksResult, homeProfilesResult] = await Promise.all([
    supabase
      .from('group_members')
      .select('user_id, added_at')
      .eq('group_id', groupId),
    supabase
      .from('profiles')
      .select('id, full_name, display_name, name, role, avatar_url, created_at, home_group_id')
      .eq('home_group_id', groupId),
  ]);

  if (linksResult.error) throw new Error(linksResult.error.message);
  if (homeProfilesResult.error) throw new Error(homeProfilesResult.error.message);

  const linkedAtByUserId = new Map<string, string>();
  for (const link of linksResult.data ?? []) {
    const row = link as { user_id: string; added_at: string };
    linkedAtByUserId.set(row.user_id, row.added_at);
  }

  const profilesById = new Map<string, ProfileRow>();
  for (const profile of (homeProfilesResult.data ?? []) as ProfileRow[]) {
    profilesById.set(profile.id, profile);
  }

  const missingProfileIds = Array.from(linkedAtByUserId.keys()).filter(
    (userId) => !profilesById.has(userId)
  );

  if (missingProfileIds.length > 0) {
    const { data: linkedProfiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, name, role, avatar_url, created_at, home_group_id')
      .in('id', missingProfileIds);

    if (error) throw new Error(error.message);

    for (const profile of (linkedProfiles ?? []) as ProfileRow[]) {
      profilesById.set(profile.id, profile);
    }
  }

  return Array.from(profilesById.values())
    .map((profile) => ({
      id: profile.id,
      displayName: getProfileDisplayName(profile),
      role: profile.role || 'member',
      avatarUrl: profile.avatar_url,
      joinedAt: linkedAtByUserId.get(profile.id) ?? profile.created_at,
      homeGroupId: profile.home_group_id,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
