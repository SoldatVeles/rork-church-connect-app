import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import { Calendar, MapPin, Users, Plus, Clock, AlertCircle, X, CalendarPlus, Globe, Church } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/providers/auth-provider';
import { useChurch } from '@/providers/church-provider';
import { isAdmin } from '@/utils/permissions';
import type { Event, EventType } from '@/types/event';
import { supabase } from '@/lib/supabase';
import { addEventToCalendar } from '@/utils/calendar-sync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const allowedEventTypes: EventType[] = ['bible_study', 'youth', 'special', 'conference'];

const eventTypeColors: Record<EventType, string> = {
  bible_study: '#10b981',
  youth: '#f59e0b',
  special: '#8b5cf6',
  conference: '#06b6d4',
};

const eventTypeTranslationKeys: Record<EventType, string> = {
  bible_study: 'events.types.bibleStudy',
  youth: 'events.types.youth',
  special: 'events.types.special',
  conference: 'events.types.conference',
};

const normalizeEventType = (value: unknown): EventType | null => {
  if (allowedEventTypes.includes(value as EventType)) {
    return value as EventType;
  }
  console.log('[Events] Normalized unexpected event type to bible_study:', value);
  return 'bible_study';
};

const fallbackEventImage = 'https://images.unsplash.com/photo-1530023367847-a683933f4177?w=1200&q=80&auto=format&fit=crop' as const;

export default function EventsScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{
    eventId?: string | string[];
    notificationId?: string | string[];
  }>();

  const eventIdParam = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const notificationIdParam = Array.isArray(params.notificationId)
    ? params.notificationId[0]
    : params.notificationId;

  const openedEventNotificationRef = useRef<string | null>(null);

  const { user, isAuthenticated, isLoading } = useAuth();
  const { currentChurch } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = isAdmin(user);
  
  console.log('[Events] Auth state:', { user: user?.id, isAuthenticated, isLoading, churchId: currentChurchId });
  const [selectedFilter, setSelectedFilter] = useState<EventType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    startDate: Date;
    startTime: Date;
    endDate: Date;
    endTime: Date;
    location: string;
    type: EventType;
    maxAttendees?: string;
    isSharedAllChurches: boolean;
  }>({
    title: '',
    description: '',
    startDate: new Date(),
    startTime: new Date(),
    endDate: new Date(),
    endTime: new Date(),
    location: '',
    type: 'bible_study',
    maxAttendees: '',
    isSharedAllChurches: false,
  });

  const [showDatePicker, setShowDatePicker] = useState<{
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;
    mode: 'date' | 'time';
  }>({ field: null, mode: 'date' });

  const getEventTypeLabel = useCallback(
  (type: EventType) => t(eventTypeTranslationKeys[type]),
  [t]
);

