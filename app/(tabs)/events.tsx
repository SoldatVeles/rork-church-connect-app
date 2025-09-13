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
import { trpc } from '@/lib/trpc';

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
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<EventType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    startDate: Date;
    startTime: Date;
    endDate: Date | null;
    endTime: Date | null;
    location: string;
    type: EventType;
    maxAttendees?: string;
  }>({
    title: '',
    description: '',
    startDate: new Date(),
    startTime: new Date(),
    endDate: null,
    endTime: null,
    location: '',
    type: 'sabbath',
    maxAttendees: '',
  });

  const [showDatePicker, setShowDatePicker] = useState<'startDate' | 'startTime' | 'endDate' | 'endTime' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const utils = trpc.useUtils();

  const listQuery = trpc.events.list.useQuery({}, { suspense: false });

  const registerMutation = trpc.events.register.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
    },
    onError: (error) => {
      Alert.alert('Error', error.message ?? 'Failed to register');
    },
  });

  const unregisterMutation = trpc.events.unregister.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
    },
    onError: (error) => {
      Alert.alert('Error', error.message ?? 'Failed to cancel registration');
    },
  });

  const createMutation = trpc.events.create.useMutation({
    onSuccess: (data) => {
      console.log('[Events] Event created successfully:', data);
      utils.events.list.invalidate();
      setForm({ 
        title: '', 
        description: '', 
        startDate: new Date(), 
        startTime: new Date(), 
        endDate: null, 
        endTime: null, 
        location: '', 
        type: 'sabbath', 
        maxAttendees: '' 
      });
      setShowAddModal(false);
      Alert.alert('Success', data.message || 'Event has been created successfully!');
    },
    onError: (error) => {
      console.error('[Events] Error creating event:', error);
      console.error('[Events] Error details:', {
        message: error.message,
        data: error.data,
        shape: error.shape,
      });
      Alert.alert('Error', error.message ?? 'Failed to create event. Please try again.');
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

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create an event');
      return;
    }

    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      Alert.alert('Error', 'Please fill in title, description, and location');
      return;
    }

    try {
      console.log('[Events] Starting event creation...');
      console.log('[Events] Form data:', {
        title: form.title,
        description: form.description,
        startDate: form.startDate,
        startTime: form.startTime,
        endDate: form.endDate,
        endTime: form.endTime,
        location: form.location,
        type: form.type,
        maxAttendees: form.maxAttendees
      });

      console.log('[Events] Proceeding with event creation...');

      // Combine start date and time
      const startDateTime = new Date(form.startDate);
      startDateTime.setHours(form.startTime.getHours(), form.startTime.getMinutes(), 0, 0);

      // Combine end date and time if provided
      let endDateTime: Date | undefined;
      if (form.endDate && form.endTime) {
        endDateTime = new Date(form.endDate);
        endDateTime.setHours(form.endTime.getHours(), form.endTime.getMinutes(), 0, 0);
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        date: startDateTime.toISOString(),
        endDate: endDateTime ? endDateTime.toISOString() : undefined,
        location: form.location.trim(),
        type: form.type,
        maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : undefined,
        createdBy: user.id,
      };

      if (payload.maxAttendees !== undefined && Number.isNaN(payload.maxAttendees)) {
        Alert.alert('Error', 'Max attendees must be a number');
        return;
      }

      console.log('[Events] Payload to send:', payload);
      const result = await createMutation.mutateAsync(payload);
      console.log('[Events] Event created successfully:', result);
    } catch (error) {
      console.error('[Events] Error in handleCreate:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    }
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
            onPress={() => {
              console.log('[Events] + pressed');
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
                  disabled={registerMutation.isPending || unregisterMutation.isPending}
                  onPress={() => {
                    if (!user?.id) {
                      Alert.alert('Login required', 'Please log in to register for events.');
                      return;
                    }
                    if (isUserRegistered(event)) {
                      unregisterMutation.mutate({ eventId: event.id, userId: user.id });
                    } else {
                      registerMutation.mutate({ eventId: event.id, userId: user.id });
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.registerButtonText,
                      isUserRegistered(event) && styles.registeredButtonText,
                    ]}
                  >
                    {(registerMutation.isPending || unregisterMutation.isPending)
                      ? 'Please wait...'
                      : (isUserRegistered(event) ? 'Registered • Tap to cancel' : 'Register')}
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
        onShow={() => console.log('[Events] Modal shown')}
        onRequestClose={() => {
          console.log('[Events] Modal request close');
          setShowAddModal(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer} testID="event-modal">
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} testID="event-cancel-button">
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Event</Text>
            <TouchableOpacity 
              onPress={handleCreate} 
              disabled={createMutation.isPending}
              testID="submit-event-button"
              style={createMutation.isPending ? styles.disabledButton : undefined}
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
              <Text style={styles.inputLabel}>Start Date *</Text>
              <TouchableOpacity
                testID="event-startDate-picker"
                style={styles.datePickerButton}
                onPress={() => {
                  console.log('[Events] Start Date picker pressed');
                  setTempDate(form.startDate);
                  setShowDatePicker('startDate');
                }}
              >
                <Calendar size={20} color="#1e3a8a" />
                <Text style={styles.datePickerText}>
                  {form.startDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Time *</Text>
              <TouchableOpacity
                testID="event-startTime-picker"
                style={styles.datePickerButton}
                onPress={() => {
                  console.log('[Events] Start Time picker pressed');
                  setTempDate(form.startTime);
                  setShowDatePicker('startTime');
                }}
              >
                <Clock size={20} color="#1e3a8a" />
                <Text style={styles.datePickerText}>
                  {form.startTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>End Date (Optional)</Text>
              <TouchableOpacity
                testID="event-endDate-picker"
                style={styles.datePickerButton}
                onPress={() => {
                  console.log('[Events] End Date picker pressed');
                  setTempDate(form.endDate || new Date(form.startDate.getTime() + 24 * 60 * 60 * 1000));
                  setShowDatePicker('endDate');
                }}
              >
                <Calendar size={20} color={form.endDate ? "#1e3a8a" : "#94a3b8"} />
                <Text style={[styles.datePickerText, !form.endDate && styles.datePickerPlaceholder]}>
                  {form.endDate ? (
                    form.endDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  ) : (
                    'Tap to set end date'
                  )}
                </Text>
                {form.endDate && (
                  <TouchableOpacity
                    onPress={() => {
                      setForm(prev => ({ ...prev, endDate: null, endTime: null }));
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            {form.endDate && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End Time</Text>
                <TouchableOpacity
                  testID="event-endTime-picker"
                  style={styles.datePickerButton}
                  onPress={() => {
                    console.log('[Events] End Time picker pressed');
                    setTempDate(form.endTime || new Date(form.startTime.getTime() + 2 * 60 * 60 * 1000));
                    setShowDatePicker('endTime');
                  }}
                >
                  <Clock size={20} color={form.endTime ? "#1e3a8a" : "#94a3b8"} />
                  <Text style={[styles.datePickerText, !form.endTime && styles.datePickerPlaceholder]}>
                    {form.endTime ? (
                      form.endTime.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })
                    ) : (
                      'Tap to set end time'
                    )}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

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
                {(Object.keys(eventTypeLabels) as Array<keyof typeof eventTypeLabels>).map((key) => (
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

          {Platform.OS !== 'web' && showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={tempDate}
              mode={showDatePicker === 'startDate' || showDatePicker === 'endDate' ? 'date' : 'time'}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                console.log('[DatePicker] onChange called:', { event, selectedDate, showDatePicker });
                
                if (Platform.OS === 'android') {
                  setShowDatePicker(null);
                }
                
                if (selectedDate) {
                  setTempDate(selectedDate);
                  
                  if (Platform.OS === 'android') {
                    if (showDatePicker === 'startDate') {
                      setForm(prev => ({ ...prev, startDate: selectedDate }));
                    } else if (showDatePicker === 'startTime') {
                      setForm(prev => ({ ...prev, startTime: selectedDate }));
                    } else if (showDatePicker === 'endDate') {
                      setForm(prev => ({ ...prev, endDate: selectedDate }));
                    } else if (showDatePicker === 'endTime') {
                      setForm(prev => ({ ...prev, endTime: selectedDate }));
                    }
                  }
                }
              }}
            />
          )}

          {Platform.OS === 'web' && showDatePicker && (
            <View style={styles.webDatePickerContainer}>
              <View style={styles.webDatePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(null)}
                  style={styles.webDatePickerButton}
                >
                  <Text style={styles.webDatePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.webDatePickerTitle}>
                  {showDatePicker === 'startDate' ? 'Select Start Date' :
                   showDatePicker === 'startTime' ? 'Select Start Time' :
                   showDatePicker === 'endDate' ? 'Select End Date' :
                   'Select End Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (showDatePicker === 'startDate') {
                      setForm(prev => ({ ...prev, startDate: tempDate }));
                    } else if (showDatePicker === 'startTime') {
                      setForm(prev => ({ ...prev, startTime: tempDate }));
                    } else if (showDatePicker === 'endDate') {
                      setForm(prev => ({ ...prev, endDate: tempDate }));
                    } else if (showDatePicker === 'endTime') {
                      setForm(prev => ({ ...prev, endTime: tempDate }));
                    }
                    setShowDatePicker(null);
                  }}
                  style={styles.webDatePickerButton}
                >
                  <Text style={[styles.webDatePickerButtonText, styles.webDatePickerDoneText]}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.webDatePickerContent}>
                {(showDatePicker === 'startDate' || showDatePicker === 'endDate') ? (
                  <input
                    type="date"
                    value={tempDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value + 'T00:00:00');
                      setTempDate(newDate);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc'
                    }}
                  />
                ) : (
                  <input
                    type="time"
                    value={tempDate.toTimeString().slice(0, 5)}
                    onChange={(e) => {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(tempDate);
                      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      setTempDate(newDate);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc'
                    }}
                  />
                )}
              </View>
            </View>
          )}

          {Platform.OS === 'ios' && showDatePicker && (
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(null)}
                  style={styles.iosDatePickerButton}
                >
                  <Text style={styles.iosDatePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (showDatePicker === 'startDate') {
                      setForm(prev => ({ ...prev, startDate: tempDate }));
                    } else if (showDatePicker === 'startTime') {
                      setForm(prev => ({ ...prev, startTime: tempDate }));
                    } else if (showDatePicker === 'endDate') {
                      setForm(prev => ({ ...prev, endDate: tempDate }));
                    } else if (showDatePicker === 'endTime') {
                      setForm(prev => ({ ...prev, endTime: tempDate }));
                    }
                    setShowDatePicker(null);
                  }}
                  style={styles.iosDatePickerButton}
                >
                  <Text style={[styles.iosDatePickerButtonText, styles.iosDatePickerDoneText]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
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
  datePickerButton: {
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
  datePickerText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  datePickerPlaceholder: {
    color: '#94a3b8',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ef4444',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  iosDatePickerContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  iosDatePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iosDatePickerButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  iosDatePickerDoneText: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  webDatePickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  webDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minWidth: 300,
  },
  webDatePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  webDatePickerContent: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    minWidth: 300,
  },
  webDatePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  webDatePickerButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  webDatePickerDoneText: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
});