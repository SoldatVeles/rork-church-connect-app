import React from 'react';
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
  isRead: boolean;
  createdAt: Date;
  sabbathId: string | null;
};

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  visible,
  onClose,
  anchorPosition,
  onNotificationsChanged,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

const refreshNotificationCounts = () => {
  void notificationsQuery.refetch();
  void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  void queryClient.invalidateQueries({ queryKey: ['notifications', 'count', user?.id] });
  onNotificationsChanged?.();
};
  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotificationItem[]> => {
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
        message: notification.body || notification.message || '',
        isRead: Boolean(state?.is_read),
        createdAt: new Date(notification.created_at),
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
        throw new Error('You must be logged in.');
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
        throw new Error('You must be logged in.');
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
        router.push('/(tabs)/events');
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
        router.push('/(tabs)/prayers');
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
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    const minutes = Math.floor(diff / (1000 * 60));
    return minutes > 0 ? `${minutes} min${minutes > 1 ? 's' : ''} ago` : 'Just now';
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
          {notification.title}
        </Text>

        <Text style={styles.notificationMessage} numberOfLines={isWeb ? 2 : 3}>
          {notification.message}
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
            <Text style={styles.dropdownTitle}>Notifications</Text>

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
              <Text style={styles.emptyText}>No notifications</Text>
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
                  <Text style={styles.viewAllText}>View all notifications</Text>
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
            <Text style={styles.modalTitle}>Notifications</Text>

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
              <Text style={styles.emptyText}>No notifications</Text>
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