import { StatusBar } from 'expo-status-bar';
import { Calendar, MapPin, Users, Plus, Clock, AlertCircle, X, CalendarPlus, Globe, Trash2, Church as ChurchIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { Church } from '@/providers/church-provider';
import { isAdmin } from '@/utils/permissions';
import { buildChurchScope, canManageEventsForGroup, canManageAnyEvent } from '@/utils/church-scope';
import type { Event, EventType } from '@/types/event';
import { supabase } from '@/lib/supabase';
import { addEventToCalendar } from '@/utils/calendar-sync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, Shadow, Radius, Spacing } from '@/constants/theme';

const allowedEventTypes: EventType[] = ['bible_study', 'youth', 'special', 'conference'];

const eventTypeColors: Record<EventType, string> = {
  bible_study: '#10b981',
  youth: '#f59e0b',
  special: '#8b5cf6',
  conference: '#06b6d4',
};

const eventTypeLabels: Record<EventType, string> = {
  bible_study: 'Bible Study',
  youth: 'Youth',
  special: 'Special',
  conference: 'Conference',
};

const resolveRawType = (row: any): string => {
  const eventType = row.event_type;
  const legacyType = row.type;
  if (typeof eventType === 'string' && eventType.length > 0) return eventType;
  if (typeof legacyType === 'string' && legacyType.length > 0) return legacyType;
  return 'bible_study';
};

const normalizeEventType = (value: string): EventType | null => {
  if (value === 'sabbath' || value === 'prayer_meeting') return null;
  if (allowedEventTypes.includes(value as EventType)) return value as EventType;
  console.log('[Events] Normalized unexpected event type to bible_study:', value);
  return 'bible_study';
};

const fallbackEventImage = 'https://images.unsplash.com/photo-1530023367847-a683933f4177?w=1200&q=80&auto=format&fit=crop' as const;

export default function EventsScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { currentChurch, availableChurches } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = isAdmin(user);

  const pastorGroupsQuery = useQuery({
    queryKey: ['pastor-groups-for-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)
        .eq('role', 'pastor');
      if (error) {
        console.warn('[Events] Error fetching pastor groups:', error.message);
        return [];
      }
      return (data || []).map((r: any) => r.group_id as string);
    },
    enabled: !!user?.id,
  });
  const pastorGroupIds = useMemo(() => pastorGroupsQuery.data ?? [], [pastorGroupsQuery.data]);
  const churchScope = useMemo(() => buildChurchScope(user, currentChurchId, pastorGroupIds), [user, currentChurchId, pastorGroupIds]);
  const canManageEvents = canManageAnyEvent(churchScope);

  const manageableChurches = useMemo<Church[]>(() => {
    if (!availableChurches || availableChurches.length === 0) return [];
    if (userIsAdmin) return availableChurches;
    return availableChurches.filter((c) => canManageEventsForGroup(churchScope, c.id));
  }, [availableChurches, userIsAdmin, churchScope]);

  console.log('[Events] Auth state:', { user: user?.id, isAuthenticated, isLoading, churchId: currentChurchId, canManageEvents });
  const [selectedFilter, setSelectedFilter] = useState<EventType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
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
    groupId: string | null;
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
    groupId: currentChurchId,
    isSharedAllChurches: false,
  });

  const [showDatePicker, setShowDatePicker] = useState<{
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;
    mode: 'date' | 'time';
  }>({ field: null, mode: 'date' });

  const filterOptions = useMemo<{ key: EventType | 'all'; label: string; accent: string }[]>(() => {
    return [
      { key: 'all', label: 'All', accent: '#1e293b' },
      ...Object.entries(eventTypeLabels).map(([key, label]) => ({
        key: key as EventType,
        label,
        accent: eventTypeColors[key as EventType],
      })),
    ];
  }, []);

  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['events', currentChurchId, userIsAdmin],
    queryFn: async () => {
      console.log('[Events] Fetching events from database, churchId:', currentChurchId);
      
      let query = supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });

      if (!userIsAdmin && currentChurchId) {
        query = query.or(`group_id.eq.${currentChurchId},is_shared_all_churches.eq.true`);
      } else if (!userIsAdmin && !currentChurchId) {
        console.log('[Events] Non-admin user has no church, returning empty');
        return [];
      }

      let { data, error } = await query;

      if (error) {
        console.error('[Events] Failed to fetch events:', JSON.stringify(error));
        if (!userIsAdmin && currentChurchId && error.message?.includes('is_shared_all_churches')) {
          console.log('[Events] is_shared_all_churches column missing, falling back to group_id filter');
          const fallback = await supabase
            .from('events')
            .select('*')
            .eq('group_id', currentChurchId)
            .order('start_at', { ascending: true });
          if (fallback.error) {
            console.error('[Events] Fallback also failed:', JSON.stringify(fallback.error));
            throw new Error(fallback.error.message ?? 'Failed to load events');
          }
          data = fallback.data;
          error = null;
        } else {
          throw new Error(error.message ?? 'Failed to load events');
        }
      }

      const rows = (data ?? []) as any[];
      console.log('[Events] Raw rows fetched:', rows.length);
      const rawDetails = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        event_type: r.event_type,
        type: r.type,
        group_id: r.group_id,
        start_at: r.start_at,
        created_at: r.created_at,
      }));
      console.log('[Events] Raw row details:', JSON.stringify(rawDetails));

      const sanitizedEvents: Event[] = [];
      for (const event of rows) {
        const rawType = resolveRawType(event);
        const normalized = normalizeEventType(rawType);
        console.log('[Events] Row', event.id, '| event_type:', event.event_type, '| type:', event.type, '| resolved:', rawType, '| normalized:', normalized);

        if (!normalized) {
          console.log('[Events] Skipping excluded type:', rawType, 'for event', event.id);
          continue;
        }

        const start = event.start_at ? new Date(event.start_at) : new Date();
        const end = event.end_at ? new Date(event.end_at) : undefined;
        const registeredUsersSafe: string[] = Array.isArray(event?.registered_users)
          ? (event.registered_users as string[])
          : [];

        sanitizedEvents.push({
          id: event.id,
          title: event.title,
          description: event.description ?? '',
          date: start,
          endDate: end,
          location: event.location ?? '',
          type: normalized,
          maxAttendees: event.max_attendees ?? undefined,
          currentAttendees: event.current_attendees ?? 0,
          registeredUsers: registeredUsersSafe,
          isRegistrationOpen: event.is_registration_open ?? true,
          createdBy: event.created_by,
          imageUrl: event.image_url ?? undefined,
          createdAt: new Date(event.created_at ?? new Date().toISOString()),
          groupId: event.group_id ?? null,
          isSharedAllChurches: event.is_shared_all_churches ?? false,
        } as Event);
      }

      console.log('[Events] Final sanitized events count:', sanitizedEvents.length);
      console.log('[Events] Sanitized event ids:', sanitizedEvents.map(e => e.id));
      console.log('[Events] Skipped count:', rows.length - sanitizedEvents.length);
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
      groupId: string | null;
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
        group_id: eventData.groupId,
        is_shared_all_churches: eventData.isSharedAllChurches ?? false,
      };

      console.log('[Events] Inserting event with data:', JSON.stringify(insertData, null, 2));

      const { data: checkSession } = await supabase.auth.getSession();
      console.log('[Events] Current auth session uid:', checkSession?.session?.user?.id ?? 'NO SESSION');
      console.log('[Events] created_by value:', eventData.createdBy);

      if (!checkSession?.session) {
        throw new Error('Your session has expired. Please log out and log in again.');
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
        const msg = error.message ?? 'Failed to create event';
        if (msg.includes('type')) {
          throw new Error(
            msg + ' — You may need to run the database fix script (database-fix-events-creation.sql).'
          );
        }
        throw new Error(msg);
      }

      if (!data) {
        console.error('[Events] Insert returned no data - likely RLS policy blocking insert');
        throw new Error('Event was not created. You may not have permission to create events.');
      }

      console.log('[Events] Insert succeeded, created event:', data.id);
      return true;
    },
    onSuccess: () => {
      console.log('[Events] Mutation success, invalidating queries');
      void queryClient.invalidateQueries({ queryKey: ['events'] });
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
        groupId: currentChurchId,
        isSharedAllChurches: false,
      });
      setShowAddModal(false);
      Alert.alert('Success', 'Event has been created successfully!');
    },
    onError: (error) => {
      console.error('[Events] Mutation error:', error);
      Alert.alert('Error', (error as Error).message ?? 'Failed to create event. Please try again.');
    },
  });

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

  const handleCloseDetails = useCallback(() => {
    console.log('[Events] Closing event details modal');
    setShowDetailsModal(false);
    setSelectedEvent(null);
  }, []);

  const registerMutation = useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      console.log('[Events] Register mutation called for', eventId);
      if (!user?.id) {
        throw new Error('You must be logged in.');
      }

      const { data: current, error: fetchError } = await supabase
        .from('events')
        .select('id, registered_users, current_attendees, max_attendees, is_registration_open')
        .eq('id', eventId)
        .single();

      if (fetchError) {
        console.error('[Events] Failed to fetch event before register:', fetchError);
        throw new Error(fetchError.message ?? 'Failed to load event');
      }

      const regUsers: string[] = (current as any).registered_users ?? [];
      const already = regUsers.includes(user.id);
      const capacity: number | null = (current as any).max_attendees ?? null;
      const open: boolean = Boolean((current as any).is_registration_open);
      const currentCount: number = Number((current as any).current_attendees ?? 0);

      if (!open) {
        throw new Error('Registration is closed for this event.');
      }

      if (!already) {
        if (capacity !== null && currentCount >= capacity) {
          throw new Error('This event is at full capacity.');
        }
      }

      const nextUsers = already ? regUsers.filter((id: string) => id !== user.id) : [...regUsers, user.id];
      const nextCount = already ? Math.max(0, currentCount - 1) : currentCount + 1;

      const { data: updated, error: updateError } = await supabase
        .from('events')
        .update({ registered_users: nextUsers, current_attendees: nextCount })
        .eq('id', eventId)
        .select()
        .single();

      if (updateError) {
        console.error('[Events] Registration update failed:', updateError);
        throw new Error(updateError.message ?? 'Failed to update registration');
      }

      return updated;
    },
    onSuccess: () => {
      console.log('[Events] Register mutation success - invalidating events');
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      Alert.alert('Success', 'Your registration status was updated.');
    },
    onError: (error) => {
      console.error('[Events] Register mutation error:', error);
      Alert.alert('Error', (error as Error).message ?? 'Could not update registration.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      console.log('[Events] Delete mutation called for', eventId);
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      if (error) {
        console.error('[Events] Delete failed:', error);
        throw new Error(error.message ?? 'Failed to delete event');
      }
      return true;
    },
    onSuccess: () => {
      console.log('[Events] Delete mutation success');
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['home-events'] });
      Alert.alert('Deleted', 'The event has been removed.');
    },
    onError: (error) => {
      console.error('[Events] Delete mutation error:', error);
      Alert.alert('Error', (error as Error).message ?? 'Could not delete event.');
    },
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
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
      Alert.alert('Error', 'You must be logged in to create an event');
      return;
    }

    if (!user.id) {
      console.log('[Events] User has no ID');
      Alert.alert('Error', 'Invalid user session. Please log out and log in again.');
      return;
    }

    if (!form.title.trim()) {
      console.log('[Events] Title validation failed');
      Alert.alert('Error', 'Please enter an event title');
      return;
    }
    
    if (!form.description.trim()) {
      console.log('[Events] Description validation failed');
      Alert.alert('Error', 'Please enter an event description');
      return;
    }
    
    if (!form.location.trim()) {
      console.log('[Events] Location validation failed');
      Alert.alert('Error', 'Please enter an event location');
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
      Alert.alert('Error', 'End date and time must be after start date and time');
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
      groupId: form.groupId,
      isSharedAllChurches: form.isSharedAllChurches,
    };

    console.log('[Events] Creating event with payload:', JSON.stringify(payload, null, 2));
    console.log('[Events] About to call createMutation.mutate');
    
    try {
      createMutation.mutate(payload);
      console.log('[Events] createMutation.mutate called successfully');
    } catch (error) {
      console.error('[Events] Error calling createMutation.mutate:', error);
      Alert.alert('Error', 'Failed to start event creation');
    }
  };

  const closeDatePicker = useCallback(() => {
    console.log('[Events] Closing date picker');
    setShowDatePicker({ field: null, mode: 'date' });
  }, []);

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTimeDisplay = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Church Events</Text>
          {canManageEvents && (
            <TouchableOpacity
              testID="add-event-button"
              style={styles.addButton}
              onPress={() => {
                const defaultGroup = manageableChurches.length > 0 ? manageableChurches[0].id : currentChurchId;
                setForm(prev => ({ ...prev, groupId: defaultGroup }));
                setShowAddModal(true);
              }}
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          )}
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
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertCircle size={20} color="#94a3b8" />
            <Text style={styles.emptyText}>No events yet</Text>
            <Text style={styles.emptySubtext}>Tap + to create the first one</Text>
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
                    {eventTypeLabels[event.type]}
                  </Text>
                </View>
                {isUserRegistered(event) && (
                  <View style={styles.registeredBadge}>
                    <Text style={styles.registeredBadgeText}>Registered</Text>
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
                  {formatDate(new Date(event.date))} at {formatTime(new Date(event.date))}
                </Text>
              </View>

              {event.endDate && (
                <View style={styles.eventDetailRow}>
                  <Clock size={16} color="#64748b" />
                  <Text style={styles.eventDetailText}>
                    Ends at {formatTime(new Date(event.endDate))}
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
                  {event.maxAttendees ? `${event.currentAttendees}/${event.maxAttendees} attending` : `${event.currentAttendees} attending`}
                </Text>
              </View>
            </View>

            {event.isSharedAllChurches && (
              <View style={styles.sharedBadgeRow}>
                <Globe size={12} color="#6366f1" />
                <Text style={styles.sharedBadgeText}>Shared with all churches</Text>
              </View>
            )}

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
                      Alert.alert('Login required', 'Please log in to register for events.');
                      return;
                    }
                    registerMutation.mutate({ eventId: event.id });
                  }}
                  disabled={registerMutation.isPending}
                >
                  <Text
                    style={[
                      styles.registerButtonText,
                      isUserRegistered(event) && styles.registeredButtonText,
                    ]}
                  >
                    {registerMutation.isPending
                      ? 'Please wait...'
                      : isUserRegistered(event)
                      ? 'Unregister'
                      : 'Register'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                testID={`view-details-button-${event.id}`}
                style={styles.detailsButton}
                onPress={() => handleOpenDetails(event)}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
              </TouchableOpacity>

              {event.groupId && canManageEventsForGroup(churchScope, event.groupId) && (
                <TouchableOpacity
                  testID={`delete-event-button-${event.id}`}
                  style={styles.deleteButton}
                  onPress={() => {
                    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate({ eventId: event.id }) },
                    ]);
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              )}
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
                          {eventTypeLabels[activeEvent.type]}
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
                      <Text style={styles.detailsSectionTitle}>About this event</Text>
                      <Text style={styles.detailsDescription}>{activeEvent.description}</Text>
                    </View>

                    <View style={styles.detailsInfoGrid}>
                      <View style={styles.detailsInfoCard}>
                        <Calendar size={18} color="#1e3a8a" />
                        <Text style={styles.detailsInfoLabel}>Starts</Text>
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
                          <Text style={styles.detailsInfoLabel}>Ends</Text>
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
                        <Text style={styles.detailsInfoLabel}>Location</Text>
                        <Text style={styles.detailsInfoValue}>{activeEvent.location}</Text>
                        {activeEvent.maxAttendees ? (
                          <Text style={styles.detailsInfoSubValue}>
                            Capacity {activeEvent.maxAttendees}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.detailsInfoCard}>
                        <Users size={18} color="#1e3a8a" />
                        <Text style={styles.detailsInfoLabel}>Attending</Text>
                        <Text style={styles.detailsInfoValue}>
                          {activeEvent.maxAttendees
                            ? `${activeEvent.currentAttendees}/${activeEvent.maxAttendees}`
                            : `${activeEvent.currentAttendees}`}
                        </Text>
                        <Text style={styles.detailsInfoSubValue}>
                          {isUserRegistered(activeEvent) ? 'You are registered' : 'Spots available'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      testID={`add-to-calendar-button-${activeEvent.id}`}
                      style={styles.calendarSyncButton}
                      onPress={() => addEventToCalendar(activeEvent)}
                    >
                      <CalendarPlus size={18} color="#1e3a8a" />
                      <Text style={styles.calendarSyncButtonText}>Add to Calendar</Text>
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
                            Alert.alert('Login required', 'Please log in to register for events.');
                            return;
                          }
                          registerMutation.mutate({ eventId: activeEvent.id });
                        }}
                        disabled={registerMutation.isPending}
                      >
                        <Text
                          style={[
                            styles.detailsRegisterButtonText,
                            isUserRegistered(activeEvent) && styles.detailsRegisterButtonTextActive,
                          ]}
                        >
                          {registerMutation.isPending
                            ? 'Updating...'
                            : isUserRegistered(activeEvent)
                            ? 'Cancel registration'
                            : 'Reserve your spot'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.detailsRegistrationClosed}>
                        <Text style={styles.detailsRegistrationClosedText}>Registration closed</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.detailsEmpty}>
                  <Text style={styles.detailsEmptyTitle}>Event unavailable</Text>
                  <Text style={styles.detailsEmptySubtitle}>
                    This event may have been removed or is no longer accessible.
                  </Text>
                  <TouchableOpacity
                    testID="dismiss-event-details-button"
                    style={styles.detailsDismissButton}
                    onPress={handleCloseDetails}
                  >
                    <Text style={styles.detailsDismissButtonText}>Go back</Text>
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
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity 
              onPress={() => {
                console.log('[Events] Create button pressed!');
                handleCreate();
              }} 
              disabled={createMutation.isPending}
              testID="submit-event-button"
            >
              <Text style={[styles.modalSubmitText, createMutation.isPending && styles.modalSubmitTextDisabled]}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {manageableChurches.length === 1 && (
              <View style={styles.churchContextBanner}>
                <ChurchIcon size={14} color={Colors.primary} />
                <Text style={styles.churchContextText}>
                  Posting to: {manageableChurches[0].name}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                testID="event-title-input"
                style={styles.textInput}
                placeholder="Give your event a name"
                placeholderTextColor={Colors.textPlaceholder}
                value={form.title}
                onChangeText={(text) => setForm(prev => ({ ...prev, title: text }))}
                maxLength={120}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                testID="event-description-input"
                style={[styles.textInput, styles.textArea]}
                placeholder="Tell people what this event is about..."
                placeholderTextColor={Colors.textPlaceholder}
                value={form.description}
                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Event Type</Text>
              <View style={styles.typesWrap}>
                {(Object.keys(eventTypeLabels) as EventType[]).map((key) => (
                  <TouchableOpacity
                    key={key}
                    testID={`type-${key}`}
                    style={[styles.typeChip, form.type === key && [styles.typeChipActive, { backgroundColor: eventTypeColors[key] }]]}
                    onPress={() => setForm(prev => ({ ...prev, type: key }))}
                  >
                    <View style={[styles.typeChipDot, { backgroundColor: form.type === key ? 'rgba(255,255,255,0.8)' : eventTypeColors[key] }]} />
                    <Text style={[styles.typeChipText, form.type === key && styles.typeChipTextActive]}>
                      {eventTypeLabels[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formDivider} />

            <View style={styles.inputGroup}>
              <Text style={styles.formSectionHeader}>Date & Time</Text>

              <View style={styles.dtCard}>
                <View style={styles.dtCardLabel}>
                  <View style={styles.dtCardDot} />
                  <Text style={styles.dtCardLabelText}>Starts</Text>
                </View>
                <View style={styles.dtCardFields}>
                  <TouchableOpacity
                    testID="event-start-date-picker"
                    style={[
                      styles.dtFieldButton,
                      showDatePicker.field === 'startDate' && styles.dtFieldButtonActive,
                    ]}
                    onPress={() => {
                      console.log('[Events] Start date picker pressed');
                      setShowDatePicker(prev =>
                        prev.field === 'startDate' ? { field: null, mode: 'date' } : { field: 'startDate', mode: 'date' }
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Calendar size={18} color={Colors.primary} />
                    <Text style={styles.dtFieldValue} numberOfLines={1}>
                      {formatDateDisplay(form.startDate)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="event-start-time-picker"
                    style={[
                      styles.dtFieldButtonCompact,
                      showDatePicker.field === 'startTime' && styles.dtFieldButtonActive,
                    ]}
                    onPress={() => {
                      console.log('[Events] Start time picker pressed');
                      setShowDatePicker(prev =>
                        prev.field === 'startTime' ? { field: null, mode: 'date' } : { field: 'startTime', mode: 'time' }
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Clock size={18} color={Colors.primary} />
                    <Text style={styles.dtFieldValue} numberOfLines={1}>
                      {formatTimeDisplay(form.startTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
                {(showDatePicker.field === 'startDate' || showDatePicker.field === 'startTime') && (
                  <View style={styles.inlinePickerContainer}>
                    {Platform.OS === 'web' ? (
                      <TextInput
                        testID="web-datetime-input"
                        style={styles.webDateInput}
                        value={
                          showDatePicker.field === 'startDate'
                            ? form.startDate.toISOString().split('T')[0]
                            : form.startTime.toTimeString().slice(0, 5)
                        }
                        placeholder={showDatePicker.mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
                        placeholderTextColor={Colors.textPlaceholder}
                        onChangeText={(value) => {
                          if (!showDatePicker.field) return;
                          const current = new Date(form[showDatePicker.field]);
                          if (showDatePicker.mode === 'date') {
                            const parts = value.split('-').map(Number);
                            if (parts.length === 3 && parts[0] > 2000) {
                              current.setFullYear(parts[0], parts[1] - 1, parts[2]);
                              setForm(prev => ({ ...prev, [showDatePicker.field!]: new Date(current) }));
                            }
                          } else {
                            const parts = value.split(':').map(Number);
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                              current.setHours(parts[0], parts[1]);
                              setForm(prev => ({ ...prev, [showDatePicker.field!]: new Date(current) }));
                            }
                          }
                        }}
                      />
                    ) : (
                      <DateTimePicker
                        testID="startDateTimePicker"
                        value={showDatePicker.field ? form[showDatePicker.field] : new Date()}
                        mode={showDatePicker.mode}
                        is24Hour={false}
                        onChange={(evt, date) => {
                          console.log('[Events] Start picker changed:', date);
                          if (Platform.OS === 'android') {
                            setShowDatePicker({ field: null, mode: 'date' });
                          }
                          if (date && showDatePicker.field) {
                            setForm(prev => ({ ...prev, [showDatePicker.field!]: date }));
                          }
                        }}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        style={Platform.OS === 'ios' ? styles.iosSpinnerPicker : undefined}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.pickerDoneButton}
                      onPress={closeDatePicker}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.dtConnector}>
                <View style={styles.dtConnectorLine} />
                <View style={styles.dtConnectorArrow}>
                  <Text style={styles.dtConnectorArrowText}>to</Text>
                </View>
                <View style={styles.dtConnectorLine} />
              </View>

              <View style={styles.dtCard}>
                <View style={styles.dtCardLabel}>
                  <View style={[styles.dtCardDot, styles.dtCardDotEnd]} />
                  <Text style={styles.dtCardLabelText}>Ends</Text>
                </View>
                <View style={styles.dtCardFields}>
                  <TouchableOpacity
                    testID="event-end-date-picker"
                    style={[
                      styles.dtFieldButton,
                      showDatePicker.field === 'endDate' && styles.dtFieldButtonActive,
                    ]}
                    onPress={() => {
                      console.log('[Events] End date picker pressed');
                      setShowDatePicker(prev =>
                        prev.field === 'endDate' ? { field: null, mode: 'date' } : { field: 'endDate', mode: 'date' }
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Calendar size={18} color={Colors.textTertiary} />
                    <Text style={styles.dtFieldValue} numberOfLines={1}>
                      {formatDateDisplay(form.endDate)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="event-end-time-picker"
                    style={[
                      styles.dtFieldButtonCompact,
                      showDatePicker.field === 'endTime' && styles.dtFieldButtonActive,
                    ]}
                    onPress={() => {
                      console.log('[Events] End time picker pressed');
                      setShowDatePicker(prev =>
                        prev.field === 'endTime' ? { field: null, mode: 'date' } : { field: 'endTime', mode: 'time' }
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Clock size={18} color={Colors.textTertiary} />
                    <Text style={styles.dtFieldValue} numberOfLines={1}>
                      {formatTimeDisplay(form.endTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
                {(showDatePicker.field === 'endDate' || showDatePicker.field === 'endTime') && (
                  <View style={styles.inlinePickerContainer}>
                    {Platform.OS === 'web' ? (
                      <TextInput
                        testID="web-datetime-input-end"
                        style={styles.webDateInput}
                        value={
                          showDatePicker.field === 'endDate'
                            ? form.endDate.toISOString().split('T')[0]
                            : form.endTime.toTimeString().slice(0, 5)
                        }
                        placeholder={showDatePicker.mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
                        placeholderTextColor={Colors.textPlaceholder}
                        onChangeText={(value) => {
                          if (!showDatePicker.field) return;
                          const current = new Date(form[showDatePicker.field]);
                          if (showDatePicker.mode === 'date') {
                            const parts = value.split('-').map(Number);
                            if (parts.length === 3 && parts[0] > 2000) {
                              current.setFullYear(parts[0], parts[1] - 1, parts[2]);
                              setForm(prev => ({ ...prev, [showDatePicker.field!]: new Date(current) }));
                            }
                          } else {
                            const parts = value.split(':').map(Number);
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                              current.setHours(parts[0], parts[1]);
                              setForm(prev => ({ ...prev, [showDatePicker.field!]: new Date(current) }));
                            }
                          }
                        }}
                      />
                    ) : (
                      <DateTimePicker
                        testID="endDateTimePicker"
                        value={showDatePicker.field ? form[showDatePicker.field] : new Date()}
                        mode={showDatePicker.mode}
                        is24Hour={false}
                        onChange={(evt, date) => {
                          console.log('[Events] End picker changed:', date);
                          if (Platform.OS === 'android') {
                            setShowDatePicker({ field: null, mode: 'date' });
                          }
                          if (date && showDatePicker.field) {
                            setForm(prev => ({ ...prev, [showDatePicker.field!]: date }));
                          }
                        }}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        style={Platform.OS === 'ios' ? styles.iosSpinnerPicker : undefined}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.pickerDoneButton}
                      onPress={closeDatePicker}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formDivider} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                testID="event-location-input"
                style={styles.textInput}
                placeholder="Where will this take place?"
                placeholderTextColor={Colors.textPlaceholder}
                value={form.location}
                onChangeText={(text) => setForm(prev => ({ ...prev, location: text }))}
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Attendees (optional)</Text>
              <TextInput
                testID="event-maxAttendees-input"
                style={styles.textInput}
                placeholder="Leave empty for unlimited"
                placeholderTextColor={Colors.textPlaceholder}
                value={form.maxAttendees ?? ''}
                onChangeText={(text) => setForm(prev => ({ ...prev, maxAttendees: text.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
              />
            </View>

            {manageableChurches.length > 1 && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Church Group</Text>
                <View style={styles.typesWrap}>
                  {manageableChurches.map((church) => (
                    <TouchableOpacity
                      key={church.id}
                      testID={`church-${church.id}`}
                      style={[styles.typeChip, form.groupId === church.id && styles.typeChipActive]}
                      onPress={() => setForm(prev => ({ ...prev, groupId: church.id }))}
                    >
                      <Text style={[styles.typeChipText, form.groupId === church.id && styles.typeChipTextActive]}>
                        {church.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.formDivider} />

            <View style={styles.switchGroup}>
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
                  testID="share-all-churches-toggle"
                  value={form.isSharedAllChurches}
                  onValueChange={(value) => setForm(prev => ({ ...prev, isSharedAllChurches: value }))}
                  trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                  thumbColor={form.isSharedAllChurches ? 'white' : '#f4f4f5'}
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
                <Text style={styles.createButtonBottomText}>Create Event</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>


        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: 60,
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
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
    padding: Spacing.xxl,
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  eventTypeBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'white',
  },
  registeredBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  registeredBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#16a34a',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  eventDescription: {
    fontSize: 14,
    color: Colors.textMuted,
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
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  registeredButton: {
    backgroundColor: Colors.success,
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  registeredButtonText: {
    color: 'white',
  },
  detailsButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
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
    backgroundColor: Colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  modalSubmitTextDisabled: {
    color: Colors.textPlaceholder,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.xxl,
  },
  inputGroup: {
    marginBottom: Spacing.xxl,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeChipActive: {
    borderColor: 'transparent',
  },
  typeChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  typeChipTextActive: {
    color: 'white',
    fontWeight: '600' as const,
  },
  formDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  formSectionHeader: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  dtCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dtCardLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  dtCardDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  dtCardDotEnd: {
    backgroundColor: Colors.textTertiary,
  },
  dtCardLabelText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dtCardFields: {
    flexDirection: 'row',
    gap: 10,
  },
  dtFieldButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50,
  },
  dtFieldButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 50,
  },
  dtFieldValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  dtConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dtConnectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dtConnectorArrow: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  dtConnectorArrowText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textPlaceholder,
    textTransform: 'lowercase',
  },
  churchContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  churchContextText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  switchGroup: {
    marginBottom: Spacing.xxl,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  switchDescription: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
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
    paddingVertical: 80,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textPlaceholder,
    textAlign: 'center',
  },
  inlinePickerContainer: {
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    overflow: 'hidden',
  },
  iosSpinnerPicker: {
    height: 216,
  },
  webDateInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    margin: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerDoneButton: {
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.primaryLight,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  dtFieldButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  createButtonBottom: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  createButtonBottomDisabled: {
    backgroundColor: Colors.textPlaceholder,
  },
  createButtonBottomText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'white',
  },
  sharedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sharedBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#6366f1',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },

});