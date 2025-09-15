import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState, useMemo, useCallback } from 'react';

import type { AuthState } from '@/types/user';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [session, setSession] = useState<Session | null>(null);

  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['auth_session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (data) => {
      setSession(data.session);
      if (data.session) {
        const profile = await getOrCreateProfile(data.session.user);
        setAuthState({
          user: profile,
          isLoading: false,
          isAuthenticated: true,
        });
        queryClient.setQueryData(['auth_session'], data.session);
        router.replace('/(tabs)');
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Starting logout...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw new Error(error.message);
      }
      console.log('Logout successful');
      return true;
    },
    onSuccess: () => {
      console.log('Logout mutation success, clearing state...');
      setSession(null);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      queryClient.clear();
      queryClient.setQueryData(['auth_session'], null);
      console.log('Navigating to login...');
      router.replace('/(auth)/login');
    },
    onError: (error) => {
      console.error('Logout mutation error:', error);
      // Even if there's an error, try to clear local state
      setSession(null);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      queryClient.clear();
      queryClient.setQueryData(['auth_session'], null);
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
        setAuthState({
          user: profile,
          isLoading: false,
          isAuthenticated: true,
        });
        queryClient.setQueryData(['auth_session'], data.session);
        router.replace('/(tabs)');
      } else if (data.user) {
        const email = data.user.email ?? '';
        console.log('Registration successful. Email confirmation required for', email);
        router.replace({ pathname: '/(auth)/login', params: { registered: 'true', email } });
      }
    },
  });

  // Helper function to get or create profile
  const getOrCreateProfile = async (user: User) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          display_name: user.user_metadata?.display_name || user.user_metadata?.first_name + ' ' + user.user_metadata?.last_name || null,
          role: 'member' as const,
        })
        .select()
        .single();
      
      if (insertError) throw new Error(insertError.message);
      return {
        id: newProfile.id,
        email: newProfile.email,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        displayName: newProfile.display_name,
        role: newProfile.role,
        permissions: [],
        joinedAt: new Date(newProfile.created_at),
        createdAt: newProfile.created_at,
      };
    }

    if (error) throw new Error(error.message);
    
    return {
      id: profile.id,
      email: profile.email,
      firstName: user.user_metadata?.first_name || '',
      lastName: user.user_metadata?.last_name || '',
      displayName: profile.display_name,
      role: profile.role,
      permissions: [],
      joinedAt: new Date(profile.created_at),
      createdAt: profile.created_at,
    };
  };

  useEffect(() => {
    // Skip if we're in the middle of a logout
    if (logoutMutation.isPending) {
      return;
    }
    
    if (userQuery.data) {
      setSession(userQuery.data);
      if (userQuery.data.user) {
        getOrCreateProfile(userQuery.data.user).then((profile) => {
          setAuthState({
            user: profile,
            isLoading: false,
            isAuthenticated: true,
          });
          // Only navigate if we're not already authenticated
          if (!authState.isAuthenticated) {
            router.replace('/(tabs)');
          }
        }).catch(() => {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
          router.replace('/(auth)/login');
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        // Only navigate if we're currently authenticated
        if (authState.isAuthenticated) {
          router.replace('/(auth)/login');
        }
      }
    } else if (!userQuery.isLoading) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      // Only navigate if we're currently authenticated
      if (authState.isAuthenticated) {
        router.replace('/(auth)/login');
      }
    }
  }, [userQuery.data, userQuery.isLoading, logoutMutation.isPending]);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle sign out event specifically
        if (event === 'SIGNED_OUT') {
          console.log('User signed out via auth state change');
          setSession(null);
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
          queryClient.clear();
          queryClient.setQueryData(['auth_session'], null);
          return;
        }
        
        setSession(session);
        
        if (session?.user) {
          try {
            const profile = await getOrCreateProfile(session.user);
            setAuthState({
              user: profile,
              isLoading: false,
              isAuthenticated: true,
            });
          } catch (error) {
            console.error('Error getting profile:', error);
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const hasPermission = useCallback((permission: string): boolean => {
    return authState.user?.permissions.includes(permission as any) || false;
  }, [authState.user?.permissions]);

  const isRole = useCallback((role: string): boolean => {
    return authState.user?.role === role;
  }, [authState.user?.role]);

  const isAdmin = useCallback((): boolean => {
    return authState.user?.role === 'admin';
  }, [authState.user?.role]);

  const isPastor = useCallback((): boolean => {
    return authState.user?.role === 'pastor' || authState.user?.role === 'admin';
  }, [authState.user?.role]);

  return useMemo(() => ({
    ...authState,
    session,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    register: registerMutation.mutate,
    isLoginLoading: loginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    loginError: loginMutation.error?.message,
    registerError: registerMutation.error?.message,
    hasPermission,
    isRole,
    isAdmin,
    isPastor,
  }), [
    authState,
    session,
    loginMutation.mutate,
    loginMutation.isPending,
    loginMutation.error?.message,
    logoutMutation.mutate,
    logoutMutation.isPending,
    registerMutation.mutate,
    registerMutation.isPending,
    registerMutation.error?.message,
    hasPermission,
    isRole,
    isAdmin,
    isPastor,
  ]);
});