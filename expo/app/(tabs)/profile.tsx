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
  ChevronRight,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
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
import { useTranslation } from 'react-i18next';
import LanguageSelector from '@/components/LanguageSelector';

function formatPermissionFallback(permission: string): string {
  return permission
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, isLogoutLoading } = useAuth();

  const { data: userStats, isLoading: isStatsLoading } = trpc.users.getStats.useQuery(
    { userId: user?.id ?? '' },
    { enabled: !!user?.id }
  );

  const { data: totalCount, isLoading: isTotalCountLoading } = trpc.users.getTotalCount.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const handleLogout = () => {
    Alert.alert(
      t('profile.signOutTitle'),
      t('profile.signOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.signOut'),
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  const profileStats = useMemo(
    () => [
      {
        label: t('profile.eventsAttended'),
        value: isStatsLoading ? '...' : String(userStats?.eventsAttended ?? 0),
        icon: Calendar,
        color: '#3b82f6',
      },
      {
        label: t('profile.prayersShared'),
        value: isStatsLoading ? '...' : String(userStats?.prayersShared ?? 0),
        icon: Heart,
        color: '#ef4444',
      },
      {
        label: t('profile.totalUsers'),
        value: isTotalCountLoading ? '...' : String(totalCount?.totalUsers ?? 0),
        icon: Users,
        color: '#10b981',
      },
    ],
    [
      t,
      isStatsLoading,
      userStats?.eventsAttended,
      userStats?.prayersShared,
      isTotalCountLoading,
      totalCount?.totalUsers,
    ]
  );

  const menuItems = useMemo(
    () => [
      {
        title: t('profile.notifications'),
        subtitle: t('profile.notificationsSubtitle'),
        icon: Bell,
        onPress: () =>
          Alert.alert(
            t('common.comingSoon'),
            t('profile.notificationsComingSoon', {
              defaultValue: 'Notification settings will be available soon.',
            })
          ),
      },
      {
        title: t('profile.privacySecurity'),
        subtitle: t('profile.privacySecuritySubtitle'),
        icon: Shield,
        onPress: () =>
          Alert.alert(
            t('common.comingSoon'),
            t('profile.privacySecurityComingSoon', {
              defaultValue: 'Privacy and security settings will be available soon.',
            })
          ),
      },
      {
        title: t('profile.appSettings'),
        subtitle: t('profile.appSettingsSubtitle'),
        icon: Settings,
        onPress: () =>
          Alert.alert(
            t('common.comingSoon'),
            t('profile.appSettingsComingSoon', {
              defaultValue: 'App settings will be available soon.',
            })
          ),
      },
      ...(checkIsChurchLeader(user)
        ? [
            {
              title: t('profile.adminDashboard'),
              subtitle: t('profile.adminDashboardSubtitle'),
              icon: Shield,
              onPress: () => router.push('/admin'),
            },
          ]
        : []),
    ],
    [t, user]
  );

  const formatDate = (input: Date | string) => {
    const date = input instanceof Date ? input : new Date(input);

    if (Number.isNaN(date.getTime())) {
      return t('common.unknown');
    }

    return date.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#8b5cf6';
      case 'pastor':
        return '#3b82f6';
      case 'church_leader':
        return '#f59e0b';
      case 'member':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  const getRoleLabel = (role: string) => {
    if (!role) return '';

    return t(`profile.roles.${role}`, {
      defaultValue: role.charAt(0).toUpperCase() + role.slice(1),
    });
  };

  const getPermissionLabel = (permission: string) => {
    return t(`profile.permissions.${permission}`, {
      defaultValue: formatPermissionFallback(permission),
    });
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
            <Text style={styles.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone && (
              <Text style={styles.userPhone}>{user.phone}</Text>
            )}
            <Text style={styles.joinDate}>
              {t('profile.memberSince', { date: formatDate(user?.joinedAt ?? new Date()) })}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{t('profile.yourActivity')}</Text>
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
            <Text style={styles.sectionTitle}>{t('profile.yourPermissions')}</Text>
            <View style={styles.permissionsList}>
              {user.permissions.map((permission, index) => (
                <View key={index} style={styles.permissionItem}>
                  <Shield size={16} color="#64748b" />
                  <Text style={styles.permissionText}>
                    {getPermissionLabel(permission)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          <LanguageSelector variant="profile" />
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <item.icon size={20} color="#64748b" />
                </View>
                <View style={styles.menuTextBlock}>
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
            <LogOut size={20} color={isLogoutLoading ? '#94a3b8' : '#ef4444'} />
            <Text style={[styles.logoutText, isLogoutLoading && styles.logoutTextDisabled]}>
              {isLogoutLoading ? t('profile.signingOut') : t('profile.signOut')}
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuTextBlock: {
    flex: 1,
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