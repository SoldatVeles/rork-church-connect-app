import { StatusBar } from 'expo-status-bar';
import { 
  User, 
  Calendar, 
  Settings, 
  LogOut, 
  Shield,
  Bell,
  Heart,
  Users,
  ChevronRight
} from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import { isChurchLeaderLevel as checkIsChurchLeader } from '@/utils/permissions';
import { router } from 'expo-router';
import { trpc } from '@/lib/trpc';

export default function ProfileScreen() {
  const { user, logout, isLogoutLoading } = useAuth();

  const { data: userStats, isLoading: isStatsLoading } = trpc.users.getStats.useQuery(
    { userId: user?.id ?? '' },
    { enabled: !!user?.id && user?.role !== 'admin' }
  );

  const { data: totalCount, isLoading: isTotalCountLoading } = trpc.users.getTotalCount.useQuery(
    undefined,
    { enabled: checkIsChurchLeader(user) }
  );

  const handleLogout = () => {
    console.log('handleLogout called');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: () => {
            console.log('User confirmed logout, calling logout function');
            logout();
          }
        },
      ]
    );
  };

  const isLeaderOrAdmin = checkIsChurchLeader(user);

  const profileStats = [
    { 
      label: 'Events Attended', 
      value: isStatsLoading ? '...' : String(userStats?.eventsAttended ?? 0), 
      icon: Calendar, 
      color: '#3b82f6' 
    },
    { 
      label: 'Prayers Shared', 
      value: isStatsLoading ? '...' : String(userStats?.prayersShared ?? 0), 
      icon: Heart, 
      color: '#ef4444' 
    },
    { 
      label: isLeaderOrAdmin ? 'Total Users' : 'Church Members', 
      value: isLeaderOrAdmin 
        ? (isTotalCountLoading ? '...' : String(totalCount?.totalUsers ?? 0))
        : (isStatsLoading ? '...' : String(userStats?.membersCount ?? 0)), 
      icon: Users, 
      color: '#10b981' 
    },
  ];

  const menuItems = [
    { 
      title: 'Notifications', 
      subtitle: 'Manage your notification preferences',
      icon: Bell, 
      onPress: () => {} 
    },
    { 
      title: 'Privacy & Security', 
      subtitle: 'Control your privacy settings',
      icon: Shield, 
      onPress: () => {} 
    },
    { 
      title: 'App Settings', 
      subtitle: 'Customize your app experience',
      icon: Settings, 
      onPress: () => {} 
    },
    ...(checkIsChurchLeader(user) ? [{
      title: 'Admin Dashboard',
      subtitle: 'Manage users, sermons, and groups',
      icon: Shield,
      onPress: () => router.push('/admin')
    }] : []),
  ];

  const formatDate = (input: Date | string) => {
    const date = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#8b5cf6';
      case 'pastor': return '#3b82f6';
      case 'member': return '#10b981';
      default: return '#64748b';
    }
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={40} color="white" />
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role || '') }]}>
              <Text style={styles.roleBadgeText}>{getRoleLabel(user?.role || '')}</Text>
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone && (
              <Text style={styles.userPhone}>{user.phone}</Text>
            )}
            <Text style={styles.joinDate}>
              Member since {formatDate(user?.joinedAt ?? new Date())}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            {profileStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                  <stat.icon size={20} color="white" />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {user?.permissions && user.permissions.length > 0 && (
          <View style={styles.permissionsContainer}>
            <Text style={styles.sectionTitle}>Your Permissions</Text>
            <View style={styles.permissionsList}>
              {user.permissions.map((permission, index) => (
                <View key={index} style={styles.permissionItem}>
                  <Shield size={16} color="#64748b" />
                  <Text style={styles.permissionText}>
                    {permission.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <item.icon size={20} color="#64748b" />
                </View>
                <View>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity 
            style={[styles.logoutButton, isLogoutLoading && styles.logoutButtonDisabled]} 
            onPress={handleLogout}
            disabled={isLogoutLoading}
          >
            <LogOut size={20} color={isLogoutLoading ? "#94a3b8" : "#ef4444"} />
            <Text style={[styles.logoutText, isLogoutLoading && styles.logoutTextDisabled]}>
              {isLogoutLoading ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  joinDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statsContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  permissionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  permissionsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#475569',
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  logoutContainer: {
    paddingHorizontal: 24,
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutTextDisabled: {
    color: '#94a3b8',
  },
  spacer: {
    height: 40,
  },
});