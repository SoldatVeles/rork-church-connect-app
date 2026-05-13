import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { Stack } from 'expo-router';
import { Users, Shield, Plus, Check, UserPlus, Church, BookOpen, Youtube, Edit, Trash2, Ban, RefreshCw, ChevronDown, ChevronUp, X, Globe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { canAccessAdminPanel } from '@/utils/permissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import type { Sermon } from '@/types/sermon';
import { LinearGradient } from 'expo-linear-gradient';

type Role = 'admin' | 'church_leader' | 'pastor' | 'member' | 'visitor';

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

type AdminTab = 'users' | 'sermons' | 'groups' | 'countries';

export default function AdminTabScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  
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
  };

  const usersQuery = useQuery<AdminUserRow[]>({
    queryKey: ['users', 'getAll'],
    queryFn: async (): Promise<AdminUserRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, display_name, role, is_blocked, created_at, phone')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{
        id: string;
        email: string | null;
        full_name: string | null;
        display_name: string | null;
        role: string | null;
        is_blocked: boolean | null;
        created_at: string;
        phone: string | null;
      }>;
      return rows
        .filter((p) => Boolean(p.email))
        .map((p) => {
          const fullName = p.display_name || p.full_name || (p.email ? p.email.split('@')[0] : 'User');
          const parts = fullName.trim().split(/\s+/);
          return {
            id: p.id,
            firstName: parts[0] || 'User',
            lastName: parts.slice(1).join(' ') || '',
            email: p.email ?? '',
            role: ((p.role as Role) || 'member'),
            isBlocked: Boolean(p.is_blocked),
            createdAt: p.created_at,
            displayName: fullName,
            phone: p.phone ?? undefined,
          };
        });
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (usersQuery.data) {
      console.log('[Admin] Users loaded:', usersQuery.data.length);
    }
  }, [usersQuery.data]);

  React.useEffect(() => {
    if (usersQuery.error) {
      console.error('[Admin] Users query error:', usersQuery.error);
    }
  }, [usersQuery.error]);

  const _diagnosticsQuery = trpc.users.diagnostics.useQuery(undefined, {
    enabled: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'member' as Role });
  const [groupName, setGroupName] = useState('');
  const [selectedGroupForAdding, setSelectedGroupForAdding] = useState<string>('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<string[]>([]);
  
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
      console.log('[Admin] User created successfully', createdUser);
      void queryClient.invalidateQueries({ queryKey: ['users', 'getAll'] });
      void usersQuery.refetch();
      setNewUser({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'member' });
      const requiresEmailConfirmation = Boolean(createdUser?.requiresEmailConfirmation);
      const successMessage = requiresEmailConfirmation
        ? 'Account created. The user must confirm their email before they can sign in.'
        : 'User created and ready to sign in.';
      Alert.alert('Success', successMessage);
    },
    onError: (error) => {
      console.error('[Admin] User creation failed', error);
      Alert.alert('Error', error.message ?? 'Failed to create user');
    },
  });
  
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'User role updated successfully');
      void usersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'User removed from church successfully');
      void usersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const blockUserMutation = trpc.users.block.useMutation({
    onSuccess: (data) => {
      Alert.alert('Success', data.isBlocked ? 'User blocked successfully' : 'User unblocked successfully');
      void usersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });
  
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      if (!user?.id) {
        throw new Error('You must be logged in to create a group');
      }
      
      console.log('[Admin] Creating group:', data.name, 'by user:', user.id);
      
      const { data: insertedData, error } = await supabase
        .from('groups')
        .insert({
          name: data.name,
          created_by: user.id,
        })
        .select();
      
      if (error) {
        console.error('[Admin] Group creation error:', error);
        throw new Error(error.message);
      }
      
      console.log('[Admin] Group created successfully:', insertedData);

      if (insertedData && insertedData[0]) {
        const newGroupId = insertedData[0].id;
        console.log('[Admin] Auto-adding creator as member of group:', newGroupId);
        const { error: memberError } = await supabase
          .from('group_members')
          .upsert({ group_id: newGroupId, user_id: user.id }, { onConflict: 'group_id,user_id', ignoreDuplicates: true });
        if (memberError) {
          console.warn('[Admin] Error auto-adding creator as member:', memberError.message);
        }
      }

      return insertedData;
    },
    onSuccess: () => {
      Alert.alert('Success', 'Church group created');
      setGroupName('');
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['user-groups'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to create group'),
  });
  
  const groupMembersQuery = useQuery<{ userId: string; fullName: string; email: string; role: string }[]>({
    queryKey: ['group-members', expandedGroupId],
    queryFn: async () => {
      if (!expandedGroupId) return [];
      console.log('[Admin] Fetching members for group:', expandedGroupId);
      const { data: memberLinks, error: linkError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', expandedGroupId);
      console.log('[Admin] Member links result:', { memberLinks, linkError });
      if (linkError) throw new Error(linkError.message);
      if (!memberLinks || memberLinks.length === 0) {
        console.log('[Admin] No member links found for group:', expandedGroupId);
        return [];
      }
      const userIds = memberLinks.map((m: any) => m.user_id);
      console.log('[Admin] Looking up profiles for user IDs:', userIds);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, email, role')
        .in('id', userIds);
      console.log('[Admin] Profiles result:', { profiles, profileError });
      if (profileError) throw new Error(profileError.message);

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.id, p));

      return userIds.map((uid: string) => {
        const p = profileMap.get(uid);
        if (p) {
          const name = p.full_name || p.display_name || p.email?.split('@')[0] || 'Member';
          return {
            userId: p.id,
            fullName: name,
            email: p.email || '',
            role: p.role || 'member',
          };
        }
        return {
          userId: uid,
          fullName: 'Member',
          email: '',
          role: 'member',
        };
      });
    },
    enabled: !!expandedGroupId,
  });

  const removeMemberFromGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; userId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', data.groupId)
        .eq('user_id', data.userId);
      if (error) throw new Error(error.message);

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

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ home_group_id: newHomeGroupId })
          .eq('id', data.userId);

        if (updateError) {
          console.warn('[Admin] Failed to clear home_group_id for user:', data.userId, updateError.message);
        } else {
          console.log('[Admin] Updated home_group_id for user:', data.userId, '→', newHomeGroupId);
        }
      }
    },
    onSuccess: () => {
      Alert.alert('Success', 'Member removed from group');
      void queryClient.invalidateQueries({ queryKey: ['group-members', expandedGroupId] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['churches'] });
      void queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'getAll'] });
      void queryClient.invalidateQueries({ queryKey: ['prayers'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error: membersError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId);
      if (membersError) console.warn('[Admin] Error deleting group members:', membersError.message);
      const { error: messagesError } = await supabase
        .from('group_messages')
        .delete()
        .eq('group_id', groupId);
      if (messagesError) console.warn('[Admin] Error deleting group messages:', messagesError.message);
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Group deleted');
      setExpandedGroupId(null);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${groupName}"? All members and messages will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGroupMutation.mutate(groupId) },
      ]
    );
  };

  const handleRemoveMemberFromGroup = (groupId: string, userId: string, name: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${name} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeMemberFromGroupMutation.mutate({ groupId, userId }) },
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
      
      if (error) throw new Error(error.message);
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
      
      if (error) throw new Error(error.message);

      for (const userId of data.userIds) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ home_group_id: data.groupId })
          .eq('id', userId);

        if (updateError) {
          console.warn('[Admin] Failed to sync home_group_id for user:', userId, updateError.message);
        } else {
          console.log('[Admin] Synced home_group_id for user:', userId, '→', data.groupId);
        }
      }
    },
    onSuccess: () => {
      Alert.alert('Success', 'Members added to church group');
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
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to add members'),
  });

  const sermonsQuery = trpc.sermons.getAll.useQuery();

  const countriesQuery = trpc.countries.list.useQuery();
  const groupsWithCountryQuery = trpc.countries.listGroupsWithCountry.useQuery();
  const [newCountry, setNewCountry] = useState<{ code: string; name: string; flag: string }>({ code: '', name: '', flag: '' });
  const [selectedUserForCountries, setSelectedUserForCountries] = useState<string | null>(null);
  const userCountriesQuery = trpc.countries.getUserCountries.useQuery(
    { userId: selectedUserForCountries ?? '' },
    { enabled: !!selectedUserForCountries }
  );

  const createCountryMutation = trpc.countries.create.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Country created');
      setNewCountry({ code: '', name: '', flag: '' });
      void countriesQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const deleteCountryMutation = trpc.countries.delete.useMutation({
    onSuccess: () => {
      void countriesQuery.refetch();
      void groupsWithCountryQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const setGroupCountryMutation = trpc.countries.setGroupCountry.useMutation({
    onSuccess: () => {
      void groupsWithCountryQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const addUserCountryMutation = trpc.countries.addUserCountry.useMutation({
    onSuccess: () => {
      void userCountriesQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const removeUserCountryMutation = trpc.countries.removeUserCountry.useMutation({
    onSuccess: () => {
      void userCountriesQuery.refetch();
    },
    onError: (e) => Alert.alert('Error', e.message),
  });

  const createSermonMutation = trpc.sermons.create.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon created successfully');
      resetSermonForm();
      void sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateSermonMutation = trpc.sermons.update.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon updated successfully');
      resetSermonForm();
      void sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteSermonMutation = trpc.sermons.delete.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon deleted successfully');
      void sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
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
      Alert.alert('Error', 'Please fill in all required fields');
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
      'Delete Sermon',
      'Are you sure you want to delete this sermon?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSermonMutation.mutate({ id: sermonId }),
        },
      ]
    );
  };

  const roles: Role[] = ['visitor', 'member', 'pastor', 'church_leader', 'admin'];

  const getRoleDisplayName = (role: Role): string => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'church_leader': return 'Church Leader';
      case 'pastor': return 'Pastor';
      case 'member': return 'Member';
      case 'visitor': return 'Visitor';
      default: return role;
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${userName} from the church? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteUserMutation.mutate({ userId }),
        },
      ]
    );
  };

  const handleBlockUser = (userId: string, userName: string, currentlyBlocked: boolean) => {
    Alert.alert(
      currentlyBlocked ? 'Unblock Member' : 'Block Member',
      `Are you sure you want to ${currentlyBlocked ? 'unblock' : 'block'} ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlyBlocked ? 'Unblock' : 'Block',
          style: currentlyBlocked ? 'default' : 'destructive',
          onPress: () => blockUserMutation.mutate({ userId, isBlocked: !currentlyBlocked }),
        },
      ]
    );
  };

  if (!canAccessAdminPanel(user)) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.accessDenied}>
          <Shield size={48} color="#ef4444" />
          <Text style={styles.accessDeniedTitle}>Admin Access Only</Text>
          <Text style={styles.accessDeniedText}>You do not have permission to access this section.</Text>
        </View>
      </View>
    );
  }

  const renderUsersTab = () => (
    <>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{usersQuery.data?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Total Members</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{usersQuery.data?.filter(u => u.role === 'admin').length ?? 0}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{usersQuery.data?.filter(u => u.role === 'pastor').length ?? 0}</Text>
          <Text style={styles.statLabel}>Pastors</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Users size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>Church Members</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
          >
            <RefreshCw size={18} color={usersQuery.isFetching ? "#94a3b8" : "#1e3a8a"} />
          </TouchableOpacity>
        </View>

        {usersQuery.isLoading ? (
          <View style={styles.loadingRow}><ActivityIndicator color="#1e3a8a" /></View>
        ) : usersQuery.isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to load members</Text>
            <Text style={styles.errorMessage}>
              {usersQuery.error?.message ?? 'Please check your connection.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => usersQuery.refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
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
                        <Text style={styles.blockedBadgeText}>BLOCKED</Text>
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
                    <Text style={styles.userDetailLabel}>Email</Text>
                    <Text style={styles.userDetailValue}>{u.email}</Text>
                  </View>

                  <Text style={styles.roleLabel}>Change Role:</Text>
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

                  <View style={styles.userExpandedActions}>
                    <TouchableOpacity
                      style={[styles.userActionButton, u.isBlocked ? styles.userActionButtonWarning : styles.userActionButtonDefault]}
                      onPress={() => handleBlockUser(u.id, `${u.firstName} ${u.lastName}`, u.isBlocked)}
                      disabled={blockUserMutation.isPending}
                    >
                      <Ban size={14} color={u.isBlocked ? "#f97316" : "#64748b"} />
                      <Text style={[styles.userActionButtonText, u.isBlocked && styles.userActionButtonTextWarning]}>
                        {u.isBlocked ? 'Unblock' : 'Block'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.userActionButton, styles.userActionButtonDanger]}
                      onPress={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                      disabled={deleteUserMutation.isPending}
                    >
                      <Trash2 size={14} color="#ef4444" />
                      <Text style={styles.userActionButtonTextDanger}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No members found</Text>
        )}
      </View>

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
            <Text style={styles.userName}>Add New Member</Text>
            <Text style={styles.userEmail}>Tap to expand and fill in details</Text>
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
              <TextInput style={styles.inputInPanel} placeholder="First name" value={newUser.firstName} onChangeText={(t)=>setNewUser((p)=>({...p, firstName:t}))} placeholderTextColor="#94a3b8" />
              <TextInput style={styles.inputInPanel} placeholder="Last name" value={newUser.lastName} onChangeText={(t)=>setNewUser((p)=>({...p, lastName:t}))} placeholderTextColor="#94a3b8" />
            </View>
            <TextInput style={styles.inputInPanel} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={newUser.email} onChangeText={(t)=>setNewUser((p)=>({...p, email:t}))} placeholderTextColor="#94a3b8" />
            <TextInput style={styles.inputInPanel} placeholder="Phone (optional)" keyboardType="phone-pad" value={newUser.phone} onChangeText={(t)=>setNewUser((p)=>({...p, phone:t}))} placeholderTextColor="#94a3b8" />
            <TextInput style={styles.inputInPanel} placeholder="Password" secureTextEntry value={newUser.password} onChangeText={(t)=>setNewUser((p)=>({...p, password:t}))} placeholderTextColor="#94a3b8" />

            <Text style={styles.roleLabel}>Select Role:</Text>
            <View style={styles.roleSelectorInline}>
              {roles.map((r) => (
                <TouchableOpacity key={r} style={[styles.roleChip, newUser.role === r && styles.roleChipActive]} onPress={()=>setNewUser((p)=>({...p, role: r}))}>
                  <Text style={[styles.roleChipText, newUser.role === r && styles.roleChipTextActive]}>{getRoleDisplayName(r)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              testID="create-user-button"
              style={[styles.primaryButton, createUserMutation.isPending && { opacity: 0.7 }]}
              onPress={() => {
                if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
                  Alert.alert('Missing Information', 'Please fill in first name, last name, email, and password.');
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
                <View style={styles.buttonContent}><Plus size={18} color="#fff" /><Text style={styles.primaryButtonText}>Add Member</Text></View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );

  const renderSermonsTab = () => (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BookOpen size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>
            {editingSermon ? 'Edit Sermon' : 'Add New Sermon'}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Title *"
          value={sermonForm.title}
          onChangeText={(text) => setSermonForm({ ...sermonForm, title: text })}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          style={styles.input}
          placeholder="Speaker *"
          value={sermonForm.speaker}
          onChangeText={(text) => setSermonForm({ ...sermonForm, speaker: text })}
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Date * (e.g. January 14, 2025)"
            value={sermonForm.date}
            onChangeText={(text) => setSermonForm({ ...sermonForm, date: text })}
            placeholderTextColor="#94a3b8"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Duration * (e.g. 45 min)"
            value={sermonForm.duration}
            onChangeText={(text) => setSermonForm({ ...sermonForm, duration: text })}
            placeholderTextColor="#94a3b8"
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Topic *"
          value={sermonForm.topic}
          onChangeText={(text) => setSermonForm({ ...sermonForm, topic: text })}
          placeholderTextColor="#94a3b8"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description *"
          value={sermonForm.description}
          onChangeText={(text) => setSermonForm({ ...sermonForm, description: text })}
          multiline
          numberOfLines={4}
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.youtubeSection}>
          <View style={styles.youtubeBadge}>
            <Youtube size={14} color="#ef4444" />
            <Text style={styles.youtubeBadgeText}>YouTube Integration</Text>
          </View>
          
          <TextInput
            style={styles.inputLight}
            placeholder="YouTube URL (optional)"
            value={sermonForm.youtube_url}
            onChangeText={(text) => setSermonForm({ ...sermonForm, youtube_url: text })}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor="#94a3b8"
          />
          
          <TextInput
            style={styles.inputLight}
            placeholder="Thumbnail URL (optional)"
            value={sermonForm.thumbnail_url}
            onChangeText={(text) => setSermonForm({ ...sermonForm, thumbnail_url: text })}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Featured Sermon</Text>
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
              <Text style={styles.secondaryButtonText}>Cancel</Text>
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
                  {editingSermon ? 'Update' : 'Create'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BookOpen size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>Existing Sermons</Text>
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
                      <Text style={styles.featuredBadgeSmallText}>FEATURED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sermonMeta}>
                  {sermon.speaker} • {sermon.date} • {sermon.duration}
                </Text>
                {sermon.youtube_url && (
                  <View style={styles.youtubeIndicator}>
                    <Youtube size={12} color="#ef4444" />
                    <Text style={styles.youtubeIndicatorText}>YouTube Video</Text>
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
          <Text style={styles.emptyText}>No sermons yet. Create your first one!</Text>
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
      Alert.alert('Error', 'Please select a group first');
      return;
    }
    if (selectedUsersForGroup.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }
    addMembersToGroupMutation.mutate({
      groupId: selectedGroupForAdding,
      userIds: selectedUsersForGroup,
    });
  };

  const renderGroupsTab = () => (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Church size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>Create Church Group</Text>
        </View>

        <View style={styles.row}>
          <TextInput 
            style={styles.input} 
            placeholder="Group name (e.g. Youth Ministry)" 
            value={groupName} 
            onChangeText={setGroupName}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.primaryButtonCompact]}
            onPress={() => {
              if (!groupName.trim()) {
                Alert.alert('Error', 'Please enter a group name');
                return;
              }
              createGroupMutation.mutate({ name: groupName.trim() });
            }}
            disabled={createGroupMutation.isPending}
          >
            {createGroupMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Church size={20} color="#1e3a8a" />
          <Text style={styles.cardTitle}>Existing Groups</Text>
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
                    Created {new Date(group.created_at).toLocaleDateString()}
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
                  <Text style={styles.membersPanelTitle}>Group Members</Text>
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
                          <Text style={styles.memberRoleText}>{member.role}</Text>
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
                    <Text style={styles.noMembersText}>No members in this group</Text>
                  )}
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No groups yet. Create your first one!</Text>
        )}
      </View>

      {selectedGroupForAdding && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserPlus size={20} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Add Members to Group</Text>
          </View>

          <Text style={styles.helpText}>Select members to add to this group:</Text>

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
                      Add {selectedUsersForGroup.length} Member{selectedUsersForGroup.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyText}>No members available</Text>
          )}
        </View>
      )}
    </>
  );

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
            <Text style={styles.cardTitle}>Countries</Text>
          </View>
          {countriesQuery.isLoading ? (
            <ActivityIndicator color="#1e3a8a" />
          ) : countries.length === 0 ? (
            <Text style={styles.emptyText}>No countries yet. Add the first one below.</Text>
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
                    Alert.alert('Delete Country', `Remove ${c.name}? Churches assigned to it will become unassigned.`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteCountryMutation.mutate({ countryId: c.id }) },
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
            <Text style={styles.cardTitle}>Add Country</Text>
          </View>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="Code (e.g. CH)"
              autoCapitalize="characters"
              value={newCountry.code}
              onChangeText={(t) => setNewCountry((p) => ({ ...p, code: t.toUpperCase() }))}
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.input}
              placeholder="Flag (🇨🇭)"
              value={newCountry.flag}
              onChangeText={(t) => setNewCountry((p) => ({ ...p, flag: t }))}
              placeholderTextColor="#94a3b8"
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Switzerland)"
            value={newCountry.name}
            onChangeText={(t) => setNewCountry((p) => ({ ...p, name: t }))}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.primaryButton, createCountryMutation.isPending && { opacity: 0.7 }]}
            onPress={() => {
              if (!newCountry.code.trim() || !newCountry.name.trim()) {
                Alert.alert('Missing Information', 'Please provide both a code and a name.');
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
              <View style={styles.buttonContent}><Plus size={16} color="#fff" /><Text style={styles.primaryButtonText}>Add Country</Text></View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Church size={20} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Church → Country</Text>
          </View>
          {groupsWithCountryQuery.isLoading ? (
            <ActivityIndicator color="#1e3a8a" />
          ) : groups.length === 0 ? (
            <Text style={styles.emptyText}>No churches yet.</Text>
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
                        {c.flag_emoji ?? '🌍'} {c.code}
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
            <Text style={styles.cardTitle}>Grant Extra Countries to User</Text>
          </View>
          <Text style={styles.helpText}>
            A user&apos;s primary country comes from their church. Use this to grant access to additional countries (e.g. for visiting members).
          </Text>
          <Text style={styles.roleLabel}>Select a user:</Text>
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
              <Text style={styles.roleLabel}>Toggle countries:</Text>
              <View style={styles.groupCountryChips}>
                {countries.map((c) => {
                  const assigned = assignedCountryIds.has(c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.roleChip, assigned && styles.roleChipActive]}
                      onPress={() => {
                        if (assigned) {
                          removeUserCountryMutation.mutate({ userId: selectedUserForCountries, countryId: c.id });
                        } else {
                          addUserCountryMutation.mutate({ userId: selectedUserForCountries, countryId: c.id });
                        }
                      }}
                    >
                      <Text style={[styles.roleChipText, assigned && styles.roleChipTextActive]}>
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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Manage your church community</Text>
      </LinearGradient>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Users size={16} color={activeTab === 'users' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sermons' && styles.tabActive]}
            onPress={() => setActiveTab('sermons')}
          >
            <BookOpen size={16} color={activeTab === 'sermons' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'sermons' && styles.tabTextActive]}>Sermons</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Church size={16} color={activeTab === 'groups' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'countries' && styles.tabActive]}
            onPress={() => setActiveTab('countries')}
          >
            <Globe size={16} color={activeTab === 'countries' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'countries' && styles.tabTextActive]}>Countries</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'sermons' && renderSermonsTab()}
        {activeTab === 'groups' && renderGroupsTab()}
        {activeTab === 'countries' && renderCountriesTab()}

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
});
