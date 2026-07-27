import Constants from 'expo-constants';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, Mail, Settings2, Smartphone } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import LanguageSelector from '@/components/LanguageSelector';
import { getWebsiteDisplayUrl, getWebsiteUrl } from '@/lib/website-url';

type SettingsRowProps = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function SettingsRow({ icon: Icon, title, subtitle, onPress }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Icon size={20} color="#1e3a8a" />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <ExternalLink size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

export default function AppSettingsScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        t('appSettings.openFailedTitle', { defaultValue: 'Settings could not be opened' }),
        t('appSettings.openFailedMessage', {
          defaultValue: 'Open your phone settings and select Church Connect.',
        })
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: t('appSettings.title', { defaultValue: 'App Settings' }),
          headerBackTitle: t('common.back', { defaultValue: 'Back' }),
        }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Settings2 size={30} color="#1e3a8a" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {t('appSettings.experienceTitle', { defaultValue: 'Your app experience' })}
            </Text>
            <Text style={styles.heroText}>
              {t('appSettings.experienceMessage', {
                defaultValue: 'Choose your language and manage device permissions in one place.',
              })}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {t('appSettings.languageSection', { defaultValue: 'Language' })}
        </Text>
        <View style={styles.languageCard}>
          <LanguageSelector variant="profile" />
        </View>

        <Text style={styles.sectionTitle}>
          {t('appSettings.deviceSection', { defaultValue: 'Device' })}
        </Text>
        <View style={styles.card}>
          <SettingsRow
            icon={Smartphone}
            title={t('appSettings.devicePermissions', { defaultValue: 'Device permissions' })}
            subtitle={t('appSettings.devicePermissionsSubtitle', {
              defaultValue: 'Manage notifications, calendar, photos, and location.',
            })}
            onPress={() => void openSystemSettings()}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {t('appSettings.helpSection', { defaultValue: 'Help & information' })}
        </Text>
        <View style={styles.card}>
          <SettingsRow
            icon={ExternalLink}
            title={t('appSettings.website', { defaultValue: 'Open church website' })}
            subtitle={getWebsiteDisplayUrl()}
            onPress={() => void WebBrowser.openBrowserAsync(getWebsiteUrl())}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={Mail}
            title={t('appSettings.contactSupport', { defaultValue: 'Contact support' })}
            subtitle="info@sdarm.ch"
            onPress={() => void Linking.openURL('mailto:info@sdarm.ch?subject=Church%20Connect')}
          />
        </View>

        <View style={styles.versionCard}>
          <Text style={styles.versionLabel}>Church Connect</Text>
          <Text style={styles.versionText}>
            {t('appSettings.version', { defaultValue: 'Version {{version}}', version })}
          </Text>
        </View>

        <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
          <Text style={styles.doneButtonText}>
            {t('common.done', { defaultValue: 'Done' })}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 48 },
  hero: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    marginBottom: 26,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 5 },
  heroText: { fontSize: 14, lineHeight: 20, color: '#475569' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
    marginLeft: 2,
  },
  languageCard: { marginBottom: 24 },
  card: {
    borderRadius: 16,
    backgroundColor: 'white',
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  rowSubtitle: { fontSize: 13, lineHeight: 18, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#eef2f7', marginLeft: 70 },
  versionCard: { alignItems: 'center', paddingVertical: 18 },
  versionLabel: { fontSize: 15, fontWeight: '800', color: '#334155' },
  versionText: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  doneButton: { alignItems: 'center', paddingVertical: 14 },
  doneButtonText: { color: '#1e3a8a', fontSize: 15, fontWeight: '800' },
});
