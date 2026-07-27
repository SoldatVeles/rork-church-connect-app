import { Stack, router } from 'expo-router';
import { Eye, EyeOff, ExternalLink, Lock, ShieldCheck, UserRoundCheck } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { getWebsiteUrl } from '@/lib/website-url';
import { useAuth } from '@/providers/auth-provider';
import { translateAuthError } from '@/utils/auth-errors';

export default function PrivacySecurityScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePassword = async () => {
    const nextPassword = password.trim();
    const confirmation = confirmPassword.trim();

    if (nextPassword.length < 8) {
      Alert.alert(
        t('privacySecurity.passwordTooShortTitle', { defaultValue: 'Password too short' }),
        t('privacySecurity.passwordTooShortMessage', {
          defaultValue: 'Use at least 8 characters for your new password.',
        })
      );
      return;
    }

    if (nextPassword !== confirmation) {
      Alert.alert(
        t('privacySecurity.passwordMismatchTitle', { defaultValue: 'Passwords do not match' }),
        t('privacySecurity.passwordMismatchMessage', {
          defaultValue: 'Enter the same password in both fields.',
        })
      );
      return;
    }

    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    setIsUpdating(false);

    if (error) {
      Alert.alert(
        t('privacySecurity.updateFailedTitle', { defaultValue: 'Password not changed' }),
        translateAuthError(error, t)
      );
      return;
    }

    setPassword('');
    setConfirmPassword('');
    Alert.alert(
      t('privacySecurity.updatedTitle', { defaultValue: 'Password changed' }),
      t('privacySecurity.updatedMessage', {
        defaultValue: 'Your new password is active now.',
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: t('privacySecurity.title', { defaultValue: 'Privacy & Security' }),
          headerBackTitle: t('common.back', { defaultValue: 'Back' }),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <ShieldCheck size={30} color="#1e3a8a" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>
                {t('privacySecurity.protectedTitle', { defaultValue: 'Your account is protected' })}
              </Text>
              <Text style={styles.heroText}>
                {t('privacySecurity.protectedMessage', {
                  defaultValue:
                    'Community pages show your name and church role. Your email address and phone number are not displayed there.',
                })}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {t('privacySecurity.accountTitle', { defaultValue: 'Account' })}
          </Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <UserRoundCheck size={20} color="#1e3a8a" />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>
                  {t('privacySecurity.signedInAs', { defaultValue: 'Signed in as' })}
                </Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {user?.email ?? t('common.unknown')}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {t('privacySecurity.changePassword', { defaultValue: 'Change password' })}
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardHelper}>
              {t('privacySecurity.changePasswordHelper', {
                defaultValue: 'Choose a unique password with at least 8 characters.',
              })}
            </Text>

            <View style={styles.inputRow}>
              <Lock size={19} color="#64748b" />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t('privacySecurity.newPassword', { defaultValue: 'New password' })}
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
                {showPassword ? (
                  <EyeOff size={20} color="#64748b" />
                ) : (
                  <Eye size={20} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <Lock size={19} color="#64748b" />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('privacySecurity.confirmPassword', {
                  defaultValue: 'Confirm new password',
                })}
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)}>
                {showConfirmPassword ? (
                  <EyeOff size={20} color="#64748b" />
                ) : (
                  <Eye size={20} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isUpdating && styles.disabledButton]}
              onPress={updatePassword}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {t('privacySecurity.updatePassword', { defaultValue: 'Update password' })}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => void WebBrowser.openBrowserAsync(getWebsiteUrl('/datenschutz'))}
          >
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>
                {t('privacySecurity.privacyPolicy', { defaultValue: 'Privacy policy' })}
              </Text>
              <Text style={styles.linkSubtitle}>
                {t('privacySecurity.privacyPolicySubtitle', {
                  defaultValue: 'Read how personal information is handled.',
                })}
              </Text>
            </View>
            <ExternalLink size={20} color="#1e3a8a" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={() => router.back()}>
            <Text style={styles.doneButtonText}>
              {t('common.done', { defaultValue: 'Done' })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 48 },
  hero: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    padding: 18,
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
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  cardHelper: { fontSize: 13, lineHeight: 19, color: '#64748b', marginBottom: 14 },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  input: { flex: 1, color: '#0f172a', fontSize: 15 },
  primaryButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { color: 'white', fontSize: 15, fontWeight: '800' },
  linkCard: {
    minHeight: 76,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  linkCopy: { flex: 1 },
  linkTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 },
  linkSubtitle: { fontSize: 13, lineHeight: 18, color: '#64748b' },
  doneButton: { alignItems: 'center', paddingVertical: 14 },
  doneButtonText: { color: '#1e3a8a', fontSize: 15, fontWeight: '800' },
});
