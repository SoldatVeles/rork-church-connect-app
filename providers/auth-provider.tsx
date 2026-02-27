import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import type { AuthState, User as AppUser, UserRole } from '@/types/user';
import { supabase } from '@/lib/supabase';
import type { User as SupaUser, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [session, setSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();

  const getOrCreateProfile = async (user: SupaUser): Promise<AppUser> => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && (error as any).code === 'PGRST116') {
      const firstName = (user.user_metadata?.first_name as string | undefined) ?? '';
      const lastName = (user.user_metadata?.last_name as string | undefined) ?? '';
      const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          role: 'member',
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      return {
        id: newProfile.id,
        email: newProfile.email,
        firstName: firstName,
        lastName: lastName,
        displayName: newProfile.full_name as string | null,
        role: (newProfile.role as UserRole) || 'member',
        permissions: [],
        joinedAt: new Date(newProfile.created_at as string),
        createdAt: newProfile.created_at as string,
      };
    }

    if (error) throw new Error((error as any).message ?? 'Failed to load profile');

    const firstName = (user.user_metadata?.first_name as string | undefined) ?? '';
    const lastName = (user.user_metadata?.last_name as string | undefined) ?? '';
    const currentFullName = (profile as any).full_name as string | null;

    if (!currentFullName || currentFullName.trim() === '') {
      const derivedName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';
      console.log('[Auth] Profile missing full_name, updating to:', derivedName);
      await supabase
        .from('profiles')
        .update({ full_name: derivedName })
        .eq('id', user.id);
      (profile as any).full_name = derivedName;
    }

    return {
      id: (profile as any).id as string,
      email: (profile as any).email as string,
      firstName: firstName,
      lastName: lastName,
      displayName: (profile as any).full_name as string | null,
      role: ((profile as any).role as UserRole) || 'member',
      permissions: [],
      joinedAt: new Date((profile as any).created_at as string),
      createdAt: (profile as any).created_at as string,
    };
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
          return;
        }
        setSession(data.session);
        if (data.session?.user) {
          try {
            const profile = await getOrCreateProfile(data.session.user);
            setAuthState({ user: profile, isLoading: false, isAuthenticated: true });
          } catch (profileError) {
            console.error('Error getting profile:', profileError);
            setAuthState({ user: null, isLoading: false, isAuthenticated: false });
          }
        } else {
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.error('Bootstrap error:', error);
        setAuthState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('Auth state change:', event);
      setSession(s);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        router.replace('/(auth)/login');
        return;
      }
      if (event === 'SIGNED_IN' && s?.user) {
        try {
          const profile = await getOrCreateProfile(s.user);
          setAuthState({ user: profile, isLoading: false, isAuthenticated: true });
        } catch (e) {
          console.error('Error in auth state change:', e);
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        }
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('Attempting login with email:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Login error:', error);
        console.error('Error code:', error.status);
        console.error('Error name:', error.name);
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email before signing in. Check your inbox for the confirmation link.');
        }
        
        throw new Error(error.message);
      }
      console.log('Login successful, session:', data.session);
      return data;
    },
    onSuccess: async (data) => {
      console.log('Login onSuccess, data:', data);
      setSession(data.session);
      if (data.session) {
        try {
          const profile = await getOrCreateProfile(data.session.user);
          console.log('Profile created/fetched:', profile);
          setAuthState({ user: profile, isLoading: false, isAuthenticated: true });
          router.replace('/(tabs)');
        } catch (error) {
          console.error('Error getting profile after login:', error);
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        }
      }
    },
    onError: (error) => {
      console.error('Login mutation error:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting logout process...');
      console.log('Current session before logout:', session?.user?.id);
      
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' });
        if (error) {
          console.error('Supabase signOut error:', error);
          throw error;
        }
        console.log('Logout successful from Supabase');
        return true;
      } catch (err) {
        console.error('Exception during logout:', err);
        throw err;
      }
    },
    onSuccess: async () => {
      console.log('Logout onSuccess - clearing state');
      try {
        queryClient.clear();
        setSession(null);
        setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        console.log('State cleared, navigating to login screen...');
        router.replace('/(auth)/login');
        console.log('Navigation command sent');
      } catch (err) {
        console.error('Error in logout onSuccess:', err);
      }
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      queryClient.clear();
      setSession(null);
      setAuthState({ user: null, isLoading: false, isAuthenticated: false });
      router.replace('/(auth)/login');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
    }) => {
      const redirectTo = Linking.createURL('/auth-callback');
      const fullName = `${userData.firstName} ${userData.lastName}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
          },
        },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (data) => {
      if (data.session) {
        setSession(data.session);
        const profile = await getOrCreateProfile(data.session.user);
        setAuthState({ user: profile, isLoading: false, isAuthenticated: true });
      } else if (data.user) {
        const email = data.user.email ?? '';
        router.replace({ pathname: '/(auth)/login', params: { registered: 'true', email } });
      }
    },
  });

  const hasPermission = (permission: string): boolean => authState.user?.permissions.includes(permission as any) || false;
  const isRole = (role: string): boolean => authState.user?.role === role;
  const isAdmin = (): boolean => authState.user?.role === 'admin';
  const isPastor = (): boolean => authState.user?.role === 'pastor' || authState.user?.role === 'admin';

  return {
    ...authState,
    session,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    register: registerMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    loginError: (loginMutation.error as any)?.message as string | undefined,
    logoutError: (logoutMutation.error as any)?.message as string | undefined,
    registerError: (registerMutation.error as any)?.message as string | undefined,
    hasPermission,
    isRole,
    isAdmin,
    isPastor,
  };
});