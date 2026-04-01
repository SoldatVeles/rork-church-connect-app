import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Bell, Calendar, Heart, Users, Church, BookOpen, MessageCircle, Sun } from 'lucide-react-native';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/providers/auth-provider';
import { useChurch } from '@/providers/church-provider';
import { isAdmin } from '@/utils/permissions';
import { canManageAnySabbath, buildChurchScope } from '@/utils/church-scope';
import { router } from 'expo-router';
import NotificationDropdown from '@/components/NotificationDropdown';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';
import { Colors, Shadow, Radius, Spacing } from '@/constants/theme';

const bibleVerses = [
  {
    text: '"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."',
    reference: 'Proverbs 3:5-6',
  },
  {
    text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."',
    reference: 'Jeremiah 29:11',
  },
  {
    text: '"The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul."',
    reference: 'Psalm 23:1-3',
  },
  {
    text: '"I can do all this through him who gives me strength."',
    reference: 'Philippians 4:13',
  },
  {
    text: '"Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."',
    reference: 'Joshua 1:9',
  },
  {
    text: '"The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you; the Lord turn his face toward you and give you peace."',
    reference: 'Numbers 6:24-26',
  },
  {
    text: '"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."',
    reference: 'Romans 8:28',
  },
  {
    text: '"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God."',
    reference: 'Philippians 4:6',
  },
  {
    text: '"But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."',
    reference: 'Isaiah 40:31',
  },
  {
    text: '"The Lord is close to the brokenhearted and saves those who are crushed in spirit."',
    reference: 'Psalm 34:18',
  },
  {
    text: '"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."',
    reference: 'John 3:16',
  },
  {
    text: '"The Lord is my light and my salvation—whom shall I fear? The Lord is the stronghold of my life—of whom shall I be afraid?"',
    reference: 'Psalm 27:1',
  },
  {
    text: '"Cast all your anxiety on him because he cares for you."',
    reference: '1 Peter 5:7',
  },
  {
    text: '"Come to me, all you who are weary and burdened, and I will give you rest."',
    reference: 'Matthew 11:28',
  },
  {
    text: '"If God is for us, who can be against us?"',
    reference: 'Romans 8:31',
  },
  {
    text: '"The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing."',
    reference: 'Zephaniah 3:17',
  },
  {
    text: '"Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go."',
    reference: 'Joshua 1:9',
  },
  {
    text: '"Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid."',
    reference: 'John 14:27',
  },
  {
    text: '"The Lord will fight for you; you need only to be still."',
    reference: 'Exodus 14:14',
  },
  {
    text: '"This is the day the Lord has made; let us rejoice and be glad in it."',
    reference: 'Psalm 118:24',
  },
  {
    text: '"Now faith is confidence in what we hope for and assurance about what we do not see."',
    reference: 'Hebrews 11:1',
  },
  {
    text: '"The name of the Lord is a fortified tower; the righteous run to it and are safe."',
    reference: 'Proverbs 18:10',
  },
  {
    text: '"Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours."',
    reference: 'Mark 11:24',
  },
  {
    text: '"Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up."',
    reference: 'Galatians 6:9',
  },
  {
    text: '"For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline."',
    reference: '2 Timothy 1:7',
  },
  {
    text: '"The Lord is gracious and compassionate, slow to anger and rich in love."',
    reference: 'Psalm 145:8',
  },
  {
    text: '"Commit to the Lord whatever you do, and he will establish your plans."',
    reference: 'Proverbs 16:3',
  },
  {
    text: '"Those who know your name trust in you, for you, Lord, have never forsaken those who seek you."',
    reference: 'Psalm 9:10',
  },
  {
    text: '"But seek first his kingdom and his righteousness, and all these things will be given to you as well."',
    reference: 'Matthew 6:33',
  },
  {
    text: '"The Lord is faithful to all his promises and loving toward all he has made."',
    reference: 'Psalm 145:13',
  },
  {
    text: '"In their hearts humans plan their course, but the Lord establishes their steps."',
    reference: 'Proverbs 16:9',
  },
  {
    text: '"May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit."',
    reference: 'Romans 15:13',
  },
  {
    text: '"Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own."',
    reference: 'Matthew 6:34',
  },
  {
    text: '"The Lord is my strength and my shield; my heart trusts in him, and he helps me."',
    reference: 'Psalm 28:7',
  },
  {
    text: '"Wait for the Lord; be strong and take heart and wait for the Lord."',
    reference: 'Psalm 27:14',
  },
  {
    text: '"For the Lord your God is gracious and compassionate. He will not turn his face from you if you return to him."',
    reference: '2 Chronicles 30:9',
  },
  {
    text: '"The Lord gives strength to his people; the Lord blesses his people with peace."',
    reference: 'Psalm 29:11',
  },
  {
    text: '"You will keep in perfect peace those whose minds are steadfast, because they trust in you."',
    reference: 'Isaiah 26:3',
  },
  {
    text: '"The Lord is good, a refuge in times of trouble. He cares for those who trust in him."',
    reference: 'Nahum 1:7',
  },
  {
    text: '"God is our refuge and strength, an ever-present help in trouble."',
    reference: 'Psalm 46:1',
  },
  {
    text: '"He heals the brokenhearted and binds up their wounds."',
    reference: 'Psalm 147:3',
  },
  {
    text: '"This is love: not that we loved God, but that he loved us and sent his Son as an atoning sacrifice for our sins."',
    reference: '1 John 4:10',
  },
  {
    text: '"I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world."',
    reference: 'John 16:33',
  },
  {
    text: '"The Lord himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged."',
    reference: 'Deuteronomy 31:8',
  },
  {
    text: '"Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!"',
    reference: '2 Corinthians 5:17',
  },
  {
    text: '"As the heavens are higher than the earth, so are my ways higher than your ways and my thoughts than your thoughts."',
    reference: 'Isaiah 55:9',
  },
  {
    text: '"Rejoice always, pray continually, give thanks in all circumstances; for this is God\'s will for you in Christ Jesus."',
    reference: '1 Thessalonians 5:16-18',
  },
  {
    text: '"The Lord is near to all who call on him, to all who call on him in truth."',
    reference: 'Psalm 145:18',
  },
  {
    text: '"With God all things are possible."',
    reference: 'Matthew 19:26',
  },
  {
    text: '"Delight yourself in the Lord, and he will give you the desires of your heart."',
    reference: 'Psalm 37:4',
  },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { currentChurch } = useChurch();
  const currentChurchId = currentChurch?.id ?? null;
  const userIsAdmin = isAdmin(user);
  const pastorGroupsQuery = trpc.sabbaths.getMyPastorGroups.useQuery();
  const pastorGroupIds = useMemo(() => (pastorGroupsQuery.data ?? []).map((g: any) => g.group_id as string), [pastorGroupsQuery.data]);
  const canManageSabbath = canManageAnySabbath(buildChurchScope(user, null, pastorGroupIds));
  const [showNotifications, setShowNotifications] = useState(false);
  const bellButtonRef = useRef<View>(null);
  const [bellPosition, setBellPosition] = useState({ x: 0, y: 0 });
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);

  const eventsQuery = useQuery({
    queryKey: ['home-events', currentChurchId, userIsAdmin],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });

      if (!userIsAdmin && currentChurchId) {
        query = query.or(`group_id.eq.${currentChurchId},is_shared_all_churches.eq.true`);
      } else if (!userIsAdmin && !currentChurchId) {
        console.log('[Home] Non-admin user has no church, returning empty events');
        return [];
      }

      let { data, error } = await query;

      if (error) {
        console.error('[Home] Failed to fetch events:', JSON.stringify(error));
        if (!userIsAdmin && currentChurchId && error.message?.includes('is_shared_all_churches')) {
          console.log('[Home] is_shared_all_churches column missing, falling back to group_id filter');
          const fallback = await supabase
            .from('events')
            .select('*')
            .eq('group_id', currentChurchId)
            .order('start_at', { ascending: true });
          if (fallback.error) {
            throw new Error(fallback.error.message ?? 'Failed to load events');
          }
          data = fallback.data;
          error = null;
        } else {
          throw new Error(error.message ?? 'Failed to load events');
        }
      }
      const rows = (data || []) as any[];
      console.log('[Home] Raw event rows fetched:', rows.length);
      const rawDetails = rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        event_type: r.event_type,
        type: r.type,
        group_id: r.group_id,
        start_at: r.start_at,
        created_at: r.created_at,
      }));
      console.log('[Home] Raw event row details:', JSON.stringify(rawDetails));

      const filtered = rows.filter((e: any) => {
        const eventType = typeof e.event_type === 'string' && e.event_type.length > 0 ? e.event_type : null;
        const legacyType = typeof e.type === 'string' && e.type.length > 0 ? e.type : null;
        const resolved = eventType ?? legacyType ?? 'bible_study';
        const dominated = resolved === 'sabbath' || resolved === 'prayer_meeting';
        if (dominated) {
          console.log('[Home] Excluding event', e.id, '| resolved type:', resolved);
        }
        return !dominated;
      });
      console.log('[Home] Filtered events count:', filtered.length);
      console.log('[Home] Filtered event ids:', filtered.map((e: any) => e.id));
      console.log('[Home] Excluded count:', rows.length - filtered.length);
      return filtered;
    },
  });

  const prayersActiveQuery = useQuery({
    queryKey: ['home-prayers-active', currentChurchId, userIsAdmin],
    queryFn: async () => {
      let query = supabase
        .from('prayers')
        .select('*')
        .eq('is_answered', false)
        .order('created_at', { ascending: false });

      if (!userIsAdmin && currentChurchId) {
        query = query.or(`group_id.eq.${currentChurchId},is_shared_all_churches.eq.true`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const usersQuery = useQuery({
    queryKey: ['home-members', currentChurchId, userIsAdmin],
    queryFn: async () => {
      if (userIsAdmin) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');
        if (error) throw new Error(error.message);
        return data || [];
      }

      if (!currentChurchId) {
        console.log('[Home] Non-admin user has no church selected, returning empty members');
        return [];
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
        .in('id', userIds);
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const totalEventsCount = eventsQuery.data?.length ?? 0;

  const activeRequestsCount = prayersActiveQuery.data?.length ?? 0;
  const membersCount = usersQuery.data?.length ?? 0;
  const notificationsCountQuery = useQuery({
    queryKey: ['notifications', 'count', user?.id, currentChurchId, userIsAdmin],
    queryFn: async () => {
      if (!user?.id) return 0;
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      if (userIsAdmin) {
        // Admin sees all
      } else {
        const filters = [`user_id.eq.${user.id}`];
        if (currentChurchId) {
          filters.push(`group_id.eq.${currentChurchId}`);
        }
        query = query.or(filters.join(','));
      }

      const { count, error } = await query;
      if (error) {
        console.warn('[Home] Notifications count error:', error.message);
        return 0;
      }
      return count ?? 0;
    },
    refetchInterval: 15000,
  });

  const unreadNotificationsCount = notificationsCountQuery.data ?? 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVerseIndex((prevIndex) => (prevIndex + 1) % bibleVerses.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const quickActions = useMemo(() => [
    {
      icon: Calendar,
      title: 'Upcoming Events',
      subtitle: `${totalEventsCount} total ${totalEventsCount === 1 ? 'event' : 'events'}`,
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
      onPress: () => router.push('/manage-sermons'),
    },
    {
      icon: Users,
      title: 'Community',
      subtitle: `${membersCount} ${membersCount === 1 ? 'member' : 'members'}`,
      color: '#f59e0b',
      onPress: () => router.push('/community'),
    },
    {
      icon: MessageCircle,
      title: 'Group Chats',
      subtitle: 'Connect with your groups',
      color: '#8b5cf6',
      onPress: () => router.push('/groups'),
    },
    ...(canManageSabbath ? [{
      icon: Sun,
      title: 'Plan Sabbath',
      subtitle: 'Plan & manage services',
      color: '#0f172a',
      onPress: () => router.push('/sabbath-planner' as any),
    }] : []),
  ], [totalEventsCount, activeRequestsCount, membersCount, canManageSabbath]);

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
                void notificationsCountQuery.refetch();
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
            {bibleVerses[currentVerseIndex].text}
          </Text>
          <Text style={styles.verseReference}>{bibleVerses[currentVerseIndex].reference}</Text>
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
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
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
    fontWeight: '700' as const,
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
    padding: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  content: {
    flex: 1,
    padding: Spacing.xxl,
  },
  quickActions: {
    marginBottom: Spacing.xxxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '47%',
    alignItems: 'center',
    ...Shadow.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  announcements: {
    marginBottom: Spacing.xxxl,
  },
  announcementCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  urgentBadge: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.dangerBorder,
    borderWidth: 1,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  urgentBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#dc2626',
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  announcementContent: {
    fontSize: 14,
    color: Colors.textTertiary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  announcementTime: {
    fontSize: 12,
    color: Colors.textPlaceholder,
  },
  todayVerse: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.sm,
  },
  verseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  verseTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  verseText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    textAlign: 'right',
  },
  spacer: {
    height: 40,
  },
});