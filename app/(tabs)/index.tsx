import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Bell, Calendar, Heart, Users, Church, BookOpen } from 'lucide-react-native';
import React, { useMemo, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import { router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import NotificationDropdown from '@/components/NotificationDropdown';

export default function HomeScreen() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const bellButtonRef = useRef<View>(null);
  const [bellPosition, setBellPosition] = useState({ x: 0, y: 0 });

  const eventsQuery = trpc.events.list.useQuery({}, { suspense: false });
  const prayersActiveQuery = trpc.prayers.list.useQuery({ status: 'active' }, { suspense: false });
  const usersQuery = trpc.users.list.useQuery(undefined, { suspense: false });
  const notificationsQuery = trpc.notifications.list.useQuery(undefined, { 
    suspense: false,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Test tRPC connection
  const testQuery = trpc.example.hi.useQuery({ name: 'Test' }, { 
    suspense: false,
    retry: 1
  });
  
  // Log test results
  React.useEffect(() => {
    if (testQuery.error) {
      console.error('[Home] tRPC test error:', testQuery.error);
    }
    if (testQuery.data) {
      console.log('[Home] tRPC test success:', testQuery.data);
    }
  }, [testQuery.data, testQuery.error]);

  const eventsThisWeekCount = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return events.filter((e) => {
      const d = new Date(e.date as unknown as string);
      return d >= now && d <= in7;
    }).length;
  }, [eventsQuery.data]);

  const activeRequestsCount = prayersActiveQuery.data?.length ?? 0;
  const membersCount = usersQuery.data?.length ?? 0;
  const unreadNotificationsCount = notificationsQuery.data?.filter(n => !n.isRead).length ?? 0;

  const quickActions = useMemo(() => [
    {
      icon: Calendar,
      title: 'Upcoming Events',
      subtitle: `${eventsThisWeekCount} ${eventsThisWeekCount === 1 ? 'event' : 'events'} this week`,
      color: '#3b82f6',
      onPress: () => router.push('/(tabs)/events'),
    },
    {
      icon: Heart,
      title: 'Prayer Requests',
      subtitle: `${activeRequestsCount} active ${activeRequestsCount === 1 ? 'request' : 'requests'}`,
      color: '#ef4444',
      onPress: () => router.push('/(tabs)/prayers'),
    },
    {
      icon: BookOpen,
      title: 'Latest Sermon',
      subtitle: 'The Power of Faith',
      color: '#10b981',
      onPress: () => {},
    },
    {
      icon: Users,
      title: 'Community',
      subtitle: `${membersCount} ${membersCount === 1 ? 'member' : 'members'}`,
      color: '#f59e0b',
      onPress: () => {},
    },
  ], [eventsThisWeekCount, activeRequestsCount, membersCount]);

  const announcements = [
    {
      id: '1',
      title: 'Sabbath Service This Saturday',
      content: 'Join us for our weekly Sabbath service at 9:00 AM. Pastor John will be speaking about "Walking in Faith".',
      time: '2 hours ago',
      isUrgent: false,
    },
    {
      id: '2',
      title: 'Youth Bible Study',
      content: 'Special youth Bible study session this Friday at 7:00 PM. All young members are welcome!',
      time: '1 day ago',
      isUrgent: true,
    },
    {
      id: '3',
      title: 'Community Outreach Program',
      content: 'We are organizing a community outreach program next month. Volunteers needed!',
      time: '2 days ago',
      isUrgent: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#1e3a8a', '#3b82f6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userRole}>{user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}</Text>
          </View>
          <TouchableOpacity 
            ref={bellButtonRef}
            style={styles.notificationButton}
            onPress={() => {
              bellButtonRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                setBellPosition({ x: pageX + width / 2, y: pageY + height });
                setShowNotifications(true);
              });
            }}
          >
            <Bell size={24} color="white" />
            {unreadNotificationsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={action.onPress}
                testID={`quick-action-${index}`}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <action.icon size={24} color="white" />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.announcements}>
          <Text style={styles.sectionTitle}>Recent Announcements</Text>
          {announcements.map((announcement) => (
            <View key={announcement.id} style={styles.announcementCard}>
              {announcement.isUrgent && (
                <View style={styles.urgentBadge}>
                  <Text style={styles.urgentBadgeText}>URGENT</Text>
                </View>
              )}
              <Text style={styles.announcementTitle}>{announcement.title}</Text>
              <Text style={styles.announcementContent}>{announcement.content}</Text>
              <Text style={styles.announcementTime}>{announcement.time}</Text>
            </View>
          ))}
        </View>

        <View style={styles.todayVerse}>
          <View style={styles.verseHeader}>
            <Church size={20} color="#1e3a8a" />
            <Text style={styles.verseTitle}>Verse of the Day</Text>
          </View>
          <Text style={styles.verseText}>
            &ldquo;Trust in the Lord with all your heart and lean not on your own understanding; 
            in all your ways submit to him, and he will make your paths straight.&rdquo;
          </Text>
          <Text style={styles.verseReference}>Proverbs 3:5-6</Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <NotificationDropdown
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        anchorPosition={bellPosition}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  quickActions: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  announcements: {
    marginBottom: 32,
  },
  announcementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  urgentBadge: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  announcementTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  todayVerse: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
    marginLeft: 8,
  },
  verseText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3a8a',
    textAlign: 'right',
  },
  spacer: {
    height: 40,
  },
});