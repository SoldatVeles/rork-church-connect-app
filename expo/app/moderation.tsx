import { Stack } from 'expo-router';
import { Ban, CheckCircle2, Flag, ShieldCheck, XCircle } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { isAdmin, isChurchLeaderLevel } from '@/utils/permissions';

type ContentReport = {
  id: string;
  content_type: 'group_message' | 'prayer';
  content_id: string;
  reported_user_id: string | null;
  reason: string;
  status: 'pending' | 'dismissed' | 'action_taken';
  created_at: string;
  reporter?: { full_name?: string | null; display_name?: string | null } | null;
  reported_user?: { full_name?: string | null; display_name?: string | null } | null;
};

const displayName = (profile: ContentReport['reporter']) =>
  profile?.display_name?.trim() || profile?.full_name?.trim() || 'Church member';

export default function ModerationScreen() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const canReviewReports = isChurchLeaderLevel(user);
  const canBlockMembers = isAdmin(user);

  const reportsQuery = useQuery({
    queryKey: ['content-reports'],
    enabled: canReviewReports,
    queryFn: async (): Promise<ContentReport[]> => {
      const { data, error } = await (supabase.from as any)('content_reports')
        .select(`
          id, content_type, content_id, reported_user_id, reason, status, created_at,
          reporter:profiles!content_reports_reporter_id_fkey(full_name, display_name),
          reported_user:profiles!content_reports_reported_user_id_fkey(full_name, display_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as ContentReport[];
    },
  });

  const pendingReports = useMemo(
    () => (reportsQuery.data ?? []).filter((report) => report.status === 'pending'),
    [reportsQuery.data]
  );

  const reviewMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: ContentReport['status'] }) => {
      const { error } = await (supabase.from as any)('content_reports')
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', reportId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['content-reports'] }),
    onError: () => Alert.alert(
      t('moderation.updateFailedTitle', { defaultValue: 'Review could not be saved' }),
      t('moderation.updateFailedMessage', { defaultValue: 'Please try again.' })
    ),
  });

  const blockMemberMutation = useMutation({
    mutationFn: async ({ reportId, memberId }: { reportId: string; memberId: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-church-users', {
        body: { action: 'set_blocked', userId: memberId, isBlocked: true },
      });
      if (error || !data?.success) throw new Error('Block request failed.');

      const { error: reviewError } = await (supabase.from as any)('content_reports')
        .update({ status: 'action_taken', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq('id', reportId);
      if (reviewError) throw new Error(reviewError.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['content-reports'] });
      Alert.alert(
        t('moderation.memberBlockedTitle', { defaultValue: 'Member blocked' }),
        t('moderation.memberBlockedMessage', { defaultValue: 'Their access and chat messages are now restricted.' })
      );
    },
    onError: () => Alert.alert(
      t('moderation.blockFailedTitle', { defaultValue: 'Member could not be blocked' }),
      t('moderation.blockFailedMessage', { defaultValue: 'Please try again.' })
    ),
  });

  const confirmBlock = (report: ContentReport) => {
    if (!report.reported_user_id) return;
    Alert.alert(
      t('moderation.blockMemberTitle', { defaultValue: 'Block reported member?' }),
      t('moderation.blockMemberMessage', { defaultValue: 'They will no longer be able to use the app until an administrator unblocks them.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        { text: t('moderation.block', { defaultValue: 'Block member' }), style: 'destructive', onPress: () => blockMemberMutation.mutate({ reportId: report.id, memberId: report.reported_user_id! }) },
      ]
    );
  };

  if (!canReviewReports) {
    return <SafeAreaView style={styles.container}><Stack.Screen options={{ title: t('moderation.title', { defaultValue: 'Moderation' }) }} /><View style={styles.denied}><ShieldCheck size={46} color="#b91c1c" /><Text style={styles.deniedTitle}>{t('leadership.accessRequired', { defaultValue: 'Leadership access required' })}</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: t('moderation.title', { defaultValue: 'Safety & moderation' }) }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}><View style={styles.heroIcon}><ShieldCheck size={28} color="#1e3a8a" /></View><View style={styles.heroCopy}><Text style={styles.heroTitle}>{t('moderation.title', { defaultValue: 'Safety & moderation' })}</Text><Text style={styles.heroText}>{t('moderation.help', { defaultValue: 'Review member reports promptly and take the appropriate action.' })}</Text></View></View>
        <Text style={styles.sectionTitle}>{t('moderation.pending', { defaultValue: 'Pending reports' })} · {pendingReports.length}</Text>
        {reportsQuery.isLoading ? <ActivityIndicator color="#1e3a8a" style={styles.loading} /> : null}
        {reportsQuery.error ? <Text style={styles.stateText}>{t('moderation.loadFailed', { defaultValue: 'Reports could not be loaded.' })}</Text> : null}
        {!reportsQuery.isLoading && !reportsQuery.error && pendingReports.length === 0 ? <View style={styles.empty}><CheckCircle2 size={34} color="#16a34a" /><Text style={styles.emptyTitle}>{t('moderation.allClear', { defaultValue: 'All clear' })}</Text><Text style={styles.stateText}>{t('moderation.noPending', { defaultValue: 'There are no reports waiting for review.' })}</Text></View> : null}
        {pendingReports.map((report) => <View key={report.id} style={styles.reportCard}>
          <View style={styles.reportHeader}><View style={styles.reportIcon}><Flag size={18} color="#b45309" /></View><View style={styles.reportCopy}><Text style={styles.reportTitle}>{report.content_type === 'group_message' ? t('moderation.chatMessage', { defaultValue: 'Chat message' }) : t('moderation.prayerRequest', { defaultValue: 'Prayer request' })}</Text><Text style={styles.reportMeta}>{new Date(report.created_at).toLocaleString(i18n.language)}</Text></View></View>
          <Text style={styles.reportText}>{t('moderation.reason', { defaultValue: 'Reason' })}: {report.reason}</Text>
          <Text style={styles.reportMeta}>{t('moderation.reportedBy', { defaultValue: 'Reported by' })}: {displayName(report.reporter)}</Text>
          <Text style={styles.reportMeta}>{t('moderation.reportedMember', { defaultValue: 'Reported member' })}: {displayName(report.reported_user)}</Text>
          <View style={styles.actions}><TouchableOpacity style={styles.dismissButton} onPress={() => reviewMutation.mutate({ reportId: report.id, status: 'dismissed' })} disabled={reviewMutation.isPending}><XCircle size={16} color="#64748b" /><Text style={styles.dismissText}>{t('moderation.dismiss', { defaultValue: 'Dismiss' })}</Text></TouchableOpacity>{canBlockMembers && report.reported_user_id ? <TouchableOpacity style={styles.blockButton} onPress={() => confirmBlock(report)} disabled={blockMemberMutation.isPending}><Ban size={16} color="white" /><Text style={styles.blockText}>{t('moderation.block', { defaultValue: 'Block member' })}</Text></TouchableOpacity> : <TouchableOpacity style={styles.actionButton} onPress={() => reviewMutation.mutate({ reportId: report.id, status: 'action_taken' })} disabled={reviewMutation.isPending}><CheckCircle2 size={16} color="white" /><Text style={styles.blockText}>{t('moderation.actionTaken', { defaultValue: 'Action taken' })}</Text></TouchableOpacity>}</View>
        </View>)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, content: { padding: 20, paddingBottom: 44 }, hero: { flexDirection: 'row', gap: 14, backgroundColor: '#eff6ff', borderRadius: 18, padding: 18, marginBottom: 26 }, heroIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1 }, heroTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 }, heroText: { color: '#475569', fontSize: 14, lineHeight: 20 }, sectionTitle: { color: '#334155', fontSize: 15, fontWeight: '800', marginBottom: 10 }, loading: { marginTop: 32 }, stateText: { color: '#64748b', fontSize: 14, lineHeight: 20, textAlign: 'center' }, empty: { backgroundColor: 'white', borderRadius: 16, alignItems: 'center', padding: 28, gap: 8 }, emptyTitle: { fontWeight: '800', fontSize: 16, color: '#0f172a' }, reportCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }, reportHeader: { flexDirection: 'row', gap: 10, marginBottom: 10 }, reportIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fffbeb', alignItems: 'center', justifyContent: 'center' }, reportCopy: { flex: 1 }, reportTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800' }, reportText: { color: '#334155', fontSize: 14, fontWeight: '700', marginBottom: 6 }, reportMeta: { color: '#64748b', fontSize: 12, lineHeight: 18 }, actions: { flexDirection: 'row', gap: 10, marginTop: 14 }, dismissButton: { flex: 1, minHeight: 42, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#f1f5f9' }, dismissText: { color: '#475569', fontWeight: '800', fontSize: 13 }, blockButton: { flex: 1.25, minHeight: 42, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#b91c1c' }, actionButton: { flex: 1.25, minHeight: 42, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#1e3a8a' }, blockText: { color: 'white', fontWeight: '800', fontSize: 13 }, denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }, deniedTitle: { color: '#7f1d1d', fontWeight: '800', fontSize: 17 },
});
