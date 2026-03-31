import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Calendar,
  ChevronRight,
  Sun,
  Users,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/auth-provider';
import { canManageAnySabbath, canManageSabbathForGroup, buildChurchScope } from '@/utils/church-scope';
import { isAdmin as checkIsAdmin } from '@/utils/permissions';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import type { Sabbath, SabbathStatus } from '@/types/sabbath';
import { STATUS_LABELS } from '@/types/sabbath';
import { getNextUnplannedSaturday } from '@/utils/sabbath';

function getNextSaturday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilSaturday);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getUpcomingSaturdays(count: number): Date[] {
  const saturdays: Date[] = [];
  const start = getNextSaturday();
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    saturdays.push(d);
  }
  return saturdays;
}

function formatSabbathDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sabbathDate = new Date(dateStr + 'T00:00:00');
  return sabbathDate >= today;
}

const STATUS_COLORS: Record<SabbathStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  published: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
};

type FilterType = 'all' | 'upcoming' | 'past' | 'draft' | 'published' | 'cancelled';

export default function SabbathPlannerScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const trpcUtils = trpc.useUtils();

  const pastorGroupsQuery = trpc.sabbaths.getMyPastorGroups.useQuery();
  const pastorGroups = useMemo(() => pastorGroupsQuery.data ?? [], [pastorGroupsQuery.data]);
  const pastorGroupIds = useMemo(() => pastorGroups.map((gp) => gp.group_id as string), [pastorGroups]);
  const churchScope = useMemo(() => buildChurchScope(user, null, pastorGroupIds), [user, pastorGroupIds]);

  const sabbathsQuery = trpc.sabbaths.getAll.useQuery();
  const sabbaths = useMemo(() => sabbathsQuery.data ?? [], [sabbathsQuery.data]);
  const isLoading = sabbathsQuery.isLoading;

  const createSabbathMutation = trpc.sabbaths.createDraft.useMutation({
    onSuccess: () => {
      console.log('[SabbathPlanner] tRPC createDraft success, invalidating');
      void trpcUtils.sabbaths.invalidate();
    },
  });
  const isCreatingSabbath = createSabbathMutation.isPending;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const canManage = canManageAnySabbath(churchScope);

  const groupsQuery = useQuery({
    queryKey: ['user-groups-for-sabbath', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('groups')
        .select('id, name');
      if (error) {
        console.error('[SabbathPlanner] Error fetching groups:', error.message);
        return [];
      }
      return (data || []) as { id: string; name: string }[];
    },
    enabled: !!user?.id,
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const availableGroups = useMemo(() => {
    const groups = groupsQuery.data || [];
    if (checkIsAdmin(user)) return groups;
    return groups.filter((g) => canManageSabbathForGroup(churchScope, g.id));
  }, [groupsQuery.data, churchScope, user]);

  const groupNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (groupsQuery.data || []).forEach((g) => map.set(g.id, g.name));
    return map;
  }, [groupsQuery.data]);

  const effectiveGroupId = selectedGroupId || (availableGroups.length > 0 ? availableGroups[0]?.id : null);

  const filteredSabbaths = useMemo(() => {
    let filtered = [...sabbaths];
    switch (activeFilter) {
      case 'upcoming':
        filtered = filtered.filter((s) => isUpcoming(s.sabbath_date) && s.status !== 'cancelled');
        break;
      case 'past':
        filtered = filtered.filter((s) => !isUpcoming(s.sabbath_date));
        break;
      case 'draft':
        filtered = filtered.filter((s) => s.status === 'draft');
        break;
      case 'published':
        filtered = filtered.filter((s) => s.status === 'published');
        break;
      case 'cancelled':
        filtered = filtered.filter((s) => s.status === 'cancelled');
        break;
    }
    return filtered;
  }, [sabbaths, activeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await sabbathsQuery.refetch();
    setRefreshing(false);
  }, [sabbathsQuery]);

  const handleCreate = useCallback(async () => {
    if (!selectedDate) {
      Alert.alert('Select a Date', 'Please select a Saturday for the Sabbath service.');
      return;
    }

    if (!effectiveGroupId) {
      Alert.alert('No Group', 'You must be a pastor of a church group to create a Sabbath plan.');
      return;
    }

    try {
      const result = await createSabbathMutation.mutateAsync({
        groupId: effectiveGroupId,
        sabbathDate: selectedDate,
        notes: notes.trim() || null,
      });
      console.log('[SabbathPlanner] Created sabbath:', result.id);
      setShowCreateModal(false);
      setSelectedDate(null);
      setNotes('');
      setSelectedGroupId(null);
      router.push({ pathname: '/sabbath-detail' as any, params: { sabbathId: result.id } });
    } catch (err: any) {
      console.error('[SabbathPlanner] Create error:', err);
      Alert.alert('Error', err.message || 'Failed to create Sabbath plan.');
    }
  }, [selectedDate, effectiveGroupId, notes, createSabbathMutation]);

  const upcomingSaturdays = useMemo(() => getUpcomingSaturdays(8), []);

  const groupSabbathDates = useMemo(() => {
    if (!effectiveGroupId) return [] as string[];
    return sabbaths
      .filter((s) => s.group_id === effectiveGroupId)
      .map((s) => s.sabbath_date);
  }, [sabbaths, effectiveGroupId]);

  const existingDates = useMemo(() => new Set(groupSabbathDates), [groupSabbathDates]);

  useEffect(() => {
    if (showCreateModal && effectiveGroupId) {
      const suggested = getNextUnplannedSaturday(groupSabbathDates);
      const key = formatDateKey(suggested);
      const isInUpcoming = upcomingSaturdays.some((s) => formatDateKey(s) === key);
      if (isInUpcoming && !existingDates.has(key)) {
        setSelectedDate(key);
      } else {
        const firstAvailable = upcomingSaturdays.find((s) => !existingDates.has(formatDateKey(s)));
        setSelectedDate(firstAvailable ? formatDateKey(firstAvailable) : null);
      }
    }
  }, [showCreateModal, effectiveGroupId, groupSabbathDates, existingDates, upcomingSaturdays]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'all', label: 'All' },
    { key: 'past', label: 'Past' },
    ...(canManage ? [{ key: 'draft' as FilterType, label: 'Drafts' }] : []),
    { key: 'published', label: 'Published' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const renderSabbathCard = useCallback(
    (sabbath: Sabbath) => {
      const statusStyle = STATUS_COLORS[sabbath.status];
      const upcoming = isUpcoming(sabbath.sabbath_date);
      const groupName = groupNameMap.get(sabbath.group_id) || 'Unknown Church';

      return (
        <TouchableOpacity
          key={sabbath.id}
          style={styles.sabbathCard}
          onPress={() =>
            router.push({ pathname: '/sabbath-detail' as any, params: { sabbathId: sabbath.id } })
          }
          activeOpacity={0.7}
          testID={`sabbath-card-${sabbath.id}`}
        >
          <View style={styles.cardDateStrip}>
            <View style={[styles.dateCircle, upcoming ? styles.dateCircleUpcoming : styles.dateCirclePast]}>
              <Text style={[styles.dateCircleDay, upcoming && styles.dateCircleDayUpcoming]}>
                {new Date(sabbath.sabbath_date + 'T00:00:00').getDate()}
              </Text>
              <Text style={[styles.dateCircleMonth, upcoming && styles.dateCircleMonthUpcoming]}>
                {new Date(sabbath.sabbath_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}
              </Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                Sabbath Service
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {STATUS_LABELS[sabbath.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.cardDate}>{formatSabbathDate(sabbath.sabbath_date)}</Text>
            <View style={styles.cardMeta}>
              <View style={styles.cardMetaItem}>
                <Users size={13} color="#64748b" />
                <Text style={styles.cardMetaText}>{groupName}</Text>
              </View>
            </View>
            {sabbath.notes ? (
              <Text style={styles.cardNotes} numberOfLines={1}>
                {sabbath.notes}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={20} color="#cbd5e1" />
        </TouchableOpacity>
      );
    },
    [groupNameMap]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={['#0f172a', '#1e3a5f']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-button">
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Sun size={20} color="#fbbf24" />
            <Text style={styles.headerTitle}>Sabbath Planner</Text>
          </View>
          {canManage ? (
            <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addBtn} testID="create-sabbath-button">
              <Plus size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.addBtn} />
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a8a" />}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.emptyText}>Loading Sabbath plans...</Text>
          </View>
        ) : filteredSabbaths.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Sabbath Plans</Text>
            <Text style={styles.emptyText}>
              {canManage
                ? 'Tap + to create your first Sabbath plan.'
                : 'No published Sabbath plans yet.'}
            </Text>
          </View>
        ) : (
          filteredSabbaths.map(renderSabbathCard)
        )}
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Sabbath Plan</Text>

            {availableGroups.length > 1 && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Church / Group</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupSelector}>
                  {availableGroups.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.groupChip,
                        (selectedGroupId || availableGroups[0]?.id) === g.id && styles.groupChipActive,
                      ]}
                      onPress={() => {
                        setSelectedGroupId(g.id);
                        setSelectedDate(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.groupChipText,
                          (selectedGroupId || availableGroups[0]?.id) === g.id && styles.groupChipTextActive,
                        ]}
                      >
                        {g.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Select Saturday</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.dateSelector}
              >
                {upcomingSaturdays.map((sat) => {
                  const key = formatDateKey(sat);
                  const alreadyExists = existingDates.has(key);
                  const selected = selectedDate === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dateChip,
                        selected && styles.dateChipSelected,
                        alreadyExists && styles.dateChipDisabled,
                      ]}
                      onPress={() => {
                        if (!alreadyExists) setSelectedDate(key);
                      }}
                      disabled={alreadyExists}
                    >
                      <Text
                        style={[
                          styles.dateChipMonth,
                          selected && styles.dateChipMonthSelected,
                          alreadyExists && styles.dateChipTextDisabled,
                        ]}
                      >
                        {sat.toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                      <Text
                        style={[
                          styles.dateChipDay,
                          selected && styles.dateChipDaySelected,
                          alreadyExists && styles.dateChipTextDisabled,
                        ]}
                      >
                        {sat.getDate()}
                      </Text>
                      {alreadyExists && (
                        <Text style={styles.dateChipExisting}>Exists</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Planning notes, theme, special events..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowCreateModal(false);
                  setSelectedDate(null);
                  setNotes('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, (!selectedDate || isCreatingSabbath) && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!selectedDate || isCreatingSabbath}
              >
                {isCreatingSabbath ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createBtnText}>Save as Draft</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  filtersScroll: {
    marginTop: 4,
  },
  filtersContent: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filterChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  filterChipTextActive: {
    color: '#0f172a',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  sabbathCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDateStrip: {
    marginRight: 14,
  },
  dateCircle: {
    width: 54,
    height: 54,
    borderRadius: 14,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  dateCircleUpcoming: {
    backgroundColor: '#0f172a',
  },
  dateCirclePast: {
    backgroundColor: '#e2e8f0',
  },
  dateCircleDay: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#64748b',
    lineHeight: 24,
  },
  dateCircleDayUpcoming: {
    color: '#fff',
  },
  dateCircleMonth: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    lineHeight: 14,
  },
  dateCircleMonthUpcoming: {
    color: 'rgba(255,255,255,0.7)',
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  cardDate: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  cardMetaItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  cardMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  cardNotes: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#334155',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center' as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#0f172a',
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#334155',
    marginBottom: 10,
  },
  groupSelector: {
    flexDirection: 'row' as const,
  },
  groupChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  groupChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  groupChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
  },
  groupChipTextActive: {
    color: '#fff',
  },
  dateSelector: {
    flexDirection: 'row' as const,
  },
  dateChip: {
    width: 68,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  dateChipSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  dateChipDisabled: {
    opacity: 0.4,
  },
  dateChipMonth: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
  },
  dateChipMonthSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  dateChipDay: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#0f172a',
    lineHeight: 28,
  },
  dateChipDaySelected: {
    color: '#fff',
  },
  dateChipTextDisabled: {
    color: '#94a3b8',
  },
  dateChipExisting: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#94a3b8',
    marginTop: 2,
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row' as const,
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center' as const,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#475569',
  },
  createBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#0f172a',
    alignItems: 'center' as const,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
