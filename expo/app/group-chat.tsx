import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  Flag,
  MessageCircle,
  RefreshCw,
  Send,
  Share2,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchChurchMembers, getProfileDisplayName } from '@/lib/church-membership';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { ChatMessage } from '@/types/chat';
import { setLastRead } from '@/utils/chat-read';

const MESSAGE_LIMIT = 1000;
const AVATAR_COLORS = [
  '#1e3a8a',
  '#b91c1c',
  '#047857',
  '#7c3aed',
  '#c2410c',
  '#0e7490',
  '#a16207',
  '#4338ca',
];

function avatarColor(senderId: string): string {
  let hash = 0;
  for (let index = 0; index < senderId.length; index += 1) {
    hash = senderId.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export default function GroupChatScreen() {
  const { groupId, groupName } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
  }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');

  const messagesQuery = useQuery({
    queryKey: ['group-messages', groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          id,
          group_id,
          sender_id,
          content,
          created_at,
          profiles!group_messages_sender_id_fkey(full_name, display_name, name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: any) => ({
        id: row.id,
        groupId: row.group_id,
        senderId: row.sender_id,
        senderName: getProfileDisplayName(
          Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
          t('chat.unknownMember', { defaultValue: 'Church member' })
        ),
        content: row.content,
        createdAt: new Date(row.created_at),
        isRead: true,
      }));
    },
    refetchInterval: 30000,
  });

  const messages = useMemo(
    () =>
      (messagesQuery.data ?? [])
        .map((chatMessage) => ({
          ...chatMessage,
          createdAt:
            chatMessage.createdAt instanceof Date
              ? chatMessage.createdAt
              : new Date(chatMessage.createdAt as unknown as string),
        }))
        .filter((chatMessage) => !Number.isNaN(chatMessage.createdAt.getTime())),
    [messagesQuery.data]
  );

  const membersQuery = useQuery({
    queryKey: ['group-chat-members', groupId],
    enabled: !!groupId,
    queryFn: () => fetchChurchMembers(String(groupId)),
  });

  const blockedMembersQuery = useQuery({
    queryKey: ['blocked-members', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase.from as any)('member_blocks')
        .select('blocked_id')
        .eq('blocker_id', user?.id);

      if (error) throw new Error(error.message);
      return (data ?? []).map((row: { blocked_id: string }) => row.blocked_id);
    },
  });

  const blockedMemberIds = useMemo(
    () => new Set(blockedMembersQuery.data ?? []),
    [blockedMembersQuery.data]
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !groupId) {
        throw new Error(t('chat.invalidSession', { defaultValue: 'Your session is not available.' }));
      }

      const { error } = await supabase.from('group_messages').insert({
        group_id: groupId,
        sender_id: user.id,
        content,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setMessage('');
      void queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['user-groups', user?.id] });
    },
    onError: (error: Error) => {
      Alert.alert(
        t('chat.sendFailedTitle', { defaultValue: 'Message not sent' }),
        error.message || t('chat.sendFailedMessage', { defaultValue: 'Please try again.' })
      );
    },
  });

  const reportMessageMutation = useMutation({
    mutationFn: async ({ chatMessage, reason }: { chatMessage: ChatMessage; reason: string }) => {
      if (!user?.id) {
        throw new Error(t('chat.invalidSession', { defaultValue: 'Your session is not available.' }));
      }

      const { error } = await (supabase.from as any)('content_reports').insert({
        reporter_id: user.id,
        content_type: 'group_message',
        content_id: chatMessage.id,
        reported_user_id: chatMessage.senderId,
        group_id: groupId,
        reason,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      Alert.alert(
        t('chat.reportSentTitle', { defaultValue: 'Report sent' }),
        t('chat.reportSentMessage', { defaultValue: 'Thank you. Church leadership will review this message.' })
      );
    },
    onError: () => {
      Alert.alert(
        t('chat.reportFailedTitle', { defaultValue: 'Report was not sent' }),
        t('chat.reportFailedMessage', { defaultValue: 'You may already have reported this message. Please try again later.' })
      );
    },
  });

  const blockMemberMutation = useMutation({
    mutationFn: async ({ memberId, currentlyBlocked }: { memberId: string; currentlyBlocked: boolean }) => {
      if (!user?.id) throw new Error('Missing user session.');

      const query = (supabase.from as any)('member_blocks');
      const { error } = currentlyBlocked
        ? await query.delete().eq('blocker_id', user.id).eq('blocked_id', memberId)
        : await query.insert({ blocker_id: user.id, blocked_id: memberId });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocked-members', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
    onError: () => {
      Alert.alert(
        t('chat.blockFailedTitle', { defaultValue: 'Member could not be blocked' }),
        t('chat.blockFailedMessage', { defaultValue: 'Please try again.' })
      );
    },
  });

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
          if (user?.id) {
            void queryClient.invalidateQueries({ queryKey: ['user-groups', user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, queryClient, user?.id]);

  useEffect(() => {
    if (!messages.length || !user?.id || !groupId) return;

    const lastMessage = messages[messages.length - 1];
    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    void setLastRead(user.id, String(groupId), lastMessage.createdAt.toISOString()).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['group-unread-total', user.id] });
      void queryClient.invalidateQueries({ queryKey: ['group-unread-map', user.id] });
      void queryClient.invalidateQueries({ queryKey: ['user-groups', user.id] });
    });

    return () => clearTimeout(timeout);
  }, [groupId, messages, queryClient, user?.id]);

  const dateLabel = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('chat.today', { defaultValue: 'Today' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday', { defaultValue: 'Yesterday' });
    }
    return date.toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    });
  };

  const messageGroups = useMemo(() => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    for (const chatMessage of messages) {
      const label = dateLabel(chatMessage.createdAt);
      const current = groups[groups.length - 1];
      if (!current || current.date !== label) {
        groups.push({ date: label, messages: [chatMessage] });
      } else {
        current.messages.push(chatMessage);
      }
    }
    return groups;
    // date labels must update when app language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, i18n.language, t]);

  const send = () => {
    const content = message.trim();
    if (!content || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(content);
  };

  const reportMessage = (chatMessage: ChatMessage) => {
    Alert.alert(
      t('chat.reportMessageTitle', { defaultValue: 'Report message' }),
      t('chat.reportMessageHelp', { defaultValue: 'Why should church leadership review this message?' }),
      [
        {
          text: t('chat.reportReasonSpam', { defaultValue: 'Spam' }),
          onPress: () => reportMessageMutation.mutate({ chatMessage, reason: 'spam' }),
        },
        {
          text: t('chat.reportReasonHarassment', { defaultValue: 'Harassment' }),
          onPress: () => reportMessageMutation.mutate({ chatMessage, reason: 'harassment' }),
        },
        {
          text: t('chat.reportReasonInappropriate', { defaultValue: 'Inappropriate' }),
          onPress: () => reportMessageMutation.mutate({ chatMessage, reason: 'inappropriate' }),
        },
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      ]
    );
  };

  const openMessageOptions = (chatMessage: ChatMessage) => {
    const ownMessage = chatMessage.senderId === user?.id;
    const currentlyBlocked = blockedMemberIds.has(chatMessage.senderId);
    const actions: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [
      {
        text: t('chat.shareMessage', { defaultValue: 'Share message' }),
        onPress: () => void Share.share({ message: chatMessage.content }),
      },
    ];

    if (!ownMessage) {
      actions.push(
        {
          text: t('chat.reportMessage', { defaultValue: 'Report message' }),
          style: 'destructive',
          onPress: () => reportMessage(chatMessage),
        },
        {
          text: currentlyBlocked
            ? t('chat.unblockMember', { defaultValue: 'Unblock member' })
            : t('chat.blockMember', { defaultValue: 'Block member' }),
          style: currentlyBlocked ? 'default' : 'destructive',
          onPress: () => blockMemberMutation.mutate({
            memberId: chatMessage.senderId,
            currentlyBlocked,
          }),
        }
      );
    }

    actions.push({ text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' });

    Alert.alert(
      t('chat.messageOptions', { defaultValue: 'Message options' }),
      undefined,
      actions
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <LinearGradient
        colors={['#102a5e', '#1e3a8a', '#6d28d9']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel={t('common.back', { defaultValue: 'Back' })}
        >
          <ArrowLeft size={23} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupName || t('chat.churchChat', { defaultValue: 'Church Chat' })}
          </Text>
          <View style={styles.headerMeta}>
            <Users size={12} color="rgba(255,255,255,0.72)" />
            <Text style={styles.headerSubtitle}>
              {membersQuery.isLoading
                ? t('chat.connecting', { defaultValue: 'Connecting…' })
                : t('chat.memberCount', {
                    defaultValue: '{{count}} members',
                    count: membersQuery.data?.length ?? 0,
                  })}
            </Text>
          </View>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('chat.live', { defaultValue: 'Live' })}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={messagesQuery.isRefetching}
            onRefresh={() => void messagesQuery.refetch()}
          />
        }
      >
        {messagesQuery.isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.stateText}>
              {t('chat.loadingMessages', { defaultValue: 'Loading messages…' })}
            </Text>
          </View>
        ) : messagesQuery.error ? (
          <View style={styles.stateBox}>
            <RefreshCw size={44} color="#94a3b8" />
            <Text style={styles.stateTitle}>
              {t('chat.messagesLoadFailed', { defaultValue: 'Messages could not be loaded' })}
            </Text>
            <Text style={styles.stateText}>{(messagesQuery.error as Error).message}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void messagesQuery.refetch()}
            >
              <Text style={styles.retryText}>
                {t('common.retry', { defaultValue: 'Try again' })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : messageGroups.length === 0 ? (
          <View style={styles.stateBox}>
            <View style={styles.emptyIcon}>
              <MessageCircle size={36} color="#6d28d9" />
            </View>
            <Text style={styles.stateTitle}>
              {t('chat.noMessages', { defaultValue: 'No messages yet' })}
            </Text>
            <Text style={styles.stateText}>
              {t('chat.startConversation', { defaultValue: 'Start the conversation!' })}
            </Text>
          </View>
        ) : (
          messageGroups.map((group) => (
            <View key={group.date}>
              <View style={styles.dateDivider}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>{group.date}</Text>
                <View style={styles.dateLine} />
              </View>

              {group.messages.map((chatMessage, index) => {
                const ownMessage = chatMessage.senderId === user?.id;
                const previous = group.messages[index - 1];
                const showSender = !ownMessage && previous?.senderId !== chatMessage.senderId;

                return (
                  <View
                    key={chatMessage.id}
                    style={[
                      styles.messageRow,
                      ownMessage ? styles.ownRow : styles.otherRow,
                    ]}
                  >
                    {!ownMessage && (
                      <View style={styles.avatarSlot}>
                        {showSender && (
                          <View
                            style={[
                              styles.avatar,
                              { backgroundColor: avatarColor(chatMessage.senderId) },
                            ]}
                          >
                            <Text style={styles.avatarText}>
                              {initials(chatMessage.senderName)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.82}
                      onLongPress={() => openMessageOptions(chatMessage)}
                      delayLongPress={350}
                      style={[
                        styles.bubble,
                        ownMessage ? styles.ownBubble : styles.otherBubble,
                      ]}
                    >
                      {!ownMessage && showSender && (
                        <Text
                          style={[
                            styles.senderName,
                            { color: avatarColor(chatMessage.senderId) },
                          ]}
                        >
                          {chatMessage.senderName}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.messageText,
                          ownMessage && styles.ownMessageText,
                        ]}
                      >
                        {chatMessage.content}
                      </Text>
                      <View style={styles.messageMeta}>
                        <Text
                          style={[
                            styles.messageTime,
                            ownMessage && styles.ownMessageTime,
                          ]}
                        >
                          {chatMessage.createdAt.toLocaleTimeString(i18n.language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Share2
                          size={11}
                          color={ownMessage ? 'rgba(255,255,255,0.66)' : '#94a3b8'}
                        />
                        {!ownMessage && <Flag size={11} color="#94a3b8" />}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {message.length >= 800 && (
          <Text style={styles.characterCount}>
            {message.length}/{MESSAGE_LIMIT}
          </Text>
        )}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={t('chat.messagePlaceholder', { defaultValue: 'Write a message…' })}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={MESSAGE_LIMIT}
            editable={!sendMessageMutation.isPending}
            accessibilityLabel={t('chat.messagePlaceholder', { defaultValue: 'Write a message' })}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || sendMessageMutation.isPending) && styles.sendButtonDisabled,
            ]}
            onPress={send}
            disabled={!message.trim() || sendMessageMutation.isPending}
            accessibilityLabel={t('chat.send', { defaultValue: 'Send message' })}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.composerHint}>
          {t('chat.longPressHint', {
            defaultValue: 'Tip: press and hold a message to share it.',
          })}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    minHeight: 94,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '900' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  headerSubtitle: { color: 'rgba(255,255,255,0.72)', fontSize: 11 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86efac' },
  liveText: { color: 'white', fontSize: 10, fontWeight: '800' },
  messages: { flex: 1 },
  messagesContent: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 16 },
  stateBox: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  stateTitle: { color: '#334155', fontSize: 17, fontWeight: '900', marginTop: 15, textAlign: 'center' },
  stateText: { color: '#64748b', fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  retryButton: { marginTop: 18, borderRadius: 12, backgroundColor: '#1e3a8a', paddingHorizontal: 18, paddingVertical: 11 },
  retryText: { color: 'white', fontWeight: '800', fontSize: 14 },
  dateDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dateLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dateText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  messageRow: { flexDirection: 'row', marginBottom: 7 },
  ownRow: { justifyContent: 'flex-end', paddingLeft: 54 },
  otherRow: { justifyContent: 'flex-start', paddingRight: 44 },
  avatarSlot: { width: 36, marginRight: 7, justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontSize: 10, fontWeight: '900' },
  bubble: { maxWidth: '86%', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 9 },
  ownBubble: { backgroundColor: '#1e3a8a', borderBottomRightRadius: 5 },
  otherBubble: { backgroundColor: 'white', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#eef2f7' },
  senderName: { fontSize: 11, fontWeight: '900', marginBottom: 3 },
  messageText: { color: '#334155', fontSize: 15, lineHeight: 20 },
  ownMessageText: { color: 'white' },
  messageMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 4 },
  messageTime: { color: '#94a3b8', fontSize: 9 },
  ownMessageTime: { color: 'rgba(255,255,255,0.66)' },
  composerArea: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  characterCount: { alignSelf: 'flex-end', color: '#94a3b8', fontSize: 10, marginBottom: 4, marginRight: 5 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  input: {
    flex: 1,
    minHeight: 45,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
  },
  sendButton: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#6d28d9', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#cbd5e1' },
  composerHint: { color: '#94a3b8', fontSize: 9, marginTop: 5, marginLeft: 4 },
});
