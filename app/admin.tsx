import React, { useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Users, Shield, Plus, Check, UserPlus, Church } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Role = 'admin' | 'pastor' | 'member' | 'visitor';

interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdAt: string;
}

export default function AdminScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      
      return data.map(profile => ({
        id: profile.id,
        firstName: profile.display_name?.split(' ')[0] || '',
        lastName: profile.display_name?.split(' ').slice(1).join(' ') || '',
        email: profile.email,
        role: profile.role,
        permissions: [],
        joinedAt: new Date(profile.created_at),
        createdAt: profile.created_at,
      }));
    },
  });
  
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'member' as Role });
  const [groupName, setGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState<string>('');

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
  
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: Role; permissions: string[] }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: data.role })
        .eq('id', data.userId);
      
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      Alert.alert('Updated', 'User role updated');
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to update role'),
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
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to create group'),
  });
  
  const addMemberToGroupMutation = useMutation({
    mutationFn: async (data: { groupId: string; userId: string }) => {
      // This would need to be implemented with a group_members table
      console.log('Add member to group not implemented yet:', data);
      throw new Error('Add member to group not implemented yet');
    },
    onSuccess: () => {
      Alert.alert('Success', 'Member added to group');
      setSelectedGroup('');
      setSelectedUserToAdd('');
    },
    onError: (e: Error) => Alert.alert('Error', e.message ?? 'Failed to add member'),
  });

  const roles: Role[] = ['visitor', 'member', 'pastor', 'admin'];

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Manage users and groups</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Users size={18} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Users</Text>
          </View>

          {usersQuery.isLoading ? (
            <View style={styles.loadingRow}><ActivityIndicator color="#1e3a8a" /></View>
          ) : (
            usersQuery.data?.map((u) => (
              <View key={u.id} style={styles.userRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.firstName} {u.lastName}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                </View>
                <View style={styles.roleSelector}>
                  {roles.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, u.role === r && styles.roleChipActive]}
                      onPress={() => updateRoleMutation.mutate({ userId: u.id, role: r, permissions: [] })}
                      testID={`set-role-${u.id}-${r}`}
                    >
                      <Text style={[styles.roleChipText, u.role === r && styles.roleChipTextActive]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
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

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Church size={18} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Groups</Text>
          </View>

          <View style={styles.row}>
            <TextInput style={styles.input} placeholder="New group name (e.g. Church Bern)" value={groupName} onChangeText={setGroupName} />
            <TouchableOpacity
              style={[styles.primaryButton, { paddingHorizontal: 16 }]}
              onPress={() => {
                if (!groupName.trim()) return;
                createGroupMutation.mutate({ name: groupName.trim() });
              }}
            >
              <Text style={styles.primaryButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Group ID" value={selectedGroup} onChangeText={setSelectedGroup} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="User ID" value={selectedUserToAdd} onChangeText={setSelectedUserToAdd} />
          </View>
          <TouchableOpacity
            testID="add-to-group-button"
            style={[styles.secondaryButton, addMemberToGroupMutation.isPending && { opacity: 0.7 }]}
            onPress={() => {
              if (!selectedGroup || !selectedUserToAdd) {
                Alert.alert('Select group and user');
                return;
              }
              addMemberToGroupMutation.mutate({ groupId: selectedGroup, userId: selectedUserToAdd });
            }}
          >
            {addMemberToGroupMutation.isPending ? (
              <ActivityIndicator color="#1e3a8a" />
            ) : (
              <View style={styles.buttonContent}><Check size={16} color="#1e3a8a" /><Text style={styles.secondaryButtonText}>Add Member</Text></View>
            )}
          </TouchableOpacity>

          <Text style={styles.helpText}>Tip: We kept it simple. Paste the target Group ID and User ID above. A richer picker can be added next.</Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 24 },
  header: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  userName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  userEmail: { fontSize: 12, color: '#64748b' },
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
  spacer: { height: 40 },
});
