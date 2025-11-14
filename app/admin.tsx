import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Users, Shield, Plus, Check, UserPlus, Church, BookOpen, Settings, Youtube, Edit, Trash2, ArrowLeft, Ban } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import type { Sermon } from '@/types/sermon';
import { router } from 'expo-router';

type Role = 'admin' | 'pastor' | 'member' | 'visitor';

interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface GroupWithMembers extends Group {
  memberCount: number;
}

type AdminTab = 'users' | 'sermons' | 'groups';

export default function AdminScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  
  const usersQuery = trpc.users.getAll.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('[Admin] Users query success, received users:', data?.length || 0);
      console.log('[Admin] Users data:', JSON.stringify(data, null, 2));
    },
    onError: (error) => {
      console.error('[Admin] Users query error:', error);
    },
  });

  console.log('[Admin] Users query state:', {
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    dataLength: usersQuery.data?.length,
    error: usersQuery.error,
  });
  
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'member' as Role });
  const [groupName, setGroupName] = useState('');
  const [selectedGroupForAdding, setSelectedGroupForAdding] = useState<string>('');
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState<string[]>([]);
  
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

  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role: Role;
      permissions: string[];
    }) => {
      // This would need to be implemented with Supabase Auth
      console.log('Create user not implemented yet:', userData);
      throw new Error('User creation not implemented yet');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewUser({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'member' });
      Alert.alert('Success', 'User created');
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to create user'),
  });
  
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'User role updated successfully');
      usersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'User deleted successfully');
      usersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const blockUserMutation = trpc.users.block.useMutation({
    onSuccess: (data) => {
      Alert.alert('Success', data.isBlocked ? 'User blocked successfully' : 'User unblocked successfully');
      usersQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });
  
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const { error } = await supabase
        .from('groups')
        .insert({
          name: data.name,
          created_by: user?.id || '',
        });
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Group created');
      setGroupName('');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to create group'),
  });
  
  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const addMembersToGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; userIds: string[] }) => {
      const { error } = await supabase
        .from('group_members')
        .insert(
          data.userIds.map(userId => ({
            group_id: data.groupId,
            user_id: userId,
          }))
        );
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      Alert.alert('Success', 'Members added to group');
      setSelectedGroupForAdding('');
      setSelectedUsersForGroup([]);
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to add members'),
  });

  const sermonsQuery = trpc.sermons.getAll.useQuery();

  const createSermonMutation = trpc.sermons.create.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon created successfully');
      resetSermonForm();
      sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateSermonMutation = trpc.sermons.update.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon updated successfully');
      resetSermonForm();
      sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteSermonMutation = trpc.sermons.delete.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon deleted successfully');
      sermonsQuery.refetch();
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

  const roles: Role[] = ['visitor', 'member', 'pastor', 'admin'];

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteUserMutation.mutate({ userId }),
        },
      ]
    );
  };

  const handleBlockUser = (userId: string, userName: string, currentlyBlocked: boolean) => {
    Alert.alert(
      currentlyBlocked ? 'Unblock User' : 'Block User',
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

  const canAccess = user?.role === 'admin';
  if (!canAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}> 
          <Shield size={32} color="#ef4444" />
          <Text style={styles.deniedText}>Admin access only</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderUsersTab = () => (
    <>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={18} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Users</Text>
          </View>

          {usersQuery.isLoading ? (
            <View style={styles.loadingRow}><ActivityIndicator color="#1e3a8a" /></View>
          ) : usersQuery.data && usersQuery.data.length > 0 ? (
            usersQuery.data.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userCardHeader}>
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
                    <Text style={styles.userEmail}>{u.email}</Text>
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={[styles.iconButtonSmall, u.isBlocked && styles.iconButtonWarning]}
                      onPress={() => handleBlockUser(u.id, `${u.firstName} ${u.lastName}`, u.isBlocked)}
                      disabled={blockUserMutation.isPending}
                    >
                      <Ban size={16} color={u.isBlocked ? "#f97316" : "#64748b"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButtonSmall}
                      onPress={() => handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)}
                      disabled={deleteUserMutation.isPending}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                
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
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No users found</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserPlus size={18} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Create Account</Text>
          </View>

          <View style={styles.row}>
            <TextInput style={styles.input} placeholder="First name" value={newUser.firstName} onChangeText={(t)=>setNewUser((p)=>({...p, firstName:t}))} />
            <TextInput style={styles.input} placeholder="Last name" value={newUser.lastName} onChangeText={(t)=>setNewUser((p)=>({...p, lastName:t}))} />
          </View>
          <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={newUser.email} onChangeText={(t)=>setNewUser((p)=>({...p, email:t}))} />
          <TextInput style={styles.input} placeholder="Phone (optional)" keyboardType="phone-pad" value={newUser.phone} onChangeText={(t)=>setNewUser((p)=>({...p, phone:t}))} />
          <TextInput style={styles.input} placeholder="Password" secureTextEntry value={newUser.password} onChangeText={(t)=>setNewUser((p)=>({...p, password:t}))} />

          <View style={styles.roleSelectorInline}>
            {roles.map((r) => (
              <TouchableOpacity key={r} style={[styles.roleChip, newUser.role === r && styles.roleChipActive]} onPress={()=>setNewUser((p)=>({...p, role: r}))}>
                <Text style={[styles.roleChipText, newUser.role === r && styles.roleChipTextActive]}>{r.charAt(0).toUpperCase()+r.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            testID="create-user-button"
            style={[styles.primaryButton, createUserMutation.isPending && { opacity: 0.7 }]}
            onPress={() => {
              if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
                Alert.alert('Fill all fields', 'First, last, email, password required');
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
              <View style={styles.buttonContent}><Plus size={16} color="#fff" /><Text style={styles.primaryButtonText}>Create</Text></View>
            )}
          </TouchableOpacity>
        </View>



        <View style={styles.spacer} />
      </>
  );

  const renderSermonsTab = () => (
    <>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <BookOpen size={18} color="#1e3a8a" />
          <Text style={styles.cardTitle}>
            {editingSermon ? 'Edit Sermon' : 'Add New Sermon'}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Title *"
          value={sermonForm.title}
          onChangeText={(text) => setSermonForm({ ...sermonForm, title: text })}
        />

        <TextInput
          style={styles.input}
          placeholder="Speaker *"
          value={sermonForm.speaker}
          onChangeText={(text) => setSermonForm({ ...sermonForm, speaker: text })}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Date * (e.g. January 14, 2025)"
            value={sermonForm.date}
            onChangeText={(text) => setSermonForm({ ...sermonForm, date: text })}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Duration * (e.g. 45 min)"
            value={sermonForm.duration}
            onChangeText={(text) => setSermonForm({ ...sermonForm, duration: text })}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Topic *"
          value={sermonForm.topic}
          onChangeText={(text) => setSermonForm({ ...sermonForm, topic: text })}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description *"
          value={sermonForm.description}
          onChangeText={(text) => setSermonForm({ ...sermonForm, description: text })}
          multiline
          numberOfLines={4}
        />

        <View style={styles.youtubeSection}>
          <View style={styles.youtubeBadge}>
            <Youtube size={14} color="#ef4444" />
            <Text style={styles.youtubeBadgeText}>YouTube Integration</Text>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="YouTube URL (optional)"
            value={sermonForm.youtube_url}
            onChangeText={(text) => setSermonForm({ ...sermonForm, youtube_url: text })}
            autoCapitalize="none"
            keyboardType="url"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Thumbnail URL (optional)"
            value={sermonForm.thumbnail_url}
            onChangeText={(text) => setSermonForm({ ...sermonForm, thumbnail_url: text })}
            autoCapitalize="none"
            keyboardType="url"
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
                <Plus size={16} color="#fff" />
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
          <BookOpen size={18} color="#1e3a8a" />
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

      <View style={styles.spacer} />
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
      Alert.alert('Error', 'Please select at least one user');
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
          <Church size={18} color="#1e3a8a" />
          <Text style={styles.cardTitle}>Create Group</Text>
        </View>

        <View style={styles.row}>
          <TextInput 
            style={styles.input} 
            placeholder="Group name (e.g. Church Bern)" 
            value={groupName} 
            onChangeText={setGroupName} 
          />
          <TouchableOpacity
            style={[styles.primaryButton, { paddingHorizontal: 16 }]}
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
          <Church size={18} color="#1e3a8a" />
          <Text style={styles.cardTitle}>Existing Groups</Text>
        </View>

        {groupsQuery.isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#1e3a8a" />
          </View>
        ) : groupsQuery.data && groupsQuery.data.length > 0 ? (
          groupsQuery.data.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupCard,
                selectedGroupForAdding === group.id && styles.groupCardSelected,
              ]}
              onPress={() => {
                setSelectedGroupForAdding(
                  selectedGroupForAdding === group.id ? '' : group.id
                );
                setSelectedUsersForGroup([]);
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMeta}>
                  Created {new Date(group.created_at).toLocaleDateString()}
                </Text>
              </View>
              {selectedGroupForAdding === group.id && (
                <View style={styles.selectedBadge}>
                  <Check size={14} color="#1e3a8a" />
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No groups yet. Create your first one!</Text>
        )}
      </View>

      {selectedGroupForAdding && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserPlus size={18} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Add Members to Group</Text>
          </View>

          <Text style={styles.helpText}>Select users to add to this group:</Text>

          {usersQuery.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#1e3a8a" />
            </View>
          ) : usersQuery.data && usersQuery.data.length > 0 ? (
            <>
              {usersQuery.data.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userSelectCard}
                  onPress={() => toggleUserSelection(user.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedUsersForGroup.includes(user.id) && styles.checkboxChecked,
                    ]}
                  >
                    {selectedUsersForGroup.includes(user.id) && (
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
                    <Plus size={16} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      Add {selectedUsersForGroup.length} Member{selectedUsersForGroup.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyText}>No users available</Text>
          )}
        </View>
      )}

      <View style={styles.spacer} />
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Comprehensive admin management</Text>
          </View>
          <Settings size={24} color="#64748b" />
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Users size={18} color={activeTab === 'users' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sermons' && styles.tabActive]}
            onPress={() => setActiveTab('sermons')}
          >
            <BookOpen size={18} color={activeTab === 'sermons' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'sermons' && styles.tabTextActive]}>Sermons</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Church size={18} color={activeTab === 'groups' ? '#1e3a8a' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>Groups</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'sermons' && renderSermonsTab()}
        {activeTab === 'groups' && renderGroupsTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backButton: { padding: 4 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 20, backgroundColor: 'white', padding: 6, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  tabActive: { backgroundColor: '#eff6ff' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#1e3a8a' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  userCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  userCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userActions: { flexDirection: 'row', gap: 6 },
  blockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fee2e2' },
  blockedBadgeText: { fontSize: 9, fontWeight: '700', color: '#ef4444', letterSpacing: 0.5 },
  iconButtonSmall: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  iconButtonWarning: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  userName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  userEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  userRole: { fontSize: 11, color: '#3b82f6', fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  roleSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  roleSelectorInline: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  roleChipActive: { backgroundColor: '#1e3a8a' },
  roleChipText: { fontSize: 12, color: '#334155' },
  roleChipTextActive: { color: 'white', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 10, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
  primaryButton: { backgroundColor: '#1e3a8a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  secondaryButton: { backgroundColor: 'white', borderWidth: 1, borderColor: '#1e3a8a', paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  secondaryButtonText: { color: '#1e3a8a', fontWeight: '700' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingRow: { paddingVertical: 16, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deniedText: { marginTop: 8, color: '#ef4444', fontWeight: '600' },
  helpText: { marginTop: 8, color: '#64748b', fontSize: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },
  youtubeSection: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 12 },
  youtubeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  youtubeBadgeText: { fontSize: 12, fontWeight: '700', color: '#ef4444', letterSpacing: 0.5 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingVertical: 8 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  sermonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sermonTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sermonTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1 },
  sermonMeta: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  featuredBadgeSmall: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  featuredBadgeSmallText: { fontSize: 10, fontWeight: '700', color: '#92400e', letterSpacing: 0.5 },
  youtubeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  youtubeIndicatorText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8 },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 16 },
  spacer: { height: 40 },
  groupCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  groupCardSelected: { backgroundColor: '#eff6ff', borderColor: '#1e3a8a', borderWidth: 2 },
  groupName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginBottom: 4 },
  groupMeta: { fontSize: 12, color: '#64748b' },
  selectedBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center' },
  userSelectCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#1e3a8a', borderColor: '#1e3a8a' },
});
