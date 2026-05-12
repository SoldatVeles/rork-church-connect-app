import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Users, Church, Heart, ChevronRight } from 'lucide-react-native';
import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useChurch } from '@/providers/church-provider';
import { isAdmin } from '@/utils/permissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  pastor: 'Pastor',
  church_leader: 'Church Leader',
  member: 'Member',
  visitor: 'Visitor',
};

const ROLE_EMOJI: Record<string, string> = {
  admin: '⭐',
  pastor: '🙏',
  church_leader: '🏛️',
  member: '👤',
  visitor: '👋',
};

export default function CommunityScreen() {
  const { user } = useAuth();
  const { currentChurch } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = isAdmin(user);

  // Resolve user's home group so prayer visibility doesn't depend on the church picker.
  const homeGroupQuery = useQuery({
    queryKey: ['community-user-group', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<string | null> => {
      if (!user?.id) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('home_group_id')
        .eq('id', user.id)
        .single();
      const homeGroupId = (profile as any)?.home_group_id as string | null;
      if (homeGroupId) return homeGroupId;
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .limit(1);
      if (memberships && memberships.length > 0) {
        return (memberships[0] as any).group_id as string;
      }
      return null;
    },
  });
  const userHomeGroupId = homeGroupQuery.data ?? null;

  const membersQuery = useQuery({
    queryKey: ['community-members', currentChurchId, userIsAdmin],
    queryFn: async () => {
      if (userIsAdmin) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
      }

      if (!currentChurchId) {
        console.log('[Community] Non-admin user has no church selected, returning empty');
        return [];
      }

      const { data: memberLinks, error: linkError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', currentChurchId);
      if (linkError) throw new Error(linkError.message);
      const userIds = (memberLinks || []).map((m: any) => m.user_id as string);
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const prayersQuery = useQuery({
    queryKey: ['community-prayers', userHomeGroupId, userIsAdmin, homeGroupQuery.isFetched],
    enabled: userIsAdmin || homeGroupQuery.isFetched,
    queryFn: async () => {
      let query = supabase
        .from('prayers')
        .select('*')
        .eq('is_answered', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!userIsAdmin) {
        if (userHomeGroupId) {
          query = query.or(`group_id.eq.${userHomeGroupId},is_shared_all_churches.eq.true`);
        } else {
          query = query.eq('is_shared_all_churches', true);
        }
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const list = (data || []) as any[];
      const filtered = userIsAdmin
        ? list
        : list.filter((p: any) => {
            const shared = p?.is_shared_all_churches === true;
            const sameGroup = !!userHomeGroupId && p?.group_id === userHomeGroupId;
            return shared || sameGroup;
          });
      return filtered.slice(0, 5);
    },
  });

  const groupsQuery = useQuery({
    queryKey: ['community-groups', currentChurchId, userIsAdmin],
    queryFn: async () => {
      let query = supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });

      if (!userIsAdmin && currentChurchId) {
        query = query.eq('id', currentChurchId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const totalMembers = membersQuery.data?.length ?? 0;
  const activePrayers = prayersQuery.data?.length ?? 0;
  const totalGroups = groupsQuery.data?.length ?? 0;

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (membersQuery.data || []).forEach((m: any) => {
      const role = m.role || 'member';
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }, [membersQuery.data]);

  const memberPreview = useMemo(() => {
    return (membersQuery.data || []).slice(0, 6);
  }, [membersQuery.data]);

  const recentMembers = useMemo(() => {
    return (membersQuery.data || []).slice(0, 4);
  }, [membersQuery.data]);

  const isLoading = membersQuery.isLoading || prayersQuery.isLoading || groupsQuery.isLoading;

  const churchName = currentChurch?.name ?? (userIsAdmin ? 'All Churches' : 'Your Church');

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Community',
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold' as const,
          },
        }}
      />
      <StatusBar style="light" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1e3a8a', '#3b82f6']}
          style={styles.headerCard}
        >
          <Text style={styles.churchLabel}>{churchName}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{isLoading ? '–' : totalMembers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{isLoading ? '–' : activePrayers}</Text>
              <Text style={styles.statLabel}>Active Prayers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{isLoading ? '–' : totalGroups}</Text>
              <Text style={styles.statLabel}>{totalGroups === 1 ? 'Group' : 'Groups'}</Text>
            </View>
          </View>
        </LinearGradient>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading community...</Text>
          </View>
        ) : (
          <>
            {Object.keys(roleCounts).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Roles Overview</Text>
                <View style={styles.rolesGrid}>
                  {Object.entries(roleCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count]) => (
                      <View key={role} style={styles.roleChip}>
                        <Text style={styles.roleEmoji}>{ROLE_EMOJI[role] ?? '👤'}</Text>
                        <View>
                          <Text style={styles.roleChipLabel}>{ROLE_LABELS[role] ?? role}</Text>
                          <Text style={styles.roleChipCount}>{count}</Text>
                        </View>
                      </View>
                    ))}
                </View>
              </View>
            )}

            {memberPreview.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Members</Text>
                  {totalMembers > 6 && (
                    <Text style={styles.seeAllText}>
                      {totalMembers} total
                    </Text>
                  )}
                </View>

                {memberPreview.map((member: any) => (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={styles.memberLeft}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.avatarEmoji}>
                          {ROLE_EMOJI[member.role] ?? '👤'}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>
                          {member.first_name ?? ''} {member.last_name ?? ''}
                        </Text>
                        <Text style={styles.memberRole}>
                          {ROLE_LABELS[member.role] ?? member.role ?? 'Member'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {recentMembers.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recently Joined</Text>
                {recentMembers.map((member: any) => (
                  <View key={`recent-${member.id}`} style={styles.activityCard}>
                    <View style={styles.activityIcon}>
                      <Users size={18} color="#3b82f6" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>
                        <Text style={styles.activityUser}>
                          {member.first_name ?? ''} {member.last_name ?? ''}
                        </Text>
                        {' joined as '}
                        {ROLE_LABELS[member.role] ?? member.role ?? 'Member'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {(groupsQuery.data ?? []).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Church Groups</Text>
                {(groupsQuery.data ?? []).map((group: any) => (
                  <View key={group.id} style={styles.groupCard}>
                    <View style={styles.groupIcon}>
                      <Church size={22} color="#1e3a8a" />
                    </View>
                    <View style={styles.groupContent}>
                      <Text style={styles.groupTitle}>{group.name}</Text>
                      {group.location && (
                        <Text style={styles.groupMembers}>{group.location}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {prayersQuery.data && prayersQuery.data.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Prayer Requests</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/prayers')}>
                    <View style={styles.seeAllRow}>
                      <Text style={styles.seeAllText}>See All</Text>
                      <ChevronRight size={16} color="#3b82f6" />
                    </View>
                  </TouchableOpacity>
                </View>
                {prayersQuery.data.map((prayer: any) => (
                  <View key={prayer.id} style={styles.activityCard}>
                    <View style={[styles.activityIcon, { backgroundColor: '#fef2f2' }]}>
                      <Heart size={18} color="#ef4444" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText} numberOfLines={2}>
                        {prayer.title || prayer.content || 'Prayer request'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {totalMembers === 0 && (
              <View style={styles.emptyContainer}>
                <Users size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No members yet</Text>
                <Text style={styles.emptySubtitle}>
                  Members of your church group will appear here
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  headerCard: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  churchLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1e293b',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3b82f6',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  roleEmoji: {
    fontSize: 20,
  },
  roleChipLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  roleChipCount: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1e293b',
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#64748b',
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupContent: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  spacer: {
    height: 40,
  },
});
