import { Stack } from 'expo-router';
import {
  Calendar,
  Heart,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sun,
} from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  fetchNotificationPreferences,
  NotificationPreferences,
  saveNotificationPreferences,
} from '@/lib/notification-preferences';
import { useAuth } from '@/providers/auth-provider';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery<NotificationPreferences, Error>({
    queryKey: ['notification-preferences', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchNotificationPreferences(user!.id),
  });
  const preferences = preferencesQuery.data ?? DEFAULT_NOTIFICATION_PREFERENCES;

  const savePreferences = useMutation({
    mutationFn: (nextPreferences: NotificationPreferences) => {
      if (!user?.id) {
        throw new Error(t('notifications.mustBeLoggedIn'));
      }
      return saveNotificationPreferences(user.id, nextPreferences);
    },
    onSuccess: (savedPreferences) => {
      queryClient.setQueryData(['notification-preferences', user?.id], savedPreferences);
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      Alert.alert(
        t('notifications.preferencesSaveFailedTitle', {
          defaultValue: 'Preference not saved',
        }),
        t('notifications.preferencesSaveFailedMessage', {
          defaultValue: 'Please check your connection and try again.',
        })
      );
    },
  });

  const changePreference = (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    savePreferences.mutate({ ...preferences, [key]: value });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: t('notifications.title') }} />

      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('notifications.title')}</Text>
      </View>

      {preferencesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e3a8a" />
        </View>
      ) : preferencesQuery.isError ? (
        <View style={styles.center}>
          <RefreshCw size={42} color="#94a3b8" />
          <Text style={styles.errorTitle}>
            {t('notifications.failedToLoad')}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => void preferencesQuery.refetch()}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.preferencesTitle}>
            {t('notifications.preferencesTitle', { defaultValue: 'What you receive' })}
          </Text>
          <Text style={styles.preferencesSubtitle}>
            {t('notifications.preferencesSubtitle', {
              defaultValue: 'Choose the community updates you want to receive.',
            })}
          </Text>

          <View style={styles.preferencesCard}>
            <View style={styles.preferenceRow}>
              <View style={[styles.preferenceIcon, styles.eventIcon]}>
                <Calendar size={19} color="#2563eb" />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceLabel}>
                  {t('notifications.preferenceEvents', { defaultValue: 'Events' })}
                </Text>
                <Text style={styles.preferenceDescription}>
                  {t('notifications.preferenceEventsDescription', {
                    defaultValue: 'New church and shared events',
                  })}
                </Text>
              </View>
              <Switch
                value={preferences.events}
                onValueChange={(value) => changePreference('events', value)}
                disabled={savePreferences.isPending}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={preferences.events ? '#1d4ed8' : '#f8fafc'}
                accessibilityLabel={t('notifications.preferenceEvents')}
              />
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceRow}>
              <View style={[styles.preferenceIcon, styles.prayerIcon]}>
                <Heart size={19} color="#dc2626" />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceLabel}>
                  {t('notifications.preferencePrayers', { defaultValue: 'Prayer requests' })}
                </Text>
                <Text style={styles.preferenceDescription}>
                  {t('notifications.preferencePrayersDescription', {
                    defaultValue: 'New and answered prayer requests',
                  })}
                </Text>
              </View>
              <Switch
                value={preferences.prayers}
                onValueChange={(value) => changePreference('prayers', value)}
                disabled={savePreferences.isPending}
                trackColor={{ false: '#cbd5e1', true: '#fca5a5' }}
                thumbColor={preferences.prayers ? '#dc2626' : '#f8fafc'}
                accessibilityLabel={t('notifications.preferencePrayers')}
              />
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceRow}>
              <View style={[styles.preferenceIcon, styles.sabbathIcon]}>
                <Sun size={19} color="#b45309" />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceLabel}>
                  {t('notifications.preferenceSabbaths', { defaultValue: 'Sabbath updates' })}
                </Text>
                <Text style={styles.preferenceDescription}>
                  {t('notifications.preferenceSabbathsDescription', {
                    defaultValue: 'Published and changed Sabbath programs',
                  })}
                </Text>
              </View>
              <Switch
                value={preferences.sabbathUpdates}
                onValueChange={(value) => changePreference('sabbathUpdates', value)}
                disabled={savePreferences.isPending}
                trackColor={{ false: '#cbd5e1', true: '#fcd34d' }}
                thumbColor={preferences.sabbathUpdates ? '#b45309' : '#f8fafc'}
                accessibilityLabel={t('notifications.preferenceSabbaths')}
              />
            </View>

            <View style={styles.preferenceDivider} />

            <View style={styles.preferenceRow}>
              <View style={[styles.preferenceIcon, styles.announcementIcon]}>
                <MessageCircle size={19} color="#047857" />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={styles.preferenceLabel}>
                  {t('notifications.preferenceAnnouncements', {
                    defaultValue: 'Church announcements',
                  })}
                </Text>
                <Text style={styles.preferenceDescription}>
                  {t('notifications.preferenceAnnouncementsDescription', {
                    defaultValue: 'General community announcements',
                  })}
                </Text>
              </View>
              <Switch
                value={preferences.churchAnnouncements}
                onValueChange={(value) => changePreference('churchAnnouncements', value)}
                disabled={savePreferences.isPending}
                trackColor={{ false: '#cbd5e1', true: '#6ee7b7' }}
                thumbColor={preferences.churchAnnouncements ? '#047857' : '#f8fafc'}
                accessibilityLabel={t('notifications.preferenceAnnouncements')}
              />
            </View>
          </View>

          <View style={styles.alwaysOnCard}>
            <ShieldCheck size={18} color="#1e3a8a" />
            <Text style={styles.alwaysOnText}>
              {t('notifications.alwaysOnMessage', {
                defaultValue:
                  'Personal assignments, replacement requests, and account notices always stay enabled.',
              })}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 44,
  },
  preferencesTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  preferencesSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 14,
  },
  preferencesCard: {
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  preferenceRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  preferenceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIcon: { backgroundColor: '#eff6ff' },
  prayerIcon: { backgroundColor: '#fef2f2' },
  sabbathIcon: { backgroundColor: '#fffbeb' },
  announcementIcon: { backgroundColor: '#ecfdf5' },
  preferenceCopy: { flex: 1 },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  preferenceDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
    marginTop: 2,
  },
  preferenceDivider: {
    height: 1,
    backgroundColor: '#eef2f7',
    marginLeft: 63,
  },
  alwaysOnCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    padding: 12,
    marginTop: 12,
  },
  alwaysOnText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#334155',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  retryButton: {
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 16,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
});
