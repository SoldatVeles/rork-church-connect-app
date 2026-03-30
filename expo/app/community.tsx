import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Users, MessageCircle, Calendar, Heart, Trophy, Sparkles } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useChurch } from '@/providers/church-provider';
import { isAdmin } from '@/utils/permissions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface CommunityMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  points: number;
}

interface CommunityActivity {
  id: string;
  type: 'prayer' | 'event' | 'milestone';
  user: string;
  action: string;
  time: string;
  icon: any;
  iconColor: string;
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const { currentChurch } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = isAdmin(user);

  const membersQuery = useQuery({
    queryKey: ['community-members', currentChurchId, userIsAdmin],
    queryFn: async () => {
      if (userIsAdmin) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
      }

      if (!currentChurchId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
      }

      const { data: memberLinks, error: linkError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', currentChurchId);
      if (linkError) throw new Error(linkError.message);
      const userIds = (memberLinks || []).map((m: any) => m.user_id as string);
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const totalMembers = membersQuery.data?.length ?? 0;

  const topMembers: CommunityMember[] = [
    { id: '1', name: 'Sarah Johnson', role: 'Prayer Warrior', avatar: '🙏', points: 450 },
    { id: '2', name: 'Michael Chen', role: 'Event Organizer', avatar: '🎯', points: 380 },
    { id: '3', name: 'Emily Davis', role: 'Community Helper', avatar: '💝', points: 320 },
    { id: '4', name: 'David Brown', role: 'Bible Study Leader', avatar: '📖', points: 290 },
  ];

  const recentActivities: CommunityActivity[] = [
    { 
      id: '1', 
      type: 'prayer', 
      user: 'Sarah Johnson', 
      action: 'prayed for 5 requests today',
      time: '30 minutes ago',
      icon: Heart,
      iconColor: '#ef4444',
    },
    { 
      id: '2', 
      type: 'event', 
      user: 'Michael Chen', 
      action: 'attended Youth Bible Study',
      time: '2 hours ago',
      icon: Calendar,
      iconColor: '#3b82f6',
    },
    { 
      id: '3', 
      type: 'milestone', 
      user: 'Emily Davis', 
      action: 'reached 100 prayer points!',
      time: '5 hours ago',
      icon: Trophy,
      iconColor: '#f59e0b',
    },
    { 
      id: '4', 
      type: 'prayer', 
      user: 'David Brown', 
      action: 'shared a testimony',
      time: '1 day ago',
      icon: Sparkles,
      iconColor: '#10b981',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Community',
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }} 
      />
      <StatusBar style="light" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1e3a8a', '#3b82f6']}
          style={styles.headerCard}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalMembers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>156</Text>
              <Text style={styles.statLabel}>Active Today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>42</Text>
              <Text style={styles.statLabel}>Groups</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Contributors</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {topMembers.map((member, index) => (
            <TouchableOpacity key={member.id} style={styles.memberCard}>
              <View style={styles.memberLeft}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.memberAvatar}>
                  <Text style={styles.avatarEmoji}>{member.avatar}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
              </View>
              <View style={styles.pointsBadge}>
                <Trophy size={14} color="#f59e0b" />
                <Text style={styles.pointsText}>{member.points}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>

          {recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View style={[styles.activityIcon, { backgroundColor: activity.iconColor + '20' }]}>
                <activity.icon size={20} color={activity.iconColor} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityUser}>{activity.user}</Text>
                  {' '}{activity.action}
                </Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community Groups</Text>
          
          <TouchableOpacity style={styles.groupCard}>
            <View style={styles.groupIcon}>
              <Users size={24} color="#1e3a8a" />
            </View>
            <View style={styles.groupContent}>
              <Text style={styles.groupTitle}>Youth Ministry</Text>
              <Text style={styles.groupMembers}>24 members</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.groupCard}>
            <View style={styles.groupIcon}>
              <MessageCircle size={24} color="#1e3a8a" />
            </View>
            <View style={styles.groupContent}>
              <Text style={styles.groupTitle}>Prayer Warriors</Text>
              <Text style={styles.groupMembers}>67 members</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.groupCard}>
            <View style={styles.groupIcon}>
              <Heart size={24} color="#1e3a8a" />
            </View>
            <View style={styles.groupContent}>
              <Text style={styles.groupTitle}>Women's Fellowship</Text>
              <Text style={styles.groupMembers}>38 members</Text>
            </View>
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
  headerCard: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  memberCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#64748b',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '600',
    color: '#1e293b',
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupContent: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#64748b',
  },
  spacer: {
    height: 40,
  },
});
