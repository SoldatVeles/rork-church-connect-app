import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  titleKey: string | null;
  bodyKey: string | null;
  bodyParams: Record<string, unknown>;
  created_at: string;
  isRead: boolean;
}

function normalizeNotificationParams(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function formatSabbathNotificationDate(value: unknown, locale: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }

  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

type NotificationScope = {
  role: string | null;
  homeGroupId: string | null;
  createdAt: string | null;
};

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationScopeQuery = useQuery<NotificationScope, Error>({
    queryKey: ['notification-scope', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) {
        return { role: null, homeGroupId: null, createdAt: null };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, home_group_id, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('[NotificationsPage] Profile scope fetch error:', profileError.message);
        return { role: user.role ?? null, homeGroupId: null, createdAt: null };
      }

      const profileHomeGroupId = (profile as any)?.home_group_id as string | null;

      if (profileHomeGroupId) {
        return {
          role: ((profile as any)?.role ?? user.role ?? null) as string | null,
          homeGroupId: profileHomeGroupId,
          createdAt: ((profile as any)?.created_at ?? null) as string | null,
        };
      }

      const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .limit(1);

      if (membershipsError) {
        console.warn('[NotificationsPage] Membership scope fetch error:', membershipsError.message);
      }

      return {
        role: ((profile as any)?.role ?? user.role ?? null) as string | null,
        homeGroupId: memberships && memberships.length > 0 ? ((memberships[0] as any).group_id as string) : null,
        createdAt: ((profile as any)?.created_at ?? null) as string | null,
      };
    },
  });

  const notificationScope = notificationScopeQuery.data;
  const notificationUserIsAdmin = notificationScope?.role === 'admin';
  const notificationHomeGroupId = notificationScope?.homeGroupId ?? null;
  const notificationUserCreatedAt = notificationScope?.createdAt ?? null;

  const query = useQuery<AppNotification[], Error>({
    queryKey: [
      'notifications',
      'all',
      user?.id,
      notificationHomeGroupId,
      notificationUserIsAdmin,
      notificationUserCreatedAt,
      notificationScopeQuery.isFetched,
    ],
    enabled: !!user?.id && notificationScopeQuery.isFetched,
    queryFn: async () => {
      if (!user?.id) return [];

      if (!notificationUserIsAdmin && !notificationHomeGroupId) {
        return [];
      }

      let notificationsQuery = supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });

      if (notificationUserCreatedAt) {
        notificationsQuery = notificationsQuery.gte('created_at', notificationUserCreatedAt);
      }

      const { data: notificationsData, error: notificationsError } = await notificationsQuery;

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
            title: notification.title ?? t('notifications.fallbackTitle'),
            body: notification.body ?? null,
            titleKey: notification.title_key ?? null,
            bodyKey: notification.body_key ?? null,
            bodyParams: normalizeNotificationParams(notification.body_params),
            created_at: notification.created_at,
            isRead: Boolean(state?.is_read),
          };
        });
    },
    refetchInterval: 30000,
  });

  const notifications = useMemo(() => query.data ?? [], [query.data]);

  const refreshNotifications = () => {
    void query.refetch();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'count', user?.id] });
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) {
        throw new Error(t('notifications.mustBeLoggedIn'));
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
        throw new Error(t('notifications.mustBeLoggedIn'));
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
        throw new Error(t('notifications.mustBeLoggedIn'));
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

  const formatTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString(i18n.language);
  };

  const getNotificationParams = (notification: AppNotification) => {
    const params = { ...notification.bodyParams };
    const formattedSabbathDate = formatSabbathNotificationDate(params.sabbathDate, i18n.language);

    if (formattedSabbathDate && !params.date) {
      params.date = formattedSabbathDate;
    }

    if (typeof params.sabbathRole === 'string' && !params.role) {
      params.role = t(`sabbath.roles.${params.sabbathRole}`, {
        defaultValue: params.sabbathRole,
      });
    }

    return params;
  };

  const getNotificationTitle = (notification: AppNotification) => {
    if (!notification.titleKey) {
      return notification.title || t('notifications.fallbackTitle');
    }

    return t(notification.titleKey, {
      ...getNotificationParams(notification),
      defaultValue: notification.title || t('notifications.fallbackTitle'),
    });
  };

  const getNotificationBody = (notification: AppNotification) => {
    if (!notification.bodyKey) {
      return notification.body;
    }

    return t(notification.bodyKey, {
      ...getNotificationParams(notification),
      defaultValue: notification.body ?? '',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: t('notifications.title') }} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('notifications.title')}</Text>

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
          <Text style={styles.errorText}>{t('notifications.failedToLoad')}</Text>
        </View>
      ) : query.isLoading || notificationScopeQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Bell size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
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
                  {getNotificationTitle(notification)}
                </Text>

                {getNotificationBody(notification) ? (
                  <Text style={styles.itemBody}>{getNotificationBody(notification)}</Text>
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
