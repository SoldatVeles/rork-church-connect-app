import { StatusBar } from 'expo-status-bar';
import { Heart, Plus, Clock, User, AlertCircle, CheckCircle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import type { PrayerRequest, PrayerStatus } from '@/types/prayer';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PrayersScreen() {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<PrayerStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrayer, setNewPrayer] = useState({
    title: '',
    description: '',
    isAnonymous: false,
    isUrgent: false,
  });

  const queryClient = useQueryClient();
  
  // Single query for all prayers, then filter on client side for better performance
  const allPrayersQuery = useQuery({
    queryKey: ['prayers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      return data.map(prayer => ({
        id: prayer.id,
        title: prayer.title,
        description: prayer.description || '',
        requestedBy: prayer.created_by,
        requestedByName: 'Anonymous',
        status: prayer.is_answered ? 'answered' as PrayerStatus : 'active' as PrayerStatus,
        isAnonymous: prayer.is_anonymous,
        isUrgent: false,
        prayedBy: [],
        createdAt: new Date(prayer.created_at),
        answeredAt: prayer.updated_at && prayer.is_answered ? new Date(prayer.updated_at) : undefined,
      }));
    },
  });

  // Fetch who is praying per prayer (via join table). If the table doesn't exist, we fail soft.
  const prayingQuery = useQuery({
    queryKey: ['prayer_prayers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_prayers')
        .select('prayer_id, user_id');
      if (error) {
        console.warn('[Prayers] prayer_prayers table not available or query failed:', error.message);
        return [] as { prayer_id: string; user_id: string }[];
      }
      return data as { prayer_id: string; user_id: string }[];
    },
  });

  const mergedPrayers: PrayerRequest[] = useMemo(() => {
    const base = allPrayersQuery.data ?? [];
    const praying = prayingQuery.data ?? [];
    const map = new Map<string, string[]>();
    for (const row of praying) {
      const list = map.get(row.prayer_id) ?? [];
      list.push(row.user_id);
      map.set(row.prayer_id, list);
    }
    return base.map(p => ({ ...p, prayedBy: map.get(p.id) ?? [] }));
  }, [allPrayersQuery.data, prayingQuery.data]);
  
  const createPrayerMutation = useMutation({
    mutationFn: async (prayerData: {
      title: string;
      description: string;
      isAnonymous: boolean;
      isUrgent: boolean;
      requestedBy: string;
      requestedByName: string;
    }) => {
      const { data, error } = await supabase
        .from('prayers')
        .insert({
          title: prayerData.title,
          description: prayerData.description,
          created_by: prayerData.requestedBy,
          is_anonymous: prayerData.isAnonymous,
          is_answered: false,
          category: 'personal',
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      setNewPrayer({
        title: '',
        description: '',
        isAnonymous: false,
        isUrgent: false,
      });
      setShowAddModal(false);
      Alert.alert('Success', 'Your prayer request has been submitted');
    },
    onError: (error: Error) => {
      console.error('[Prayers] Error creating prayer:', error);
      Alert.alert('Error', error.message || 'Failed to create prayer request');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      prayerId: string;
      status: PrayerStatus;
      userId: string;
      userRole: string;
    }) => {
      const { error } = await supabase
        .from('prayers')
        .update({
          is_answered: data.status === 'answered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.prayerId);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      Alert.alert('Success', 'Prayer status updated');
    },
    onError: (error: Error) => {
      console.error('Error updating prayer status:', error);
      Alert.alert('Error', error.message || 'Failed to update prayer status');
    },
  });

  const allPrayers = mergedPrayers || [];
  
  // Filter prayers based on selected filter
  const prayers = selectedFilter === 'all' 
    ? allPrayers 
    : allPrayers.filter((prayer: PrayerRequest) => prayer.status === selectedFilter);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hasUserPrayed = (prayer: PrayerRequest) => {
    return (prayer.prayedBy ?? []).includes(user?.id || '');
  };

  const canUpdateStatus = (prayer: PrayerRequest) => {
    if (!user) return false;
    const isRequester = prayer.requestedBy === user.id;
    const isAdmin = user.role === 'admin' || user.role === 'pastor';
    return isRequester || isAdmin;
  };

  const togglePrayMutation = useMutation({
    mutationFn: async (payload: { prayerId: string; willPray: boolean; userId: string }) => {
      // Try using a join table: prayer_prayers(prayer_id uuid, user_id uuid)
      if (payload.willPray) {
        const { error } = await supabase.from('prayer_prayers').upsert({
          prayer_id: payload.prayerId,
          user_id: payload.userId,
        }, {
          onConflict: 'prayer_id,user_id',
          ignoreDuplicates: true
        });
        if (error) {
          // Check if it's a table not found error
          if (error.message.includes('relation') && error.message.includes('does not exist')) {
            throw new Error('Prayer tracking table not configured. Please run the database setup SQL.');
          }
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase
          .from('prayer_prayers')
          .delete()
          .eq('prayer_id', payload.prayerId)
          .eq('user_id', payload.userId);
        if (error) {
          // Ignore error if table doesn't exist when trying to delete
          if (!error.message.includes('relation') || !error.message.includes('does not exist')) {
            throw new Error(error.message);
          }
        }
      }
    },
    onMutate: async ({ prayerId, willPray, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['prayers'] });
      await queryClient.cancelQueries({ queryKey: ['prayer_prayers'] });

      const prevPrayers = queryClient.getQueryData<PrayerRequest[]>(['prayers']);
      const prevLinks = queryClient.getQueryData<{ prayer_id: string; user_id: string }[]>(['prayer_prayers']);

      if (prevPrayers) {
        const next = prevPrayers.map(p =>
          p.id === prayerId
            ? { ...p, prayedBy: willPray ? [...(p.prayedBy ?? []), userId] : (p.prayedBy ?? []).filter(id => id !== userId) }
            : p,
        );
        queryClient.setQueryData(['prayers'], next);
      }

      if (prevLinks) {
        const nextLinks = willPray
          ? [...prevLinks, { prayer_id: prayerId, user_id: userId }]
          : prevLinks.filter(l => !(l.prayer_id === prayerId && l.user_id === userId));
        queryClient.setQueryData(['prayer_prayers'], nextLinks);
      }

      return { prevPrayers, prevLinks };
    },
    onError: (err: Error, _vars, ctx) => {
      console.error('[Prayers] Toggle pray failed:', err);
      if (ctx?.prevPrayers) queryClient.setQueryData(['prayers'], ctx.prevPrayers);
      if (ctx?.prevLinks) queryClient.setQueryData(['prayer_prayers'], ctx.prevLinks);
      
      // Provide helpful error message
      if (err.message.includes('Prayer tracking table not configured')) {
        Alert.alert(
          'Database Setup Required', 
          'The prayer tracking feature requires a database update. Please ask your administrator to run the prayer_prayers table setup SQL.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', err.message ?? 'Failed to update prayer status. Please try again.');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      queryClient.invalidateQueries({ queryKey: ['prayer_prayers'] });
    },
  });

  const handleToggleAnswered = (prayer: PrayerRequest) => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to update prayer status.');
      return;
    }

    const newStatus = prayer.status === 'answered' ? 'active' : 'answered';
    const message = prayer.status === 'answered' 
      ? 'Mark this prayer request as unanswered?' 
      : 'Mark this prayer request as answered?';

    Alert.alert(
      'Update Prayer Status',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            console.log('[Prayers] Updating prayer status:', {
              prayerId: prayer.id,
              status: newStatus,
              userId: user.id,
              userRole: user.role,
            });
            updateStatusMutation.mutate({
              prayerId: prayer.id,
              status: newStatus,
              userId: user.id,
              userRole: user.role,
            });
          },
        },
      ],
    );
  };

  const handleAddPrayer = () => {
    if (!newPrayer.title.trim() || !newPrayer.description.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a prayer request');
      return;
    }

    console.log('[Prayers] Creating prayer with data:', {
      title: newPrayer.title.trim(),
      description: newPrayer.description.trim(),
      isAnonymous: newPrayer.isAnonymous,
      isUrgent: newPrayer.isUrgent,
      requestedBy: user.id,
      requestedByName: `${user.firstName} ${user.lastName}`,
    });
    
    createPrayerMutation.mutate({
      title: newPrayer.title.trim(),
      description: newPrayer.description.trim(),
      isAnonymous: newPrayer.isAnonymous,
      isUrgent: newPrayer.isUrgent,
      requestedBy: user.id,
      requestedByName: `${user.firstName} ${user.lastName}`,
    });
  };

  // Calculate counts for filter buttons
  const activePrayers = allPrayers.filter((p: PrayerRequest) => p.status === 'active');
  const answeredPrayers = allPrayers.filter((p: PrayerRequest) => p.status === 'answered');

  const filters: { key: PrayerStatus | 'all'; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: allPrayers.length },
    { key: 'active', label: 'Active', count: activePrayers.length },
    { key: 'answered', label: 'Answered', count: answeredPrayers.length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Prayer Requests</Text>
          <TouchableOpacity 
            testID="add-prayer-button"
            style={styles.addButton}
            onPress={() => {
              console.log('[Prayers] + pressed');
              setShowAddModal(true);
            }}
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedFilter === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedFilter === filter.key && styles.filterButtonTextActive,
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {allPrayersQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={styles.loadingText}>Loading prayers...</Text>
          </View>
        ) : prayers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No prayer requests found</Text>
            <Text style={styles.emptySubtext}>Be the first to share a prayer request</Text>
          </View>
        ) : (
          prayers.map((prayer: PrayerRequest) => (
          <View key={prayer.id} style={styles.prayerCard}>
            <View style={styles.prayerHeader}>
              <View style={styles.prayerBadges}>
                {prayer.isUrgent && (
                  <View style={styles.urgentBadge}>
                    <AlertCircle size={12} color="#dc2626" />
                    <Text style={styles.urgentBadgeText}>URGENT</Text>
                  </View>
                )}
                <View style={[
                  styles.statusBadge,
                  prayer.status === 'answered' && styles.answeredBadge,
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    prayer.status === 'answered' && styles.answeredBadgeText,
                  ]}>
                    {prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1)}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.prayerTitle}>{prayer.title}</Text>
              <Text style={styles.prayerDescription}>{prayer.description}</Text>
            </View>

            <View style={styles.prayerMeta}>
              <View style={styles.prayerMetaRow}>
                <User size={14} color="#64748b" />
                <Text style={styles.prayerMetaText}>
                  {prayer.isAnonymous ? 'Anonymous' : prayer.requestedByName}
                </Text>
              </View>
              
              <View style={styles.prayerMetaRow}>
                <Clock size={14} color="#64748b" />
                <Text style={styles.prayerMetaText}>
                  {formatDate(prayer.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.prayerActions}>
              <View style={styles.prayerStats}>
                <Heart 
                  size={16} 
                  color={hasUserPrayed(prayer) ? "#ef4444" : "#94a3b8"}
                  fill={hasUserPrayed(prayer) ? "#ef4444" : "none"}
                />
                <Text style={styles.prayerStatsText}>
                  {prayer.prayedBy.length} {prayer.prayedBy.length === 1 ? 'person' : 'people'} praying
                </Text>
              </View>
              
              <View style={styles.actionButtons}>
                {canUpdateStatus(prayer) && (
                  <TouchableOpacity
                    testID={`status-button-${prayer.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={prayer.status === 'answered' ? 'Mark as unanswered' : 'Mark as answered'}
                    onPress={() => handleToggleAnswered(prayer)}
                    disabled={updateStatusMutation.isPending}
                    style={[
                      styles.statusButton,
                      prayer.status === 'answered' && styles.answeredStatusButton,
                      updateStatusMutation.isPending ? { opacity: 0.6 } as const : null,
                    ]}
                  >
                    <CheckCircle 
                      size={14} 
                      color="white"
                      fill={prayer.status === 'answered' ? "white" : "none"}
                    />
                    <Text style={styles.statusButtonText}>
                      {prayer.status === 'answered' ? 'Answered' : 'Mark Answered'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                testID={`pray-button-${prayer.id}`}
                accessibilityRole="button"
                accessibilityLabel={hasUserPrayed(prayer) ? 'Mark not praying' : 'Mark praying'}
                onPress={() => {
                  if (!user?.id) {
                    Alert.alert('Login required', 'Please log in to mark that you are praying.');
                    return;
                  }
                  if (!(user.role === 'member' || user.role === 'pastor' || user.role === 'admin')) {
                    Alert.alert('Not allowed', 'Only members and priests can use this action.');
                    return;
                  }
                  const willPray = !hasUserPrayed(prayer);
                  console.log('[Prayers] Toggling pray', { prayerId: prayer.id, willPray, userId: user.id });
                  togglePrayMutation.mutate({ prayerId: prayer.id, willPray, userId: user.id });
                }}
                disabled={togglePrayMutation.isPending}
                style={[
                  styles.prayButton,
                  hasUserPrayed(prayer) && styles.prayedButton,
                  togglePrayMutation.isPending ? { opacity: 0.6 } as const : null,
                ]}
              >
                <Text style={[
                  styles.prayButtonText,
                  hasUserPrayed(prayer) && styles.prayedButtonText,
                ]}>
                  {hasUserPrayed(prayer) ? 'Praying' : 'Pray'}
                </Text>
              </TouchableOpacity>
              </View>
            </View>
          </View>
          ))
        )}

        <View style={styles.spacer} />
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onShow={() => console.log('[Prayers] Modal shown')}
        onRequestClose={() => {
          console.log('[Prayers] Modal request close');
          setShowAddModal(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer} testID="prayer-modal">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} testID="prayer-cancel-button">
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Prayer Request</Text>
            <TouchableOpacity 
              onPress={handleAddPrayer}
              disabled={createPrayerMutation.isPending}
              testID="prayer-submit-button"
            >
              <Text style={[
                styles.modalSubmitText,
                createPrayerMutation.isPending && styles.modalSubmitTextDisabled
              ]}>
                {createPrayerMutation.isPending ? 'Submitting...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief title for your prayer request"
                value={newPrayer.title}
                onChangeText={(text) => setNewPrayer(prev => ({ ...prev, title: text }))}
                maxLength={100}
                testID="prayer-title-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Please share more details about your prayer request..."
                value={newPrayer.description}
                onChangeText={(text) => setNewPrayer(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                testID="prayer-description-input"
              />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Submit anonymously</Text>
                  <Text style={styles.switchDescription}>Your name won&apos;t be shown</Text>
                </View>
                <Switch
                  value={newPrayer.isAnonymous}
                  onValueChange={(value) => setNewPrayer(prev => ({ ...prev, isAnonymous: value }))}
                  trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                  thumbColor={newPrayer.isAnonymous ? 'white' : '#f4f4f5'}
                  testID="prayer-anonymous-switch"
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Mark as urgent</Text>
                  <Text style={styles.switchDescription}>For immediate prayer needs</Text>
                </View>
                <Switch
                  value={newPrayer.isUrgent}
                  onValueChange={(value) => setNewPrayer(prev => ({ ...prev, isUrgent: value }))}
                  trackColor={{ false: '#e2e8f0', true: '#ef4444' }}
                  thumbColor={newPrayer.isUrgent ? 'white' : '#f4f4f5'}
                  testID="prayer-urgent-switch"
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#ef4444',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    marginHorizontal: -24,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterButtonActive: {
    backgroundColor: '#ef4444',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  prayerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  prayerHeader: {
    marginBottom: 16,
  },
  prayerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  statusBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  answeredBadge: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  answeredBadgeText: {
    color: '#16a34a',
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  prayerDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  prayerMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  prayerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayerMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  prayerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  prayerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prayerStatsText: {
    fontSize: 12,
    color: '#64748b',
  },
  prayButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  prayedButton: {
    backgroundColor: '#16a34a',
  },
  prayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  prayedButtonText: {
    color: 'white',
  },
  spacer: {
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#64748b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  switchGroup: {
    gap: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  switchDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  modalSubmitTextDisabled: {
    color: '#94a3b8',
  },
  statusButton: {
    backgroundColor: '#64748b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  answeredStatusButton: {
    backgroundColor: '#16a34a',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
});