const filterOptions = useMemo<{ key: EventType | 'all'; label: string; accent: string }[]>(() => {
  return [
    { key: 'all', label: t('events.filters.all'), accent: '#1e293b' },
    ...allowedEventTypes.map((key) => ({
      key,
      label: getEventTypeLabel(key),
      accent: eventTypeColors[key],
    })),
  ];
}, [getEventTypeLabel, t]);

  const queryClient = useQueryClient();

  const homeChurchQuery = useQuery({
    queryKey: ['user-home-church', user?.id],
    queryFn: async (): Promise<{ id: string; name: string } | null> => {
      if (!user?.id) return null;
      const { data: profile } = await supabase
        .from('profiles')
        .select('home_group_id')
        .eq('id', user.id)
        .single();
      const homeGroupId = (profile as any)?.home_group_id as string | null;
      if (homeGroupId) {
        const { data: group } = await supabase
          .from('groups')
          .select('id, name')
          .eq('id', homeGroupId)
          .single();
        if (group) return { id: group.id as string, name: group.name as string };
      }
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .limit(1);
      if (memberships && memberships.length > 0) {
        const gid = (memberships[0] as any).group_id as string;
        const { data: group } = await supabase
          .from('groups')
          .select('id, name')
          .eq('id', gid)
          .single();
        if (group) return { id: group.id as string, name: group.name as string };
      }
      return null;
    },
    enabled: !!user?.id,
  });

  const userHomeChurch = homeChurchQuery.data ?? null;
  // Strict: only use the user's actual home group for scoping. Never fall back to the church picker.
  const userHomeGroupId = userHomeChurch?.id ?? null;
  // For display/labels we can still fall back to the church picker name.
  const effectiveChurchId = userHomeGroupId ?? currentChurchId;
  const effectiveChurchName = userHomeChurch?.name ?? currentChurch?.name ?? null;

  const listQuery = useQuery({
    queryKey: ['events', userHomeGroupId, userIsAdmin, homeChurchQuery.isFetched],
    enabled: userIsAdmin || homeChurchQuery.isFetched,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      console.log('[Events] Fetching events, userHomeGroupId:', userHomeGroupId, 'isAdmin:', userIsAdmin);

      if (!userIsAdmin && !userHomeGroupId) {
        console.log('[Events] User has no home church, returning no events');
        return [];
      }

      let query = supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });

      if (!userIsAdmin) {
        query = query.or(`group_id.eq.${userHomeGroupId},is_shared_all_churches.eq.true`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Events] Failed to fetch events:', error);
        throw new Error(error.message ?? t('events.errors.failedToLoad'));
      }

      // Client-side safety filter: enforce visibility even if RLS/column issues exist.
      const visibleRaw = (data as any[]).filter((e: any) => {
        if (userIsAdmin) return true;
        const shared = e?.is_shared_all_churches === true;
        const sameGroup = !!userHomeGroupId && e?.group_id === userHomeGroupId;
        return shared || sameGroup;
      });

      console.log('[Events] Fetched events:', data?.length, 'visible after safety filter:', visibleRaw.length);

      const sanitizedEvents = visibleRaw
        .map((event: any) => {
          const rawType = (event.event_type ?? 'bible_study') as string;

          const start = event.start_at ? new Date(event.start_at) : new Date();
          const end = event.end_at ? new Date(event.end_at) : undefined;
          const registeredUsersSafe: string[] = Array.isArray(event?.registered_users)
            ? (event.registered_users as string[])
            : [];

          return {
            id: event.id,
            title: event.title,
            description: event.description ?? '',
            date: start,
            endDate: end,
            location: event.location ?? '',
            type: normalizeEventType(rawType)!,
            maxAttendees: event.max_attendees ?? undefined,
            currentAttendees: event.current_attendees ?? 0,
            registeredUsers: registeredUsersSafe,
            isRegistrationOpen: event.is_registration_open ?? true,
            createdBy: event.created_by,
            imageUrl: event.image_url ?? undefined,
            createdAt: new Date(event.created_at ?? new Date().toISOString()),
          } as Event;
        })
        .filter((item): item is Event => item !== null)
        .filter((item) => {
          const eventEnd = item.endDate ?? item.date;
          return eventEnd.getTime() >= Date.now();
        });

      return sanitizedEvents;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (eventData: {
      title: string;
      description: string;
      startDate: Date;
      startTime: Date;
      endDate: Date;
      endTime: Date;
      location: string;
      type: EventType;
      maxAttendees?: number;
      createdBy: string;
      isSharedAllChurches: boolean;
    }) => {
      console.log('[Events] mutationFn called with:', eventData);

      // Combine date and time into single timestamp
      const startAt = new Date(
        eventData.startDate.getFullYear(),
        eventData.startDate.getMonth(),
        eventData.startDate.getDate(),
        eventData.startTime.getHours(),
        eventData.startTime.getMinutes(),
      );
      const endAt = new Date(
        eventData.endDate.getFullYear(),
        eventData.endDate.getMonth(),
        eventData.endDate.getDate(),
        eventData.endTime.getHours(),
        eventData.endTime.getMinutes(),
      );

      // Always attach the creator's home group. Never use the church-picker as a fallback,
      // otherwise events get assigned to the wrong church.
      if (!userIsAdmin && !userHomeGroupId) {
        throw new Error(t('events.errors.homeChurchRequired'));
      }

      const insertData: Record<string, unknown> = {
        title: eventData.title,
        description: eventData.description,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        location: eventData.location,
        event_type: eventData.type,
        max_attendees: eventData.maxAttendees ?? null,
        created_by: eventData.createdBy,
        is_registration_open: true,
        current_attendees: 0,
        registered_users: [],
        group_id: userHomeGroupId,
        is_shared_all_churches: eventData.isSharedAllChurches === true,
      };

      console.log('[Events] Inserting event with data:', JSON.stringify(insertData, null, 2));

      const { data: checkSession } = await supabase.auth.getSession();
      console.log('[Events] Current auth session uid:', checkSession?.session?.user?.id ?? 'NO SESSION');
      console.log('[Events] created_by value:', eventData.createdBy);

      if (!checkSession?.session) {
        throw new Error(t('events.errors.sessionExpired'));
      }

      const { data, error, status } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();

      console.log('[Events] Insert response status:', status);
      console.log('[Events] Insert response data:', JSON.stringify(data));
      console.log('[Events] Insert response error:', JSON.stringify(error));

      if (error) {
        console.error('[Events] Insert failed:', JSON.stringify(error));
        throw new Error(error.message ?? t('events.errors.createFailed'));
      }

      if (!data) {
        console.error('[Events] Insert returned no data - likely RLS policy blocking insert');
        throw new Error(t('events.errors.noPermissionCreate'));
      }

console.log('[Events] Insert succeeded, created event:', data.id);

try {
  const createdEventId = (data as any).id as string;
  const eventGroupId = ((data as any).group_id ?? userHomeGroupId) as string | null;

  const notificationTitle = 'New Event';
  const notificationBody = effectiveChurchName
    ? `${eventData.title} has been added at ${effectiveChurchName}.`
    : `${eventData.title} has been added.`;
  const notificationBodyKey = effectiveChurchName
    ? 'notificationContent.events.newEventBodyWithChurch'
    : 'notificationContent.events.newEventBody';
  const notificationBodyParams = effectiveChurchName
    ? { title: eventData.title, church: effectiveChurchName }
    : { title: eventData.title };

  if (eventData.isSharedAllChurches) {
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'event',
        title: notificationTitle,
        body: notificationBody,
        title_key: 'notificationContent.events.newEventTitle',
        body_key: notificationBodyKey,
        body_params: notificationBodyParams,
        user_id: null,
        event_id: createdEventId,
      });

    if (notificationError) {
      console.warn('[Events] Failed to create global notification:', notificationError.message);
    }
  } else if (eventGroupId) {
    const { data: recipients, error: recipientsError } = await supabase.rpc(
      'get_church_notification_recipient_ids',
      {
        target_group_id: eventGroupId,
        extra_user_ids: [eventData.createdBy],
      }
    );

    if (recipientsError) {
      console.warn('[Events] Failed to fetch notification recipients:', recipientsError.message);
    }

    const recipientIds = ((recipients ?? []) as any[])
      .map((recipient) => recipient.user_id as string | null)
      .filter(Boolean) as string[];

    if (recipientIds.length > 0) {
      const notificationRows = recipientIds.map((recipientId) => ({
        type: 'event',
        title: notificationTitle,
        body: notificationBody,
        title_key: 'notificationContent.events.newEventTitle',
        body_key: notificationBodyKey,
        body_params: notificationBodyParams,
        user_id: recipientId,
        event_id: createdEventId,
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationRows);

      if (notificationError) {
        console.warn('[Events] Failed to create member notifications:', notificationError.message);
      }
    }
  }
} catch (notificationError) {
  console.warn('[Events] Notification creation failed:', notificationError);
}

return data;

    },
    onSuccess: async () => {
      console.log('[Events] Mutation success, invalidating + refetching events');
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await listQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
      const now = new Date();
      setForm({
        title: '',
        description: '',
        startDate: now,
        startTime: now,
        endDate: now,
        endTime: now,
        location: '',
        type: 'bible_study',
        maxAttendees: '',
        isSharedAllChurches: false,
      });
      setShowAddModal(false);
      Alert.alert(t('events.successTitle'), t('events.createSuccess'));
    },
    onError: (error) => {
      console.error('[Events] Mutation error:', error);
      Alert.alert(t('events.errorTitle'), (error as Error).message ?? t('events.errors.createFailedTryAgain'));
    },
  });

  useFocusEffect(
    useCallback(() => {
      console.log('[Events] Screen focused, refetching events');
      void listQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const allEvents = useMemo<Event[]>(() => listQuery.data ?? [], [listQuery.data]);

  const events = useMemo(() => {
    if (selectedFilter === 'all') return allEvents;
    return allEvents.filter(e => e.type === selectedFilter);
  }, [allEvents, selectedFilter]);

  const activeEvent = useMemo(() => {
    if (!selectedEvent) {
      return null;
    }
    const match = allEvents.find(item => item.id === selectedEvent.id);
    return match ?? selectedEvent;
  }, [allEvents, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) {
      return;
    }
    const exists = allEvents.some(item => item.id === selectedEvent.id);
    if (!exists) {
      console.log('[Events] Selected event no longer available, closing details modal');
      setShowDetailsModal(false);
      setSelectedEvent(null);
    }
  }, [allEvents, selectedEvent]);

  const handleOpenDetails = useCallback((event: Event) => {
    console.log('[Events] Opening details for event', event.id);
    setSelectedEvent(event);
    setShowDetailsModal(true);
  }, []);

  useEffect(() => {
    if (!eventIdParam) return;

    const openKey = notificationIdParam ?? eventIdParam;

    if (openedEventNotificationRef.current === openKey) {
      return;
    }

    if (listQuery.isLoading) {
      return;
    }

    const eventToOpen = allEvents.find((event) => event.id === eventIdParam);

    if (!eventToOpen) {
      console.warn('[Events] Event from notification not found or already past:', eventIdParam);
      return;
    }

    openedEventNotificationRef.current = openKey;
    setSelectedEvent(eventToOpen);
    setShowDetailsModal(true);
  }, [eventIdParam, notificationIdParam, allEvents, listQuery.isLoading]);

  const handleCloseDetails = useCallback(() => {
    console.log('[Events] Closing event details modal');
    setShowDetailsModal(false);
    setSelectedEvent(null);
  }, []);

const registerMutation = useMutation({
  mutationFn: async ({ eventId }: { eventId: string }) => {
    setRegisteringEventId(eventId);

    if (!user?.id) {
      throw new Error(t('events.errors.mustBeLoggedIn'));
    }

    const { data, error } = await supabase.rpc('toggle_event_registration', {
      target_event_id: eventId,
    });

if (error) {
  console.error('[Events] Registration RPC failed:', error);
  throw new Error(error.message ?? t('events.errors.registrationUpdateFailed'));
}

console.log('[Events] Registration RPC success:', data);

return data;
  },
  onSuccess: async () => {
    setRegisteringEventId(null);
    await queryClient.invalidateQueries({ queryKey: ['events'] });
    await listQuery.refetch();
  },
  onError: (error) => {
    setRegisteringEventId(null);
    Alert.alert(t('events.errorTitle'), (error as Error).message ?? t('events.errors.couldNotUpdateRegistration'));
  },
});

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.language, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatAttending = (current: number, max?: number) => {
  if (max) {
    return t('events.attendingWithMax', { current, max });
  }

  return t('events.attending', { count: current });
 };

  const isUserRegistered = (event: Event) => {
    const list = Array.isArray(event?.registeredUsers) ? event.registeredUsers : [] as string[];
    const uid = user?.id ?? '';
    return !!uid && list.includes(uid);
  };

  const handleCreate = () => {
    console.log('[Events] handleCreate called');
    console.log('[Events] Current form state:', JSON.stringify(form, null, 2));
    console.log('[Events] Current user:', JSON.stringify(user, null, 2));
    console.log('[Events] Auth state:', { isAuthenticated, isLoading });
    console.log('[Events] Mutation state:', { isPending: createMutation.isPending, error: createMutation.error });
    
    if (!user) {
      console.log('[Events] No user found');
      Alert.alert(t('events.errorTitle'), t('events.errors.mustBeLoggedInCreate'));
      return;
    }

    if (!user.id) {
      console.log('[Events] User has no ID');
      Alert.alert(t('events.errorTitle'), t('events.errors.invalidSession'));
      return;
    }

    if (!form.title.trim()) {
      console.log('[Events] Title validation failed');
      Alert.alert(t('events.errorTitle'), t('events.errors.enterTitle'));
      return;
    }
    
    if (!form.description.trim()) {
      console.log('[Events] Description validation failed');
      Alert.alert(t('events.errorTitle'), t('events.errors.enterDescription'));
      return;
    }
    
    if (!form.location.trim()) {
      console.log('[Events] Location validation failed');
      Alert.alert(t('events.errorTitle'), t('events.errors.enterLocation'));
      return;
    }
    
    if (createMutation.isPending) {
      console.log('[Events] Mutation already in progress, skipping');
      return;
    }
    
    // Combine date and time for start
    const startDateTime = new Date(
      form.startDate.getFullYear(),
      form.startDate.getMonth(),
      form.startDate.getDate(),
      form.startTime.getHours(),
      form.startTime.getMinutes()
    );

    // Combine date and time for end
    const endDateTime = new Date(
      form.endDate.getFullYear(),
      form.endDate.getMonth(),
      form.endDate.getDate(),
      form.endTime.getHours(),
      form.endTime.getMinutes()
    );

    console.log('[Events] Calculated dates:', { startDateTime, endDateTime });

    // Validate dates
    if (endDateTime <= startDateTime) {
      console.log('[Events] Date validation failed');
      Alert.alert(t('events.errorTitle'), t('events.errors.endAfterStart'));
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      startDate: form.startDate,
      startTime: form.startTime,
      endDate: form.endDate,
      endTime: form.endTime,
      location: form.location.trim(),
      type: form.type,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : undefined,
      createdBy: user.id,
      isSharedAllChurches: form.isSharedAllChurches,
    };

    console.log('[Events] Creating event with payload:', JSON.stringify(payload, null, 2));
    console.log('[Events] About to call createMutation.mutate');
    
    try {
      createMutation.mutate(payload);
      console.log('[Events] createMutation.mutate called successfully');
    } catch (error) {
      console.error('[Events] Error calling createMutation.mutate:', error);
      Alert.alert(t('events.errorTitle'), t('events.errors.startCreationFailed'));
    }
  };

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    console.log('[Events] DateTimePicker change:', { event, selectedDate, field: showDatePicker.field });
    
    // On Android, the picker automatically closes after selection
    if (Platform.OS === 'android') {
      setShowDatePicker({ field: null, mode: 'date' });
    }
    
    // Update the form if a date was selected and we have a field
    if (selectedDate && showDatePicker.field) {
      console.log('[Events] Updating field:', showDatePicker.field, 'with date:', selectedDate);
      setForm(prev => ({
        ...prev,
        [showDatePicker.field!]: selectedDate
      }));
    }
  };

  const closeDatePicker = () => {
    console.log('[Events] Closing date picker');
    setShowDatePicker({ field: null, mode: 'date' });
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString(i18n.language, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeDisplay = (date: Date) => {
    return date.toLocaleTimeString(i18n.language, {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('events.title')}</Text>
          <TouchableOpacity
            testID="add-event-button"
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.filtersContainer}>
          {filterOptions.map((option) => {
            const isActive = selectedFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                testID={`filter-${option.key}`}
                style={[
                  styles.filterChip,
                  { borderColor: option.accent },
                  isActive && [styles.filterChipActive, { backgroundColor: option.accent }],
                ]}
                onPress={() => setSelectedFilter(option.key)}
                accessibilityState={{ selected: isActive }}
              >
                <View
                  style={[
                    styles.filterChipIndicator,
                    { backgroundColor: option.accent },
                    isActive && styles.filterChipIndicatorActive,
                  ]}
                />
                <Text
                  style={[
                    styles.filterChipLabel,
                    isActive && styles.filterChipLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {listQuery.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.loadingText}>{t('events.loading')}</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={20} color="#94a3b8" />
            <Text style={styles.emptyText}>{t('events.emptyTitle')}</Text>
            <Text style={styles.emptySubtext}>{t('events.emptySubtitle')}</Text>
          </View>
        ) : (
          events.map((event) => (
          <View key={event.id} style={styles.eventCard} testID={`event-${event.id}`}>
            <View style={styles.eventHeader}>
              <View style={styles.eventTypeContainer}>
                <View
                  style={[
                    styles.eventTypeBadge,
                    { backgroundColor: eventTypeColors[event.type] },
                  ]}
                >
                  <Text style={styles.eventTypeBadgeText}>
                    {getEventTypeLabel(event.type)}
                  </Text>
                </View>
                {isUserRegistered(event) && (
                  <View style={styles.registeredBadge}>
                    <Text style={styles.registeredBadgeText}>{t('events.registered')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDescription}>{event.description}</Text>
            </View>

            <View style={styles.eventDetails}>
              <View style={styles.eventDetailRow}>
                <Calendar size={16} color="#64748b" />
                <Text style={styles.eventDetailText}>
                  {t('events.dateAtTime', {
                    date: formatDate(new Date(event.date)),
                    time: formatTime(new Date(event.date)),
                  })}
                </Text>
              </View>

              {event.endDate && (
                <View style={styles.eventDetailRow}>
                  <Clock size={16} color="#64748b" />
                  <Text style={styles.eventDetailText}>
                    {t('events.endsAt', { time: formatTime(new Date(event.endDate)) })}
                  </Text>
                </View>
              )}

              <View style={styles.eventDetailRow}>
                <MapPin size={16} color="#64748b" />
                <Text style={styles.eventDetailText}>{event.location}</Text>
              </View>

              <View style={styles.eventDetailRow}>
                <Users size={16} color="#64748b" />
                <Text style={styles.eventDetailText}>
                  {formatAttending(event.currentAttendees, event.maxAttendees)}
                </Text>
              </View>
            </View>

            <View style={styles.eventActions}>
              {event.isRegistrationOpen && (
                <TouchableOpacity
                  testID={`register-button-${event.id}`}
                  style={[
                    styles.registerButton,
                    isUserRegistered(event) && styles.registeredButton,
                  ]}
                  onPress={() => {
                    if (!user?.id) {
                      Alert.alert(t('events.loginRequiredTitle'), t('events.loginRequiredMessage'));
                      return;
                    }
                    registerMutation.mutate({ eventId: event.id });
                  }}
                  disabled={registeringEventId === event.id}
                >
                  <Text
                    style={[
                      styles.registerButtonText,
                      isUserRegistered(event) && styles.registeredButtonText,
                    ]}
                  >
                    {registeringEventId === event.id
                      ? t('events.pleaseWait')
                      : isUserRegistered(event)
                      ? t('events.unregister')
                      : t('events.register')}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                testID={`view-details-button-${event.id}`}
                style={styles.detailsButton}
                onPress={() => handleOpenDetails(event)}
              >
                <Text style={styles.detailsButtonText}>{t('events.viewDetails')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          ))
        )}

        <View style={styles.spacer} />
      </ScrollView>

      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseDetails}
      >
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsContainer} testID="event-details-modal">
            <SafeAreaView style={styles.detailsSafeArea}>
              {activeEvent ? (
                <View style={styles.detailsContent}>
                  <View style={styles.detailsHero}>
                    <Image
                      source={{ uri: activeEvent.imageUrl ?? fallbackEventImage }}
                      style={styles.detailsHeroImage}
                      contentFit="cover"
                      transition={200}
                    />
                    <LinearGradient
                      colors={['rgba(15, 23, 42, 0.1)', 'rgba(15, 23, 42, 0.75)', '#0f172a']}
                      locations={[0, 0.6, 1]}
                      style={styles.detailsHeroGradient}
                    />
                    <View style={styles.detailsHeroTopRow}>
                      <View
                        style={[
                          styles.detailsTypeBadge,
                          { backgroundColor: eventTypeColors[activeEvent.type] },
                        ]}
                      >
                        <Text style={styles.detailsTypeBadgeText}>
                          {getEventTypeLabel(activeEvent.type)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        testID="close-event-details-button"
                        style={styles.detailsCloseButton}
                        onPress={handleCloseDetails}
                      >
                        <X size={20} color="white" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.detailsHeroTextGroup}>
                      <Text style={styles.detailsHeroTitle}>{activeEvent.title}</Text>
                      <Text style={styles.detailsHeroMeta}>
                        {formatDate(new Date(activeEvent.date))} · {formatTime(new Date(activeEvent.date))}
                      </Text>
                      {activeEvent.location ? (
                        <Text style={styles.detailsHeroLocation}>{activeEvent.location}</Text>
                      ) : null}
                    </View>
                  </View>

                  <ScrollView
                    style={styles.detailsScroll}
                    contentContainerStyle={styles.detailsScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.detailsSection}>
                      <Text style={styles.detailsSectionTitle}>{t('events.aboutThisEvent')}</Text>
                      <Text style={styles.detailsDescription}>{activeEvent.description}</Text>
                    </View>

                    <View style={styles.detailsInfoGrid}>
                      <View style={styles.detailsInfoCard}>
                        <Calendar size={18} color="#1e3a8a" />
                        <Text style={styles.detailsInfoLabel}>{t('events.starts')}</Text>
                        <Text style={styles.detailsInfoValue}>
                          {formatDate(new Date(activeEvent.date))}
                        </Text>
                        <Text style={styles.detailsInfoSubValue}>
                          {formatTime(new Date(activeEvent.date))}
                        </Text>
                      </View>
                      {activeEvent.endDate ? (
                        <View style={styles.detailsInfoCard}>
                          <Clock size={18} color="#1e3a8a" />
                          <Text style={styles.detailsInfoLabel}>{t('events.ends')}</Text>
                          <Text style={styles.detailsInfoValue}>
                            {formatDate(new Date(activeEvent.endDate))}
                          </Text>
                          <Text style={styles.detailsInfoSubValue}>
                            {formatTime(new Date(activeEvent.endDate))}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.detailsInfoCard}>
                        <MapPin size={18} color="#1e3a8a" />
                        <Text style={styles.detailsInfoLabel}>{t('events.location')}</Text>
                        <Text style={styles.detailsInfoValue}>{activeEvent.location}</Text>
                        {activeEvent.maxAttendees ? (
                          <Text style={styles.detailsInfoSubValue}>
                            {t('events.capacity', { count: activeEvent.maxAttendees })}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.detailsInfoCard}>
                        <Users size={18} color="#1e3a8a" />
                        <Text style={styles.detailsInfoLabel}>{t('events.attendingLabel')}</Text>
                        <Text style={styles.detailsInfoValue}>
                          {activeEvent.maxAttendees
                            ? `${activeEvent.currentAttendees}/${activeEvent.maxAttendees}`
                            : `${activeEvent.currentAttendees}`}
                        </Text>
                        <Text style={styles.detailsInfoSubValue}>
                          {isUserRegistered(activeEvent) ? t('events.youAreRegistered') : t('events.spotsAvailable')}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      testID={`add-to-calendar-button-${activeEvent.id}`}
                      style={styles.calendarSyncButton}
                      onPress={() => addEventToCalendar(activeEvent)}
                    >
                      <CalendarPlus size={18} color="#1e3a8a" />
                      <Text style={styles.calendarSyncButtonText}>{t('events.addToCalendar')}</Text>
                    </TouchableOpacity>

                    {activeEvent.isRegistrationOpen ? (
                      <TouchableOpacity
                        testID={`details-register-button-${activeEvent.id}`}
                        style={[
                          styles.detailsRegisterButton,
                          isUserRegistered(activeEvent) && styles.detailsRegisterButtonActive,
                        ]}
                        onPress={() => {
                          if (!user?.id) {
                            Alert.alert(t('events.loginRequiredTitle'), t('events.loginRequiredMessage'));
                            return;
                          }
                          registerMutation.mutate({ eventId: activeEvent.id });
                        }}
                        disabled={registeringEventId === activeEvent.id}
                      >
                        <Text
                          style={[
                            styles.detailsRegisterButtonText,
                            isUserRegistered(activeEvent) && styles.detailsRegisterButtonTextActive,
                          ]}
                        >
                          {registeringEventId === activeEvent.id
                            ? t('events.updating')
                            : isUserRegistered(activeEvent)
                            ? t('events.cancelRegistration')
                            : t('events.reserveSpot')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.detailsRegistrationClosed}>
                        <Text style={styles.detailsRegistrationClosedText}>{t('events.registrationClosed')}</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.detailsEmpty}>
                  <Text style={styles.detailsEmptyTitle}>{t('events.unavailableTitle')}</Text>
                  <Text style={styles.detailsEmptySubtitle}>
                    {t('events.unavailableSubtitle')}
                  </Text>
                  <TouchableOpacity
                    testID="dismiss-event-details-button"
                    style={styles.detailsDismissButton}
                    onPress={handleCloseDetails}
                  >
                    <Text style={styles.detailsDismissButtonText}>{t('events.goBack')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} testID="event-modal">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} testID="event-cancel-button">
              <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('events.newEvent')}</Text>
            <TouchableOpacity 
              onPress={() => {
                console.log('[Events] Create button pressed!');
                handleCreate();
              }} 
              disabled={createMutation.isPending}
              testID="submit-event-button"
            >
              <Text style={[styles.modalSubmitText, createMutation.isPending && styles.modalSubmitTextDisabled]}>
                {createMutation.isPending ? t('events.creating') : t('events.create')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {effectiveChurchName && (
              <View style={styles.churchContextBanner}>
                <Church size={14} color="#1e3a8a" />
                <Text style={styles.churchContextText}>
                  {t('events.postingTo', { church: effectiveChurchName })}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.title')}</Text>
              <TextInput
                testID="event-title-input"
                style={styles.textInput}
                placeholder={t('events.form.titlePlaceholder')}
                value={form.title}
                onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
                maxLength={120}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.description')}</Text>
              <TextInput
                testID="event-description-input"
                style={[styles.textInput, styles.textArea]}
                placeholder={t('events.form.descriptionPlaceholder')}
                value={form.description}
                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.startDate')}</Text>
              <TouchableOpacity
                testID="event-start-date-picker"
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker({ field: 'startDate', mode: 'date' })}
              >
                <Calendar size={20} color="#64748b" />
                <Text style={styles.dateTimeButtonText}>
                  {formatDateDisplay(form.startDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.startTime')}</Text>
              <TouchableOpacity
                testID="event-start-time-picker"
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker({ field: 'startTime', mode: 'time' })}
              >
                <Clock size={20} color="#64748b" />
                <Text style={styles.dateTimeButtonText}>
                  {formatTimeDisplay(form.startTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.endDate')}</Text>
              <TouchableOpacity
                testID="event-end-date-picker"
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker({ field: 'endDate', mode: 'date' })}
              >
                <Calendar size={20} color="#64748b" />
                <Text style={styles.dateTimeButtonText}>
                  {formatDateDisplay(form.endDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.endTime')}</Text>
              <TouchableOpacity
                testID="event-end-time-picker"
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker({ field: 'endTime', mode: 'time' })}
              >
                <Clock size={20} color="#64748b" />
                <Text style={styles.dateTimeButtonText}>
                  {formatTimeDisplay(form.endTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.location')}</Text>
              <TextInput
                testID="event-location-input"
                style={styles.textInput}
                placeholder={t('events.form.locationPlaceholder')}
                value={form.location}
                onChangeText={(text) => setForm(prev => ({ ...prev, location: text }))}
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.eventType')}</Text>
              <View style={styles.typesWrap}>
                {allowedEventTypes.map((key) => (
                  <TouchableOpacity
                    key={key}
                    testID={`type-${key}`}
                    style={[styles.typeChip, form.type === key && styles.typeChipActive]}
                    onPress={() => setForm(prev => ({ ...prev, type: key }))}
                  >
                    <Text style={[styles.typeChipText, form.type === key && styles.typeChipTextActive]}>
                      {getEventTypeLabel(key)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('events.form.maxAttendees')}</Text>
              <TextInput
                testID="event-maxAttendees-input"
                style={styles.textInput}
                placeholder={t('events.form.maxAttendeesPlaceholder')}
                value={form.maxAttendees ?? ''}
                onChangeText={(text) => setForm(prev => ({ ...prev, maxAttendees: text.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.switchGroup}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.shareLabelRow}>
                    <Globe size={16} color="#2563eb" />
                    <Text style={styles.switchLabel}>{t('events.form.shareAllChurches')}</Text>
                  </View>
                  <Text style={styles.switchDescription}>
                    {t('events.form.shareAllChurchesDescription')}
                  </Text>
                </View>
                <Switch
                  value={form.isSharedAllChurches}
                  onValueChange={(value) => setForm(prev => ({ ...prev, isSharedAllChurches: value }))}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor={form.isSharedAllChurches ? 'white' : '#f4f4f5'}
                  testID="event-shared-switch"
                />
              </View>
            </View>

            <TouchableOpacity
              testID="submit-event-button-bottom"
              style={[styles.createButtonBottom, createMutation.isPending && styles.createButtonBottomDisabled]}
              onPress={() => {
                console.log('[Events] Bottom create button pressed!');
                handleCreate();
              }}
              disabled={createMutation.isPending}
              activeOpacity={0.8}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Plus size={20} color="white" />
              )}
              <Text style={styles.createButtonBottomText}>
                {createMutation.isPending ? t('events.creatingEvent') : t('events.createEvent')}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>

          {showDatePicker.field && (
            <>
              {Platform.OS === 'web' ? (
                <View style={styles.datePickerOverlay}>
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={closeDatePicker}>
                        <Text style={styles.datePickerCancel}>{t('common.cancel')}</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>
                        {showDatePicker.mode === 'date' ? t('events.selectDate') : t('events.selectTime')}
                      </Text>
                      <TouchableOpacity onPress={closeDatePicker}>
                        <Text style={styles.datePickerDone}>{t('events.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.webDatePickerContainer}>
                      <input
                        type={showDatePicker.mode === 'date' ? 'date' : 'time'}
                        value={showDatePicker.mode === 'date' 
                          ? (showDatePicker.field ? form[showDatePicker.field].toISOString().split('T')[0] : '')
                          : (showDatePicker.field ? form[showDatePicker.field].toTimeString().slice(0, 5) : '')
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          let newDate: Date;
                          
                          if (showDatePicker.field) {
                            if (showDatePicker.mode === 'date') {
                              const [year, month, day] = value.split('-').map(Number);
                              newDate = new Date(form[showDatePicker.field]);
                              newDate.setFullYear(year, month - 1, day);
                            } else {
                              const [hours, minutes] = value.split(':').map(Number);
                              newDate = new Date(form[showDatePicker.field]);
                              newDate.setHours(hours, minutes);
                            }
                          } else {
                            return;
                          }
                          
                          setForm(prev => ({
                            ...prev,
                            [showDatePicker.field!]: newDate
                          }));
                        }}
                        style={styles.webDateInput}
                      />
                    </View>
                  </View>
                </View>
              ) : Platform.OS === 'ios' ? (
                <View style={styles.datePickerOverlay}>
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                      <TouchableOpacity onPress={closeDatePicker}>
                        <Text style={styles.datePickerCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>
                        {showDatePicker.mode === 'date' ? t('events.selectDate') : t('events.selectTime')}
                      </Text>
                      <TouchableOpacity onPress={closeDatePicker}>
                        <Text style={styles.datePickerDone}>{t('events.done')}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={showDatePicker.field ? form[showDatePicker.field] : new Date()}
                      mode={showDatePicker.mode}
                      is24Hour={false}
                      onChange={handleDateTimeChange}
                      display="spinner"
                      style={styles.datePicker}
                    />
                  </View>
                </View>
              ) : (
                <DateTimePicker
                  testID="dateTimePicker"
                  value={showDatePicker.field ? form[showDatePicker.field] : new Date()}
                  mode={showDatePicker.mode}
                  is24Hour={false}
                  onChange={handleDateTimeChange}
                  display="default"
                />
              )}
            </>
          )}
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
    backgroundColor: '#1e3a8a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
  },
  filterChipActive: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  filterChipIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.55,
  },
  filterChipIndicatorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    opacity: 1,
  },
  filterChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 0.2,
  },
  filterChipLabelActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  eventCard: {
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
  eventHeader: {
    marginBottom: 16,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  registeredBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  registeredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  eventDetails: {
    gap: 8,
    marginBottom: 16,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#475569',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 12,
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#1e3a8a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  registeredButton: {
    backgroundColor: '#16a34a',
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  registeredButtonText: {
    color: 'white',
  },
  detailsButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  spacer: {
    height: 40,
  },
  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  detailsContainer: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
    maxHeight: '88%',
  },
  detailsSafeArea: {
    flex: 1,
  },
  detailsContent: {
    flex: 1,
  },
  detailsHero: {
    height: 240,
    position: 'relative',
    overflow: 'hidden',
  },
  detailsHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  detailsHeroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  detailsHeroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  detailsTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailsTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  detailsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsHeroTextGroup: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 32,
    gap: 6,
  },
  detailsHeroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  detailsHeroMeta: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(226, 232, 240, 0.95)',
  },
  detailsHeroLocation: {
    fontSize: 14,
    color: 'rgba(226, 232, 240, 0.85)',
  },
  detailsScroll: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  detailsScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 28,
  },
  detailsSection: {
    gap: 12,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  detailsDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cbd5f5',
  },
  detailsInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailsInfoCard: {
    width: '46%',
    backgroundColor: '#111c34',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 6,
  },
  detailsInfoLabel: {
    fontSize: 12,
    color: '#94a3b8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  detailsInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  detailsInfoSubValue: {
    fontSize: 13,
    color: '#cbd5f5',
  },
  calendarSyncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  calendarSyncButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  detailsRegisterButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  detailsRegisterButtonActive: {
    backgroundColor: '#16a34a',
  },
  detailsRegisterButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  detailsRegisterButtonTextActive: {
    color: 'white',
  },
  detailsRegistrationClosed: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  detailsRegistrationClosedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  detailsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  detailsEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  detailsEmptySubtitle: {
    fontSize: 15,
    color: '#cbd5f5',
    textAlign: 'center',
  },
  detailsDismissButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'white',
  },
  detailsDismissButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
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
    color: '#1e3a8a',
  },
  modalSubmitTextDisabled: {
    color: '#94a3b8',
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
  typesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  typeChipActive: {
    backgroundColor: '#1e3a8a',
  },
  typeChipText: {
    fontSize: 14,
    color: '#334155',
  },
  typeChipTextActive: {
    color: 'white',
  },
  inputHelp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dateTimeButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
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
    gap: 6,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  datePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  datePickerCancel: {
    fontSize: 16,
    color: '#64748b',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  datePicker: {
    height: 200,
  },
  webDatePickerContainer: {
    padding: 20,
  },
  webDateInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  createButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  createButtonBottomDisabled: {
    backgroundColor: '#94a3b8',
  },
  createButtonBottomText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: 'white',
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
  switchGroup: {
    gap: 20,
    marginBottom: 24,
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
  shareLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});