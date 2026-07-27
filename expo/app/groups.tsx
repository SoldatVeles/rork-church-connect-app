import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  Users,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchAccessibleGroupIds,
  fetchChurchMembers,
} from '@/lib/church-membership';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { GroupChat } from '@/types/chat';
import { getLastReadMap } from '@/utils/chat-read';

export default function GroupsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['user-groups', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<GroupChat[]> => {
      if (!user?.id) return [];

      const groupIds = await fetchAccessibleGroupIds(user.id);
      if (groupIds.length === 0) return [];

      const [groupsResult, messagesResult, lastReadMap] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds),
        supabase
          .from('group_messages')
          .select('group_id, sender_id, content, created_at')
          .in('group_id', groupIds)
          .order('created_at', { ascending: false }),
        getLastReadMap(user.id),
      ]);

      if (groupsResult.error) throw new Error(groupsResult.error.message);
      if (messagesResult.error) throw new Error(messagesResult.error.message);

      const allMessages = (messagesResult.data ?? []) as {
        group_id: string;
        sender_id: string;
        content: string;
        created_at: string;
      }[];

      const groups = await Promise.all(
        (groupsResult.data ?? []).map(async (group: any): Promise<GroupChat> => {
          const groupMessages = allMessages.filter((message) => message.group_id === group.id);
          const lastMessage = groupMessages[0];
          const since = new Date(lastReadMap[group.id] ?? '1970-01-01T00:00:00.000Z').getTime();
          const memberCount = (await fetchChurchMembers(group.id)).length;

          return {
            id: group.id,
            name: group.name,
            lastMessage: lastMessage?.content,
            lastMessageTime: lastMessage ? new Date(lastMessage.created_at) : undefined,
            unreadCount: groupMessages.filter(
              (message) =>
                message.sender_id !== user.id &&
                new Date(message.created_at).getTime() > since
            ).length,
            memberCount,
          };
        })
      );

      return groups.sort((a, b) => {
        const aTime = a.lastMessageTime?.getTime() ?? 0;
        const bTime = b.lastMessageTime?.getTime() ?? 0;
        if (aTime !== bTime) return bTime - aTime;
        return a.name.localeCompare(b.name);
      });
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`church-chat-list-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_messages' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['user-groups', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['group-unread-total', user.id] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const formatTime = (value?: Date | string) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const differenceDays = Math.round(
      (today.getTime() - messageDay.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (differenceDays === 0) {
      return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    }
    if (differenceDays === 1) {
      return t('chat.yesterday', { defaultValue: 'Yesterday' });
    }
    if (differenceDays < 7) {
      return date.toLocaleDateString(i18n.language, { weekday: 'short' });
    }
    return date.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <LinearGradient
        colors={['#102a5e', '#1e3a8a', '#6d28d9']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft size={23} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>
              {t('chat.churchChats', { defaultValue: 'Church Chats' })}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('chat.churchChatsSubtitle', {
                defaultValue: 'Conversations from your church communities',
              })}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <MessageCircle size={22} color="white" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={groupsQuery.isRefetching}
            onRefresh={() => void groupsQuery.refetch()}
          />
        }
      >
        {groupsQuery.isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.stateText}>
              {t('chat.loadingChurches', { defaultValue: 'Loading church chats…' })}
            </Text>
          </View>
        ) : groupsQuery.error ? (
          <View style={styles.stateBox}>
            <RefreshCw size={46} color="#94a3b8" />
            <Text style={styles.stateTitle}>
              {t('chat.loadFailed', { defaultValue: 'Chats could not be loaded' })}
            </Text>
            <Text style={styles.stateText}>{(groupsQuery.error as Error).message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => void groupsQuery.refetch()}>
              <Text style={styles.retryText}>
                {t('common.retry', { defaultValue: 'Try again' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (groupsQuery.data?.length ?? 0) === 0 ? (
          <View style={styles.stateBox}>
            <MessageCircle size={50} color="#cbd5e1" />
            <Text style={styles.stateTitle}>
              {t('chat.noChurchesTitle', { defaultValue: 'No church chats yet' })}
            </Text>
            <Text style={styles.stateText}>
              {t('chat.noChurchesMessage', {
                defaultValue:
                  'Ask an administrator or church leader to assign your account to a church.',
              })}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>
                {t('chat.tipTitle', { defaultValue: 'Stay connected' })}
              </Text>
              <Text style={styles.tipText}>
                {t('chat.tipText', {
                  defaultValue:
                    'New messages appear automatically. Pull down at any time to refresh.',
                })}
              </Text>
            </View>

            {(groupsQuery.data ?? []).map((group) => (
              <TouchableOpacity
                key={group.id}
                style={styles.groupCard}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: '/group-chat',
                    params: { groupId: group.id, groupName: group.name },
                  })
                }
              >
                <View style={styles.groupIcon}>
                  <MessageCircle size={24} color="#6d28d9" />
                </View>
                <View style={styles.groupInfo}>
                  <View style={styles.groupHeading}>
                    <Text
                      style={[
                        styles.groupName,
                        group.unreadCount > 0 && styles.groupNameUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {group.name}
                    </Text>
                    <Text
                      style={[
                        styles.groupTime,
                        group.unreadCount > 0 && styles.groupTimeUnread,
                      ]}
                    >
                      {formatTime(group.lastMessageTime)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.lastMessage,
                      group.unreadCount > 0 && styles.lastMessageUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {group.lastMessage ||
                      t('chat.noMessages', { defaultValue: 'No messages yet' })}
                  </Text>
                  <View style={styles.memberRow}>
                    <Users size={13} color="#94a3b8" />
                    <Text style={styles.memberCount}>
                      {t('chat.memberCount', {
                        defaultValue: '{{count}} members',
                        count: group.memberCount,
                      })}
                    </Text>
                  </View>
                </View>
                {group.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>
                      {group.unreadCount > 99 ? '99+' : group.unreadCount}
                    </Text>
                  </View>
                ) : (
                  <ChevronRight size={20} color="#cbd5e1" />
                )}
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '900' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 3 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  contentContainer: { padding: 18, paddingBottom: 48 },
  tipCard: {
    borderRadius: 15,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    padding: 15,
    marginBottom: 16,
  },
  tipTitle: { color: '#4c1d95', fontSize: 14, fontWeight: '900' },
  tipText: { color: '#6d28d9', fontSize: 12, lineHeight: 18, marginTop: 3 },
  groupCard: {
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: 'white',
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: { flex: 1 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  groupName: { flex: 1, color: '#334155', fontSize: 16, fontWeight: '800', marginRight: 8 },
  groupNameUnread: { color: '#0f172a', fontWeight: '900' },
  groupTime: { color: '#94a3b8', fontSize: 11 },
  groupTimeUnread: { color: '#6d28d9', fontWeight: '800' },
  lastMessage: { color: '#64748b', fontSize: 13, marginBottom: 7 },
  lastMessageUnread: { color: '#334155', fontWeight: '700' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memberCount: { color: '#94a3b8', fontSize: 11 },
  unreadBadge: {
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#dc2626',
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: 'white', fontSize: 11, fontWeight: '900' },
  stateBox: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 28 },
  stateTitle: { color: '#334155', fontSize: 18, fontWeight: '900', marginTop: 16, textAlign: 'center' },
  stateText: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  retryButton: { marginTop: 18, borderRadius: 12, backgroundColor: '#1e3a8a', paddingHorizontal: 18, paddingVertical: 11 },
  retryText: { color: 'white', fontWeight: '800', fontSize: 14 },
});
