import { StatusBar } from 'expo-status-bar';
import { Heart, Plus, Clock, User, AlertCircle, CheckCircle, MessageSquarePlus, ChevronDown, ChevronUp, Sparkles, Globe, Church } from 'lucide-react-native';
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
import { useChurch } from '@/providers/church-provider';
import { isAdmin } from '@/utils/permissions';
import type { PrayerRequest, PrayerStatus, PrayerUpdate } from '@/types/prayer';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function PrayersScreen() {
  const { user } = useAuth();
  const { currentChurch } = useChurch();
  const [selectedFilter, setSelectedFilter] = useState<PrayerStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPrayer, setNewPrayer] = useState({
    title: '',
    description: '',
    isAnonymous: false,
    isUrgent: false,
    isSharedAllChurches: false,
  });
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedPrayerForUpdate, setSelectedPrayerForUpdate] = useState<PrayerRequest | null>(null);
  const [updateContent, setUpdateContent] = useState('');
  const [isAnsweredUpdate, setIsAnsweredUpdate] = useState(false);
  const [expandedPrayers, setExpandedPrayers] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const userIsAdmin = isAdmin(user);

  const homeChurchQuery = useQuery({
    queryKey: ['user-home-church', user?.id],
    queryFn: async (): Promise<{ id: string; name: string } | null> => {
      if (!user?.id) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('home_group_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.warn('[Prayers] Could not fetch profile home_group_id:', profileError?.message);
        return null;
      }

      const homeGroupId = (profile as any).home_group_id as string | null;

      if (homeGroupId) {
        const { data: group, error: groupError } = await supabase
          .from('groups')
          .select('id, name')
          .eq('id', homeGroupId)
          .single();

        if (!groupError && group) {
          console.log('[Prayers] Resolved home church:', group.name);
          return { id: group.id as string, name: group.name as string };
        }
      }

      const { data: memberships, error: memError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!memError && memberships && memberships.length > 0) {
        const gid = (memberships[0] as any).group_id as string;
        const { data: group } = await supabase
          .from('groups')
          .select('id, name')
          .eq('id', gid)
          .single();
        if (group) {
          console.log('[Prayers] Resolved church from group_members:', group.name);
          return { id: group.id as string, name: group.name as string };
        }
      }

      return null;
    },
    enabled: !!user?.id,
  });

  const userHomeChurch = homeChurchQuery.data ?? null;
  // Strict: scope by the viewer's actual home group only. The church picker must NOT
  // grant visibility into another church's local prayers.
  const userHomeGroupId = userHomeChurch?.id ?? null;
  const effectiveChurchId = userHomeGroupId ?? currentChurch?.id ?? null;
  const effectiveChurchName = userHomeChurch?.name ?? currentChurch?.name ?? null;

  const allPrayersQuery = useQuery({
    queryKey: ['prayers', userHomeGroupId, userIsAdmin, homeChurchQuery.isFetched],
    enabled: userIsAdmin || homeChurchQuery.isFetched,
    queryFn: async () => {
      let query = supabase
        .from('prayers')
        .select(`
          *,
          profiles!prayers_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (!userIsAdmin) {
        if (userHomeGroupId) {
          query = query.or(`group_id.eq.${userHomeGroupId},is_shared_all_churches.eq.true`);
        } else {
          query = query.eq('is_shared_all_churches', true);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Prayers] Fetch error:', error.message);
        throw new Error(error.message);
      }

      const rows = (data || []) as any[];
      const visible = userIsAdmin
        ? rows
        : rows.filter((p: any) => {
            const shared = p?.is_shared_all_churches === true;
            const sameGroup = !!userHomeGroupId && p?.group_id === userHomeGroupId;
            return shared || sameGroup;
          });

      return visible.map((prayer: any) => ({
        id: prayer.id,
        title: prayer.title,
        description: prayer.description || '',
        requestedBy: prayer.created_by || '',
        requestedByName: prayer.profiles?.full_name || 'Anonymous',
        status: prayer.is_answered ? 'answered' as PrayerStatus : 'active' as PrayerStatus,
        isAnonymous: prayer.is_anonymous || false,
        isUrgent: false,
        prayedBy: [] as string[],
        createdAt: new Date(prayer.created_at),
        answeredAt: prayer.updated_at && prayer.is_answered ? new Date(prayer.updated_at) : undefined,
        groupId: prayer.group_id ?? null,
        isSharedAllChurches: prayer.is_shared_all_churches ?? false,
      }));
    },
  });

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

  const updatesQuery = useQuery({
    queryKey: ['prayer_updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prayer_updates')
        .select(`
          id,
          prayer_id,
          content,
          is_answered_update,
          created_by,
          created_at,
          profiles!prayer_updates_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: true });
      if (error) {
        console.warn('[Prayers] prayer_updates table not available:', error.message);
        return [] as PrayerUpdate[];
      }
      return (data || []).map((u: any) => ({
        id: u.id,
        prayerId: u.prayer_id,
        content: u.content,
        isAnsweredUpdate: u.is_answered_update || false,
        createdBy: u.created_by,
        createdByName: u.profiles?.full_name || 'Anonymous',
        createdAt: new Date(u.created_at),
      })) as PrayerUpdate[];
    },
  });

  const mergedPrayers: PrayerRequest[] = useMemo(() => {
    const base = allPrayersQuery.data ?? [];
    const praying = prayingQuery.data ?? [];
    const updates = updatesQuery.data ?? [];
    const prayMap = new Map<string, string[]>();
    for (const row of praying) {
      const list = prayMap.get(row.prayer_id) ?? [];
      list.push(row.user_id);
      prayMap.set(row.prayer_id, list);
    }
    const updateMap = new Map<string, PrayerUpdate[]>();
    for (const upd of updates) {
      const list = updateMap.get(upd.prayerId) ?? [];
      list.push(upd);
      updateMap.set(upd.prayerId, list);
    }
    return base.map(p => ({
      ...p,
      prayedBy: prayMap.get(p.id) ?? [],
      updates: updateMap.get(p.id) ?? [],
    }));
  }, [allPrayersQuery.data, prayingQuery.data, updatesQuery.data]);

  const visiblePrayers: PrayerRequest[] = mergedPrayers;
  
  const createPrayerMutation = useMutation({
    mutationFn: async (prayerData: {
      title: string;
      description: string;
      isAnonymous: boolean;
      isUrgent: boolean;
      requestedBy: string;
      requestedByName: string;
      isSharedAllChurches: boolean;
    }) => {
      // Non-admins MUST be tied to their own home group so prayers can never
      // leak into another church's local feed via the church picker.
      if (!userIsAdmin && !userHomeGroupId) {
        throw new Error('You must be assigned to a home church before posting a prayer.');
      }
      const groupForInsert = userIsAdmin ? effectiveChurchId : userHomeGroupId;
      const { data, error } = await supabase
        .from('prayers')
        .insert({
          title: prayerData.title,
          description: prayerData.description,
          created_by: prayerData.requestedBy,
          is_anonymous: prayerData.isAnonymous,
          is_answered: false,
          group_id: groupForInsert,
          is_shared_all_churches: prayerData.isSharedAllChurches,
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      setNewPrayer({
        title: '',
        description: '',
        isAnonymous: false,
        isUrgent: false,
        isSharedAllChurches: false,
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
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayer_updates'] });
      Alert.alert('Success', 'Prayer status updated');
    },
    onError: (error: Error) => {
      console.error('Error updating prayer status:', error);
      Alert.alert('Error', error.message || 'Failed to update prayer status');
    },
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (data: {
      prayerId: string;
      content: string;
      isAnsweredUpdate: boolean;
      createdBy: string;
    }) => {
      const { error } = await supabase.from('prayer_updates').insert({
        prayer_id: data.prayerId,
        content: data.content,
        is_answered_update: data.isAnsweredUpdate,
        created_by: data.createdBy,
      });
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          throw new Error('Prayer updates table not configured. Please run the database setup SQL.');
        }
        throw new Error(error.message);
      }
      if (data.isAnsweredUpdate) {
        await supabase
          .from('prayers')
          .update({ is_answered: true, updated_at: new Date().toISOString() })
          .eq('id', data.prayerId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayer_updates'] });
      setShowUpdateModal(false);
      setSelectedPrayerForUpdate(null);
      setUpdateContent('');
      setIsAnsweredUpdate(false);
      Alert.alert('Success', 'Your update has been posted');
    },
    onError: (error: Error) => {
      console.error('[Prayers] Error creating update:', error);
      Alert.alert('Error', error.message || 'Failed to post update');
    },
  });

  const togglePrayerExpanded = (prayerId: string) => {
    setExpandedPrayers(prev => {
      const next = new Set(prev);
      if (next.has(prayerId)) {
        next.delete(prayerId);
      } else {
        next.add(prayerId);
      }
      return next;
    });
  };

  const handleOpenUpdateModal = (prayer: PrayerRequest) => {
    setSelectedPrayerForUpdate(prayer);
    setUpdateContent('');
    setIsAnsweredUpdate(false);
    setShowUpdateModal(true);
  };

  const handleSubmitUpdate = () => {
    if (!updateContent.trim()) {
      Alert.alert('Error', 'Please enter an update message');
      return;
    }
    if (!user?.id || !selectedPrayerForUpdate) {
      Alert.alert('Error', 'Unable to submit update');
      return;
    }
    createUpdateMutation.mutate({
      prayerId: selectedPrayerForUpdate.id,
      content: updateContent.trim(),
      isAnsweredUpdate,
      createdBy: user.id,
    });
  };

  const allPrayers = visiblePrayers;
  
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
    return isRequester || userIsAdmin;
  };

  const togglePrayMutation = useMutation({
    mutationFn: async (payload: { prayerId: string; willPray: boolean; userId: string }) => {
      if (payload.willPray) {
        const { error } = await supabase.from('prayer_prayers').upsert({
          prayer_id: payload.prayerId,
          user_id: payload.userId,
        }, {
          onConflict: 'prayer_id,user_id',
          ignoreDuplicates: true
        });
        if (error) {
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
          if (!error.message.includes('relation') || !error.message.includes('does not exist')) {
            throw new Error(error.message);
          }
        }
      }
    },
    onMutate: async ({ prayerId, willPray, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['prayers'] });
      await queryClient.cancelQueries({ queryKey: ['prayer_prayers'] });

      const prevPrayers = queryClient.getQueryData<PrayerRequest[]>(['prayers', effectiveChurchId]);
      const prevLinks = queryClient.getQueryData<{ prayer_id: string; user_id: string }[]>(['prayer_prayers']);

      if (prevPrayers) {
        const next = prevPrayers.map(p =>
          p.id === prayerId
            ? { ...p, prayedBy: willPray ? [...(p.prayedBy ?? []), userId] : (p.prayedBy ?? []).filter(id => id !== userId) }
            : p,
        );
        queryClient.setQueryData(['prayers', effectiveChurchId], next);
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
      if (ctx?.prevPrayers) queryClient.setQueryData(['prayers', effectiveChurchId], ctx.prevPrayers);
      if (ctx?.prevLinks) queryClient.setQueryData(['prayer_prayers'], ctx.prevLinks);
      
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
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayer_prayers'] });
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
      isSharedAllChurches: newPrayer.isSharedAllChurches,
      requestedBy: user.id,
      requestedByName: `${user.firstName} ${user.lastName}`,
      groupId: effectiveChurchId,
    });
    
    createPrayerMutation.mutate({
      title: newPrayer.title.trim(),
      description: newPrayer.description.trim(),
      isAnonymous: newPrayer.isAnonymous,
      isUrgent: newPrayer.isUrgent,
      requestedBy: user.id,
      requestedByName: `${user.firstName} ${user.lastName}`,
      isSharedAllChurches: newPrayer.isSharedAllChurches,
    });
  };

  const activePrayers = allPrayers.filter((p: PrayerRequest) => p.status === 'active');
  const answeredPrayers = allPrayers.filter((p: PrayerRequest) => p.status === 'answered');

  const filters: { key: PrayerStatus | 'all'; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: allPrayers.length },
    { key: 'active', label: 'Active', count: activePrayers.length },
    { key: 'answered', label: 'Answered', count: answeredPrayers.length },
  ];

  const getScopeBadge = (prayer: PrayerRequest) => {
    if (prayer.isSharedAllChurches) return 'shared';
    if (prayer.groupId && prayer.groupId !== effectiveChurchId) return 'other';
    return 'local';
  };

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
          prayers.map((prayer: PrayerRequest) => {
          const scopeBadge = getScopeBadge(prayer);
          return (
          <View key={prayer.id} style={[styles.prayerCard, prayer.isUrgent && styles.prayerCardUrgent]}>
            {prayer.isUrgent && (
              <View style={styles.urgentRibbon}>
                <AlertCircle size={14} color="white" />
                <Text style={styles.urgentRibbonText}>URGENT PRAYER</Text>
              </View>
            )}
            <View style={styles.prayerHeader}>
              <View style={styles.prayerBadges}>
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
                {scopeBadge === 'shared' && (
                  <View style={styles.sharedBadge}>
                    <Globe size={11} color="#2563eb" />
                    <Text style={styles.sharedBadgeText}>All Churches</Text>
                  </View>
                )}
                {scopeBadge === 'local' && prayer.groupId && (
                  <View style={styles.localBadge}>
                    <Church size={11} color="#6b7280" />
                    <Text style={styles.localBadgeText}>My Church</Text>
                  </View>
                )}
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
                  if (!(user.role === 'member' || user.role === 'pastor' || user.role === 'church_leader' || user.role === 'admin')) {
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

            {((prayer.updates && prayer.updates.length > 0) || canUpdateStatus(prayer)) && (
              <View style={styles.updatesSection}>
                {prayer.updates && prayer.updates.length > 0 && (
                  <TouchableOpacity
                    style={styles.updatesToggle}
                    onPress={() => togglePrayerExpanded(prayer.id)}
                  >
                    <MessageSquarePlus size={14} color="#1e3a8a" />
                    <Text style={styles.updatesToggleText}>
                      {prayer.updates.length} update{prayer.updates.length !== 1 ? 's' : ''}
                    </Text>
                    {expandedPrayers.has(prayer.id) ? (
                      <ChevronUp size={16} color="#64748b" />
                    ) : (
                      <ChevronDown size={16} color="#64748b" />
                    )}
                  </TouchableOpacity>
                )}

                {expandedPrayers.has(prayer.id) && prayer.updates && prayer.updates.map((upd) => (
                  <View key={upd.id} style={styles.updateItem}>
                    {upd.isAnsweredUpdate && (
                      <View style={styles.answeredUpdateBadge}>
                        <Sparkles size={12} color="#16a34a" />
                        <Text style={styles.answeredUpdateBadgeText}>Prayer Answered!</Text>
                      </View>
                    )}
                    <Text style={styles.updateContent}>{upd.content}</Text>
                    <Text style={styles.updateMeta}>
                      {upd.createdByName} • {formatDate(upd.createdAt)}
                    </Text>
                  </View>
                ))}

                {canUpdateStatus(prayer) && (
                  <TouchableOpacity
                    style={styles.addUpdateButton}
                    onPress={() => handleOpenUpdateModal(prayer)}
                  >
                    <Plus size={14} color="#1e3a8a" />
                    <Text style={styles.addUpdateButtonText}>Post Update</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          );
          })
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
            {effectiveChurchName && (
              <View style={styles.churchContextBanner}>
                <Church size={14} color="#1e3a8a" />
                <Text style={styles.churchContextText}>
                  Posting to: {effectiveChurchName}
                </Text>
              </View>
            )}

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

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.shareLabelRow}>
                    <Globe size={16} color="#2563eb" />
                    <Text style={styles.switchLabel}>Share with all churches</Text>
                  </View>
                  <Text style={styles.switchDescription}>
                    Visible to members of all church groups
                  </Text>
                </View>
                <Switch
                  value={newPrayer.isSharedAllChurches}
                  onValueChange={(value) => setNewPrayer(prev => ({ ...prev, isSharedAllChurches: value }))}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor={newPrayer.isSharedAllChurches ? 'white' : '#f4f4f5'}
                  testID="prayer-shared-switch"
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showUpdateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Post Update</Text>
            <TouchableOpacity
              onPress={handleSubmitUpdate}
              disabled={createUpdateMutation.isPending}
            >
              <Text style={[
                styles.modalSubmitText,
                createUpdateMutation.isPending && styles.modalSubmitTextDisabled
              ]}>
                {createUpdateMutation.isPending ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedPrayerForUpdate && (
              <View style={styles.updatePrayerContext}>
                <Text style={styles.updatePrayerContextLabel}>Updating:</Text>
                <Text style={styles.updatePrayerContextTitle}>{selectedPrayerForUpdate.title}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your Update</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Share an update, testimony, or how God is working..."
                value={updateContent}
                onChangeText={setUpdateContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Mark as Answered Prayer</Text>
                  <Text style={styles.switchDescription}>Share your testimony of answered prayer</Text>
                </View>
                <Switch
                  value={isAnsweredUpdate}
                  onValueChange={setIsAnsweredUpdate}
                  trackColor={{ false: '#e2e8f0', true: '#16a34a' }}
                  thumbColor={isAnsweredUpdate ? 'white' : '#f4f4f5'}
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
    fontWeight: 'bold' as const,
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
    fontWeight: '500' as const,
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
    overflow: 'hidden' as const,
  },
  prayerCardUrgent: {
    borderWidth: 2,
    borderColor: '#dc2626',
    backgroundColor: '#fff8f8',
  },
  urgentRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: -20,
    marginTop: -20,
    marginBottom: 12,
  },
  urgentRibbonText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: 'white',
    letterSpacing: 1,
  },
  prayerHeader: {
    marginBottom: 16,
  },
  prayerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
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
    fontWeight: 'bold' as const,
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
    fontWeight: '600' as const,
    color: '#64748b',
  },
  answeredBadgeText: {
    color: '#16a34a',
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sharedBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#2563eb',
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  localBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
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
    flexWrap: 'wrap' as const,
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
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-end' as const,
  },
  prayerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: '#1e293b',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  churchContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  churchContextText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
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
    fontWeight: '500' as const,
    color: '#1e293b',
  },
  switchDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  shareLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: 'white',
  },
  updatesSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  updatesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  updatesToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e3a8a',
    flex: 1,
  },
  updateItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  answeredUpdateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  answeredUpdateBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#16a34a',
  },
  updateContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  updateMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
  addUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  addUpdateButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  updatePrayerContext: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  updatePrayerContextLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  updatePrayerContextTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#1e293b',
  },
});
