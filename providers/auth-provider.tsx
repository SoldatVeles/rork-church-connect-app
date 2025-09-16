import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

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
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          display_name:
            (user.user_metadata?.display_name as string | undefined) ||
            ((user.user_metadata?.first_name as string | undefined) ?? '') +
              ' ' +
              ((user.user_metadata?.last_name as string | undefined) ?? '') ||
            null,
          role: 'member',
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      return {
        id: newProfile.id,
        email: newProfile.email,
        firstName: (user.user_metadata?.first_name as string | undefined) ?? '',
        lastName: (user.user_metadata?.last_name as string | undefined) ?? '',
        displayName: newProfile.display_name as string | null,
        role: (newProfile.role as UserRole) || 'member',
        permissions: [],
        joinedAt: new Date(newProfile.created_at as string),
        createdAt: newProfile.created_at as string,
      };
    }

    if (error) throw new Error((error as any).message ?? 'Failed to load profile');

    return {
      id: (profile as any).id as string,
      email: (profile as any).email as string,
      firstName: (user.user_metadata?.first_name as string | undefined) ?? '',
      lastName: (user.user_metadata?.last_name as string | undefined) ?? '',
      displayName: (profile as any).display_name as string | null,
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw new Error(error.message);
      }
      console.log('Logout successful');
      return true;
    },
    onSuccess: () => {
      console.log('Logout onSuccess called');
      queryClient.clear();
      setSession(null);
      setAuthState({ user: null, isLoading: false, isAuthenticated: false });
      router.replace('/(auth)/login');
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
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
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            display_name: `${userData.firstName} ${userData.lastName}`,
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
    registerError: (registerMutation.error as any)?.message as string | undefined,
    hasPermission,
    isRole,
    isAdmin,
    isPastor,
  };
});