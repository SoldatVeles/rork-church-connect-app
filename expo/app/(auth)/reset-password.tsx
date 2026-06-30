import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPreparingSession, setIsPreparingSession] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const prepareRecoverySession = async () => {
      try {
        const url = await Linking.getInitialURL();

        if (!url) {
          setIsPreparingSession(false);
          return;
        }

        const parsed = Linking.parse(url);
        const queryParams = parsed.queryParams ?? {};

        const rawUrl = url.includes('#') ? url.split('#')[1] : '';
        const hashParams = new URLSearchParams(rawUrl);

        const accessToken =
          typeof queryParams.access_token === 'string'
            ? queryParams.access_token
            : hashParams.get('access_token');

        const refreshToken =
          typeof queryParams.refresh_token === 'string'
            ? queryParams.refresh_token
            : hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            Alert.alert(t('auth.passwordReset.resetLinkErrorTitle'), error.message);
          }
        }
      } catch (error) {
        console.log('[ResetPassword] Session preparation error:', error);
        Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.passwordReset.prepareSessionError'));
      } finally {
        setIsPreparingSession(false);
      }
    };

    void prepareRecoverySession();
  }, [t]);

  const handleUpdatePassword = async () => {
    const cleanPassword = password.trim();
    const cleanConfirmPassword = confirmPassword.trim();

    if (!cleanPassword || !cleanConfirmPassword) {
      Alert.alert(t('auth.passwordReset.missingInfoTitle'), t('auth.passwordReset.missingPasswordMessage'));
      return;
    }

    if (cleanPassword.length < 6) {
      Alert.alert(t('auth.passwordReset.passwordTooShortTitle'), t('auth.passwordReset.passwordTooShortMessage'));
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      Alert.alert(t('auth.passwordReset.passwordsDoNotMatchTitle'), t('auth.passwordReset.passwordsDoNotMatchMessage'));
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: cleanPassword,
      });

      if (error) {
        Alert.alert(t('auth.passwordReset.errorTitle'), error.message);
        return;
      }

      setIsDone(true);
    } catch (error) {
      console.log('[ResetPassword] Update error:', error);
      Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.passwordReset.updatePasswordError'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.gradient}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.languageSelectorContainer}>
                <LanguageSelector variant="dark" />
              </View>
              <Text style={styles.title}>{t('auth.passwordReset.createNewPasswordTitle')}</Text>
              <Text style={styles.subtitle}>{t('auth.passwordReset.createNewPasswordSubtitle')}</Text>
            </View>

            <View style={styles.form}>
              {isPreparingSession ? (
                <View style={styles.centered}>
                  <ActivityIndicator color="#1e3a8a" />
                  <Text style={styles.helperText}>{t('auth.passwordReset.preparingResetLink')}</Text>
                </View>
              ) : isDone ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconWrapper}>
                    <CheckCircle size={56} color="#16a34a" />
                  </View>
                  <Text style={styles.successTitle}>{t('auth.passwordReset.passwordUpdatedTitle')}</Text>
                  <Text style={styles.successText}>
                    {t('auth.passwordReset.passwordUpdatedMessageShort')}
                  </Text>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.replace('/(auth)/login')}
                  >
                    <Text style={styles.primaryButtonText}>{t('auth.passwordReset.backToSignIn')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('auth.passwordReset.newPassword')}
                      placeholderTextColor="#64748b"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="#64748b" />
                      ) : (
                        <Eye size={20} color="#64748b" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('auth.passwordReset.confirmNewPassword')}
                      placeholderTextColor="#64748b"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoComplete="new-password"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="#64748b" />
                      ) : (
                        <Eye size={20} color="#64748b" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, isUpdating && styles.primaryButtonDisabled]}
                    onPress={handleUpdatePassword}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t('auth.passwordReset.updatePassword')}</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => router.replace('/(auth)/login')}
                  >
                    <Text style={styles.loginText}>{t('auth.passwordReset.backToSignIn')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
  },
  languageSelectorContainer: {
    alignItems: 'flex-end' as const,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  form: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 40,
    minHeight: 500,
  },
  centered: {
    alignItems: 'center' as const,
    paddingTop: 40,
  },
  helperText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeButton: {
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center' as const,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  successContainer: {
    alignItems: 'center' as const,
    paddingTop: 24,
  },
  successIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f0fdf4',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 24,
  },
});
