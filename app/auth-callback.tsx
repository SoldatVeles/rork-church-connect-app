import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, AlertTriangle, Mail } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Params {
  code?: string | string[];
  error?: string | string[];
  error_code?: string | string[];
  error_description?: string | string[];
  email?: string | string[];
}

export default function AuthCallback() {
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const code = useMemo(() => (typeof params.code === 'string' ? params.code : undefined), [params.code]);
  const errorCode = useMemo(() => (typeof params.error_code === 'string' ? params.error_code : undefined), [params.error_code]);
  const errorDesc = useMemo(() => (typeof params.error_description === 'string' ? params.error_description : undefined), [params.error_description]);
  const email = useMemo(() => (typeof params.email === 'string' ? params.email : undefined), [params.email]);

  useEffect(() => {
    console.log('[AuthCallback] params:', params);
    const run = async () => {
      try {
        setStatus('processing');
        if (errorCode) {
          if (errorCode === 'otp_expired') {
            setStatus('error');
            setMessage('The confirmation link is invalid or has expired. You can request a new verification email below.');
            return;
          }
          setStatus('error');
          setMessage(errorDesc || 'There was an issue confirming your email.');
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.log('[AuthCallback] exchange error:', error.message);
            setStatus('error');
            setMessage('We could not complete verification. Please request a new link and try again.');
            return;
          }

          console.log('[AuthCallback] exchange success for', data.session?.user?.email);
          setStatus('success');
          setMessage('Your email has been verified. You can now sign in.');
          setTimeout(() => {
            router.replace({ pathname: '/(auth)/login', params: { registered: 'true', email: data.session?.user?.email ?? email ?? '' } });
          }, 800);
          return;
        }

        setStatus('error');
        setMessage('Missing confirmation code. Please open the link from your email again.');
      } catch (e) {
        console.log('[AuthCallback] unexpected error', e);
        setStatus('error');
        setMessage('Something went wrong while confirming your email.');
      }
    };

    run();
  }, [code, errorCode, errorDesc, email]);

  const handleResend = async () => {
    try {
      const target = email;
      if (!target) {
        setMessage('Enter your email on the Sign In page and choose "Forgot password" or sign up again to receive a fresh link.');
        setStatus('error');
        return;
      }
      setStatus('processing');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: target,
      });
      if (error) {
        console.log('[AuthCallback] resend error', error.message);
        setStatus('error');
        setMessage('Could not resend verification email. Please try again later.');
        return;
      }
      setStatus('success');
      setMessage(`We sent a new verification link to ${target}. Please check your inbox.`);
    } catch (e) {
      console.log('[AuthCallback] resend unexpected error', e);
      setStatus('error');
      setMessage('Unexpected error while resending verification.');
    }
  };

  return (
    <View style={styles.container} testID="auth-callback-screen">
      {status === 'processing' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.info}>Verifying your email…</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.center}>
          <CheckCircle2 size={64} color="#16a34a" />
          <Text style={styles.title}>Email verified</Text>
          <Text style={styles.info}>{message}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(auth)/login')} testID="go-to-login-btn">
            <Text style={styles.primaryBtnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.center}>
          <AlertTriangle size={64} color="#f59e0b" />
          <Text style={styles.title}>Link issue</Text>
          <Text style={styles.info}>{message}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(auth)/login')} testID="back-to-login-btn">
              <Text style={styles.secondaryBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resendBtn} onPress={handleResend} testID="resend-verification-btn">
              <Mail size={18} color="#fff" />
              <Text style={styles.resendBtnText}>Resend link</Text>
            </TouchableOpacity>
          </View>
          {Platform.OS === 'web' && (
            <Text style={styles.hint}>If this opened in your browser, it&apos;s okay. We&apos;ll guide you back to the app.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: 24 },
  center: { alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  info: { fontSize: 14, color: '#475569', textAlign: 'center', marginTop: 6 },
  row: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primaryBtn: { backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: { borderColor: '#1e3a8a', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  secondaryBtnText: { color: '#1e3a8a', fontWeight: '600' },
  resendBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0ea5e9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  resendBtnText: { color: '#fff', fontWeight: '600' },
  hint: { marginTop: 12, fontSize: 12, color: '#64748b' },
});