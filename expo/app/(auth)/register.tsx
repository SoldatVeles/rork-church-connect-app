import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Linking,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { supabase } from '@/lib/supabase';
import { getWebsiteUrl } from '@/lib/website-url';
import { translateAuthError } from '@/utils/auth-errors';

type RegisterStep = 'form' | 'code' | 'done';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [code, setCode] = useState('');
  const [step, setStep] = useState<RegisterStep>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedCommunityRules, setAcceptedCommunityRules] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const cleanEmail = () => formData.email.trim().toLowerCase();

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleRegister = async () => {
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const email = cleanEmail();
    const phone = formData.phone.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!firstName || !lastName || !email || !password) {
      Alert.alert(t('auth.missingInfoTitle'), t('auth.registerScreen.missingRequiredFields'));
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(t('auth.invalidEmailTitle'), t('auth.invalidEmailMessage'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('auth.passwordReset.passwordsDoNotMatchTitle'), t('auth.passwordReset.passwordsDoNotMatchMessage'));
      return;
    }

    if (password.length < 8) {
      Alert.alert(t('auth.passwordReset.passwordTooShortTitle'), t('auth.registerScreen.passwordTooShortMessage'));
      return;
    }

    if (!acceptedCommunityRules) {
      Alert.alert(
        t('auth.registerScreen.rulesRequiredTitle', { defaultValue: 'Community rules required' }),
        t('auth.registerScreen.rulesRequiredMessage', {
          defaultValue: 'Please accept the Community Rules and Privacy Policy to create an account.',
        })
      );
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${firstName} ${lastName}`.trim();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            phone,
            terms_version: '2026-08-12',
            terms_accepted_at: new Date().toISOString(),
            privacy_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        Alert.alert(t('auth.passwordReset.errorTitle'), translateAuthError(error, t));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        firstName,
        lastName,
        email,
        phone,
      }));
      setCode('');
      setStep('code');
      Alert.alert(t('auth.passwordReset.codeSentTitle'), t('auth.registerScreen.confirmationCodeSentMessage'));
    } catch {
      Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.registerScreen.createAccountError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const email = cleanEmail();
    const cleanedCode = code.trim();

    if (!email || !cleanedCode) {
      Alert.alert(t('auth.passwordReset.missingInfoTitle'), t('auth.registerScreen.missingConfirmationCode'));
      return;
    }

    if (cleanedCode.length !== 6) {
      Alert.alert(t('auth.passwordReset.invalidCodeTitle'), t('auth.passwordReset.invalidCodeMessage'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: cleanedCode,
        type: 'signup',
      });

      if (error) {
        Alert.alert(t('auth.passwordReset.invalidCodeTitle'), translateAuthError(error, t));
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      setStep('done');
    } catch {
      Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.passwordReset.verifyCodeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const email = cleanEmail();

    if (!email || !isValidEmail(email)) {
      Alert.alert(t('auth.invalidEmailTitle'), t('auth.registerScreen.goBackValidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        Alert.alert(t('auth.passwordReset.errorTitle'), translateAuthError(error, t));
        return;
      }

      Alert.alert(t('auth.passwordReset.codeSentTitle'), t('auth.registerScreen.newestCodeSentMessage'));
    } catch {
      Alert.alert(t('auth.passwordReset.errorTitle'), t('auth.registerScreen.resendCodeError'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormStep = () => (
    <>
      <View style={styles.row}>
        <View style={[styles.inputContainer, styles.halfWidth]}>
          <User size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.registerScreen.firstName')}
            placeholderTextColor="#64748b"
            value={formData.firstName}
            onChangeText={(value) => updateFormData('firstName', value)}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.inputContainer, styles.halfWidth]}>
          <User size={20} color="#64748b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder={t('auth.registerScreen.lastName')}
            placeholderTextColor="#64748b"
            value={formData.lastName}
            onChangeText={(value) => updateFormData('lastName', value)}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Mail size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.emailAddress')}
          placeholderTextColor="#64748b"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Phone size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.registerScreen.phoneOptional')}
          placeholderTextColor="#64748b"
          value={formData.phone}
          onChangeText={(value) => updateFormData('phone', value)}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
      </View>

      <View style={styles.inputContainer}>
        <Lock size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor="#64748b"
          value={formData.password}
          onChangeText={(value) => updateFormData('password', value)}
          secureTextEntry={!showPassword}
          autoComplete="new-password"
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? <EyeOff size={20} color="#64748b" /> : <Eye size={20} color="#64748b" />}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Lock size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('auth.registerScreen.confirmPassword')}
          placeholderTextColor="#64748b"
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormData('confirmPassword', value)}
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
        style={styles.rulesRow}
        onPress={() => setAcceptedCommunityRules((value) => !value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedCommunityRules }}
      >
        <View style={[styles.rulesCheckbox, acceptedCommunityRules && styles.rulesCheckboxChecked]}>
          {acceptedCommunityRules ? <CheckCircle size={18} color="white" /> : null}
        </View>
        <Text style={styles.rulesText}>
          {t('auth.registerScreen.rulesPrefix', { defaultValue: 'I accept the ' })}
          <Text style={styles.rulesLink} onPress={() => void Linking.openURL(getWebsiteUrl('/gemeinschaftsregeln'))}>
            {t('auth.registerScreen.communityRules', { defaultValue: 'Community Rules' })}
          </Text>
          {t('auth.registerScreen.rulesAnd', { defaultValue: ' and the ' })}
          <Text style={styles.rulesLink} onPress={() => void Linking.openURL(getWebsiteUrl('/datenschutz'))}>
            {t('auth.registerScreen.privacyPolicy', { defaultValue: 'Privacy Policy' })}
          </Text>
          .
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.registerScreen.createAccount')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.loginText}>
          {t('auth.registerScreen.alreadyHaveAccount')}{' '}
          <Text style={styles.loginTextBold}>{t('auth.signIn')}</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderCodeStep = () => (
    <>
      <Text style={styles.infoText}>
        {t('auth.registerScreen.confirmationCodeSentTo')}{'\n'}
        <Text style={styles.infoEmail}>{formData.email}</Text>
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
          maxLength={6}
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleVerifyCode}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>{t('auth.passwordReset.verifyCode')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={handleResendCode}
        disabled={isLoading}
      >
        <Text style={styles.loginText}>
          {t('auth.passwordReset.didntReceiveIt')}{' '}
          <Text style={styles.loginTextBold}>{t('auth.passwordReset.sendAgain')}</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryLink}
        onPress={() => setStep('form')}
        disabled={isLoading}
      >
        <Text style={styles.secondaryText}>{t('auth.registerScreen.backToRegistrationForm')}</Text>
      </TouchableOpacity>
    </>
  );

  const renderDoneStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        <CheckCircle size={56} color="#16a34a" />
      </View>

      <Text style={styles.successTitle}>{t('auth.registerScreen.accountConfirmedTitle')}</Text>
      <Text style={styles.successText}>
        {t('auth.registerScreen.accountConfirmedMessage')}
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() =>
          router.replace({
            pathname: '/(auth)/login',
            params: { registered: 'true', email: formData.email },
          })
        }
      >
        <Text style={styles.primaryButtonText}>{t('auth.registerScreen.goToSignIn')}</Text>
      </TouchableOpacity>
    </View>
  );

  const title =
    step === 'form'
      ? t('auth.registerScreen.joinTitle')
      : step === 'code'
        ? t('auth.registerScreen.confirmTitle')
        : t('auth.registerScreen.welcomeTitle');

  const subtitle =
    step === 'form'
      ? t('auth.registerScreen.createAccountSubtitle')
      : step === 'code'
        ? t('auth.passwordReset.subtitleCode')
        : t('auth.registerScreen.accountReadySubtitle');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.gradient}>
            <View style={styles.header}>
              <View style={styles.topRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.replace('/(auth)/login')}
                >
                  <ArrowLeft size={24} color="white" />
                </TouchableOpacity>
                <LanguageSelector variant="dark" />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <ScrollView
              style={styles.form}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {step === 'form' && renderFormStep()}
              {step === 'code' && renderCodeStep()}
              {step === 'done' && renderDoneStep()}

              <View style={styles.spacer} />
            </ScrollView>
          </LinearGradient>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 40,
  },
  formContent: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row' as const,
    gap: 12,
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
  halfWidth: {
    flex: 1,
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
  rulesRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, marginBottom: 18, paddingHorizontal: 2 },
  rulesCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#94a3b8', alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: 1 },
  rulesCheckboxChecked: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  rulesText: { flex: 1, fontSize: 12, lineHeight: 18, color: '#475569' },
  rulesLink: { color: '#1e3a8a', fontWeight: '700' as const, textDecorationLine: 'underline' as const },
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
  secondaryLink: {
    marginTop: 16,
    alignItems: 'center' as const,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
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
  spacer: {
    height: 40,
  },
});
