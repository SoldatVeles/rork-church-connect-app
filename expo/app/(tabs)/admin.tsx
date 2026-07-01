import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Users, Shield, Plus, Check, UserPlus, Church, BookOpen, Youtube, Edit, Trash2, Ban, RefreshCw, ChevronDown, ChevronUp, X, Globe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import type { Sermon } from '@/types/sermon';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

type Role = 'admin' | 'church_leader' | 'pastor' | 'member' | 'visitor';

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

type AdminTab = 'users' | 'sermons' | 'groups' | 'countries';

export default function AdminTabScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const isAdminUser = user?.role === 'admin';
  const isChurchLeaderUser = user?.role === 'church_leader';

  const currentUserProfileQuery = useQuery({
    queryKey: ['admin-current-user-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, home_group_id')
        .eq('id', user!.id)
        .single();

      if (error) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }

      return data as {
        id: string;
        role: Role;
        home_group_id: string | null;
      };
    },
  });

  const userHomeGroupId =
    currentUserProfileQuery.data?.home_group_id ??
    ((user as any)?.home_group_id ?? (user as any)?.homeGroupId ?? null) as string | null;
  
  // Direct Supabase query (bypasses cold-starting Hono backend so the list
  // loads quickly and reliably). Admin uses RLS-permitted access to profiles.
type AdminUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
  displayName: string;
  phone?: string;
  homeGroupId?: string | null;
};

  const usersQuery = useQuery<AdminUserRow[]>({
    queryKey: ['users', 'getAll', user?.role, userHomeGroupId],
    enabled: isAdminUser || (isChurchLeaderUser && !currentUserProfileQuery.isLoading),
    queryFn: async (): Promise<AdminUserRow[]> => {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, display_name, role, is_blocked, created_at, phone, home_group_id')
        .order('created_at', { ascending: false });

      if (user?.role === 'church_leader') {
        if (!userHomeGroupId) {
          return [];
        }

        query = query.eq('home_group_id', userHomeGroupId);
      }

      const { data, error } = await query;
      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      const rows = (data ?? []) as Array<{
        id: string;
        email: string | null;
        full_name: string | null;
        display_name: string | null;
        role: string | null;
        is_blocked: boolean | null;
        created_at: string;
        phone: string | null;
        home_group_id: string | null;
      }>;
      return rows
        .filter((p) => Boolean(p.email))
        .map((p) => {
          const fullName = p.display_name || p.full_name || (p.email ? p.email.split('@')[0] : t('admin.users.userFallback'));
          const parts = fullName.trim().split(/\s+/);
          return {
            id: p.id,
            firstName: parts[0] || t('admin.users.userFallback'),
            lastName: parts.slice(1).join(' ') || '',
            email: p.email ?? '',
            role: ((p.role as Role) || 'member'),
            isBlocked: Boolean(p.is_blocked),
            createdAt: p.created_at,
            displayName: fullName,
            phone: p.phone ?? undefined,
            homeGroupId: p.home_group_id,
          };
        });
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });


  const _diagnosticsQuery = trpc.users.diagnostics.useQuery(undefined, {
    enabled: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'member' as Role,
  });
  const [groupName, setGroupName] = useState('');
  const [selectedGroupForAdding, setSelectedGroupForAdding] = useState<string>('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<string[]>([]);
  const [selectedPastorForGroup, setSelectedPastorForGroup] = useState<string>('');

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [addUserExpanded, setAddUserExpanded] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [sermonForm, setSermonForm] = useState({
    title: '',
    speaker: '',
    date: '',
    duration: '',
    description: '',
    topic: '',
    youtube_url: '',
    thumbnail_url: '',
    is_featured: false,
  });

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: (createdUser) => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'getAll'] });
      void usersQuery.refetch();
      setNewUser({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'member' });
      const requiresEmailConfirmation = Boolean(createdUser?.requiresEmailConfirmation);
      const successMessage = requiresEmailConfirmation
        ? t('admin.alerts.accountCreatedConfirm')
        : t('admin.alerts.userCreatedReady');
      Alert.alert(t('admin.common.success'), successMessage);
    },
    onError: (error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.failedToCreateUser'));
    },
  });
  
  const updateRoleMutation = useMutation({
    mutationFn: async (input: { userId: string; role: Role }) => {
      const { error } = await supabase.rpc('update_user_role_admin', {
        target_user_id: input.userId,
        target_role: input.role,
      });

      if (error) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }

      return input;
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.userRoleUpdated'));
      void usersQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['users', 'getAll'] });
    },
    onError: (error: Error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.userRemovedFromChurch'));
      void usersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async (input: { userId: string; isBlocked: boolean }) => {
      if (!user?.id || user.role !== 'admin') {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }

      if (input.userId === user.id) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: input.isBlocked })
        .eq('id', input.userId);

      if (error) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }

      return input;
    },
    onSuccess: (data) => {
      Alert.alert(t('admin.common.success'), data.isBlocked ? t('admin.alerts.userBlocked') : t('admin.alerts.userUnblocked'));
      void usersQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ['users', 'getAll'] });
    },
    onError: () => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });
  
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      if (!user?.id) {
        throw new Error(t('admin.alerts.mustBeLoggedInCreateChurch'));
      }
      
      const { data: insertedData, error } = await supabase
        .from('groups')
        .insert({
          name: data.name,
          created_by: user.id,
        })
        .select();
      
      if (error) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }
      
      if (insertedData && insertedData[0]) {
        const newGroupId = insertedData[0].id;
        await supabase
          .from('group_members')
          .upsert({ group_id: newGroupId, user_id: user.id }, { onConflict: 'group_id,user_id', ignoreDuplicates: true });
      }

      return insertedData;
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.churchCreated'));
      setGroupName('');
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.failedToCreateChurch')),
  });
  const groupPastorsQuery = useQuery<{ groupId: string; userId: string }[]>({
    queryKey: ['group-pastors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_pastors')
        .select('group_id, user_id');

      if (error) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }

      return (data ?? []).map((row: any) => ({
        groupId: row.group_id,
        userId: row.user_id,
      }));
    },
    enabled: isAdminUser,
  });  
  const groupMembersQuery = useQuery<{ userId: string; fullName: string; email: string; role: string }[]>({
    queryKey: ['group-members', expandedGroupId],
    queryFn: async () => {
      if (!expandedGroupId) return [];
      const { data: memberLinks, error: linkError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', expandedGroupId);
      if (linkError) throw new Error(t('admin.alerts.failedToLoadMembers', { defaultValue: 'Failed to load members.' }));
      if (!memberLinks || memberLinks.length === 0) {
        return [];
      }
      const userIds = memberLinks.map((m: any) => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, email, role')
        .in('id', userIds);
      if (profileError) throw new Error(t('admin.alerts.failedToLoadMembers', { defaultValue: 'Failed to load members.' }));

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

      return userIds.map((uid: string) => {
        const p = profileMap.get(uid);
        if (p) {
          const name = p.full_name || p.display_name || p.email?.split('@')[0] || t('admin.users.memberFallback');
          return {
            userId: p.id,
            fullName: name,
            email: p.email || '',
            role: p.role || 'member',
          };
        }
        return {
          userId: uid,
          fullName: t('admin.users.memberFallback'),
          email: '',
          role: 'member',
        };
      });
    },
    enabled: !!expandedGroupId,
  });

  const assignPastorToGroupMutation = useMutation({
    mutationFn: async (input: { groupId: string; userId: string }) => {
      const { error } = await supabase.rpc('admin_assign_pastor_to_church', {
        target_group_id: input.groupId,
        target_user_id: input.userId,
      });

      if (error) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.pastorAssigned'));
      setSelectedPastorForGroup('');
      void groupPastorsQuery.refetch();
    },
    onError: (error: Error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });

  const removePastorFromGroupMutation = useMutation({
    mutationFn: async (input: { groupId: string; userId: string }) => {
      const { error } = await supabase.rpc('admin_remove_pastor_from_church', {
        target_group_id: input.groupId,
        target_user_id: input.userId,
      });

      if (error) {
        throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      }
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.pastorRemoved'));
      void groupPastorsQuery.refetch();
    },
    onError: (error: Error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });

  const removeMemberFromGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', data.groupId)
        .eq('user_id', data.userId);
      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));

      const { data: profile } = await supabase
        .from('profiles')
        .select('home_group_id')
        .eq('id', data.userId)
        .single();

      if (profile && profile.home_group_id === data.groupId) {
        const { data: otherMemberships } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', data.userId)
          .limit(1);

        const newHomeGroupId = otherMemberships && otherMemberships.length > 0
          ? otherMemberships[0].group_id
          : null;

        await supabase
          .from('profiles')
          .update({ home_group_id: newHomeGroupId })
          .eq('id', data.userId);

      }
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.memberRemovedFromChurch'));
      void queryClient.invalidateQueries({ queryKey: ['group-members', expandedGroupId] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['churches'] });
      void queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'getAll'] });
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' })),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);
      if (membersError) {
        // Continue deleting the church even if related member rows are already unavailable.
      }
      const { error: messagesError } = await supabase
        .from('group_messages')
        .delete()
        .eq('group_id', groupId);
      if (messagesError) {
        // Continue deleting the church even if related message rows are already unavailable.
      }
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.churchDeleted'));
      setExpandedGroupId(null);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' })),
  });

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      t('admin.churches.deleteTitle'),
      t('admin.churches.deleteMessage', { name: groupName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('admin.common.delete'), style: 'destructive', onPress: () => deleteGroupMutation.mutate(groupId) },
      ]
    );
  };

  const handleRemoveMemberFromGroup = (groupId: string, userId: string, name: string) => {
    Alert.alert(
      t('admin.churches.removeMemberTitle'),
      t('admin.churches.removeMemberMessage', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('admin.common.remove'), style: 'destructive', onPress: () => removeMemberFromGroupMutation.mutate({ groupId, userId }) },
      ]
    );
  };

  const groupsQuery = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: async (): Promise<Group[]> => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      return (data as Group[] | null) ?? [];
    },
  });

  const addMembersToGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; userIds: string[] }) => {
      const rows = data.userIds.map(userId => ({
        group_id: data.groupId,
        user_id: userId,
      }));
      const { error } = await supabase
        .from('group_members')
        .upsert(rows, { onConflict: 'group_id,user_id', ignoreDuplicates: true });
      
      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));

      for (const userId of data.userIds) {
        await supabase
          .from('profiles')
          .update({ home_group_id: data.groupId })
          .eq('id', userId);

      }
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.membersAddedToChurch'));
      setSelectedGroupForAdding('');
      setSelectedUsersForGroup([]);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['group-members'] });
      void queryClient.invalidateQueries({ queryKey: ['churches'] });
      void queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'getAll'] });
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.failedToAddMembers')),
  });

  const sermonsQuery = trpc.sermons.getAll.useQuery();

