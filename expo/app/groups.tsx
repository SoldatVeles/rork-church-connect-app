import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { MessageCircle, Users, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import type { GroupChat } from '@/types/chat';
import { getLastReadMap } from '@/utils/chat-read';

export default function GroupsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const groupsQuery = useQuery({
    queryKey: ['user-groups', user?.id],
    queryFn: async (): Promise<GroupChat[]> => {
      if (!user?.id) return [];

      const { data: membershipData, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (membershipError) {
        console.warn('[Groups] Error fetching memberships:', membershipError.message);
      }

      const groupIds = membershipData?.map((m: any) => m.group_id) || [];

      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .or(groupIds.length > 0 ? `id.in.(${groupIds.join(',')})` : 'id.eq.none');

      if (groupsError) {
        console.warn('[Groups] Error fetching groups:', groupsError.message);
        return [];
      }

      const lastReadMap = await getLastReadMap(user.id);

      const groups: GroupChat[] = await Promise.all(
        (groupsData || []).map(async (group: any) => {
          const { count } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          const { data: lastMsg } = await supabase
            .from('group_messages')
            .select('content, created_at')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const since = lastReadMap[group.id] ?? '1970-01-01T00:00:00.000Z';
          const { count: unread } = await supabase
            .from('group_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id)
            .neq('sender_id', user.id)
            .gt('created_at', since);

          return {
            id: group.id,
            name: group.name,
            lastMessage: lastMsg?.content,
            lastMessageTime: lastMsg?.created_at ? new Date(lastMsg.created_at) : undefined,
            unreadCount: unread ?? 0,
            memberCount: count || 0,
          };
        })
      );

      return groups.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const formatTime = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Group Chats',
          headerTitleStyle: { fontWeight: '600', color: '#1e293b' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#1e3a8a" />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: '#fff' },
          headerShadowVisible: true,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {groupsQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : groupsQuery.data && groupsQuery.data.length > 0 ? (
          groupsQuery.data.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() =>
                router.push({
                  pathname: '/group-chat',
                  params: { groupId: group.id, groupName: group.name },
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.groupIcon}>
                <MessageCircle size={24} color="#1e3a8a" />
              </View>
              <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                  <Text
                    style={[styles.groupName, group.unreadCount > 0 && styles.groupNameUnread]}
                    numberOfLines={1}
                  >
                    {group.name}
                  </Text>
                  {group.lastMessageTime && (
                    <Text
                      style={[styles.groupTime, group.unreadCount > 0 && styles.groupTimeUnread]}
                    >
                      {formatTime(group.lastMessageTime)}
                    </Text>
                  )}
                </View>
                <View style={styles.groupMeta}>
                  {group.lastMessage ? (
                    <Text
                      style={[styles.lastMessage, group.unreadCount > 0 && styles.lastMessageUnread]}
                      numberOfLines={1}
                    >
                      {group.lastMessage}
                    </Text>
                  ) : (
                    <Text style={styles.noMessages}>No messages yet</Text>
                  )}
                </View>
                <View style={styles.memberRow}>
                  <Users size={12} color="#94a3b8" />
                  <Text style={styles.memberCount}>
                    {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              {group.unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {group.unreadCount > 99 ? '99+' : group.unreadCount}
                  </Text>
                </View>
              ) : (
                <ChevronRight size={20} color="#cbd5e1" />
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptySubtitle}>
              Ask your admin to add you to a church group to start chatting.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  groupCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  groupTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  groupNameUnread: {
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  groupTimeUnread: {
    color: '#1e3a8a',
    fontWeight: '600' as const,
  },
  lastMessageUnread: {
    color: '#1e293b',
    fontWeight: '600' as const,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginLeft: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
  },
  groupMeta: {
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
  },
  noMessages: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic' as const,
  },
  memberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
});
