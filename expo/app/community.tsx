import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  ChevronRight,
  Church,
  Heart,
  MessageCircle,
  RefreshCw,
  Users,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import {
  fetchChurchMembers,
  resolveHomeGroupId,
  type ChurchMember,
} from '@/lib/church-membership';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

const ROLE_COLORS: Record<string, string> = {
  admin: '#7c3aed',
  pastor: '#2563eb',
  church_leader: '#d97706',
  member: '#059669',
  visitor: '#64748b',
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function CommunityScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const homeGroupQuery = useQuery({
    queryKey: ['community-home-group', user?.id],
    enabled: !!user?.id,
    queryFn: () => resolveHomeGroupId(user!.id),
  });
  const homeGroupId = homeGroupQuery.data ?? null;

  const churchQuery = useQuery({
    queryKey: ['community-church', homeGroupId],
    enabled: !!homeGroupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', homeGroupId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; name: string } | null;
    },
  });

  const membersQuery = useQuery({
    queryKey: ['community-members', homeGroupId],
    enabled: !!homeGroupId,
    queryFn: () => fetchChurchMembers(homeGroupId!),
  });

  const prayersQuery = useQuery({
    queryKey: ['community-prayers', homeGroupId],
    enabled: !!homeGroupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayers')
        .select('id, title, description, details, created_at')
        .eq('is_answered', false)
        .or(`group_id.eq.${homeGroupId},is_shared_all_churches.eq.true`)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const leaderCount = members.filter((member) =>
    ['admin', 'pastor', 'church_leader'].includes(member.role)
  ).length;
  const recentMembers = useMemo(
    () =>
      [...members]
        .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())
        .slice(0, 4),
    [members]
  );
  const roleCounts = useMemo(() => {
    const result = new Map<string, number>();
    for (const member of members) {
      result.set(member.role, (result.get(member.role) ?? 0) + 1);
    }
    return Array.from(result.entries()).sort((a, b) => b[1] - a[1]);
  }, [members]);

  const isLoading =
    homeGroupQuery.isLoading ||
    (!!homeGroupId && (churchQuery.isLoading || membersQuery.isLoading || prayersQuery.isLoading));
  const isRefreshing =
    homeGroupQuery.isRefetching ||
    churchQuery.isRefetching ||
    membersQuery.isRefetching ||
    prayersQuery.isRefetching;
  const error =
    homeGroupQuery.error || churchQuery.error || membersQuery.error || prayersQuery.error;

  const roleLabel = (role: string) =>
    t(`profile.roles.${role}`, {
      defaultValue: role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
    });

  const formatJoined = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('common.unknown');
    return date.toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const refresh = async () => {
    await Promise.all([
      homeGroupQuery.refetch(),
      churchQuery.refetch(),
      membersQuery.refetch(),
      prayersQuery.refetch(),
    ]);
  };

  const renderMember = (member: ChurchMember) => (
    <View key={member.id} style={styles.memberCard}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: `${ROLE_COLORS[member.role] ?? ROLE_COLORS.member}18` },
        ]}
      >
        <Text style={[styles.avatarText, { color: ROLE_COLORS[member.role] ?? ROLE_COLORS.member }]}>
          {initials(member.displayName)}
        </Text>
      </View>
      <View style={styles.memberCopy}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.displayName}
        </Text>
        <View style={styles.memberMeta}>
          <View
            style={[
              styles.roleDot,
              { backgroundColor: ROLE_COLORS[member.role] ?? ROLE_COLORS.member },
            ]}
          />
          <Text style={styles.memberRole}>{roleLabel(member.role)}</Text>
        </View>
      </View>
      <Text style={styles.joinedDate}>{formatJoined(member.joinedAt)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <LinearGradient
        colors={['#102a5e', '#1e3a8a', '#2563eb']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft size={23} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>
              {t('community.title', { defaultValue: 'Community' })}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {churchQuery.data?.name ??
                t('community.yourChurch', { defaultValue: 'Your church' })}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{isLoading ? '–' : members.length}</Text>
            <Text style={styles.statLabel}>
              {t('community.members', { defaultValue: 'Members' })}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{isLoading ? '–' : leaderCount}</Text>
            <Text style={styles.statLabel}>
              {t('community.leaders', { defaultValue: 'Leaders' })}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{isLoading ? '–' : prayersQuery.data?.length ?? 0}</Text>
            <Text style={styles.statLabel}>
              {t('community.prayers', { defaultValue: 'Prayers' })}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void refresh()} />
        }
      >
        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.stateText}>
              {t('community.loading', { defaultValue: 'Loading your church community…' })}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <RefreshCw size={42} color="#94a3b8" />
            <Text style={styles.stateTitle}>
              {t('community.loadFailed', { defaultValue: 'Community could not be loaded' })}
            </Text>
            <Text style={styles.stateText}>{(error as Error).message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void refresh()}>
              <Text style={styles.retryText}>
                {t('common.retry', { defaultValue: 'Try again' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : !homeGroupId ? (
          <View style={styles.stateBox}>
            <Church size={48} color="#94a3b8" />
            <Text style={styles.stateTitle}>
              {t('community.noChurchTitle', { defaultValue: 'No home church assigned' })}
            </Text>
            <Text style={styles.stateText}>
              {t('community.noChurchMessage', {
                defaultValue:
                  'Ask an administrator or church leader to assign your account to a church.',
              })}
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.chatCard}
              onPress={() =>
                router.push({
                  pathname: '/group-chat',
                  params: {
                    groupId: homeGroupId,
                    groupName:
                      churchQuery.data?.name ??
                      t('community.yourChurch', { defaultValue: 'Your church' }),
                  },
                })
              }
            >
              <View style={styles.chatIcon}>
                <MessageCircle size={24} color="#6d28d9" />
              </View>
              <View style={styles.chatCopy}>
                <Text style={styles.chatTitle}>
                  {t('community.openChat', { defaultValue: 'Open church chat' })}
                </Text>
                <Text style={styles.chatSubtitle}>
                  {t('community.openChatSubtitle', {
                    defaultValue: 'Share updates and stay connected with your church.',
                  })}
                </Text>
              </View>
              <ChevronRight size={21} color="#7c3aed" />
            </TouchableOpacity>

            {roleCounts.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('community.rolesOverview', { defaultValue: 'Church overview' })}
                </Text>
                <View style={styles.roleGrid}>
                  {roleCounts.map(([role, count]) => (
                    <View key={role} style={styles.roleChip}>
                      <View
                        style={[
                          styles.roleChipDot,
                          { backgroundColor: ROLE_COLORS[role] ?? ROLE_COLORS.member },
                        ]}
                      />
                      <Text style={styles.roleChipLabel}>{roleLabel(role)}</Text>
                      <Text style={styles.roleChipCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {recentMembers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('community.recentlyJoined', { defaultValue: 'Recently joined' })}
                </Text>
                <View style={styles.card}>
                  {recentMembers.map((member, index) => (
                    <View
                      key={`recent-${member.id}`}
                      style={[styles.recentRow, index > 0 && styles.rowBorder]}
                    >
                      <Users size={18} color="#2563eb" />
                      <View style={styles.recentCopy}>
                        <Text style={styles.recentName}>{member.displayName}</Text>
                        <Text style={styles.recentText}>
                          {t('community.joinedOn', {
                            defaultValue: 'Joined {{date}}',
                            date: formatJoined(member.joinedAt),
                          })}
                        </Text>
                      </View>
                      <Text style={styles.recentRole}>{roleLabel(member.role)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t('community.allMembers', { defaultValue: 'All members' })}
                </Text>
                <Text style={styles.sectionCount}>{members.length}</Text>
              </View>
              {members.length > 0 ? (
                <View style={styles.card}>{members.map(renderMember)}</View>
              ) : (
                <View style={styles.emptyCard}>
                  <Users size={42} color="#cbd5e1" />
                  <Text style={styles.stateTitle}>
                    {t('community.noMembers', { defaultValue: 'No members found' })}
                  </Text>
                </View>
              )}
            </View>

            {(prayersQuery.data?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {t('community.activePrayers', { defaultValue: 'Active prayer requests' })}
                  </Text>
                  <TouchableOpacity
                    style={styles.inlineLink}
                    onPress={() => router.push('/(tabs)/prayers')}
                  >
                    <Text style={styles.inlineLinkText}>
                      {t('community.seeAll', { defaultValue: 'See all' })}
                    </Text>
                    <ChevronRight size={16} color="#2563eb" />
                  </TouchableOpacity>
                </View>
                <View style={styles.card}>
                  {(prayersQuery.data ?? []).map((prayer: any, index) => (
                    <View
                      key={prayer.id}
                      style={[styles.prayerRow, index > 0 && styles.rowBorder]}
                    >
                      <View style={styles.prayerIcon}>
                        <Heart size={18} color="#dc2626" />
                      </View>
                      <Text style={styles.prayerText} numberOfLines={2}>
                        {prayer.title ||
                          prayer.description ||
                          prayer.details ||
                          t('community.prayerFallback', { defaultValue: 'Prayer request' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { minHeight: 52, flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerTitleBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { color: 'white', fontSize: 21, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.76)', fontSize: 13, marginTop: 2 },
  headerSpacer: { width: 42 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: 'white', fontSize: 24, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.2)' },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 48 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    borderRadius: 17,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    marginBottom: 26,
  },
  chatIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCopy: { flex: 1 },
  chatTitle: { color: '#3b0764', fontSize: 15, fontWeight: '900', marginBottom: 3 },
  chatSubtitle: { color: '#6b21a8', fontSize: 12, lineHeight: 17 },
  section: { marginBottom: 26 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginBottom: 11 },
  sectionCount: { color: '#64748b', fontSize: 13, fontWeight: '800', marginBottom: 11 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 14,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleChipDot: { width: 8, height: 8, borderRadius: 4 },
  roleChipLabel: { color: '#475569', fontSize: 12, fontWeight: '700' },
  roleChipCount: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  recentRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#eef2f7' },
  recentCopy: { flex: 1 },
  recentName: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  recentText: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  recentRole: { color: '#64748b', fontSize: 11, fontWeight: '700', maxWidth: 90, textAlign: 'right' },
  memberCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '900' },
  memberCopy: { flex: 1, paddingHorizontal: 11 },
  memberName: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  memberRole: { color: '#64748b', fontSize: 11 },
  joinedDate: { color: '#94a3b8', fontSize: 10, maxWidth: 72, textAlign: 'right' },
  inlineLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 },
  inlineLinkText: { color: '#2563eb', fontSize: 13, fontWeight: '800' },
  prayerRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11 },
  prayerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  prayerText: { flex: 1, color: '#475569', fontSize: 13, lineHeight: 18 },
  emptyCard: { alignItems: 'center', borderRadius: 16, backgroundColor: 'white', padding: 30 },
  stateBox: { alignItems: 'center', paddingHorizontal: 26, paddingVertical: 52 },
  stateTitle: { color: '#334155', fontSize: 17, fontWeight: '900', marginTop: 14, textAlign: 'center' },
  stateText: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  retryButton: { marginTop: 18, borderRadius: 12, backgroundColor: '#1e3a8a', paddingHorizontal: 18, paddingVertical: 11 },
  retryText: { color: 'white', fontWeight: '800', fontSize: 14 },
});
