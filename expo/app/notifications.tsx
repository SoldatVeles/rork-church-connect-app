import { Stack } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, Trash2, CheckCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useChurch } from '@/providers/church-provider';
import { isAdmin as checkIsAdmin } from '@/utils/permissions';
import { useMutation, useQuery } from '@tanstack/react-query';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { currentChurch } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = checkIsAdmin(user);

  const query = useQuery<AppNotification[], Error>({
    queryKey: ['notifications', 'all', user?.id, currentChurchId, userIsAdmin],
    queryFn: async () => {
      if (!user?.id) return [];
      let q = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (userIsAdmin) {
        // Admin sees all notifications
      } else {
        const filters = [`user_id.eq.${user.id}`];
        if (currentChurchId) {
          filters.push(`group_id.eq.${currentChurchId}`);
        }
        q = q.or(filters.join(','));
      }

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as AppNotification[];
    },
    refetchInterval: 30000,
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      console.log('[Notifications] Clearing notifications for user:', user.id, 'admin:', userIsAdmin);
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
    onSuccess: () => query.refetch(),
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => query.refetch(),
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[Notifications] Marking as read:', id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => query.refetch(),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      console.log('[Notifications] Marking all as read');
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
    onSuccess: () => query.refetch(),
  });

  const notifications = useMemo(() => query.data ?? [], [query.data]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {notifications.some(n => !n.is_read) && (
              <TouchableOpacity onPress={() => markAllRead.mutate()} style={styles.clearBtn} accessibilityRole="button" testID="mark-all-read-notifications-page">
                <CheckCheck size={20} color="#3b82f6" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => clearAll.mutate()} style={styles.clearBtn} accessibilityRole="button" testID="clear-all-notifications-page">
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
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
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.item, !n.is_read && styles.unreadItem]}
              onPress={() => { if (!n.is_read) markReadMutation.mutate(n.id); }}
              activeOpacity={0.7}
            >
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  {!n.is_read && <View style={styles.unreadDot} />}
                  <Text style={[styles.itemTitle, !n.is_read && styles.unreadTitle]}>{n.title}</Text>
                </View>
                {n.body ? <Text style={styles.itemBody}>{n.body}</Text> : null}
                <Text style={styles.itemTime}>{new Date(n.created_at).toLocaleString()}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteOne.mutate(n.id)} style={styles.itemDeleteButton} accessibilityRole="button" testID={`delete-notification-${n.id}`}>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  clearBtn: { padding: 6 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  list: { flex: 1 },
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
  content: { flex: 1 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginRight: 8,
  },
  unreadItem: {
    backgroundColor: '#eff6ff',
  },
  unreadTitle: {
    fontWeight: '700' as const,
  },
  itemTitle: { fontSize: 14, fontWeight: '600' as const, color: '#111827' },
  itemBody: { fontSize: 13, color: '#4b5563', marginBottom: 4, lineHeight: 18 },
  itemTime: { fontSize: 12, color: '#9ca3af' },
  itemDeleteButton: { padding: 6, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12 },
  errorText: { fontSize: 14, color: '#ef4444' },
});
