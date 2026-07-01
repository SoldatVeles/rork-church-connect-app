import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AuthState, User as AppUser, UserRole } from '@/types/user';
import { supabase } from '@/lib/supabase';
import type { User as SupaUser, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { translateAuthError } from '@/utils/auth-errors';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const { t } = useTranslation();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [session, setSession] = useState<Session | null>(null);
  const queryClient = useQueryClient();

  const deriveFullName = (user: SupaUser, existingName?: string | null): string => {
    if (existingName && existingName.trim() !== '') return existingName.trim();
    const firstName = ((user.user_metadata?.first_name as string) ?? '').trim();
    const lastName = ((user.user_metadata?.last_name as string) ?? '').trim();
    const metaFullName = ((user.user_metadata?.full_name as string) ?? '').trim();
    const combined = [firstName, lastName].filter(Boolean).join(' ');
    return combined || metaFullName || user.email?.split('@')[0] || 'User';
  };

  const getOrCreateProfile = async (user: SupaUser): Promise<AppUser> => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && (error as any).code === 'PGRST116') {
      const fullName = deriveFullName(user);
      console.log('[Auth] Creating new profile with full_name:', fullName);
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          display_name: fullName,
          role: 'member',
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      const firstName = ((user.user_metadata?.first_name as string) ?? '').trim();
      const lastName = ((user.user_metadata?.last_name as string) ?? '').trim();
      return {
        id: newProfile.id,
        email: newProfile.email,
        firstName,
        lastName,
        displayName: newProfile.full_name as string | null,
        role: (newProfile.role as UserRole) || 'member',
        permissions: [],
        joinedAt: new Date(newProfile.created_at as string),
        createdAt: newProfile.created_at as string,
      };
    }

    if (error) throw new Error((error as any).message ?? 'Failed to load profile');

    const currentFullName = ((profile as any).full_name as string | null) ?? '';
    const currentDisplayName = ((profile as any).display_name as string | null) ?? '';
    const needsUpdate = !currentFullName.trim() || !currentDisplayName.trim();

    if (needsUpdate) {
      const derivedName = deriveFullName(user, currentFullName);
      console.log('[Auth] Profile missing full_name/display_name, updating to:', derivedName);
      const updates: Record<string, string> = {};
      if (!currentFullName.trim()) updates.full_name = derivedName;
      if (!currentDisplayName.trim()) updates.display_name = derivedName;
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      (profile as any).full_name = derivedName;
      (profile as any).display_name = derivedName;
    }

    const firstName = ((user.user_metadata?.first_name as string) ?? '').trim();
    const lastName = ((user.user_metadata?.last_name as string) ?? '').trim();

    return {
      id: (profile as any).id as string,
      email: (profile as any).email as string,
      firstName,
      lastName,
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
    void bootstrap();
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
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw new Error(translateAuthError(error, t));
      }

      return data;
    },
    onSuccess: async (data) => {
      setSession(data.session);

      if (data.session) {
        try {
          const profile = await getOrCreateProfile(data.session.user);
          setAuthState({ user: profile, isLoading: false, isAuthenticated: true });
          router.replace('/(tabs)');
        } catch {
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        }
      }
    },
    onError: () => {
      // Keep this silent. The login screen displays the translated error via loginError.
      // console.error in Expo development creates a black LogBox overlay.
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
      if (error) throw new Error(translateAuthError(error, t));
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

  const hasPermission = useCallback((permission: string): boolean => authState.user?.permissions.includes(permission as any) || false, [authState.user]);
  const isRole = useCallback((role: string): boolean => authState.user?.role === role, [authState.user]);
  const isAdmin = useCallback((): boolean => authState.user?.role === 'admin', [authState.user]);
  const isChurchLeader = useCallback((): boolean => authState.user?.role === 'church_leader' || authState.user?.role === 'admin', [authState.user]);
  const isPastor = useCallback((): boolean => authState.user?.role === 'pastor' || authState.user?.role === 'church_leader' || authState.user?.role === 'admin', [authState.user]);

  return useMemo(() => ({
    ...authState,
    session,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    register: registerMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    loginError: loginMutation.error ? translateAuthError(loginMutation.error, t) : undefined,
    logoutError: logoutMutation.error ? translateAuthError(logoutMutation.error, t) : undefined,
    registerError: registerMutation.error ? translateAuthError(registerMutation.error, t) : undefined,
    hasPermission,
    isRole,
    isAdmin,
    isChurchLeader,
    isPastor,
  }), [authState, session, loginMutation, logoutMutation, registerMutation, hasPermission, isRole, isAdmin, isChurchLeader, isPastor, t]);
});