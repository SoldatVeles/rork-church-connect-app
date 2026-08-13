import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { Heart, Plus, Clock, User, AlertCircle, CheckCircle, Flag, MessageSquarePlus, ChevronDown, ChevronUp, Sparkles, Globe, Church, Inbox, BookOpenText } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
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
import { PrayerPublicationModal } from '@/components/PrayerPublicationModal';
import { WebsitePrayerInboxModal } from '@/components/WebsitePrayerInboxModal';
import { WebsiteContactInboxModal } from '@/components/WebsiteContactInboxModal';

const PRAYER_UPDATES_NOT_CONFIGURED = 'PRAYER_UPDATES_NOT_CONFIGURED';
const PRAYER_TRACKING_NOT_CONFIGURED = 'PRAYER_TRACKING_NOT_CONFIGURED';

export default function PrayersScreen() {
  const { t, i18n } = useTranslation();

  const params = useLocalSearchParams<{
    prayerId?: string | string[];
    notificationId?: string | string[];
  }>();

  const prayerIdParam = Array.isArray(params.prayerId) ? params.prayerId[0] : params.prayerId;
  const notificationIdParam = Array.isArray(params.notificationId)
    ? params.notificationId[0]
    : params.notificationId;

  const openedPrayerNotificationRef = useRef<string | null>(null);
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
  const [highlightedPrayerId, setHighlightedPrayerId] = useState<string | null>(null);
  const [selectedPrayerForPublication, setSelectedPrayerForPublication] = useState<PrayerRequest | null>(null);
  const [showWebsitePrayerInbox, setShowWebsitePrayerInbox] = useState(false);
  const [showWebsiteContactInbox, setShowWebsiteContactInbox] = useState(false);

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
          return { id: group.id as string, name: group.name as string };
        }
      }

      return null;
    },
    enabled: !!user?.id,
  });

  const userHomeChurch = homeChurchQuery.data ?? null;
  const userHomeGroupId = userHomeChurch?.id ?? null;
  const effectiveChurchId = userHomeGroupId ?? currentChurch?.id ?? null;
  const effectiveChurchName = userHomeChurch?.name ?? currentChurch?.name ?? null;

  const manageableGroupsQuery = useQuery({
    queryKey: ['website-prayer-manageable-groups', user?.id, user?.role],
    enabled: !!user?.id,
    queryFn: async (): Promise<string[]> => {
      if (!user?.id || user.role === 'admin') return [];
      if (user.role !== 'pastor' && user.role !== 'church_leader') return [];

      const groupIds = new Set<string>();
      const { data: assignments, error: assignmentsError } = await supabase
        .from('group_pastors')
        .select('group_id')
        .eq('user_id', user.id);

      if (assignmentsError) throw new Error(assignmentsError.message);
      (assignments ?? []).forEach((assignment: any) => {
        if (assignment.group_id) groupIds.add(assignment.group_id as string);
      });

      if (user.role === 'church_leader') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('home_group_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw new Error(profileError.message);
        const homeGroupId = (profile as any)?.home_group_id as string | null;
        if (homeGroupId) groupIds.add(homeGroupId);
      }

      return Array.from(groupIds);
    },
  });

  const canReviewWebsiteSubmissions =
    user?.role === 'admin' ||
    user?.role === 'pastor' ||
    user?.role === 'church_leader';

  const websitePrayerSubmissionCountQuery = useQuery({
    queryKey: ['website-prayer-submissions-count', user?.id],
    enabled: Boolean(user?.id && canReviewWebsiteSubmissions),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('website_prayer_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });

  const websiteContactSubmissionCountQuery = useQuery({
    queryKey: ['website-contact-submissions-count', user?.id],
    enabled: Boolean(user?.id && canReviewWebsiteSubmissions),
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('website_contact_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });

  const allPrayersQuery = useQuery({
    queryKey: ['prayers', userHomeGroupId, userIsAdmin, homeChurchQuery.isFetched],
    enabled: userIsAdmin || homeChurchQuery.isFetched,
    queryFn: async () => {
      if (!userIsAdmin && !userHomeGroupId) {
        return [];
      }

      let query = supabase
        .from('prayers')
        .select(`
          *,
          profiles!prayers_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (!userIsAdmin) {
        query = query.or(`group_id.eq.${userHomeGroupId},is_shared_all_churches.eq.true`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(t('prayers.createFailed'));
      }

      const rows = (data || []) as any[];
      const visible = userIsAdmin
        ? rows
        : rows.filter((p: any) => {
            const shared = p?.is_shared_all_churches === true;
            const sameGroup = !!userHomeGroupId && p?.group_id === userHomeGroupId;
            return shared || sameGroup;
          });

      return visible.map((prayer: any) => {
        const safeCreatedAt = prayer.created_at
          ? new Date(prayer.created_at)
          : new Date();

        const safeUpdatedAt =
          prayer.updated_at && prayer.is_answered
            ? new Date(prayer.updated_at)
            : undefined;

        return {
          id: prayer.id,
          title: prayer.title,
          description: prayer.description || '',
          category: prayer.category ?? undefined,
          requestedBy: prayer.created_by || '',
          requestedByName: prayer.profiles?.full_name || 'Anonymous',
          status: prayer.is_answered
            ? ('answered' as PrayerStatus)
            : ('active' as PrayerStatus),
          isAnonymous: prayer.is_anonymous || false,
          isUrgent: prayer.is_urgent === true,
          prayedBy: [] as string[],
          createdAt:
            safeCreatedAt instanceof Date &&
            !isNaN(safeCreatedAt.getTime())
              ? safeCreatedAt
              : new Date(),
          answeredAt:
            safeUpdatedAt instanceof Date &&
            !isNaN(safeUpdatedAt.getTime())
              ? safeUpdatedAt
              : undefined,
          groupId: prayer.group_id ?? null,
          isSharedAllChurches:
            prayer.is_shared_all_churches ?? false,
        };
      });
    },
  });

  const prayingQuery = useQuery({
    queryKey: ['prayer_prayers', userHomeGroupId, userIsAdmin],
    enabled: userIsAdmin || Boolean(userHomeGroupId),
    queryFn: async () => {
      if (!userIsAdmin && !userHomeGroupId) return [] as { prayer_id: string; user_id: string }[];

      const { data, error } = await supabase
        .from('prayer_prayers')
        .select('prayer_id, user_id');

      if (error) {
        return [] as { prayer_id: string; user_id: string }[];
      }

      return data as { prayer_id: string; user_id: string }[];
    },
  });

  const updatesQuery = useQuery({
    queryKey: ['prayer_updates', userHomeGroupId, userIsAdmin],
    enabled: userIsAdmin || Boolean(userHomeGroupId),
    queryFn: async () => {
      if (!userIsAdmin && !userHomeGroupId) return [] as PrayerUpdate[];

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

  const visiblePrayers: PrayerRequest[] = useMemo(() => {
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return mergedPrayers.filter((prayer) => {
      if (prayer.status !== 'answered') {
        return true;
      }

      const rawAnsweredAt = prayer.answeredAt ?? prayer.createdAt;

      if (!rawAnsweredAt) {
        return true;
      }

      const answeredAt =
        rawAnsweredAt instanceof Date
          ? rawAnsweredAt
          : new Date(rawAnsweredAt);

      if (Number.isNaN(answeredAt.getTime())) {
        return true;
      }

      return now - answeredAt.getTime() <= threeDaysMs;
    });
  }, [mergedPrayers]);

  const createPrayerAnsweredNotifications = useCallback(
    async ({
      prayerId,
      actorUserId,
    }: {
      prayerId: string;
      actorUserId: string;
    }) => {
      const { data: prayerRow, error: prayerError } = await supabase
        .from('prayers')
        .select('id, title, created_by')
        .eq('id', prayerId)
        .maybeSingle();

      if (prayerError) {
        return;
      }

      if (!prayerRow) {
        return;
      }

      const { data: prayedRows } = await supabase
        .from('prayer_prayers')
        .select('user_id')
        .eq('prayer_id', prayerId);

      const recipientIds = Array.from(
        new Set([
          (prayerRow as any).created_by as string | null,
          ...((prayedRows ?? []).map((row: any) => row.user_id as string | null)),
        ])
      )
        .filter(Boolean)
        .filter((recipientId) => recipientId !== actorUserId) as string[];

      if (recipientIds.length === 0) {
        return;
      }

      const prayerTitle =
        (prayerRow as any).title ?? 'A prayer request';

      const notificationRows = recipientIds.map((recipientId) => ({
        type: 'prayer',
        title: 'Prayer Answered',
        body: `A prayer request you prayed for was marked as answered: ${prayerTitle}`,
        title_key: 'notificationContent.prayers.prayerAnsweredTitle',
        body_key: 'notificationContent.prayers.prayerAnsweredBody',
        body_params: { title: prayerTitle },
        user_id: recipientId,
        prayer_id: prayerId,
      }));

      await supabase
        .from('notifications')
        .insert(notificationRows);
    },
    [t]
  );

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
      if (!userIsAdmin && !userHomeGroupId) {
        throw new Error(t('prayers.errors.homeChurchRequiredPost'));
      }

      const groupForInsert = userIsAdmin ? effectiveChurchId : userHomeGroupId;

      const basePayload = {
        title: prayerData.title,
        description: prayerData.description,
        created_by: prayerData.requestedBy,
        is_anonymous: prayerData.isAnonymous,
        is_answered: false,
        group_id: groupForInsert,
        is_shared_all_churches: prayerData.isSharedAllChurches,
      } as Record<string, unknown>;

      let { data, error } = await supabase
        .from('prayers')
        .insert({ ...basePayload, is_urgent: prayerData.isUrgent })
        .select()
        .single();

      const createErrorMessage = String(error?.message ?? '');
      if (error && /is_urgent/i.test(createErrorMessage)) {
        const retry = await supabase
          .from('prayers')
          .insert(basePayload)
          .select()
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (error) {
        const diagnosticCode = String((error as any)?.code ?? 'UNKNOWN')
          .replace(/[^A-Za-z0-9_-]/g, '')
          .slice(0, 32);
        if (__DEV__) {
          console.warn('[Prayers] Create failed', {
            code: diagnosticCode,
            message: String((error as any)?.message ?? ''),
          });
        }
        throw new Error(`${t('prayers.createFailed')}\nCode: ${diagnosticCode}`);
      }

      try {
        const createdPrayerId = (data as any).id as string;

        const notificationTitle = prayerData.isUrgent
          ? 'Urgent Prayer Request'
          : 'New Prayer Request';
        const notificationTitleKey = prayerData.isUrgent
          ? 'notificationContent.prayers.urgentPrayerRequestTitle'
          : 'notificationContent.prayers.newPrayerRequestTitle';

        const notificationBody = prayerData.isAnonymous
          ? 'A new anonymous prayer request has been shared.'
          : `${prayerData.requestedByName} shared a new prayer request.`;
        const notificationBodyKey = prayerData.isAnonymous
          ? 'notificationContent.prayers.anonymousPrayerBody'
          : 'notificationContent.prayers.namedPrayerBody';
        const notificationBodyParams = prayerData.isAnonymous
          ? {}
          : { name: prayerData.requestedByName };

        if (prayerData.isSharedAllChurches) {
          await supabase
            .from('notifications')
            .insert({
              type: 'prayer',
              title: notificationTitle,
              body: notificationBody,
              title_key: notificationTitleKey,
              body_key: notificationBodyKey,
              body_params: notificationBodyParams,
              user_id: null,
              prayer_id: createdPrayerId,
            });
        } else if (groupForInsert) {
          const { data: recipients } = await supabase.rpc(
            'get_church_notification_recipient_ids',
            {
              target_group_id: groupForInsert,
              extra_user_ids: [prayerData.requestedBy],
            }
          );

          const recipientIds = ((recipients ?? []) as any[])
            .map((recipient) => recipient.user_id as string | null)
            .filter(Boolean) as string[];

          if (recipientIds.length > 0) {
            const notificationRows = recipientIds.map((recipientId) => ({
              type: 'prayer',
              title: notificationTitle,
              body: notificationBody,
              title_key: notificationTitleKey,
              body_key: notificationBodyKey,
              body_params: notificationBodyParams,
              user_id: recipientId,
              prayer_id: createdPrayerId,
            }));

            await supabase
              .from('notifications')
              .insert(notificationRows);
          }
        }
      } catch {
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });

      setNewPrayer({
        title: '',
        description: '',
        isAnonymous: false,
        isUrgent: false,
        isSharedAllChurches: false,
      });

      setShowAddModal(false);
      Alert.alert(t('prayers.successTitle'), t('prayers.submitSuccess'));
    },
    onError: (error: Error) => {
      Alert.alert(t('prayers.errorTitle'), error.message || t('prayers.createFailed'));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      prayerId: string;
      status: PrayerStatus;
      userId: string;
      userRole: string;
    }) => {
      const { data: existingPrayer } = await supabase
        .from('prayers')
        .select('is_answered')
        .eq('id', data.prayerId)
        .maybeSingle();

      const wasAnswered = Boolean((existingPrayer as any)?.is_answered);
      const willBeAnswered = data.status === 'answered';

      const { error } = await supabase
        .from('prayers')
        .update({
          is_answered: willBeAnswered,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.prayerId);

      if (error) throw new Error(t('prayers.statusUpdateFailed'));

      if (willBeAnswered && !wasAnswered) {
        await createPrayerAnsweredNotifications({
          prayerId: data.prayerId,
          actorUserId: data.userId,
        });
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayer_updates'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      Alert.alert(t('prayers.successTitle'), t('prayers.statusUpdated'));
    },
    onError: () => {
      Alert.alert(t('prayers.errorTitle'), t('prayers.statusUpdateFailed'));
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
        const updateErrorMessage = String(error?.message ?? '');
        if (updateErrorMessage.includes('relation') && updateErrorMessage.includes('does not exist')) {
          throw new Error(PRAYER_UPDATES_NOT_CONFIGURED);
        }

        throw new Error(t('prayers.updateFailed'));
      }

      if (data.isAnsweredUpdate) {
        const { data: existingPrayer } = await supabase
          .from('prayers')
          .select('is_answered')
          .eq('id', data.prayerId)
          .maybeSingle();

        const wasAnswered = Boolean((existingPrayer as any)?.is_answered);

        await supabase
          .from('prayers')
          .update({ is_answered: true, updated_at: new Date().toISOString() })
          .eq('id', data.prayerId);

        if (!wasAnswered) {
          await createPrayerAnsweredNotifications({
            prayerId: data.prayerId,
            actorUserId: data.createdBy,
          });
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayer_updates'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });

      setShowUpdateModal(false);
      setSelectedPrayerForUpdate(null);
      setUpdateContent('');
      setIsAnsweredUpdate(false);

      Alert.alert(t('prayers.successTitle'), t('prayers.updatePosted'));
    },
    onError: (error: Error) => {
      const errorMessage = String((error as Error).message ?? '');
      const message = errorMessage === PRAYER_UPDATES_NOT_CONFIGURED
        ? t('prayers.errors.prayerUpdatesNotConfigured')
        : t('prayers.updateFailed');
      Alert.alert(t('prayers.errorTitle'), message);
    },
  });

  const reportPrayerMutation = useMutation({
    mutationFn: async ({ prayer, reason }: { prayer: PrayerRequest; reason: string }) => {
      if (!user?.id) {
        throw new Error(t('prayers.loginRequiredTitle'));
      }

      const { error } = await (supabase.from as any)('content_reports').insert({
        reporter_id: user.id,
        content_type: 'prayer',
        content_id: prayer.id,
        reported_user_id: prayer.requestedBy ?? null,
        group_id: prayer.groupId ?? null,
        reason,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      Alert.alert(
        t('prayers.reportSentTitle', { defaultValue: 'Report sent' }),
        t('prayers.reportSentMessage', {
          defaultValue: 'Thank you. Church leadership will review this prayer request.',
        })
      );
    },
    onError: () => {
      Alert.alert(
        t('prayers.reportFailedTitle', { defaultValue: 'Report was not sent' }),
        t('prayers.reportFailedMessage', {
          defaultValue: 'You may already have reported this prayer request. Please try again later.',
        })
      );
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
      Alert.alert(t('prayers.errorTitle'), t('prayers.enterUpdate'));
      return;
    }

    if (!user?.id || !selectedPrayerForUpdate) {
      Alert.alert(t('prayers.errorTitle'), t('prayers.unableToSubmitUpdate'));
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

  const highlightedPrayer = useMemo(() => {
    if (!highlightedPrayerId) {
      return null;
    }

    return allPrayers.find((prayer) => prayer.id === highlightedPrayerId) ?? null;
  }, [allPrayers, highlightedPrayerId]);

  const filteredPrayers = useMemo(() => {
    const basePrayers = selectedFilter === 'all'
      ? allPrayers
      : allPrayers.filter((prayer: PrayerRequest) => prayer.status === selectedFilter);

    if (!highlightedPrayerId) {
      return basePrayers;
    }

    return basePrayers.filter((prayer) => prayer.id !== highlightedPrayerId);
  }, [allPrayers, selectedFilter, highlightedPrayerId]);

  const prayers = filteredPrayers;

  useEffect(() => {
    if (!prayerIdParam) return;

    const openKey = notificationIdParam ?? prayerIdParam;

    if (openedPrayerNotificationRef.current === openKey) {
      return;
    }

    if (allPrayersQuery.isLoading || prayingQuery.isLoading || updatesQuery.isLoading) {
      return;
    }

    const prayerToOpen = allPrayers.find((prayer) => prayer.id === prayerIdParam);

    if (!prayerToOpen) {
      return;
    }

    openedPrayerNotificationRef.current = openKey;

    setSelectedFilter('all');
    setHighlightedPrayerId(prayerIdParam);
    setExpandedPrayers((prev) => {
      const next = new Set(prev);
      next.add(prayerIdParam);
      return next;
    });
  }, [
    prayerIdParam,
    notificationIdParam,
    allPrayers,
    allPrayersQuery.isLoading,
    prayingQuery.isLoading,
    updatesQuery.isLoading,
  ]);

  const formatDate = (date?: Date | string | null) => {
    if (!date) {
      return t('prayers.dates.unknown');
    }

    const parsedDate = date instanceof Date ? date : new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return t('prayers.dates.unknown');
    }

    const now = new Date();
    const diffTime = now.getTime() - parsedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return t('prayers.dates.today');
    if (diffDays === 1) return t('prayers.dates.yesterday');
    if (diffDays < 7) return t('prayers.dates.daysAgo', { count: diffDays });

    return parsedDate.toLocaleDateString(i18n.language, {
      month: 'short',
      day: 'numeric',
    });
  };

  const hasUserPrayed = (prayer: PrayerRequest) => {
    return (prayer.prayedBy ?? []).includes(user?.id || '');
  };

  const canUpdateStatus = (prayer: PrayerRequest) => {
    if (!user) return false;

    const isRequester = prayer.requestedBy === user.id;
    const managesPrayerChurch =
      !!prayer.groupId &&
      (manageableGroupsQuery.data ?? []).includes(prayer.groupId);

    return isRequester || userIsAdmin || managesPrayerChurch;
  };

  const togglePrayMutation = useMutation({
    mutationFn: async (payload: { prayerId: string; willPray: boolean; userId: string }) => {
      if (payload.willPray) {
        const { error } = await supabase.from('prayer_prayers').upsert({
          prayer_id: payload.prayerId,
          user_id: payload.userId,
        }, {
          onConflict: 'prayer_id,user_id',
          ignoreDuplicates: true,
        });

        if (error) {
          const prayErrorMessage = String(error?.message ?? '');
          if (prayErrorMessage.includes('relation') && prayErrorMessage.includes('does not exist')) {
            throw new Error(PRAYER_TRACKING_NOT_CONFIGURED);
          }

          throw new Error(t('prayers.statusUpdateFailed'));
        }
      } else {
        const { error } = await supabase
          .from('prayer_prayers')
          .delete()
          .eq('prayer_id', payload.prayerId)
          .eq('user_id', payload.userId);

        if (error) {
          const prayDeleteErrorMessage = String(error?.message ?? '');
          if (!prayDeleteErrorMessage.includes('relation') || !prayDeleteErrorMessage.includes('does not exist')) {
            throw new Error(t('prayers.statusUpdateFailed'));
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
            ? {
                ...p,
                prayedBy: willPray
                  ? [...(p.prayedBy ?? []), userId]
                  : (p.prayedBy ?? []).filter(id => id !== userId),
              }
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
      if (ctx?.prevPrayers) queryClient.setQueryData(['prayers', effectiveChurchId], ctx.prevPrayers);
      if (ctx?.prevLinks) queryClient.setQueryData(['prayer_prayers'], ctx.prevLinks);

      const errorMessage = String((err as Error).message ?? '');
      if (errorMessage === PRAYER_TRACKING_NOT_CONFIGURED) {
        Alert.alert(
          t('prayers.databaseSetupTitle'),
          t('prayers.databaseSetupMessage'),
          [{ text: t('prayers.ok', { defaultValue: 'OK' }) }]
        );
      } else {
        Alert.alert(t('prayers.errorTitle'), t('prayers.statusUpdateFailed'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['prayer_prayers'] });
    },
  });

  const handleToggleAnswered = (prayer: PrayerRequest) => {
    if (!user) {
      Alert.alert(t('prayers.loginRequiredTitle'), t('prayers.loginRequiredUpdateMessage'));
      return;
    }

    const newStatus = prayer.status === 'answered' ? 'active' : 'answered';
    const message = prayer.status === 'answered'
      ? t('prayers.markUnansweredQuestion')
      : t('prayers.markAnsweredQuestion');

    Alert.alert(
      t('prayers.updateStatusTitle'),
      message,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('prayers.confirm'),
          onPress: () => {

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
      Alert.alert(t('prayers.errorTitle'), t('prayers.fillAllFields'));
      return;
    }

    if (!user) {
      Alert.alert(t('prayers.errorTitle'), t('prayers.mustBeLoggedInCreate'));
      return;
    }

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

  const reportPrayer = (prayer: PrayerRequest) => {
    Alert.alert(
      t('prayers.reportPrayerTitle', { defaultValue: 'Report prayer request' }),
      t('prayers.reportPrayerHelp', {
        defaultValue: 'Why should church leadership review this prayer request?',
      }),
      [
        {
          text: t('prayers.reportReasonSpam', { defaultValue: 'Spam' }),
          onPress: () => reportPrayerMutation.mutate({ prayer, reason: 'spam' }),
        },
        {
          text: t('prayers.reportReasonInappropriate', { defaultValue: 'Inappropriate' }),
          onPress: () => reportPrayerMutation.mutate({ prayer, reason: 'inappropriate' }),
        },
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
      ]
    );
  };

  const activePrayers = allPrayers.filter((p: PrayerRequest) => p.status === 'active');
  const answeredPrayers = allPrayers.filter((p: PrayerRequest) => p.status === 'answered');

  const getPrayerStatusLabel = (status: PrayerStatus) => {
    return status === 'answered'
      ? t('prayers.status.answered')
      : t('prayers.status.active');
  };

  const formatPrayingCount = (count: number) => {
    const label = count === 1 ? t('prayers.person') : t('prayers.people');
    return t('prayers.prayingCount', { count, label });
  };

  const formatUpdateCount = (count: number) => {
    const label = count === 1 ? t('prayers.updateSingular') : t('prayers.updatePlural');
    return t('prayers.updateCount', { count, label });
  };

  const filters: { key: PrayerStatus | 'all'; label: string; count: number }[] = [
    { key: 'all', label: t('prayers.filters.all'), count: allPrayers.length },
    { key: 'active', label: t('prayers.filters.active'), count: activePrayers.length },
    { key: 'answered', label: t('prayers.filters.answered'), count: answeredPrayers.length },
  ];

  const getScopeBadge = (prayer: PrayerRequest) => {
    if (prayer.isSharedAllChurches) return 'shared';
    if (prayer.groupId && prayer.groupId !== effectiveChurchId) return 'other';
    return 'local';
  };

  const canManagePublication = (prayer: PrayerRequest) => {
    if (!user || !prayer.groupId) return false;
    if (user.role === 'admin') return true;
    return (manageableGroupsQuery.data ?? []).includes(prayer.groupId);
  };

  const renderPrayerCard = (prayer: PrayerRequest, isHighlighted = false) => {
    const scopeBadge = getScopeBadge(prayer);

    return (
      <View
        key={isHighlighted ? `highlighted-${prayer.id}` : prayer.id}
        style={[
          styles.prayerCard,
          prayer.isUrgent && styles.prayerCardUrgent,
          isHighlighted && styles.highlightedPrayerCard,
        ]}
      >
        {prayer.isUrgent && (
          <View style={styles.urgentRibbon}>
            <AlertCircle size={14} color="white" />
            <Text style={styles.urgentRibbonText}>{t('prayers.urgentPrayer')}</Text>
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
                {getPrayerStatusLabel(prayer.status)}
              </Text>
            </View>

            {scopeBadge === 'shared' && (
              <View style={styles.sharedBadge}>
                <Globe size={11} color="#2563eb" />
                <Text style={styles.sharedBadgeText}>{t('prayers.allChurches')}</Text>
              </View>
            )}

            {scopeBadge === 'local' && prayer.groupId && (
              <View style={styles.localBadge}>
                <Church size={11} color="#6b7280" />
                <Text style={styles.localBadgeText}>{t('prayers.myChurch')}</Text>
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
              {prayer.isAnonymous ? t('prayers.anonymous') : prayer.requestedByName}
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
              color={hasUserPrayed(prayer) ? '#ef4444' : '#94a3b8'}
              fill={hasUserPrayed(prayer) ? '#ef4444' : 'none'}
            />
            <Text style={styles.prayerStatsText}>
              {formatPrayingCount(prayer.prayedBy.length)}
            </Text>
          </View>

          <View style={styles.actionButtons}>
              {canManagePublication(prayer) ? (
                <TouchableOpacity
                  testID={`manage-prayer-publication-button-${prayer.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('prayers.publication.openManager')}
                  onPress={() => setSelectedPrayerForPublication(prayer)}
                  style={styles.publicationButton}
                >
                  <Globe size={14} color="white" />
                  <Text style={styles.publicationButtonText}>
                    {t('prayers.publication.websiteButton')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {canUpdateStatus(prayer) && (
                <TouchableOpacity
                  testID={`status-button-${prayer.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={prayer.status === 'answered' ? t('prayers.markAsUnanswered') : t('prayers.markAsAnswered')}
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
                    fill={prayer.status === 'answered' ? 'white' : 'none'}
                  />
                  <Text style={styles.statusButtonText}>
                    {prayer.status === 'answered' ? t('prayers.answeredButton') : t('prayers.markAnsweredButton')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                testID={`pray-button-${prayer.id}`}
                accessibilityRole="button"
                accessibilityLabel={hasUserPrayed(prayer) ? t('prayers.markNotPraying') : t('prayers.markPraying')}
                onPress={() => {
                  if (!user?.id) {
                    Alert.alert(t('prayers.loginRequiredTitle'), t('prayers.loginRequiredPrayMessage'));
                    return;
                  }

                  if (!(user.role === 'member' || user.role === 'pastor' || user.role === 'church_leader' || user.role === 'admin')) {
                    Alert.alert(t('prayers.notAllowedTitle'), t('prayers.notAllowedMessage'));
                    return;
                  }

                  const willPray = !hasUserPrayed(prayer);
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
                  {hasUserPrayed(prayer) ? t('prayers.praying') : t('prayers.pray')}
                </Text>
              </TouchableOpacity>
              {prayer.requestedBy !== user?.id && (
                <TouchableOpacity
                  testID={`report-prayer-button-${prayer.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('prayers.reportPrayerTitle', { defaultValue: 'Report prayer request' })}
                  onPress={() => reportPrayer(prayer)}
                  disabled={reportPrayerMutation.isPending}
                  style={styles.reportButton}
                >
                  <Flag size={15} color="#64748b" />
                </TouchableOpacity>
              )}
          </View>
        </View>

        {((prayer.updates && prayer.updates.length > 0) || canUpdateStatus(prayer)) && (
          <View style={styles.updatesSection}>
            {prayer.updates && prayer.updates.length > 0 && !isHighlighted && (
              <TouchableOpacity
                style={styles.updatesToggle}
                onPress={() => togglePrayerExpanded(prayer.id)}
              >
                <MessageSquarePlus size={14} color="#1e3a8a" />
                <Text style={styles.updatesToggleText}>
                  {formatUpdateCount(prayer.updates.length)}
                </Text>
                {expandedPrayers.has(prayer.id) ? (
                  <ChevronUp size={16} color="#64748b" />
                ) : (
                  <ChevronDown size={16} color="#64748b" />
                )}
              </TouchableOpacity>
            )}

            {isHighlighted && prayer.updates && prayer.updates.length > 0 && (
              <>
                {prayer.updates.map((upd) => (
                  <View key={upd.id} style={styles.updateItem}>
                    {upd.isAnsweredUpdate && (
                      <View style={styles.answeredUpdateBadge}>
                        <Sparkles size={12} color="#16a34a" />
                        <Text style={styles.answeredUpdateBadgeText}>{t('prayers.prayerAnswered')}</Text>
                      </View>
                    )}
                    <Text style={styles.updateContent}>{upd.content}</Text>
                    <Text style={styles.updateMeta}>
                      {upd.createdByName} • {formatDate(upd.createdAt)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {!isHighlighted && expandedPrayers.has(prayer.id) && prayer.updates && prayer.updates.map((upd) => (
              <View key={upd.id} style={styles.updateItem}>
                {upd.isAnsweredUpdate && (
                  <View style={styles.answeredUpdateBadge}>
                    <Sparkles size={12} color="#16a34a" />
                    <Text style={styles.answeredUpdateBadgeText}>{t('prayers.prayerAnswered')}</Text>
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
                <Text style={styles.addUpdateButtonText}>{t('prayers.postUpdate')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('prayers.title')}</Text>
          <TouchableOpacity
            testID="add-prayer-button"
            accessibilityRole="button"
            accessibilityLabel={t('prayers.newPrayerRequest')}
            style={styles.addButton}
            onPress={() => {
              setShowAddModal(true);
            }}
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>

        {canReviewWebsiteSubmissions ? (
          <TouchableOpacity
            testID="open-website-prayer-inbox-button"
            accessibilityRole="button"
            accessibilityLabel={t('prayers.websiteInbox.button')}
            style={styles.inboxButton}
            onPress={() => setShowWebsitePrayerInbox(true)}
          >
            <Inbox size={18} color="#1e3a8a" />
            <Text numberOfLines={1} style={styles.inboxButtonText}>
              {t('prayers.websiteInbox.button')}
            </Text>
            {(websitePrayerSubmissionCountQuery.data ?? 0) > 0 ? (
              <Text style={styles.inboxCount}>
                {websitePrayerSubmissionCountQuery.data}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {canReviewWebsiteSubmissions ? (
          <TouchableOpacity
            testID="open-website-contact-inbox-button"
            accessibilityRole="button"
            accessibilityLabel={t('prayers.websiteRequests.button')}
            style={styles.inboxButton}
            onPress={() => setShowWebsiteContactInbox(true)}
          >
            <BookOpenText size={18} color="#1e3a8a" />
            <Text numberOfLines={1} style={styles.inboxButtonText}>
              {t('prayers.websiteRequests.button')}
            </Text>
            {(websiteContactSubmissionCountQuery.data ?? 0) > 0 ? (
              <Text style={styles.inboxCount}>
                {websiteContactSubmissionCountQuery.data}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : null}

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
              onPress={() => {
                setHighlightedPrayerId(null);
                setSelectedFilter(filter.key);
              }}
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
            <Text style={styles.loadingText}>{t('prayers.loading')}</Text>
          </View>
        ) : (
          <>
            {highlightedPrayer && (
              <>
                <View style={styles.openedPrayerSectionHeader}>
                  <Sparkles size={14} color="#92400e" />
                  <Text style={styles.openedPrayerSectionText}>{t('prayers.openedFromNotification')}</Text>
                </View>

                {renderPrayerCard(highlightedPrayer, true)}
              </>
            )}

            {prayers.length === 0 && !highlightedPrayer ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('prayers.emptyTitle')}</Text>
                <Text style={styles.emptySubtext}>{t('prayers.emptySubtitle')}</Text>
              </View>
            ) : (
              prayers.map((prayer: PrayerRequest) => renderPrayerCard(prayer, false))
            )}
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      <PrayerPublicationModal
        prayer={selectedPrayerForPublication}
        visible={!!selectedPrayerForPublication}
        onClose={() => setSelectedPrayerForPublication(null)}
      />

      <WebsitePrayerInboxModal
        visible={showWebsitePrayerInbox}
        userId={user?.id ?? null}
        onClose={() => setShowWebsitePrayerInbox(false)}
      />

      <WebsiteContactInboxModal
        visible={showWebsiteContactInbox}
        userId={user?.id ?? null}
        onClose={() => setShowWebsiteContactInbox(false)}
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddModal(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer} testID="prayer-modal">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} testID="prayer-cancel-button">
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('prayers.newPrayerRequest')}</Text>
            <TouchableOpacity
              onPress={handleAddPrayer}
              disabled={createPrayerMutation.isPending}
              testID="prayer-submit-button"
            >
              <Text style={[
                styles.modalSubmitText,
                createPrayerMutation.isPending && styles.modalSubmitTextDisabled,
              ]}>
                {createPrayerMutation.isPending ? t('prayers.submitting') : t('prayers.submit')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {effectiveChurchName && (
              <View style={styles.churchContextBanner}>
                <Church size={14} color="#1e3a8a" />
                <Text style={styles.churchContextText}>
                  {t('prayers.postingTo', { church: effectiveChurchName })}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('prayers.form.title')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('prayers.form.titlePlaceholder')}
                value={newPrayer.title}
                onChangeText={(text) => setNewPrayer(prev => ({ ...prev, title: text }))}
                maxLength={100}
                testID="prayer-title-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('prayers.form.description')}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={t('prayers.form.descriptionPlaceholder')}
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
                  <Text style={styles.switchLabel}>{t('prayers.form.submitAnonymously')}</Text>
                  <Text style={styles.switchDescription}>{t('prayers.form.submitAnonymouslyDescription')}</Text>
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
                  <Text style={styles.switchLabel}>{t('prayers.form.markUrgent')}</Text>
                  <Text style={styles.switchDescription}>{t('prayers.form.markUrgentDescription')}</Text>
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
                    <Text style={styles.switchLabel}>{t('prayers.form.shareAllChurches')}</Text>
                  </View>
                  <Text style={styles.switchDescription}>
                    {t('prayers.form.shareAllChurchesDescription')}
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
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('prayers.postUpdate')}</Text>
            <TouchableOpacity
              onPress={handleSubmitUpdate}
              disabled={createUpdateMutation.isPending}
            >
              <Text style={[
                styles.modalSubmitText,
                createUpdateMutation.isPending && styles.modalSubmitTextDisabled,
              ]}>
                {createUpdateMutation.isPending ? t('prayers.posting') : t('prayers.post')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedPrayerForUpdate && (
              <View style={styles.updatePrayerContext}>
                <Text style={styles.updatePrayerContextLabel}>{t('prayers.updateModal.updating')}</Text>
                <Text style={styles.updatePrayerContextTitle}>{selectedPrayerForUpdate.title}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('prayers.updateModal.yourUpdate')}</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder={t('prayers.updateModal.updatePlaceholder')}
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
                  <Text style={styles.switchLabel}>{t('prayers.updateModal.markAnsweredPrayer')}</Text>
                  <Text style={styles.switchDescription}>{t('prayers.updateModal.markAnsweredPrayerDescription')}</Text>
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
    marginBottom: 12,
  },
  title: {
    flexShrink: 1,
    paddingRight: 12,
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#1e293b',
  },
  inboxButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  inboxButtonText: {
    flex: 1,
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '700' as const,
  },
  inboxCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1e3a8a',
    color: 'white',
    fontSize: 11,
    fontWeight: '700' as const,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 5,
  },
  addButton: {
    flexShrink: 0,
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
  publicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  publicationButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'white',
  },
  prayedButton: {
    backgroundColor: '#16a34a',
  },
  prayButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'white',
  },
  reportButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
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
  highlightedPrayerCard: {
    borderWidth: 2,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  openedFromNotificationBadge: {
    alignSelf: 'flex-start' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  openedFromNotificationText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#92400e',
  },
  openedPrayerSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  openedPrayerSectionText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#92400e',
  },
});
