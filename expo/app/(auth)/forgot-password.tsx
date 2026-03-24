import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react-native';
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSent, setIsSent] = useState<boolean>(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: undefined,
      });

      if (error) {
        console.log('[ForgotPassword] Error:', error.message);
        Alert.alert('Error', error.message);
      } else {
        console.log('[ForgotPassword] Reset email sent to:', email);
        setIsSent(true);
      }
    } catch (err) {
      console.log('[ForgotPassword] Unexpected error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                testID="back-button"
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                We&apos;ll send you a link to reset your password
              </Text>
            </View>

            <View style={styles.form}>
              {isSent ? (
                <View style={styles.successContainer} testID="reset-success">
                  <View style={styles.successIconWrapper}>
                    <CheckCircle size={56} color="#16a34a" />
                  </View>
                  <Text style={styles.successTitle}>Check your inbox</Text>
                  <Text style={styles.successText}>
                    We sent a password reset link to{'\n'}
                    <Text style={styles.successEmail}>{email}</Text>
                  </Text>
                  <Text style={styles.successHint}>
                    If you don&apos;t see the email, check your spam folder.
                  </Text>

                  <TouchableOpacity
                    style={styles.backToLoginButton}
                    onPress={() => router.replace('/(auth)/login')}
                    testID="back-to-login"
                  >
                    <Text style={styles.backToLoginText}>Back to Sign In</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendLink}
                    onPress={() => {
                      setIsSent(false);
                    }}
                    testID="resend-button"
                  >
                    <Text style={styles.resendText}>
                      Didn&apos;t receive it?{' '}
                      <Text style={styles.resendTextBold}>Send again</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Mail size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
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
                    style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    testID="reset-button"
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.resetButtonText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => router.back()}
                  >
                    <Text style={styles.loginText}>
                      Remember your password?{' '}
                      <Text style={styles.loginTextBold}>Sign In</Text>
                    </Text>
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
  backButton: {
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
  resetButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
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
    marginBottom: 8,
  },
  successEmail: {
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  successHint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  backToLoginButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    alignItems: 'center' as const,
    width: '100%',
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'white',
  },
  resendLink: {
    marginTop: 20,
    alignItems: 'center' as const,
  },
  resendText: {
    fontSize: 14,
    color: '#64748b',
  },
  resendTextBold: {
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
});
