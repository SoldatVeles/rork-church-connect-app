import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Send, ArrowLeft, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatMessage } from '@/types/chat';
import { setLastRead } from '@/utils/chat-read';

export default function GroupChatScreen() {
  const { groupId, groupName } = useLocalSearchParams<{ groupId: string; groupName: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');

  const messagesQuery = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          id,
          group_id,
          sender_id,
          content,
          created_at,
          profiles!group_messages_sender_id_fkey(full_name)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('[GroupChat] Error fetching messages:', error.message);
        return [];
      }

      return (data || []).map((msg: any) => ({
        id: msg.id,
        groupId: msg.group_id,
        senderId: msg.sender_id,
        senderName: msg.profiles?.full_name || 'Unknown',
        content: msg.content,
        createdAt: new Date(msg.created_at),
        isRead: true,
      }));
    },
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user?.id || !groupId) throw new Error('Invalid session');

      const { error } = await supabase.from('group_messages').insert({
        group_id: groupId,
        sender_id: user.id,
        content,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['group-messages', groupId] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to send message');
    },
  });

  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      const last = messagesQuery.data[messagesQuery.data.length - 1];
      if (user?.id && groupId && last?.createdAt) {
        void setLastRead(user.id, String(groupId), last.createdAt.toISOString()).then(() => {
          queryClient.invalidateQueries({ queryKey: ['group-unread-total', user.id] });
          queryClient.invalidateQueries({ queryKey: ['group-unread-map', user.id] });
        });
      }
    }
  }, [messagesQuery.data, user?.id, groupId, queryClient]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    sendMessageMutation.mutate(trimmed);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name[0] || '?').toUpperCase();
  };

  const avatarColors = [
    '#1e3a8a', '#b91c1c', '#047857', '#7c3aed',
    '#c2410c', '#0e7490', '#a16207', '#4338ca',
  ];

  const getAvatarColor = (senderId: string): string => {
    let hash = 0;
    for (let i = 0; i < senderId.length; i++) {
      hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    messages.forEach((msg) => {
      const dateStr = formatDate(msg.createdAt);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate(messagesQuery.data || []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {groupName || 'Group Chat'}
              </Text>
              <View style={styles.headerSubtitle}>
                <Users size={12} color="#64748b" />
                <Text style={styles.headerSubtitleText}>Group Chat</Text>
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#1e3a8a" />
            </TouchableOpacity>
          ),
          headerStyle: { backgroundColor: '#fff' },
          headerShadowVisible: true,
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messagesQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messageGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Start the conversation!</Text>
          </View>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <View key={groupIndex}>
              <View style={styles.dateDivider}>
                <View style={styles.dateLine} />
                <Text style={styles.dateText}>{group.date}</Text>
                <View style={styles.dateLine} />
              </View>
              {group.messages.map((msg, msgIndex) => {
                const isOwnMessage = msg.senderId === user?.id;
                const showAvatar = !isOwnMessage && (
                  msgIndex === 0 ||
                  group.messages[msgIndex - 1].senderId !== msg.senderId
                );
                const displayName = isOwnMessage ? 'You' : msg.senderName;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isOwnMessage ? styles.ownMessageRow : styles.otherMessageRow,
                    ]}
                  >
                    {!isOwnMessage && (
                      <View style={styles.avatarSlot}>
                        {showAvatar ? (
                          <View style={[styles.avatar, { backgroundColor: getAvatarColor(msg.senderId) }]}>
                            <Text style={styles.avatarText}>{getInitials(msg.senderName)}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                    <View
                      style={[
                        styles.messageBubble,
                        isOwnMessage ? styles.ownMessage : styles.otherMessage,
                      ]}
                    >
                      <Text
                        style={[
                          styles.senderName,
                          { color: isOwnMessage ? 'rgba(255,255,255,0.85)' : getAvatarColor(msg.senderId) },
                        ]}
                      >
                        {displayName}
                      </Text>
                      <Text
                        style={[
                          styles.messageText,
                          isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                        ]}
                      >
                        {msg.content}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                        ]}
                      >
                        {formatTime(msg.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#94a3b8"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() || sendMessageMutation.isPending}
        >
          {sendMessageMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  headerSubtitle: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 2,
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#64748b',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingVertical: 60,
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
    marginTop: 4,
  },
  dateDivider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dateText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#64748b',
  },
  messageRow: {
    flexDirection: 'row' as const,
    marginBottom: 4,
    alignItems: 'flex-end' as const,
  },
  ownMessageRow: {
    justifyContent: 'flex-end' as const,
  },
  otherMessageRow: {
    justifyContent: 'flex-start' as const,
  },
  avatarSlot: {
    width: 32,
    marginRight: 6,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#fff',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 2,
  },
  ownMessage: {
    backgroundColor: '#1e3a8a',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right' as const,
  },
  otherMessageTime: {
    color: '#94a3b8',
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    padding: 12,
    paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    color: '#1e293b',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
});
