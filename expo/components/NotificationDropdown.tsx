import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Bell, Calendar, Heart, MessageCircle, X, Trash2, Sun } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  fetchNotificationPreferences,
  isNotificationEnabled,
} from '@/lib/notification-preferences';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
  onNotificationsChanged?: () => void;
}

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  titleKey: string | null;
  bodyKey: string | null;
  bodyParams: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
  eventId: string | null;
  prayerId: string | null;
  sabbathId: string | null;
};

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

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  visible,
  onClose,
  anchorPosition,
  onNotificationsChanged,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const preferencesQuery = useQuery({
    queryKey: ['notification-preferences', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchNotificationPreferences(user!.id),
  });
  const preferences = preferencesQuery.data ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const notificationScopeQuery = useQuery({
    queryKey: ['notification-scope', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<{ role: string | null; homeGroupId: string | null; createdAt: string | null }> => {
      if (!user?.id) return { role: null, homeGroupId: null, createdAt: null };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, home_group_id, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.warn('[Notifications] Profile scope fetch error:', profileError.message);
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
        console.warn('[Notifications] Membership scope fetch error:', membershipsError.message);
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

const refreshNotificationCounts = () => {
  void notificationsQuery.refetch();
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  void queryClient.invalidateQueries({ queryKey: ['notifications', 'count', user?.id] });
  onNotificationsChanged?.();
};
  const notificationsQuery = useQuery({
    queryKey: [
      'notifications',
      user?.id,
      notificationHomeGroupId,
      notificationUserIsAdmin,
      notificationUserCreatedAt,
      notificationScopeQuery.isFetched,
      preferences.events,
      preferences.prayers,
      preferences.sabbathUpdates,
      preferences.churchAnnouncements,
      preferencesQuery.isFetched,
    ],
    enabled: !!user?.id && notificationScopeQuery.isFetched && preferencesQuery.isFetched,
    queryFn: async (): Promise<NotificationItem[]> => {
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

      const notificationRows = (notificationsData ?? []).filter((notification: any) =>
        isNotificationEnabled(notification, preferences, user.id)
      );

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
        message: notification.body || notification.message || '',
        titleKey: notification.title_key ?? null,
        bodyKey: notification.body_key ?? null,
        bodyParams: normalizeNotificationParams(notification.body_params),
        isRead: Boolean(state?.is_read),
        createdAt: new Date(notification.created_at),
        eventId: notification.event_id ?? null,
        prayerId: notification.prayer_id ?? null,
        sabbathId: notification.sabbath_id ?? null,
      };
        });
    },
    refetchInterval: 30000,
  });

  const notifications = notificationsQuery.data ?? [];

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) {
        throw new Error(t('notifications.mustBeLoggedIn'));
      }

      const { error } = await supabase
        .from('notification_user_states')
        .upsert(
          {
            notification_id: notificationId,
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
      onSuccess: () => {
        refreshNotificationCounts();
      },
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) {
        throw new Error(t('notifications.mustBeLoggedIn'));
      }

      const { error } = await supabase
        .from('notification_user_states')
        .upsert(
          {
            notification_id: notificationId,
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
      onSuccess: () => {
        refreshNotificationCounts();
      },
  });

  const clearAllMutation = useMutation({
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
      onSuccess: () => {
        refreshNotificationCounts();
      },
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar size={20} color="#3b82f6" />;
      case 'sabbath':
        return <Sun size={20} color="#f59e0b" />;
      case 'prayer':
        return <Heart size={20} color="#ef4444" />;
      case 'announcement':
        return <MessageCircle size={20} color="#10b981" />;
      default:
        return <Bell size={20} color="#6b7280" />;
    }
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    switch (notification.type) {
      case 'event':
        if (notification.eventId) {
          router.push({
            pathname: '/(tabs)/events' as any,
            params: {
              eventId: notification.eventId,
              notificationId: notification.id,
            },
          });
        } else {
          router.push('/(tabs)/events');
        }
        break;
      case 'sabbath':
        if (notification.sabbathId) {
          router.push({
            pathname: '/sabbath-detail' as any,
            params: { sabbathId: notification.sabbathId },
          });
        } else {
          router.push('/(tabs)/sabbath');
        }
        break;
      case 'prayer':
        if (notification.prayerId) {
          router.push({
            pathname: '/(tabs)/prayers' as any,
            params: {
              prayerId: notification.prayerId,
              notificationId: notification.id,
            },
          });
        } else {
          router.push('/(tabs)/prayers');
        }
        break;
      default:
        break;
    }

    onClose();
  };

  const handleViewAll = () => {
    router.push('/notifications');
    onClose();
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days === 1
        ? t('notifications.time.dayAgo')
        : t('notifications.time.daysAgo', { count: days });
    }

    if (hours > 0) {
      return hours === 1
        ? t('notifications.time.hourAgo')
        : t('notifications.time.hoursAgo', { count: hours });
    }

    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes > 0) {
      return minutes === 1
        ? t('notifications.time.minuteAgo')
        : t('notifications.time.minutesAgo', { count: minutes });
    }

    return t('notifications.time.justNow');
  };

  const getNotificationParams = (notification: NotificationItem) => {
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

  const getNotificationTitle = (notification: NotificationItem) => {
    if (!notification.titleKey) {
      return notification.title || t('notifications.fallbackTitle');
    }

    return t(notification.titleKey, {
      ...getNotificationParams(notification),
      defaultValue: notification.title || t('notifications.fallbackTitle'),
    });
  };

  const getNotificationMessage = (notification: NotificationItem) => {
    if (!notification.bodyKey) {
      return notification.message;
    }

    return t(notification.bodyKey, {
      ...getNotificationParams(notification),
      defaultValue: notification.message,
    });
  };

  const renderNotificationItem = (notification: NotificationItem, isWeb: boolean) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        isWeb ? styles.notificationItem : styles.modalNotificationItem,
        !notification.isRead && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={styles.notificationIcon}>
        {getIcon(notification.type)}
      </View>

      <View style={styles.notificationContent}>
        <Text
          style={[
            styles.notificationTitle,
            !notification.isRead && styles.unreadText,
          ]}
        >
          {getNotificationTitle(notification)}
        </Text>

        <Text style={styles.notificationMessage} numberOfLines={isWeb ? 2 : 3}>
          {getNotificationMessage(notification)}
        </Text>

        <Text style={styles.notificationTime}>
          {formatTime(notification.createdAt)}
        </Text>
      </View>

      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          deleteOneMutation.mutate(notification.id);
        }}
        style={styles.itemDeleteButton}
        accessibilityRole="button"
        testID={`delete-notification-${notification.id}`}
      >
        <Trash2 size={18} color="#9ca3af" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (Platform.OS === 'web') {
    if (!visible) return null;

    return (
      <>
        <TouchableOpacity
          style={styles.webOverlay}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.webDropdown,
            anchorPosition && {
              top: anchorPosition.y + 40,
              right: Dimensions.get('window').width - anchorPosition.x - 20,
            },
          ]}
        >
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>{t('notifications.title')}</Text>

            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={() => clearAllMutation.mutate()}
                accessibilityRole="button"
                testID="clear-all-notifications"
                disabled={clearAllMutation.isPending}
              >
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          {notificationsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bell size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
            </View>
          ) : (
            <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
              {notifications.slice(0, 5).map((notification) =>
                renderNotificationItem(notification, true)
              )}

              {notifications.length > 5 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewAll}
                  testID="view-all-notifications"
                >
                  <Text style={styles.viewAllText}>{t('notifications.viewAll')}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('notifications.title')}</Text>

            <View style={styles.modalHeaderActions}>
              {notifications.length > 0 && (
                <TouchableOpacity
                  onPress={() => clearAllMutation.mutate()}
                  style={styles.markAllButton}
                  disabled={clearAllMutation.isPending}
                >
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>

          {notificationsQuery.isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bell size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>{t('notifications.empty')}</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalNotificationsList} showsVerticalScrollIndicator={false}>
              {notifications.map((notification) =>
                renderNotificationItem(notification, false)
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  webOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  webDropdown: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    width: 360,
    maxHeight: 480,
    zIndex: 999,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unreadNotification: {
    backgroundColor: '#eff6ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  itemDeleteButton: {
    padding: 6,
    alignSelf: 'center',
  },
  viewAllButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    padding: 4,
  },
  modalNotificationsList: {
    maxHeight: Dimensions.get('window').height * 0.65,
  },
  modalNotificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
});

export default NotificationDropdown;