const countriesQuery = useQuery({
  queryKey: ['countries'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) {
      throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    }

    return data ?? [];
  },
});

const groupsWithCountryQuery = useQuery({
  queryKey: ['groups-with-country'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        country_id
      `)
      .order('name');

    if (error) {
      throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    }

    return data ?? [];
  },
});
  const [newCountry, setNewCountry] = useState<{ code: string; name: string; flag: string }>({ code: '', name: '', flag: '' });
  const [selectedUserForCountries, setSelectedUserForCountries] = useState<string | null>(null);
const userCountriesQuery = useQuery({
  queryKey: ['user-countries', selectedUserForCountries],
  enabled: !!selectedUserForCountries,
  queryFn: async () => {
    if (!selectedUserForCountries) return [];

    const { data, error } = await supabase
      .from('user_countries')
      .select('id, country_id, created_at')
      .eq('user_id', selectedUserForCountries);

    if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));

    return data ?? [];
  },
});

  const createCountryMutation = useMutation({
    mutationFn: async (input: { code: string; name: string; flagEmoji?: string | null }) => {
      const { data, error } = await supabase
        .from('countries')
        .insert({
          code: input.code.toUpperCase(),
          name: input.name,
          flag_emoji: input.flagEmoji ?? null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
      return data;
    },
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.countryCreated'));
      setNewCountry({ code: '', name: '', flag: '' });
      void countriesQuery.refetch();
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' })),
  });

  const deleteCountryMutation = useMutation({
    mutationFn: async (input: { countryId: string }) => {
      const { error } = await supabase
        .from('countries')
        .delete()
        .eq('id', input.countryId);

      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
    onSuccess: () => {
      void countriesQuery.refetch();
      void groupsWithCountryQuery.refetch();
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' })),
  });

  const setGroupCountryMutation = useMutation({
    mutationFn: async (input: { groupId: string; countryId: string | null }) => {
      const { error } = await supabase
        .from('groups')
        .update({ country_id: input.countryId })
        .eq('id', input.groupId);

      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
    onSuccess: () => {
      void groupsWithCountryQuery.refetch();
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' })),
  });

const addUserCountryMutation = useMutation({
  mutationFn: async (input: { userId: string; countryId: string }) => {
    const { error } = await supabase
      .from('user_countries')
      .upsert(
        {
          user_id: input.userId,
          country_id: input.countryId,
          created_by: user?.id ?? null,
        },
        {
          onConflict: 'user_id,country_id',
          ignoreDuplicates: true,
        }
      );

    if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
  },
  onSuccess: async () => {
    await userCountriesQuery.refetch();
  },
  onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' })),
});

  const removeUserCountryMutation = useMutation({
    mutationFn: async (input: { userId: string; countryId: string }) => {
      const { error } = await supabase
        .from('user_countries')
        .delete()
        .eq('user_id', input.userId)
        .eq('country_id', input.countryId);

      if (error) throw new Error(t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
    onSuccess: () => {
      void userCountriesQuery.refetch();
    },
    onError: (e: Error) => Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' })),
  });
  const createSermonMutation = trpc.sermons.create.useMutation({
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.sermonCreated'));
      resetSermonForm();
      void sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });

  const updateSermonMutation = trpc.sermons.update.useMutation({
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.sermonUpdated'));
      resetSermonForm();
      void sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });

  const deleteSermonMutation = trpc.sermons.delete.useMutation({
    onSuccess: () => {
      Alert.alert(t('admin.common.success'), t('admin.alerts.sermonDeleted'));
      void sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert(t('admin.common.error'), t('admin.alerts.genericError', { defaultValue: 'Something went wrong. Please try again.' }));
    },
  });

  const resetSermonForm = () => {
    setSermonForm({
      title: '',
      speaker: '',
      date: '',
      duration: '',
      description: '',
      topic: '',
      youtube_url: '',
      thumbnail_url: '',
      is_featured: false,
    });
    setEditingSermon(null);
  };

  const handleSermonSubmit = () => {
    if (!sermonForm.title || !sermonForm.speaker || !sermonForm.date || !sermonForm.duration) {
      Alert.alert(t('admin.common.error'), t('admin.alerts.fillRequiredFields'));
      return;
    }

    if (editingSermon) {
      updateSermonMutation.mutate({
        id: editingSermon.id,
        ...sermonForm,
        youtube_url: sermonForm.youtube_url || null,
        thumbnail_url: sermonForm.thumbnail_url || null,
      });
    } else {
      createSermonMutation.mutate({
        ...sermonForm,
        youtube_url: sermonForm.youtube_url || null,
        thumbnail_url: sermonForm.thumbnail_url || null,
      });
    }
  };

  const handleSermonEdit = (sermon: Sermon) => {
    setEditingSermon(sermon);
    setSermonForm({
      title: sermon.title,
      speaker: sermon.speaker,
      date: sermon.date,
      duration: sermon.duration,
      description: sermon.description,
      topic: sermon.topic,
      youtube_url: sermon.youtube_url || '',
      thumbnail_url: sermon.thumbnail_url || '',
      is_featured: sermon.is_featured,
    });
  };

  const handleSermonDelete = (sermonId: string) => {
    Alert.alert(
      t('admin.sermons.deleteTitle'),
      t('admin.sermons.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.common.delete'),
          style: 'destructive',
          onPress: () => deleteSermonMutation.mutate({ id: sermonId }),
        },
      ]
    );
  };

  const roles: Role[] = ['visitor', 'member', 'pastor', 'church_leader', 'admin'];

  const getRoleDisplayName = (role: Role): string => {
    return t(`admin.roles.${role}`, {
      defaultValue: role,
    });
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      t('admin.users.removeMemberTitle'),
      t('admin.users.removeMemberMessage', { name: userName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.common.remove'),
          style: 'destructive',
          onPress: () => deleteUserMutation.mutate({ userId }),
        },
      ]
    );
  };

  const handleBlockUser = (userId: string, userName: string, currentlyBlocked: boolean) => {
    Alert.alert(
      currentlyBlocked ? t('admin.users.unblockMemberTitle') : t('admin.users.blockMemberTitle'),
      t(currentlyBlocked ? 'admin.users.unblockMemberMessage' : 'admin.users.blockMemberMessage', { name: userName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: currentlyBlocked ? t('admin.common.unblock') : t('admin.common.block'),
          style: currentlyBlocked ? 'default' : 'destructive',
          onPress: () => blockUserMutation.mutate({ userId, isBlocked: !currentlyBlocked }),
        },
      ]
    );
  };

  const canAccessChurchManagement = isAdminUser || isChurchLeaderUser;

  React.useEffect(() => {
    if (!isAdminUser && activeTab !== 'users') {
      setActiveTab('users');
    }
  }, [isAdminUser, activeTab]);

  if (!canAccessChurchManagement) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.accessDenied}>
          <Shield size={48} color="#ef4444" />
          <Text style={styles.accessDeniedTitle}>{t('admin.accessDeniedTitle')}</Text>
          <Text style={styles.accessDeniedText}>{t('admin.accessDeniedText')}</Text>
        </View>
      </View>
    );
  }

  const renderUsersTab = () => (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{usersQuery.data?.length ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.stats.totalMembers')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{usersQuery.data?.filter(u => u.role === 'admin').length ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.stats.admins')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{usersQuery.data?.filter(u => u.role === 'pastor').length ?? 0}</Text>
          <Text style={styles.statLabel}>{t('admin.stats.pastors')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Users size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>{t('admin.users.churchMembers')}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            <RefreshCw size={18} color={usersQuery.isFetching ? "#94a3b8" : "#1e3a8a"} />
          </TouchableOpacity>
        </View>

        {usersQuery.isLoading || currentUserProfileQuery.isLoading ? (
          <View style={styles.loadingRow}><ActivityIndicator color="#1e3a8a" /></View>
        ) : isChurchLeaderUser && !userHomeGroupId ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('admin.users.noChurchAssigned')}</Text>
            <Text style={styles.errorMessage}>
              {t('admin.users.noChurchAssignedMessage')}
            </Text>
          </View>
        ) : usersQuery.isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>{t('admin.users.unableToLoadMembers')}</Text>
            <Text style={styles.errorMessage}>
              {t('admin.users.connectionError')}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => usersQuery.refetch()}>
              <Text style={styles.retryButtonText}>{t('admin.common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : usersQuery.data && usersQuery.data.length > 0 ? (
          usersQuery.data.map((u) => (
            <View key={u.id} style={styles.userSection}>
              <TouchableOpacity
                style={[
                  styles.userCardCollapsed,
                  expandedUserId === u.id && styles.userCardCollapsedActive,
                ]}
                onPress={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                activeOpacity={0.7}
              >
                <View style={styles.userAvatarCircle}>
                  <Text style={styles.userAvatarText}>
                    {(u.firstName?.[0] || '').toUpperCase()}{(u.lastName?.[0] || '').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{u.firstName} {u.lastName}</Text>
                    {u.isBlocked && (
                      <View style={styles.blockedBadge}>
                        <Ban size={10} color="#ef4444" />
                        <Text style={styles.blockedBadgeText}>{t('admin.users.blocked')}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userRoleInlineBadge}>
                    <Text style={styles.userRoleInlineText}>{getRoleDisplayName(u.role as Role)}</Text>
                  </View>
                </View>
                {expandedUserId === u.id ? (
                  <ChevronUp size={18} color="#1e3a8a" />
                ) : (
                  <ChevronDown size={18} color="#64748b" />
                )}
              </TouchableOpacity>

              {expandedUserId === u.id && (
                <View style={styles.userExpandedPanel}>
                  <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>{t('admin.users.email')}</Text>
                    <Text style={styles.userDetailValue}>{u.email}</Text>
                  </View>

              {user?.role === 'admin' && (
                <>
                  <Text style={styles.roleLabel}>{t('admin.users.changeRole')}</Text>
                  <View style={styles.roleSelector}>
                    {roles.map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleChip,
                          u.role === r && styles.roleChipActive,
                        ]}
                        onPress={() => {
                          if (u.role !== r) {
                            updateRoleMutation.mutate({
                              userId: u.id,
                              role: r,
                            });
                          }
                        }}
                        disabled={updateRoleMutation.isPending}
                      >
                        <Text style={[
                          styles.roleChipText,
                          u.role === r && styles.roleChipTextActive,
                        ]}>
                          {getRoleDisplayName(r)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {user?.role === 'admin' && (
                <View style={styles.userExpandedActions}>
                  <TouchableOpacity
                    style={[styles.userActionButton, u.isBlocked ? styles.userActionButtonWarning : styles.userActionButtonDefault]}
                    onPress={() => handleBlockUser(u.id, `${u.firstName} ${u.lastName}`, u.isBlocked)}
                    disabled={blockUserMutation.isPending}
                  >
                    <Ban size={14} color={u.isBlocked ? "#f97316" : "#64748b"} />
                    <Text style={[styles.userActionButtonText, u.isBlocked && styles.userActionButtonTextWarning]}>
                      {u.isBlocked ? t('admin.common.unblock') : t('admin.common.block')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.userActionButton, styles.userActionButtonDanger]}
                    onPress={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                    disabled={deleteUserMutation.isPending}
                  >
                    <Trash2 size={14} color="#ef4444" />
                    <Text style={styles.userActionButtonTextDanger}>{t('admin.common.remove')}</Text>
                  </TouchableOpacity>
                </View>
              )}
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('admin.users.noMembersFound')}</Text>
        )}
      </View>
    
      {user?.role === 'admin' && (
        <View style={styles.userSection}>
          <TouchableOpacity
            style={[
              styles.userCardCollapsed,
              addUserExpanded && styles.userCardCollapsedActive,
            ]}
            onPress={() => setAddUserExpanded(!addUserExpanded)}
            activeOpacity={0.7}
          >
            <View style={[styles.userAvatarCircle, { backgroundColor: '#16a34a' }]}>
              <UserPlus size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{t('admin.users.addNewMember')}</Text>
              <Text style={styles.userEmail}>{t('admin.users.addNewMemberSubtitle')}</Text>
            </View>
            {addUserExpanded ? (
              <ChevronUp size={18} color="#1e3a8a" />
            ) : (
              <ChevronDown size={18} color="#64748b" />
            )}
          </TouchableOpacity>

          {addUserExpanded && (
            <View style={styles.userExpandedPanel}>
              <View style={styles.row}>
                <TextInput
                  style={styles.inputInPanel}
                  placeholder={t('admin.users.firstName')}
                  value={newUser.firstName}
                  onChangeText={(t) => setNewUser((p) => ({ ...p, firstName: t }))}
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  style={styles.inputInPanel}
                  placeholder={t('admin.users.lastName')}
                  value={newUser.lastName}
                  onChangeText={(t) => setNewUser((p) => ({ ...p, lastName: t }))}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <TextInput
                style={styles.inputInPanel}
                placeholder={t('admin.users.email')}
                autoCapitalize="none"
                keyboardType="email-address"
                value={newUser.email}
                onChangeText={(t) => setNewUser((p) => ({ ...p, email: t }))}
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.inputInPanel}
                placeholder={t('admin.users.phoneOptional')}
                keyboardType="phone-pad"
                value={newUser.phone}
                onChangeText={(t) => setNewUser((p) => ({ ...p, phone: t }))}
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.inputInPanel}
                placeholder={t('admin.users.password')}
                secureTextEntry
                value={newUser.password}
                onChangeText={(t) => setNewUser((p) => ({ ...p, password: t }))}
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.roleLabel}>{t('admin.users.selectRole')}</Text>
              <View style={styles.roleSelectorInline}>
                {roles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleChip, newUser.role === r && styles.roleChipActive]}
                    onPress={() => setNewUser((p) => ({ ...p, role: r }))}
                  >
                    <Text style={[styles.roleChipText, newUser.role === r && styles.roleChipTextActive]}>
                      {getRoleDisplayName(r)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                testID="create-user-button"
                style={[styles.primaryButton, createUserMutation.isPending && { opacity: 0.7 }]}
                onPress={() => {
                  if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
                    Alert.alert(t('admin.alerts.missingInformation'), t('admin.alerts.missingUserFields'));
                    return;
                  }

                  createUserMutation.mutate({
                    email: newUser.email,
                    password: newUser.password,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    phone: newUser.phone || undefined,
                    role: newUser.role,
                    permissions: [],
                  });
                }}
              >
                {createUserMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>{t('admin.users.addMember')}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </>
  );  
  const renderSermonsTab = () => (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BookOpen size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>
            {editingSermon ? t('admin.sermons.editSermon') : t('admin.sermons.addNewSermon')}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('admin.sermons.titlePlaceholder')}
          value={sermonForm.title}
          onChangeText={(text) => setSermonForm({ ...sermonForm, title: text })}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          style={styles.input}
          placeholder={t('admin.sermons.speakerPlaceholder')}
          value={sermonForm.speaker}
          onChangeText={(text) => setSermonForm({ ...sermonForm, speaker: text })}
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={t('admin.sermons.datePlaceholder')}
            value={sermonForm.date}
            onChangeText={(text) => setSermonForm({ ...sermonForm, date: text })}
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={t('admin.sermons.durationPlaceholder')}
            value={sermonForm.duration}
            onChangeText={(text) => setSermonForm({ ...sermonForm, duration: text })}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder={t('admin.sermons.topicPlaceholder')}
          value={sermonForm.topic}
          onChangeText={(text) => setSermonForm({ ...sermonForm, topic: text })}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('admin.sermons.descriptionPlaceholder')}
          value={sermonForm.description}
          onChangeText={(text) => setSermonForm({ ...sermonForm, description: text })}
          multiline
          numberOfLines={4}
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.youtubeSection}>
          <View style={styles.youtubeBadge}>
            <Youtube size={14} color="#ef4444" />
            <Text style={styles.youtubeBadgeText}>{t('admin.sermons.youtubeIntegration')}</Text>
          </View>
          
          <TextInput
            style={styles.inputLight}
            placeholder={t('admin.sermons.youtubeUrlPlaceholder')}
            value={sermonForm.youtube_url}
            onChangeText={(text) => setSermonForm({ ...sermonForm, youtube_url: text })}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor="#94a3b8"
          />
          
          <TextInput
            style={styles.inputLight}
            placeholder={t('admin.sermons.thumbnailUrlPlaceholder')}
            value={sermonForm.thumbnail_url}
            onChangeText={(text) => setSermonForm({ ...sermonForm, thumbnail_url: text })}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('admin.sermons.featuredSermon')}</Text>
          <Switch
            value={sermonForm.is_featured}
            onValueChange={(value) => setSermonForm({ ...sermonForm, is_featured: value })}
            trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
            thumbColor={sermonForm.is_featured ? '#1e3a8a' : '#f1f5f9'}
          />
        </View>

        <View style={styles.buttonRow}>
          {editingSermon && (
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={resetSermonForm}
            >
              <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { flex: 1 },
              (createSermonMutation.isPending || updateSermonMutation.isPending) && { opacity: 0.7 },
            ]}
            onPress={handleSermonSubmit}
            disabled={createSermonMutation.isPending || updateSermonMutation.isPending}
          >
            {createSermonMutation.isPending || updateSermonMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Plus size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {editingSermon ? t('admin.common.update') : t('admin.common.create')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BookOpen size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>{t('admin.sermons.existingSermons')}</Text>
        </View>

        {sermonsQuery.isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#1e3a8a" />
          </View>
        ) : sermonsQuery.data && sermonsQuery.data.length > 0 ? (
          sermonsQuery.data.map((sermon) => (
            <View key={sermon.id} style={styles.sermonRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.sermonTitleRow}>
                  <Text style={styles.sermonTitle}>{sermon.title}</Text>
                  {sermon.is_featured && (
                    <View style={styles.featuredBadgeSmall}>
                      <Text style={styles.featuredBadgeSmallText}>{t('admin.sermons.featured')}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sermonMeta}>
                  {sermon.speaker} • {sermon.date} • {sermon.duration}
                </Text>
                {sermon.youtube_url && (
                  <View style={styles.youtubeIndicator}>
                    <Youtube size={12} color="#ef4444" />
                    <Text style={styles.youtubeIndicatorText}>{t('admin.sermons.youtubeVideo')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleSermonEdit(sermon)}
                >
                  <Edit size={18} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleSermonDelete(sermon.id)}
                  disabled={deleteSermonMutation.isPending}
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('admin.sermons.empty')}</Text>
        )}
      </View>
    </>
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUsersForGroup(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembersToGroup = () => {
    if (!selectedGroupForAdding) {
      Alert.alert(t('admin.common.error'), t('admin.alerts.selectChurchFirst'));
      return;
    }
    if (selectedUsersForGroup.length === 0) {
      Alert.alert(t('admin.common.error'), t('admin.alerts.selectAtLeastOneMember'));
      return;
    }
    addMembersToGroupMutation.mutate({
      groupId: selectedGroupForAdding,
      userIds: selectedUsersForGroup,
    });
  };

  const renderGroupsTab = () => {
    const allUsers = usersQuery.data ?? [];
    const allPastorAssignments = groupPastorsQuery.data ?? [];
    const allPastors = allUsers.filter((member) => member.role === 'pastor');

    return (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Church size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>{t('admin.churches.createChurch')}</Text>
        </View>

        <View style={styles.row}>
          <TextInput 
            style={styles.input} 
            placeholder={t('admin.churches.churchNamePlaceholder')} 
            value={groupName} 
            onChangeText={setGroupName}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.primaryButtonCompact]}
            onPress={() => {
              if (!groupName.trim()) {
                Alert.alert(t('admin.common.error'), t('admin.alerts.enterChurchName'));
                return;
              }
              createGroupMutation.mutate({ name: groupName.trim() });
            }}
            disabled={createGroupMutation.isPending}
          >
            {createGroupMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{t('admin.common.create')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Church size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>{t('admin.churches.existingChurches')}</Text>
        </View>

        {groupsQuery.isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#1e3a8a" />
          </View>
        ) : groupsQuery.data && groupsQuery.data.length > 0 ? (
          groupsQuery.data.map((group) => (
            <View key={group.id} style={styles.groupSection}>
              <View style={[
                styles.groupCard,
                selectedGroupForAdding === group.id && styles.groupCardSelected,
              ]}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    setSelectedGroupForAdding(
                      selectedGroupForAdding === group.id ? '' : group.id
                    );
                    setSelectedUsersForGroup([]);
                  }}
                >
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {t('admin.churches.created', { date: new Date(group.created_at).toLocaleDateString(i18n.language) })}
                  </Text>
                </TouchableOpacity>
                <View style={styles.groupActions}>
                  <TouchableOpacity
                    style={styles.groupActionBtn}
                    onPress={() => {
                      const next = expandedGroupId === group.id ? null : group.id;
                      setExpandedGroupId(next);
                    }}
                  >
                    {expandedGroupId === group.id ? (
                      <ChevronUp size={18} color="#1e3a8a" />
                    ) : (
                      <ChevronDown size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.groupActionBtn}
                    onPress={() => handleDeleteGroup(group.id, group.name)}
                    disabled={deleteGroupMutation.isPending}
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                  {selectedGroupForAdding === group.id && (
                    <View style={styles.selectedBadge}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </View>

              {expandedGroupId === group.id && (
                <View style={styles.membersPanel}>
                  <Text style={styles.membersPanelTitle}>{t('admin.users.churchMembers')}</Text>
                  {groupMembersQuery.isLoading ? (
                    <ActivityIndicator color="#1e3a8a" style={{ paddingVertical: 12 }} />
                  ) : groupMembersQuery.data && groupMembersQuery.data.length > 0 ? (
                    groupMembersQuery.data.map((member) => (
                      <View key={member.userId} style={styles.memberRow}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {(member.fullName?.[0] || '').toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>{member.fullName}</Text>
                        </View>
                        <View style={styles.memberRoleBadge}>
                          <Text style={styles.memberRoleText}>{getRoleDisplayName(member.role as Role)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeMemberBtn}
                          onPress={() => handleRemoveMemberFromGroup(group.id, member.userId, member.fullName)}
                          disabled={removeMemberFromGroupMutation.isPending}
                        >
                          <X size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noMembersText}>{t('admin.churches.noMembersInChurch')}</Text>
                  )}

                  <View style={{ marginTop: 18 }}>
                    <Text style={styles.membersPanelTitle}>{t('admin.churches.assignedPastors')}</Text>

                    {allPastorAssignments.filter((assignment) => assignment.groupId === group.id).length > 0 ? (
                      allPastorAssignments
                        .filter((assignment) => assignment.groupId === group.id)
                        .map((assignment) => {
                          const pastor = allUsers.find((member) => member.id === assignment.userId);

                          return (
                            <View key={`${assignment.groupId}-${assignment.userId}`} style={styles.memberRow}>
                              <View style={styles.memberAvatar}>
                                <Text style={styles.memberAvatarText}>
                                  {(pastor?.firstName?.[0] || 'P').toUpperCase()}
                                </Text>
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text style={styles.memberName}>
                                  {pastor ? `${pastor.firstName} ${pastor.lastName}` : t('admin.roles.pastor')}
                                </Text>
                                {pastor?.email ? (
                                  <Text style={styles.memberEmail}>{pastor.email}</Text>
                                ) : null}
                              </View>

                              <TouchableOpacity
                                style={styles.removeMemberBtn}
                                onPress={() =>
                                  removePastorFromGroupMutation.mutate({
                                    groupId: group.id,
                                    userId: assignment.userId,
                                  })
                                }
                                disabled={removePastorFromGroupMutation.isPending}
                              >
                                <X size={14} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          );
                        })
                    ) : (
                      <Text style={styles.noMembersText}>{t('admin.churches.noPastorsAssigned')}</Text>
                    )}

                    <Text style={[styles.roleLabel, { marginTop: 14 }]}>{t('admin.churches.addPastor')}</Text>

                    <View style={styles.roleSelector}>
                      {allPastors
                        .filter(
                          (pastor) =>
                            !allPastorAssignments.some(
                              (assignment) =>
                                assignment.groupId === group.id && assignment.userId === pastor.id
                            )
                        )
                        .map((pastor) => (
                          <TouchableOpacity
                            key={pastor.id}
                            style={[
                              styles.roleChip,
                              selectedPastorForGroup === pastor.id && styles.roleChipActive,
                            ]}
                            onPress={() => setSelectedPastorForGroup(pastor.id)}
                          >
                            <Text
                              style={[
                                styles.roleChipText,
                                selectedPastorForGroup === pastor.id && styles.roleChipTextActive,
                              ]}
                            >
                              {pastor.firstName} {pastor.lastName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>

                    {allPastors.length === 0 ? (
                      <Text style={styles.noMembersText}>{t('admin.churches.noPastorUsers')}</Text>
                    ) : null}

                    {selectedPastorForGroup ? (
                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          { marginTop: 12 },
                          assignPastorToGroupMutation.isPending && { opacity: 0.7 },
                        ]}
                        onPress={() =>
                          assignPastorToGroupMutation.mutate({
                            groupId: group.id,
                            userId: selectedPastorForGroup,
                          })
                        }
                        disabled={assignPastorToGroupMutation.isPending}
                      >
                        {assignPastorToGroupMutation.isPending ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryButtonText}>{t('admin.churches.assignPastor')}</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>{t('admin.churches.empty')}</Text>
        )}
      </View>

      {selectedGroupForAdding && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserPlus size={20} color="#1e3a8a" />
            <Text style={styles.cardTitle}>{t('admin.churches.addMembersToChurch')}</Text>
          </View>

          <Text style={styles.helpText}>{t('admin.churches.selectMembersToAdd')}</Text>

          {usersQuery.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#1e3a8a" />
            </View>
          ) : usersQuery.data && usersQuery.data.length > 0 ? (
            <>
              {usersQuery.data.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.userSelectCard}
                  onPress={() => toggleUserSelection(member.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>
                      {member.firstName} {member.lastName}
                    </Text>
                    <Text style={styles.userEmail}>{member.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedUsersForGroup.includes(member.id) && styles.checkboxChecked,
                    ]}
                  >
                    {selectedUsersForGroup.includes(member.id) && (
                      <Check size={16} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (addMembersToGroupMutation.isPending || selectedUsersForGroup.length === 0) && { opacity: 0.7 },
                ]}
                onPress={handleAddMembersToGroup}
                disabled={addMembersToGroupMutation.isPending || selectedUsersForGroup.length === 0}
              >
                {addMembersToGroupMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      {t('admin.churches.addMembersButton', { count: selectedUsersForGroup.length })}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyText}>{t('admin.churches.noMembersAvailable')}</Text>
          )}
        </View>
      )}
      </>
    );
  };

  const renderCountriesTab = () => {
    const countries = countriesQuery.data ?? [];
    const groups = groupsWithCountryQuery.data ?? [];
    const users = usersQuery.data ?? [];
    const assignedCountryIds = new Set((userCountriesQuery.data ?? []).map((r) => r.country_id));
    return (
      <>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Globe size={20} color="#1e3a8a" />
            <Text style={styles.cardTitle}>{t('admin.countries.title')}</Text>
          </View>
          {countriesQuery.isLoading && countries.length === 0 ? (
            <ActivityIndicator color="#1e3a8a" />
          ) : countries.length === 0 ? (
            <Text style={styles.emptyText}>{t('admin.countries.empty')}</Text>
          ) : (
            countries.map((c) => (
              <View key={c.id} style={styles.countryRow}>
                <Text style={styles.countryRowFlag}>{c.flag_emoji ?? '🌍'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.countryRowName}>{c.name}</Text>
                  <Text style={styles.countryRowCode}>{c.code}</Text>
                </View>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => {
                    Alert.alert(t('admin.countries.deleteTitle'), t('admin.countries.deleteMessage', { name: c.name }), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('admin.common.delete'), style: 'destructive', onPress: () => deleteCountryMutation.mutate({ countryId: c.id }) },
                    ]);
                  }}
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Plus size={20} color="#1e3a8a" />
            <Text style={styles.cardTitle}>{t('admin.countries.addCountry')}</Text>
          </View>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder={t('admin.countries.codePlaceholder')}
              autoCapitalize="characters"
              value={newCountry.code}
              onChangeText={(t) => setNewCountry((p) => ({ ...p, code: t.toUpperCase() }))}
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.input}
              placeholder={t('admin.countries.flagPlaceholder')}
              value={newCountry.flag}
              onChangeText={(t) => setNewCountry((p) => ({ ...p, flag: t }))}
              placeholderTextColor="#94a3b8"
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder={t('admin.countries.namePlaceholder')}
            value={newCountry.name}
            onChangeText={(t) => setNewCountry((p) => ({ ...p, name: t }))}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.primaryButton, createCountryMutation.isPending && { opacity: 0.7 }]}
            onPress={() => {
              if (!newCountry.code.trim() || !newCountry.name.trim()) {
                Alert.alert(t('admin.alerts.missingInformation'), t('admin.alerts.missingCountryFields'));
                return;
              }
              createCountryMutation.mutate({
                code: newCountry.code.trim(),
                name: newCountry.name.trim(),
                flagEmoji: newCountry.flag.trim() || null,
              });
            }}
            disabled={createCountryMutation.isPending}
          >
            {createCountryMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}><Plus size={16} color="#fff" /><Text style={styles.primaryButtonText}>{t('admin.countries.addCountry')}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Church size={20} color="#1e3a8a" />
            <Text style={styles.cardTitle}>{t('admin.countries.churchCountry')}</Text>
          </View>
          {groupsWithCountryQuery.isLoading && groups.length === 0 ? (
            <ActivityIndicator color="#1e3a8a" />
          ) : groups.length === 0 ? (
            <Text style={styles.emptyText}>{t('admin.churches.noChurchesYet')}</Text>
          ) : (
            groups.map((g) => (
              <View key={g.id} style={styles.groupCountryRow}>
                <Text style={styles.groupCountryName}>{g.name}</Text>
                <View style={styles.groupCountryChips}>
                  {countries.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.roleChip, g.country_id === c.id && styles.roleChipActive]}
                      onPress={() => setGroupCountryMutation.mutate({ groupId: g.id, countryId: c.id })}
                    >
                      <Text style={[styles.roleChipText, g.country_id === c.id && styles.roleChipTextActive]}>
                        {c.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserPlus size={20} color="#1e3a8a" />
            <Text style={styles.cardTitle}>{t('admin.countries.grantExtraCountries')}</Text>
          </View>
          <Text style={styles.helpText}>
            {t('admin.countries.grantExtraCountriesHelp')}
          </Text>
          <Text style={styles.roleLabel}>{t('admin.countries.selectUser')}</Text>
          <View style={styles.groupCountryChips}>
            {users.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[styles.roleChip, selectedUserForCountries === u.id && styles.roleChipActive]}
                onPress={() => setSelectedUserForCountries(selectedUserForCountries === u.id ? null : u.id)}
              >
                <Text style={[styles.roleChipText, selectedUserForCountries === u.id && styles.roleChipTextActive]}>
                  {u.firstName} {u.lastName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedUserForCountries && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.roleLabel}>{t('admin.countries.toggleCountries')}</Text>
              <View style={styles.groupCountryChips}>
                {countries.map((c) => {
                  const assigned = assignedCountryIds.has(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.countryToggleButton,
                        assigned && styles.countryToggleButtonActive,
                      ]}
                      onPress={() => {
                        if (assigned) {
                          removeUserCountryMutation.mutate({ userId: selectedUserForCountries, countryId: c.id });
                        } else {
                          addUserCountryMutation.mutate({ userId: selectedUserForCountries, countryId: c.id });
                        }
                      }}
                    >
                      <Text style={[
                        styles.countryToggleButtonText,
                        assigned && styles.countryToggleButtonTextActive,
                      ]}>
                        {c.flag_emoji ?? '🌍'} {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.header}>
        <Text style={styles.headerTitle}>{t('admin.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('admin.subtitle')}</Text>
      </LinearGradient>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Users size={16} color={activeTab === 'users' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>{t('admin.tabs.members')}</Text>
          </TouchableOpacity>

          {isAdminUser && (
            <>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'sermons' && styles.tabActive]}
                onPress={() => setActiveTab('sermons')}
              >
                <BookOpen size={16} color={activeTab === 'sermons' ? '#1e3a8a' : '#64748b'} />
                <Text style={[styles.tabText, activeTab === 'sermons' && styles.tabTextActive]}>{t('admin.tabs.sermons')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
                onPress={() => setActiveTab('groups')}
              >
                <Church size={16} color={activeTab === 'groups' ? '#1e3a8a' : '#64748b'} />
                <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>{t('admin.tabs.churches')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, activeTab === 'countries' && styles.tabActive]}
                onPress={() => setActiveTab('countries')}
              >
                <Globe size={16} color={activeTab === 'countries' ? '#1e3a8a' : '#64748b'} />
                <Text style={[styles.tabText, activeTab === 'countries' && styles.tabTextActive]}>{t('admin.countries.title')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {activeTab === 'users' && renderUsersTab()}
        {isAdminUser && activeTab === 'sermons' && renderSermonsTab()}
        {isAdminUser && activeTab === 'groups' && renderGroupsTab()}
        {isAdminUser && activeTab === 'countries' && renderCountriesTab()}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' as const, color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  accessDeniedTitle: { fontSize: 20, fontWeight: 'bold' as const, color: '#1e293b', marginTop: 16 },
  accessDeniedText: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' as const },
  statsRow: { flexDirection: 'row' as const, gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' as const, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 24, fontWeight: 'bold' as const, color: '#1e3a8a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  tabBar: { flexDirection: 'row' as const, gap: 4, marginBottom: 16, backgroundColor: 'white', padding: 4, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tab: { flex: 1, flexDirection: 'column' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 4, paddingVertical: 8, paddingHorizontal: 2, borderRadius: 8, minWidth: 0 },
  tabActive: { backgroundColor: '#eff6ff' },
  tabText: { fontSize: 11, fontWeight: '600' as const, color: '#64748b' },
  tabTextActive: { color: '#1e3a8a' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700' as const, color: '#1e293b', flex: 1 },
  refreshButton: { padding: 8 },
  userSection: { marginBottom: 10 },
  userCardCollapsed: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  userCardCollapsedActive: { backgroundColor: '#eff6ff', borderColor: '#1e3a8a', borderWidth: 2, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  userAvatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e3a8a', justifyContent: 'center' as const, alignItems: 'center' as const },
  userAvatarText: { color: '#fff', fontSize: 14, fontWeight: '700' as const },
  userRoleInlineBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' as const, marginTop: 4 },
  userRoleInlineText: { fontSize: 11, fontWeight: '600' as const, color: '#3730a3', textTransform: 'capitalize' as const },
  userExpandedPanel: { backgroundColor: '#f0f4ff', borderRadius: 12, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 14, marginTop: -1, borderWidth: 1, borderTopWidth: 0, borderColor: '#dbeafe' },
  userDetailRow: { marginBottom: 12 },
  userDetailLabel: { fontSize: 11, fontWeight: '700' as const, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 },
  userDetailValue: { fontSize: 14, color: '#1e293b' },
  userExpandedActions: { flexDirection: 'row' as const, gap: 10, marginTop: 14 },
  userActionButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  userActionButtonDefault: { backgroundColor: '#fff', borderColor: '#e2e8f0' },
  userActionButtonWarning: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  userActionButtonDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  userActionButtonText: { fontSize: 13, fontWeight: '600' as const, color: '#64748b' },
  userActionButtonTextWarning: { color: '#f97316' },
  userActionButtonTextDanger: { fontSize: 13, fontWeight: '600' as const, color: '#ef4444' },
  userNameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, flexWrap: 'wrap' as const },

  blockedBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 3, backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fee2e2' },
  blockedBadgeText: { fontSize: 9, fontWeight: '700' as const, color: '#ef4444', letterSpacing: 0.5 },
  iconButtonSmall: { width: 36, height: 36, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  iconButtonWarning: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  userName: { fontSize: 15, fontWeight: '600' as const, color: '#1e293b' },
  userEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  roleLabel: { fontSize: 12, fontWeight: '600' as const, color: '#64748b', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  roleSelector: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  roleSelectorInline: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  roleChipActive: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  roleChipText: { fontSize: 13, color: '#334155', fontWeight: '500' as const },
  roleChipTextActive: { color: 'white', fontWeight: '600' as const },
  row: { flexDirection: 'row' as const, gap: 12, marginBottom: 12 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 12, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', fontSize: 15, marginBottom: 12 },
  inputLight: { flex: 1, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 12, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', fontSize: 15, marginBottom: 12 },
  primaryButton: { backgroundColor: '#1e3a8a', paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
  primaryButtonCompact: { backgroundColor: '#1e3a8a', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' as const },
  primaryButtonText: { color: 'white', fontWeight: '700' as const, fontSize: 15 },
  secondaryButton: { backgroundColor: 'white', borderWidth: 2, borderColor: '#1e3a8a', paddingVertical: 12, borderRadius: 12, alignItems: 'center' as const },
  secondaryButtonText: { color: '#1e3a8a', fontWeight: '700' as const, fontSize: 15 },
  buttonContent: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  buttonRow: { flexDirection: 'row' as const, gap: 12 },
  loadingRow: { paddingVertical: 24, alignItems: 'center' as const },
  textArea: { height: 100, textAlignVertical: 'top' as const },
  youtubeSection: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginBottom: 12 },
  youtubeBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, marginBottom: 12 },
  youtubeBadgeText: { fontSize: 12, fontWeight: '700' as const, color: '#ef4444', letterSpacing: 0.5 },
  switchRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 16, paddingVertical: 8 },
  switchLabel: { fontSize: 15, fontWeight: '600' as const, color: '#1e293b' },
  sermonRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sermonTitleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 4 },
  sermonTitle: { fontSize: 15, fontWeight: '600' as const, color: '#1e293b', flex: 1 },
  sermonMeta: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  featuredBadgeSmall: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  featuredBadgeSmallText: { fontSize: 10, fontWeight: '700' as const, color: '#92400e', letterSpacing: 0.5 },
  youtubeIndicator: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, marginTop: 4 },
  youtubeIndicatorText: { fontSize: 11, color: '#ef4444', fontWeight: '600' as const },
  actionButtons: { flexDirection: 'row' as const, gap: 8 },
  iconButton: { width: 40, height: 40, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: '#f8fafc', borderRadius: 10 },
  emptyText: { textAlign: 'center' as const, color: '#94a3b8', paddingVertical: 24, fontSize: 14 },
  errorContainer: { backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center' as const },
  errorTitle: { fontSize: 15, fontWeight: '700' as const, color: '#b91c1c', marginBottom: 6 },
  errorMessage: { fontSize: 13, color: '#7f1d1d', textAlign: 'center' as const },
  retryButton: { marginTop: 12, backgroundColor: '#b91c1c', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' as const },
  helpText: { color: '#64748b', fontSize: 13, marginBottom: 12 },
  groupCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row' as const, alignItems: 'center' as const },
  groupCardSelected: { backgroundColor: '#eff6ff', borderColor: '#1e3a8a', borderWidth: 2 },
  groupSection: { marginBottom: 10 },
  groupName: { fontSize: 15, fontWeight: '600' as const, color: '#1e293b', marginBottom: 4 },
  groupMeta: { fontSize: 12, color: '#64748b' },
  groupActions: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  groupActionBtn: { width: 34, height: 34, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  selectedBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a8a', justifyContent: 'center' as const, alignItems: 'center' as const },
  membersPanel: { backgroundColor: '#f0f4ff', borderRadius: 12, padding: 14, marginTop: -4, borderWidth: 1, borderColor: '#dbeafe' },
  membersPanelTitle: { fontSize: 13, fontWeight: '700' as const, color: '#1e3a8a', marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  memberRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#dbeafe', gap: 10 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e3a8a', justifyContent: 'center' as const, alignItems: 'center' as const },
  memberAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' as const },
  memberName: { fontSize: 14, fontWeight: '600' as const, color: '#1e293b' },
  memberEmail: { fontSize: 12, color: '#64748b', marginTop: 1 },
  memberRoleBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  memberRoleText: { fontSize: 11, fontWeight: '600' as const, color: '#3730a3', textTransform: 'capitalize' as const },
  removeMemberBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: '#fee2e2' },
  noMembersText: { color: '#64748b', fontSize: 13, textAlign: 'center' as const, paddingVertical: 16 },
  userSelectCard: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center' as const, alignItems: 'center' as const },
  checkboxChecked: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
  inputInPanel: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 12, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b', fontSize: 15, marginBottom: 12 },
  spacer: { height: 40 },
  countryRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  countryRowFlag: { fontSize: 22 },
  countryRowName: { fontSize: 15, fontWeight: '600' as const, color: '#1e293b' },
  countryRowCode: { fontSize: 11, color: '#64748b', marginTop: 2, letterSpacing: 1 },
  groupCountryRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  groupCountryName: { fontSize: 14, fontWeight: '600' as const, color: '#1e293b', marginBottom: 8 },
  groupCountryChips: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6 },
  countryToggleButton: {
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#cbd5e1',
  backgroundColor: '#ffffff',
  marginRight: 8,
  marginBottom: 8,
},

countryToggleButtonActive: {
  backgroundColor: '#1e3a8a',
  borderColor: '#1e3a8a',
},

countryToggleButtonText: {
  fontSize: 14,
  fontWeight: '600' as const,
  color: '#334155',
},

countryToggleButtonTextActive: {
  color: '#ffffff',
},
});
