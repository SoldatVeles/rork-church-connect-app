import { Platform, Linking, Alert } from 'react-native';
import * as Calendar from 'expo-calendar';
import type { Event } from '@/types/event';

export async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getDefaultCalendarId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    const defaultCalendar = calendars.find(
      (cal) =>
        cal.allowsModifications &&
        (cal.isPrimary || cal.source?.name === 'Default')
    );

    if (defaultCalendar) {
      return defaultCalendar.id;
    }

    const modifiableCalendar = calendars.find((cal) => cal.allowsModifications);
    return modifiableCalendar?.id ?? null;
  } catch (error) {
    console.error('[Calendar] Error getting calendars:', error);
    return null;
  }
}

export async function addEventToCalendar(event: Event): Promise<boolean> {
  if (Platform.OS === 'web') {
    return addEventToCalendarWeb(event);
  }

  try {
    const hasPermission = await requestCalendarPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Calendar access is needed to add events. Please enable it in settings.'
      );
      return false;
    }

    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      Alert.alert('Error', 'Could not find a calendar to add the event to.');
      return false;
    }

    const startDate = new Date(event.date);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate,
      endDate,
      location: event.location,
      notes: event.description,
      alarms: [{ relativeOffset: -60 }],
    });

    Alert.alert('Success', `"${event.title}" has been added to your calendar.`);
    return true;
  } catch (error) {
    console.error('[Calendar] Error adding event:', error);
    Alert.alert('Error', 'Failed to add event to calendar. Please try again.');
    return false;
  }
}

function addEventToCalendarWeb(event: Event): boolean {
  try {
    const startDate = new Date(event.date);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
    };

    const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalendarUrl.searchParams.set('action', 'TEMPLATE');
    googleCalendarUrl.searchParams.set('text', event.title);
    googleCalendarUrl.searchParams.set('dates', `${formatDate(startDate)}/${formatDate(endDate)}`);
    googleCalendarUrl.searchParams.set('details', event.description);
    googleCalendarUrl.searchParams.set('location', event.location);

    Linking.openURL(googleCalendarUrl.toString());
    return true;
  } catch (error) {
    console.error('[Calendar] Error opening Google Calendar:', error);
    Alert.alert('Error', 'Failed to open calendar. Please try again.');
    return false;
  }
}

export function generateICSContent(event: Event): string {
  const startDate = new Date(event.date);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
  };

  const escapeICS = (text: string) => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Church App//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@churchapp`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
    `LOCATION:${escapeICS(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
