import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react-native';
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
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showRegisterNotice, setShowRegisterNotice] = useState<boolean>(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const params = useLocalSearchParams<{ registered?: string; email?: string }>();
  const { login, isLoginLoading, loginError } = useAuth();

  useEffect(() => {
    const comingFromRegister = params?.registered === 'true';
    const em = typeof params?.email === 'string' ? params.email : '';
    if (comingFromRegister) {
      setShowRegisterNotice(true);
      setRegisteredEmail(em);
    }
  }, [params?.registered, params?.email]);

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const handleLogin = () => {
  const cleanedEmail = email.trim().toLowerCase();

  if (!cleanedEmail || !password.trim()) {
    Alert.alert(t('auth.missingInfoTitle'), t('auth.missingInfoMessage'));
    return;
  }

  if (!isValidEmail(cleanedEmail)) {
    Alert.alert(t('auth.invalidEmailTitle'), t('auth.invalidEmailMessage'));
    return;
  }

  login({ email: cleanedEmail, password });
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={['#1e3a8a', '#3b82f6']}
          style={styles.gradient}
        >
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
            <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
            <Text style={styles.subtitle}>{t('auth.signInContinue')}</Text>
          </View>

            <View style={styles.form}>
          {showRegisterNotice && (
            <View style={styles.noticeBox} testID="register-success-notice">
            <Text style={styles.noticeTitle}>{t('auth.accountCreated')}</Text>
            <Text style={styles.noticeText}>
              {registeredEmail
                ? t('auth.confirmationEmail', { email: registeredEmail })
                : t('auth.confirmationGeneric')}
            </Text>
            <TouchableOpacity style={styles.noticeButton} onPress={() => setShowRegisterNotice(false)}>
              <Text style={styles.noticeButtonText}>{t('auth.gotIt')}</Text>
            </TouchableOpacity>
            </View>
          )}
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
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#64748b" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.password')}
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
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

          {loginError && (
            <Text style={styles.errorText}>{loginError}</Text>
          )}

          <TouchableOpacity
            style={[styles.loginButton, isLoginLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoginLoading}
          >
            {isLoginLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>{t('auth.signIn')}</Text>
            )}
          </TouchableOpacity>


          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() =>
            router.push({
              pathname: '/(auth)/forgot-password',
              params: { email: email.trim().toLowerCase() },
            })
          }
          >
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.replace('/(auth)/register')}
          >
            <Text style={styles.registerText}>
              {t('auth.noAccount')} <Text style={styles.registerTextBold}>{t('auth.joinUs')}</Text>
            </Text>
          </TouchableOpacity>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
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
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  noticeBox: {
    backgroundColor: '#ecfeff',
    borderColor: '#22d3ee',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0e7490',
    marginBottom: 6,
  },
  noticeText: {
    fontSize: 14,
    color: '#0e7490',
    marginBottom: 10,
  },
  noticeButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  noticeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#64748b',
  },
  registerTextBold: {
    fontWeight: '600',
    color: '#1e3a8a',
  },
  forgotLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e3a8a',
  },
  languageSelectorContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
});