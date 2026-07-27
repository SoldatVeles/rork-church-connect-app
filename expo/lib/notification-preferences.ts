import { supabase } from '@/lib/supabase';

export type NotificationPreferences = {
  events: boolean;
  prayers: boolean;
  sabbathUpdates: boolean;
  churchAnnouncements: boolean;
};

export type PreferenceAwareNotification = {
  type?: string | null;
  title_key?: string | null;
  user_id?: string | null;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  events: true,
  prayers: true,
  sabbathUpdates: true,
  churchAnnouncements: true,
};

export async function fetchNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('events, prayers, sabbath_updates, church_announcements')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  return {
    events: data.events !== false,
    prayers: data.prayers !== false,
    sabbathUpdates: data.sabbath_updates !== false,
    churchAnnouncements: data.church_announcements !== false,
  };
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: userId,
        events: preferences.events,
        prayers: preferences.prayers,
        sabbath_updates: preferences.sabbathUpdates,
        church_announcements: preferences.churchAnnouncements,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('events, prayers, sabbath_updates, church_announcements')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    events: data.events !== false,
    prayers: data.prayers !== false,
    sabbathUpdates: data.sabbath_updates !== false,
    churchAnnouncements: data.church_announcements !== false,
  };
}

function isPersonalSabbathNotice(
  notification: PreferenceAwareNotification,
  currentUserId: string
): boolean {
  if (notification.type !== 'sabbath' || notification.user_id !== currentUserId) {
    return false;
  }

  const titleKey = notification.title_key ?? '';

  return (
    titleKey.includes('assignment') ||
    titleKey.includes('replacement') ||
    titleKey.includes('cancelled')
  );
}

export function isNotificationEnabled(
  notification: PreferenceAwareNotification,
  preferences: NotificationPreferences,
  currentUserId: string
): boolean {
  if (isPersonalSabbathNotice(notification, currentUserId)) {
    return true;
  }

  switch (notification.type) {
    case 'event':
      return preferences.events;
    case 'prayer':
      return preferences.prayers;
    case 'sabbath':
      return preferences.sabbathUpdates;
    case 'announcement':
      return preferences.churchAnnouncements;
    default:
      return true;
  }
}
