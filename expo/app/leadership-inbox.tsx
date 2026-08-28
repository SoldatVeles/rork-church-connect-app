import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { ArrowLeft, BookOpenText, ChevronRight, Inbox, Mail, MessageCircle } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { WebsiteContactInboxModal } from '@/components/WebsiteContactInboxModal';
import { WebsitePrayerInboxModal } from '@/components/WebsitePrayerInboxModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { isPastorLevel } from '@/utils/permissions';

type WebsiteRequestType = 'contact' | 'book_request';

export default function LeadershipInboxScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [showPrayerInbox, setShowPrayerInbox] = useState(false);
  const [showContactInbox, setShowContactInbox] = useState(false);
  const [contactInboxType, setContactInboxType] =
    useState<WebsiteRequestType>('contact');
  const canReviewWebsiteRequests = isPastorLevel(user);

  const prayerCountQuery = useQuery({
    queryKey: ['website-prayer-submissions-count', user?.id],
    enabled: Boolean(user?.id && canReviewWebsiteRequests),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('website_prayer_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });

  const contactTypesQuery = useQuery({
    queryKey: ['website-contact-submission-types', 'pending', user?.id],
    enabled: Boolean(user?.id && canReviewWebsiteRequests),
    queryFn: async (): Promise<WebsiteRequestType[]> => {
      const { data, error } = await supabase
        .from('website_contact_submissions')
        .select('submission_type')
        .eq('status', 'pending');

      if (error) throw new Error(error.message);
      return (data ?? []).flatMap((item: any) =>
        item.submission_type === 'contact' || item.submission_type === 'book_request'
          ? [item.submission_type as WebsiteRequestType]
          : [],
      );
    },
  });

  const contactCounts = useMemo(() => {
    const rows = contactTypesQuery.data ?? [];
    return {
      contact: rows.filter((type) => type === 'contact').length,
      books: rows.filter((type) => type === 'book_request').length,
    };
  }, [contactTypesQuery.data]);

  if (!canReviewWebsiteRequests) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: t('leadership.websiteInbox'), headerShown: true }} />
        <View style={styles.denied}>
          <Inbox size={46} color="#b91c1c" />
          <Text style={styles.deniedTitle}>{t('leadership.accessRequired')}</Text>
          <Text style={styles.deniedText}>{t('leadership.websiteInboxAccess')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const total = (prayerCountQuery.data ?? 0) + contactCounts.contact + contactCounts.books;
  const loading = prayerCountQuery.isLoading || contactTypesQuery.isLoading;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: t('leadership.websiteInbox'), headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={21} color="#1e3a8a" />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{t('leadership.website')}</Text>
          <Text style={styles.title}>{t('leadership.websiteInbox')}</Text>
        </View>
        {loading ? (
          <ActivityIndicator color="#1e3a8a" />
        ) : (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{total}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Inbox size={22} color="#1e3a8a" />
          <Text style={styles.introText}>{t('leadership.websiteInboxHelp')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('leadership.reviewRequests')}</Text>

        <TouchableOpacity
          testID="leadership-prayer-inbox"
          accessibilityRole="button"
          style={styles.queueCard}
          onPress={() => setShowPrayerInbox(true)}
        >
          <View style={[styles.queueIcon, styles.prayerIcon]}>
            <MessageCircle size={21} color="#1e3a8a" />
          </View>
          <View style={styles.queueCopy}>
            <Text style={styles.queueTitle}>{t('leadership.prayerRequests')}</Text>
            <Text style={styles.queueText}>{t('leadership.prayerRequestsHelp')}</Text>
          </View>
          <View style={styles.queueEnd}>
            <Text style={styles.queueCount}>{prayerCountQuery.data ?? 0}</Text>
            <ChevronRight size={19} color="#64748b" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          testID="leadership-contact-inbox"
          accessibilityRole="button"
          style={styles.queueCard}
          onPress={() => {
            setContactInboxType('contact');
            setShowContactInbox(true);
          }}
        >
          <View style={[styles.queueIcon, styles.contactIcon]}>
            <Mail size={21} color="#9a3412" />
          </View>
          <View style={styles.queueCopy}>
            <Text style={styles.queueTitle}>{t('leadership.contactMessages')}</Text>
            <Text style={styles.queueText}>{t('leadership.contactMessagesHelp')}</Text>
          </View>
          <View style={styles.queueEnd}>
            <Text style={styles.queueCount}>{contactCounts.contact}</Text>
            <ChevronRight size={19} color="#64748b" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          testID="leadership-book-inbox"
          accessibilityRole="button"
          style={styles.queueCard}
          onPress={() => {
            setContactInboxType('book_request');
            setShowContactInbox(true);
          }}
        >
          <View style={[styles.queueIcon, styles.bookIcon]}>
            <BookOpenText size={21} color="#496b3f" />
          </View>
          <View style={styles.queueCopy}>
            <Text style={styles.queueTitle}>{t('leadership.bookRequests')}</Text>
            <Text style={styles.queueText}>{t('leadership.bookRequestsHelp')}</Text>
          </View>
          <View style={styles.queueEnd}>
            <Text style={styles.queueCount}>{contactCounts.books}</Text>
            <ChevronRight size={19} color="#64748b" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <WebsitePrayerInboxModal
        visible={showPrayerInbox}
        userId={user?.id ?? null}
        onClose={() => setShowPrayerInbox(false)}
      />
      <WebsiteContactInboxModal
        visible={showContactInbox}
        userId={user?.id ?? null}
        submissionType={contactInboxType}
        onClose={() => setShowContactInbox(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#496b3f', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { color: '#0f172a', fontSize: 20, fontWeight: '800', marginTop: 2 },
  totalBadge: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e3a8a',
  },
  totalBadgeText: { color: 'white', fontWeight: '800', fontSize: 14 },
  content: { padding: 20, paddingBottom: 48, gap: 12 },
  introCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    marginBottom: 10,
  },
  introText: { flex: 1, color: '#334155', fontSize: 14, lineHeight: 20 },
  sectionTitle: { color: '#334155', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'white',
  },
  queueIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  prayerIcon: { backgroundColor: '#eff6ff' },
  contactIcon: { backgroundColor: '#fff7ed' },
  bookIcon: { backgroundColor: '#f0fdf4' },
  queueCopy: { flex: 1, gap: 3 },
  queueTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  queueText: { color: '#64748b', fontSize: 13, lineHeight: 18 },
  queueEnd: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  queueCount: { minWidth: 24, textAlign: 'center', color: '#1e3a8a', fontSize: 16, fontWeight: '800' },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  deniedTitle: { color: '#7f1d1d', fontSize: 18, fontWeight: '800' },
  deniedText: { color: '#64748b', fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
