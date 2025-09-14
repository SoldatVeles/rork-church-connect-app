import { StatusBar } from 'expo-status-bar';
import { Calendar, MapPin, Users, Plus, Clock, AlertCircle } from 'lucide-react-native';
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
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/providers/auth-provider';
import type { Event, EventType } from '@/types/event';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const eventTypeColors: Record<EventType, string> = {
  sabbath: '#3b82f6',
  prayer_meeting: '#ef4444',
  bible_study: '#10b981',
  youth: '#f59e0b',
  special: '#8b5cf6',
  conference: '#06b6d4',
};

const eventTypeLabels: Record<EventType, string> = {
  sabbath: 'Sabbath',
  prayer_meeting: 'Prayer',
  bible_study: 'Bible Study',
  youth: 'Youth',
  special: 'Special',
  conference: 'Conference',
};

export default function EventsScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  console.log('[Events] Auth state:', { user: user?.id, isAuthenticated, isLoading });
  const [selectedFilter, setSelectedFilter] = useState<EventType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
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
    type: 'sabbath',
    maxAttendees: '',
  });

  const [showDatePicker, setShowDatePicker] = useState<{
    field: 'startDate' | 'startTime' | 'endDate' | 'endTime' | null;
    mode: 'date' | 'time';
  }>({ field: null, mode: 'date' });

  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      console.log('[Events] listQuery fetching events (attempt 1: split date/time schema)');
      const attemptSplit = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });

      if (!attemptSplit.error) {
        const data = attemptSplit.data as any[];
        return data.map((event: any) => {
          const startDateTime = new Date(`${event.start_date}T${event.start_time ?? '00:00:00'}`);
          const endDateTime = event.end_date && event.end_time
            ? new Date(`${event.end_date}T${event.end_time}`)
            : undefined;

          return {
            id: event.id,
            title: event.title,
            description: event.description ?? '',
            date: startDateTime,
            endDate: endDateTime,
            location: event.location ?? '',
            type: (event.category ?? event.event_type ?? 'sabbath') as EventType,
            maxAttendees: event.max_attendees ?? undefined,
            currentAttendees: event.current_attendees ?? 0,
            registeredUsers: (event.registered_users ?? []) as string[],
            isRegistrationOpen: event.is_registration_open ?? true,
            createdBy: event.created_by,
            imageUrl: event.image_url ?? undefined,
            createdAt: new Date(event.created_at ?? new Date().toISOString()),
          } as Event;
        });
      }

      const err1 = attemptSplit.error as any;
      console.warn('[Events] listQuery attempt 1 failed:', err1?.code, err1?.message);
      console.log('[Events] listQuery fetching events (attempt 2: unified start_at/end_at schema)');

      const attemptUnified = await supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });

      if (attemptUnified.error) {
        const err2 = attemptUnified.error as any;
        console.error('[Events] listQuery failed for both schemas:', { err1, err2 });
        throw new Error(err2.message ?? 'Failed to load events');
      }

      const data = attemptUnified.data as any[];
      return data.map((event: any) => {
        const start = new Date(event.start_at);
        const end = event.end_at ? new Date(event.end_at) : undefined;
        return {
          id: event.id,
          title: event.title,
          description: event.description ?? '',
          date: start,
          endDate: end,
          location: event.location ?? '',
          type: (event.event_type ?? 'sabbath') as EventType,
          maxAttendees: event.max_attendees ?? undefined,
          currentAttendees: event.current_attendees ?? 0,
          registeredUsers: (event.registered_users ?? []) as string[],
          isRegistrationOpen: event.is_registration_open ?? true,
          createdBy: event.created_by,
          imageUrl: event.image_url ?? undefined,
          createdAt: new Date(event.created_at ?? new Date().toISOString()),
        } as Event;
      });
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

      const pad2 = (n: number) => String(n).padStart(2, '0');
      const formatDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
      const formatTime = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`;

      const splitInsert = {
        title: eventData.title,
        description: eventData.description,
        start_date: formatDate(eventData.startDate),
        start_time: formatTime(eventData.startTime),
        end_date: formatDate(eventData.endDate),
        end_time: formatTime(eventData.endTime),
        location: eventData.location,
        category: eventData.type,
        max_attendees: eventData.maxAttendees ?? null,
        created_by: eventData.createdBy,
      } as const;

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
      const unifiedInsert = {
        title: eventData.title,
        description: eventData.description,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        location: eventData.location,
        event_type: eventData.type,
        max_attendees: eventData.maxAttendees ?? null,
        created_by: eventData.createdBy,
        is_registration_open: true,
      } as const;

      console.log('[Events] Trying insert (attempt 1: split date/time schema):', splitInsert);
      const attempt1 = await supabase
        .from('events')
        .insert(splitInsert)
        .select()
        .single();

      if (!attempt1.error) {
        console.log('[Events] Insert attempt 1 succeeded');
        return attempt1.data;
      }

      const e1: any = attempt1.error;
      console.warn('[Events] Insert attempt 1 failed:', e1?.code, e1?.message);
      console.log('[Events] Trying insert (attempt 2: unified start_at/end_at schema):', unifiedInsert);

      const attempt2 = await supabase
        .from('events')
        .insert(unifiedInsert)
        .select()
        .single();

      if (attempt2.error) {
        const e2: any = attempt2.error;
        console.error('[Events] Both insert attempts failed:', { e1, e2 });
        throw new Error(e2?.message ?? 'Failed to create event');
      }

      return attempt2.data;
    },
    onSuccess: (data) => {
      console.log('[Events] Mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      const now = new Date();
      setForm({
        title: '',
        description: '',
        startDate: now,
        startTime: now,
        endDate: now,
        endTime: now,
        location: '',
        type: 'sabbath',
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

  const allEvents: Event[] = listQuery.data ?? [];

  const events = useMemo(() => {
    if (selectedFilter === 'all') return allEvents;
    return allEvents.filter(e => e.type === selectedFilter);
  }, [allEvents, selectedFilter]);

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
    return event.registeredUsers.includes(user?.id || '');
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

  const filters: { key: EventType | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sabbath', label: 'Sabbath' },
    { key: 'prayer_meeting', label: 'Prayer' },
    { key: 'youth', label: 'Youth' },
    { key: 'special', label: 'Special' },
  ];

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
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              testID={`filter-${filter.key}`}
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
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
                    Alert.alert('Info', 'Event registration will be available soon!');
                  }}
                >
                  <Text
                    style={[
                      styles.registerButtonText,
                      isUserRegistered(event) && styles.registeredButtonText,
                    ]}
                  >
                    {isUserRegistered(event) ? 'Registered' : 'Register'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>View Details</Text>
              </TouchableOpacity>
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
    backgroundColor: '#1e3a8a',
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
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  },
});