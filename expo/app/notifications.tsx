import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  isRead: boolean;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<AppNotification[], Error>({
    queryKey: ['notifications', 'all', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      if (notificationsError) {
        throw new Error(notificationsError.message);
      }

      const notificationRows = notificationsData ?? [];

      if (notificationRows.length === 0) {
        return [];
      }

      const notificationIds = notificationRows.map((notification: any) => notification.id);

      const { data: stateRows, error: statesError } = await supabase
        .from('notification_user_states')
        .select('notification_id, is_read, is_deleted')
        .eq('user_id', user.id)
        .in('notification_id', notificationIds);

      if (statesError) {
        throw new Error(statesError.message);
      }

      const stateMap = new Map<string, { is_read: boolean; is_deleted: boolean }>();

      (stateRows ?? []).forEach((state: any) => {
        stateMap.set(state.notification_id, {
          is_read: Boolean(state.is_read),
          is_deleted: Boolean(state.is_deleted),
        });
      });

      return notificationRows
        .filter((notification: any) => {
          const state = stateMap.get(notification.id);
          return state?.is_deleted !== true;
        })
        .map((notification: any) => {
          const state = stateMap.get(notification.id);

          return {
            id: notification.id,
            type: notification.type ?? 'announcement',
            title: notification.title ?? 'Notification',
            body: notification.body ?? null,
            created_at: notification.created_at,
            isRead: Boolean(state?.is_read),
          };
        });
    },
    refetchInterval: 30000,
  });

  const refreshNotifications = () => {
    void query.refetch();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'count', user?.id] });
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error('You must be logged in.');
      }

      const { error } = await supabase
        .from('notification_user_states')
        .upsert(
          {
            notification_id: id,
            user_id: user.id,
            is_read: true,
            is_deleted: false,
          },
          {
            onConflict: 'notification_id,user_id',
          }
        );

      if (error) throw new Error(error.message);
    },
    onSuccess: refreshNotifications,
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('You must be logged in.');
      }

      if (notifications.length === 0) return;

      const rows = notifications.map((notification) => ({
        notification_id: notification.id,
        user_id: user.id,
        is_read: true,
        is_deleted: true,
      }));

      const { error } = await supabase
        .from('notification_user_states')
        .upsert(rows, {
          onConflict: 'notification_id,user_id',
        });

      if (error) throw new Error(error.message);
    },
    onSuccess: refreshNotifications,
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error('You must be logged in.');
      }

      const { error } = await supabase
        .from('notification_user_states')
        .upsert(
          {
            notification_id: id,
            user_id: user.id,
            is_read: true,
            is_deleted: true,
          },
          {
            onConflict: 'notification_id,user_id',
          }
        );

      if (error) throw new Error(error.message);
    },
    onSuccess: refreshNotifications,
  });

  const notifications = useMemo(() => query.data ?? [], [query.data]);

  const formatTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>

        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={() => clearAll.mutate()}
            style={styles.clearBtn}
            accessibilityRole="button"
            testID="clear-all-notifications-page"
            disabled={clearAll.isPending}
          >
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>

      {query.isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load notifications</Text>
        </View>
      ) : query.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.item,
                !notification.isRead && styles.unreadItem,
              ]}
              onPress={() => {
                if (!notification.isRead) {
                  markRead.mutate(notification.id);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.content}>
                <Text
                  style={[
                    styles.itemTitle,
                    !notification.isRead && styles.unreadTitle,
                  ]}
                >
                  {notification.title}
                </Text>

                {notification.body ? (
                  <Text style={styles.itemBody}>{notification.body}</Text>
                ) : null}

                <Text style={styles.itemTime}>{formatTime(notification.created_at)}</Text>
              </View>

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  deleteOne.mutate(notification.id);
                }}
                style={styles.itemDeleteButton}
                accessibilityRole="button"
                testID={`delete-notification-${notification.id}`}
                disabled={deleteOne.isPending}
              >
                <Trash2 size={18} color="#9ca3af" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearBtn: {
    padding: 6,
  },
  list: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unreadItem: {
    backgroundColor: '#eff6ff',
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#1e3a8a',
  },
  itemBody: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  itemDeleteButton: {
    padding: 6,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
  },
});