import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Mail, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react-native';
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
import { translateAuthError } from '@/utils/auth-errors';

type ResetStep = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [step, setStep] = useState<ResetStep>('email');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const paramEmail = typeof params.email === 'string' ? params.email : '';
    if (paramEmail) {
      setEmail(paramEmail);
    }
  }, [params.email]);

  const cleanEmail = () => email.trim().toLowerCase();

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleSendCode = async () => {
    const cleanedEmail = cleanEmail();

    if (!cleanedEmail) {
      Alert.alert(t('auth.passwordReset.missingEmailTitle'), t('auth.passwordReset.missingEmailMessage'));
      return;
    }

    if (!isValidEmail(cleanedEmail)) {
      Alert.alert(t('auth.invalidEmailTitle'), t('auth.invalidEmailMessage'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail);

      if (error) {
        Alert.alert(t('auth.passwordReset.errorTitle'), translateAuthError(error, t));
        return;
      }

      setEmail(cleanedEmail);
      setCode('');
      setStep('code');
      Alert.alert(t('auth.passwordReset.codeSentTitle'), t('auth.passwordReset.resetCodeSentMessage'));
    } catch (err) {
      console.log('[ForgotPassword] Send code error:', err);
      Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.passwordReset.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const cleanedEmail = cleanEmail();
    const cleanedCode = code.trim();

    if (!cleanedEmail || !cleanedCode) {
      Alert.alert(t('auth.passwordReset.missingInfoTitle'), t('auth.passwordReset.missingEmailCodeMessage'));
      return;
    }

    if (cleanedCode.length !== 6) {
      Alert.alert(t('auth.passwordReset.invalidCodeTitle'), t('auth.passwordReset.invalidCodeMessage'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: cleanedEmail,
        token: cleanedCode,
        type: 'recovery',
      });

      if (error) {
        Alert.alert(t('auth.passwordReset.invalidCodeTitle'), translateAuthError(error, t));
        return;
      }

      setStep('password');
    } catch (err) {
      console.log('[ForgotPassword] Verify code error:', err);
      Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.passwordReset.verifyCodeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    const cleanedPassword = password.trim();
    const cleanedConfirmPassword = confirmPassword.trim();

    if (!cleanedPassword || !cleanedConfirmPassword) {
      Alert.alert(t('auth.passwordReset.missingInfoTitle'), t('auth.passwordReset.missingPasswordMessage'));
      return;
    }

    if (cleanedPassword.length < 6) {
      Alert.alert(t('auth.passwordReset.passwordTooShortTitle'), t('auth.passwordReset.passwordTooShortMessage'));
      return;
    }

    if (cleanedPassword !== cleanedConfirmPassword) {
      Alert.alert(t('auth.passwordReset.passwordsDoNotMatchTitle'), t('auth.passwordReset.passwordsDoNotMatchMessage'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: cleanedPassword,
      });

      if (error) {
        Alert.alert(t('auth.passwordReset.errorTitle'), translateAuthError(error, t));
        return;
      }

      setStep('done');
    } catch (err) {
      console.log('[ForgotPassword] Update password error:', err);
      Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.passwordReset.updatePasswordError'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <View style={styles.inputContainer}>
        <Mail size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.emailAddress')}
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoFocus
          testID="email-input"
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleSendCode}
        disabled={isLoading}
        testID="send-code-button"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.passwordReset.sendResetCode')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
        <Text style={styles.loginText}>
          {t('auth.passwordReset.rememberPassword')}{' '}
          <Text style={styles.loginTextBold}>{t('auth.signIn')}</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderCodeStep = () => (
    <>
      <Text style={styles.infoText}>
        {t('auth.passwordReset.codeSentTo')}{'\n'}
        <Text style={styles.infoEmail}>{email}</Text>
      </Text>

      <View style={styles.inputContainer}>
        <CheckCircle size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.passwordReset.codePlaceholder')}
          placeholderTextColor="#64748b"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoFocus
          maxLength={6}
          testID="code-input"
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleVerifyCode}
        disabled={isLoading}
        testID="verify-code-button"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.passwordReset.verifyCode')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={handleSendCode}
        disabled={isLoading}
      >
        <Text style={styles.loginText}>
          {t('auth.passwordReset.didntReceiveIt')}{' '}
          <Text style={styles.loginTextBold}>{t('auth.passwordReset.sendAgain')}</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={styles.infoText}>{t('auth.passwordReset.enterNewPassword')}</Text>

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
          testID="new-password-input"
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
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
          testID="confirm-password-input"
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
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleUpdatePassword}
        disabled={isLoading}
        testID="update-password-button"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.passwordReset.updatePassword')}</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderDoneStep = () => (
    <View style={styles.successContainer} testID="reset-success">
      <View style={styles.successIconWrapper}>
        <CheckCircle size={56} color="#16a34a" />
      </View>
      <Text style={styles.successTitle}>{t('auth.passwordReset.passwordUpdatedTitle')}</Text>
      <Text style={styles.successText}>
        {t('auth.passwordReset.passwordUpdatedMessage')}
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace('/(auth)/login')}
        testID="back-to-login"
      >
        <Text style={styles.primaryButtonText}>{t('auth.passwordReset.backToSignIn')}</Text>
      </TouchableOpacity>
    </View>
  );

  const subtitle =
    step === 'email'
      ? t('auth.passwordReset.subtitleEmail')
      : step === 'code'
        ? t('auth.passwordReset.subtitleCode')
        : step === 'password'
          ? t('auth.passwordReset.subtitlePassword')
          : t('auth.passwordReset.subtitleDone');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.gradient}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.topRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                  testID="back-button"
                >
                  <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <LanguageSelector variant="dark" />
              </View>
              <Text style={styles.title}>{t('auth.passwordReset.title')}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.form}>
              {step === 'email' && renderEmailStep()}
              {step === 'code' && renderCodeStep()}
              {step === 'password' && renderPasswordStep()}
              {step === 'done' && renderDoneStep()}
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
  topRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
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
    width: '100%',
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
    color: '#64748b',
  },
  loginTextBold: {
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  infoText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 20,
  },
  infoEmail: {
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
