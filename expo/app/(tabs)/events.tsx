import { StatusBar } from 'expo-status-bar';
import { Calendar, MapPin, Users, Plus, Clock, AlertCircle, X, CalendarPlus } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
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

const eventTypeLabels: Record<EventType, string> = {
  bible_study: 'Bible Study',
  youth: 'Youth',
  special: 'Special',
  conference: 'Conference',
};

const normalizeEventType = (value: unknown): EventType | null => {
  if (value === 'sabbath') {
    return null;
  }
  if (allowedEventTypes.includes(value as EventType)) {
    return value as EventType;
  }
  console.log('[Events] Normalized unexpected event type to bible_study:', value);
  return 'bible_study';
};

const fallbackEventImage = 'https://images.unsplash.com/photo-1530023367847-a683933f4177?w=1200&q=80&auto=format&fit=crop' as const;

export default function EventsScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { currentChurch } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = isAdmin(user);
  
  console.log('[Events] Auth state:', { user: user?.id, isAuthenticated, isLoading, churchId: currentChurchId });
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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      console.log('[Events] Fetching events from database, churchId:', currentChurchId);
      
      let query = supabase
        .from('events')
        .select('*')
        .neq('event_type', 'sabbath')
        .order('start_at', { ascending: true });

      if (!userIsAdmin && currentChurchId) {
        query = query.eq('group_id', currentChurchId);
      } else if (!userIsAdmin && !currentChurchId) {
        console.log('[Events] Non-admin user has no church, returning empty');
        return [];
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Events] Failed to fetch events:', error);
        throw new Error(error.message ?? 'Failed to load events');
      }

      console.log('[Events] Fetched events:', data);
      
      const sanitizedEvents = (data as any[])
        .map((event: any) => {
          // Prefer event_type over the legacy `type` column, since the
          // `type` column has a DB default of 'sabbath' and would otherwise
          // make newly-created events look like sabbath entries.
          const rawType = (event.event_type ?? event.type ?? 'bible_study') as string;

          if (rawType === 'prayer_meeting' || rawType === 'sabbath') {
            console.log('[Events] Skipping non-event entry in events feed:', event.id, rawType);
            return null;
          }

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
        .filter((item): item is Event => item !== null);

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
        // Set BOTH columns to keep legacy `type` (which defaults to 'sabbath')
        // in sync with the canonical event_type field. Otherwise new events
        // get filtered out as sabbath entries.
        type: eventData.type,
        event_type: eventData.type,
        max_attendees: eventData.maxAttendees ?? null,
        created_by: eventData.createdBy,
        is_registration_open: true,
        current_attendees: 0,
        registered_users: [],
        group_id: currentChurchId,
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
    onSuccess: async () => {
      console.log('[Events] Mutation success, invalidating + refetching events');
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await listQuery.refetch();
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
        maxAttendees: ''
      });
      setShowAddModal(false);
      Alert.alert('Success', 'Event has been created successfully!');
    },
    onError: (error) => {
      console.error('[Events] Mutation error:', error);
      Alert.alert('Error', (error as Error).message ?? 'Failed to create event. Please try again.');
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

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                testID="event-title-input"
                style={styles.textInput}
                placeholder="Event title"
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
                placeholder="Describe the event"
                value={form.description}
                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Date</Text>
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
              <Text style={styles.inputLabel}>Start Time</Text>
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
              <Text style={styles.inputLabel}>End Date</Text>
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
              <Text style={styles.inputLabel}>End Time</Text>
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
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                testID="event-location-input"
                style={styles.textInput}
                placeholder="Where is it?"
                value={form.location}
                onChangeText={(text) => setForm(prev => ({ ...prev, location: text }))}
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Event Type</Text>
              <View style={styles.typesWrap}>
                {(Object.keys(eventTypeLabels) as EventType[]).map((key) => (
                  <TouchableOpacity
                    key={key}
                    testID={`type-${key}`}
                    style={[styles.typeChip, form.type === key && styles.typeChipActive]}
                    onPress={() => setForm(prev => ({ ...prev, type: key }))}
                  >
                    <Text style={[styles.typeChipText, form.type === key && styles.typeChipTextActive]}>
                      {eventTypeLabels[key]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Attendees (optional)</Text>
              <TextInput
                testID="event-maxAttendees-input"
                style={styles.textInput}
                placeholder="e.g. 100"
                value={form.maxAttendees ?? ''}
                onChangeText={(text) => setForm(prev => ({ ...prev, maxAttendees: text.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
              />
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
                {createMutation.isPending ? 'Creating Event...' : 'Create Event'}
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
                        <Text style={styles.datePickerCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.datePickerTitle}>
                        Select {showDatePicker.mode === 'date' ? 'Date' : 'Time'}
                      </Text>
                      <TouchableOpacity onPress={closeDatePicker}>
                        <Text style={styles.datePickerDone}>Done</Text>
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
                        Select {showDatePicker.mode === 'date' ? 'Date' : 'Time'}
                      </Text>
                      <TouchableOpacity onPress={closeDatePicker}>
                        <Text style={styles.datePickerDone}>Done</Text>
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
});