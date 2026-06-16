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
  TouchableWithoutFeedback,
} from 'react-native';
import { supabase } from '@/lib/supabase';

type RegisterStep = 'form' | 'code' | 'done';

export default function RegisterScreen() {
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
      Alert.alert('Missing information', 'Please fill in all required fields.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please enter the same password twice.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
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
          },
        },
      });

      if (error) {
        Alert.alert('Error', error.message);
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
      Alert.alert('Code sent', 'Please check your email for the 6-digit confirmation code.');
    } catch (error) {
      console.log('[Register] Sign up error:', error);
      Alert.alert('Error', 'Could not create your account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const email = cleanEmail();
    const cleanedCode = code.trim();

    if (!email || !cleanedCode) {
      Alert.alert('Missing information', 'Please enter the confirmation code.');
      return;
    }

    if (cleanedCode.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code from your email.');
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
        Alert.alert('Invalid code', error.message);
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      setStep('done');
    } catch (error) {
      console.log('[Register] Verify code error:', error);
      Alert.alert('Error', 'Could not verify the code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    const email = cleanEmail();

    if (!email || !isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please go back and enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert('Code sent', 'Please check your email for the newest confirmation code.');
    } catch (error) {
      console.log('[Register] Resend code error:', error);
      Alert.alert('Error', 'Could not resend the code. Please try again.');
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
            placeholder="First Name"
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
            placeholder="Last Name"
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
          placeholder="Email address"
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
          placeholder="Phone number (optional)"
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
          placeholder="Password"
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
          placeholder="Confirm Password"
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
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.primaryButtonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </>
  );

  const renderCodeStep = () => (
    <>
      <Text style={styles.infoText}>
        We sent a 6-digit confirmation code to{'\n'}
        <Text style={styles.infoEmail}>{formData.email}</Text>
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
          <Text style={styles.primaryButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginLink}
        onPress={handleResendCode}
        disabled={isLoading}
      >
        <Text style={styles.loginText}>
          Didn&apos;t receive it? <Text style={styles.loginTextBold}>Send again</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryLink}
        onPress={() => setStep('form')}
        disabled={isLoading}
      >
        <Text style={styles.secondaryText}>Back to registration form</Text>
      </TouchableOpacity>
    </>
  );

  const renderDoneStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconWrapper}>
        <CheckCircle size={56} color="#16a34a" />
      </View>

      <Text style={styles.successTitle}>Account confirmed</Text>
      <Text style={styles.successText}>
        Your account has been confirmed. You can now sign in.
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
        <Text style={styles.primaryButtonText}>Go to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

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
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.replace('/(auth)/login')}
              >
                <ArrowLeft size={24} color="white" />
              </TouchableOpacity>

              <Text style={styles.title}>
                {step === 'form'
                  ? 'Join Our Community'
                  : step === 'code'
                    ? 'Confirm Your Account'
                    : 'Welcome'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'form'
                  ? 'Create your account'
                  : step === 'code'
                    ? 'Enter the code from your email'
                    : 'Your account is ready'}
              </Text>
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