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
import { Bell, Calendar, Heart, MessageCircle, X, Trash2, BookOpen, CheckCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useChurch } from '@/providers/church-provider';
import { isAdmin as checkIsAdmin } from '@/utils/permissions';
import { useQuery, useMutation } from '@tanstack/react-query';

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
}


const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  visible,
  onClose,
  anchorPosition,
}) => {
  const { user } = useAuth();
  const { currentChurch } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = checkIsAdmin(user);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id, currentChurchId, userIsAdmin],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (userIsAdmin) {
        // Admin sees all
      } else {
        const filters = [`user_id.eq.${user.id}`];
        if (currentChurchId) {
          filters.push(`group_id.eq.${currentChurchId}`);
        }
        query = query.or(filters.join(','));
      }

      const { data, error } = await query;
      
      if (error) throw new Error(error.message);
      
      return (data || []).map((notification: any) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.body || '',
        isRead: !!notification.is_read,
        createdAt: new Date(notification.created_at),
      }));
    },
    refetchInterval: 30000,
  });
  
  const markReadMutation = useMutation({
    mutationFn: async (data: { id: string }) => {
      console.log('[NotificationDropdown] Marking notification as read:', data.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', data.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void notificationsQuery.refetch();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      console.log('[NotificationDropdown] Marking all as read for user:', user.id);
      if (userIsAdmin) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('is_read', false);
        if (error) throw new Error(error.message);
      } else {
        const { error: errDirect } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
        if (errDirect) throw new Error(errDirect.message);
        if (currentChurchId) {
          const { error: errGroup } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('group_id', currentChurchId)
            .is('user_id', null)
            .eq('is_read', false);
          if (errGroup) throw new Error(errGroup.message);
        }
      }
    },
    onSuccess: () => {
      void notificationsQuery.refetch();
    },
  });

  const notifications = notificationsQuery.data || [];

  const getIcon = (type: string) => {
    switch (type) {
      case 'event':
        return <Calendar size={20} color="#3b82f6" />;
      case 'prayer':
        return <Heart size={20} color="#ef4444" />;
      case 'announcement':
        return <MessageCircle size={20} color="#10b981" />;
      case 'sabbath_published':
      case 'sabbath_updated':
      case 'sabbath_cancelled':
      case 'sabbath_assignment':
      case 'sabbath_reassigned':
      case 'sabbath_assignment_cancelled':
      case 'sabbath_response':
        return <BookOpen size={20} color="#8b5cf6" />;
      default:
        return <Bell size={20} color="#6b7280" />;
    }
  };

  const handleNotificationPress = (notification: { id: string; type: string; isRead: boolean }) => {
    // Mark as read
    if (!notification.isRead) {
      markReadMutation.mutate({ id: notification.id });
    }

    // Navigate based on type
    switch (notification.type) {
      case 'event':
        router.push('/(tabs)/events');
        break;
      case 'prayer':
        router.push('/(tabs)/prayers');
        break;
      case 'sabbath_published':
      case 'sabbath_updated':
      case 'sabbath_cancelled':
      case 'sabbath_assignment':
      case 'sabbath_reassigned':
      case 'sabbath_assignment_cancelled':
      case 'sabbath_response':
        router.push('/(tabs)/sabbath');
        break;
      default:
        break;
    }
    
    onClose();
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes > 0 ? `${minutes} min${minutes > 1 ? 's' : ''} ago` : 'Just now';
    }
  };

  const deleteOneMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting notification', id);
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => notificationsQuery.refetch(),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      console.log('[NotificationDropdown] Clearing notifications for user:', user.id, 'admin:', userIsAdmin);
      if (userIsAdmin) {
        const { error } = await supabase.from('notifications').delete().not('id', 'is', null);
        if (error) throw new Error(error.message);
      } else {
        const { error: errDirect } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', user.id);
        if (errDirect) throw new Error(errDirect.message);
        if (currentChurchId) {
          const { error: errGroup } = await supabase
            .from('notifications')
            .delete()
            .eq('group_id', currentChurchId)
            .is('user_id', null);
          if (errGroup) throw new Error(errGroup.message);
        }
      }
    },
    onSuccess: () => notificationsQuery.refetch(),
  });

  const handleViewAll = () => {
    router.push('/notifications');
    onClose();
  };

  if (Platform.OS === 'web') {
    // Web implementation with absolute positioning
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
              <View style={styles.headerActions}>
                {notifications.some(n => !n.isRead) && (
                  <TouchableOpacity onPress={() => markAllReadMutation.mutate()} accessibilityRole="button" testID="mark-all-read-notifications">
                    <CheckCheck size={20} color="#3b82f6" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => clearAllMutation.mutate()} accessibilityRole="button" testID="clear-all-notifications">
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
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
              {notifications.slice(0, 5).map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    !notification.isRead && styles.unreadNotification,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationIcon}>
                    {getIcon(notification.type)}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.unreadText,
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
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
              ))}
              {notifications.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll} testID="view-all-notifications">
                  <Text style={styles.viewAllText}>View all notifications</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </>
    );
  }

  // Mobile implementation with Modal
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
                <View style={styles.headerActions}>
                  {notifications.some(n => !n.isRead) && (
                    <TouchableOpacity onPress={() => markAllReadMutation.mutate()} style={styles.markAllButton}>
                      <CheckCheck size={20} color="#3b82f6" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => clearAllMutation.mutate()} style={styles.markAllButton}>
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
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
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.modalNotificationItem,
                    !notification.isRead && styles.unreadNotification,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                >
                  <View style={styles.notificationIcon}>
                    {getIcon(notification.type)}
                  </View>
                  <View style={styles.notificationContent}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.unreadText,
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationMessage}>
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
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Web styles
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

  // Mobile Modal styles
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
    maxHeight: '80%',
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
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  modalNotificationsList: {
    flex: 1,
  },
  modalNotificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
});

export default NotificationDropdown;