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
import { supabase } from '@/lib/supabase';

type ResetStep = 'email' | 'code' | 'password' | 'done';

export default function ForgotPasswordScreen() {
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
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }

    if (!isValidEmail(cleanedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanedEmail);

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setEmail(cleanedEmail);
      setCode('');
      setStep('code');
      Alert.alert('Code sent', 'Please check your email for the 6-digit reset code.');
    } catch (err) {
      console.log('[ForgotPassword] Send code error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const cleanedEmail = cleanEmail();
    const cleanedCode = code.trim();

    if (!cleanedEmail || !cleanedCode) {
      Alert.alert('Missing information', 'Please enter your email and reset code.');
      return;
    }

    if (cleanedCode.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code from your email.');
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
        Alert.alert('Invalid code', error.message);
        return;
      }

      setStep('password');
    } catch (err) {
      console.log('[ForgotPassword] Verify code error:', err);
      Alert.alert('Error', 'Could not verify the code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    const cleanedPassword = password.trim();
    const cleanedConfirmPassword = confirmPassword.trim();

    if (!cleanedPassword || !cleanedConfirmPassword) {
      Alert.alert('Missing information', 'Please enter and confirm your new password.');
      return;
    }

    if (cleanedPassword.length < 6) {
      Alert.alert('Password too short', 'Please use at least 6 characters.');
      return;
    }

    if (cleanedPassword !== cleanedConfirmPassword) {
      Alert.alert('Passwords do not match', 'Please enter the same password twice.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: cleanedPassword,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      setStep('done');
    } catch (err) {
      console.log('[ForgotPassword] Update password error:', err);
      Alert.alert('Error', 'Could not update your password. Please try again.');
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
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleSendCode}
        disabled={isLoading}
        testID="send-code-button"
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>Send Reset Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
        <Text style={styles.loginText}>
          Remember your password? <Text style={styles.loginTextBold}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderCodeStep = () => (
    <>
      <Text style={styles.infoText}>
        We sent a 6-digit reset code to{'\n'}
        <Text style={styles.infoEmail}>{email}</Text>
      </Text>

      <View style={styles.inputContainer}>
        <CheckCircle size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="6-digit code"
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
          <Text style={styles.primaryButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={handleSendCode}
        disabled={isLoading}
      >
        <Text style={styles.loginText}>
          Didn&apos;t receive it? <Text style={styles.loginTextBold}>Send again</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={styles.infoText}>Enter your new password.</Text>

      <View style={styles.inputContainer}>
        <Lock size={20} color="#64748b" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="New password"
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
          placeholder="Confirm new password"
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
          <Text style={styles.primaryButtonText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderDoneStep = () => (
    <View style={styles.successContainer} testID="reset-success">
      <View style={styles.successIconWrapper}>
        <CheckCircle size={56} color="#16a34a" />
      </View>
      <Text style={styles.successTitle}>Password updated</Text>
      <Text style={styles.successText}>
        Your password has been changed successfully. You can now sign in.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.replace('/(auth)/login')}
        testID="back-to-login"
      >
        <Text style={styles.primaryButtonText}>Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

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
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
                testID="back-button"
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                {step === 'email'
                  ? 'We will send you a 6-digit reset code'
                  : step === 'code'
                    ? 'Enter the code from your email'
                    : step === 'password'
                      ? 'Create a new password'
                      : 'Your password was updated'}
              </Text>
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