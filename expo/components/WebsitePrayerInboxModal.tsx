import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Church,
  Clock,
  Inbox,
  Mail,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

type SubmissionPreference =
  | 'leaders_only'
  | 'church_anonymous'
  | 'contact_first';

type WebsitePrayerSubmission = {
  id: string;
  groupId: string;
  churchName: string;
  requesterName: string | null;
  requesterEmail: string | null;
  title: string;
  details: string;
  sharingPreference: SubmissionPreference;
  createdAt: string;
};

type WebsitePrayerInboxModalProps = {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
};

export function WebsitePrayerInboxModal({
  visible,
  userId,
  onClose,
}: WebsitePrayerInboxModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<WebsitePrayerSubmission | null>(
    null,
  );
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewDetails, setReviewDetails] = useState('');

  const queryKey = ['website-prayer-submissions', 'pending', userId] as const;
  const submissionsQuery = useQuery({
    queryKey,
    enabled: visible && !!userId,
    queryFn: async (): Promise<WebsitePrayerSubmission[]> => {
      const { data, error } = await supabase
        .from('website_prayer_submissions')
        .select(`
          id,
          group_id,
          requester_name,
          requester_email,
          title,
          details,
          sharing_preference,
          created_at,
          church:groups!website_prayer_submissions_group_id_fkey(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);

      return ((data ?? []) as any[]).map((submission) => ({
        id: submission.id as string,
        groupId: submission.group_id as string,
        churchName:
          (Array.isArray(submission.church)
            ? submission.church[0]?.name
            : submission.church?.name) ??
          t('prayers.websiteInbox.unknownChurch'),
        requesterName: submission.requester_name as string | null,
        requesterEmail: submission.requester_email as string | null,
        title: submission.title as string,
        details: submission.details as string,
        sharingPreference:
          submission.sharing_preference as SubmissionPreference,
        createdAt: submission.created_at as string,
      }));
    },
  });

  useEffect(() => {
    if (!selected) return;
    setReviewTitle(selected.title);
    setReviewDetails(selected.details);
  }, [selected]);

  const reviewMutation = useMutation({
    mutationFn: async ({
      action,
      submission,
    }: {
      action: 'accept' | 'handled' | 'rejected';
      submission: WebsitePrayerSubmission;
    }) => {
      const { error } = await supabase.rpc(
        'review_website_prayer_submission',
        {
          p_submission_id: submission.id,
          p_action: action,
          p_title: action === 'accept' ? reviewTitle.trim() : null,
          p_details: action === 'accept' ? reviewDetails.trim() : null,
        },
      );

      if (error) throw new Error(error.message);
      return action;
    },
    onSuccess: (action) => {
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: ['website-prayer-submissions-count'],
      });

      if (action === 'accept') {
        void queryClient.invalidateQueries({ queryKey: ['prayers'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }

      Alert.alert(
        t('prayers.websiteInbox.successTitle'),
        t(`prayers.websiteInbox.success.${action}`),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('prayers.errorTitle'),
        error instanceof Error
          ? error.message
          : t('prayers.websiteInbox.reviewFailed'),
      );
    },
  });

  const confirmReview = (
    action: 'accept' | 'handled' | 'rejected',
    submission: WebsitePrayerSubmission,
  ) => {
    if (
      action === 'accept' &&
      (!reviewTitle.trim() || !reviewDetails.trim())
    ) {
      Alert.alert(
        t('prayers.errorTitle'),
        t('prayers.websiteInbox.completeSanitizedCopy'),
      );
      return;
    }

    Alert.alert(
      t(`prayers.websiteInbox.confirm.${action}Title`),
      t(`prayers.websiteInbox.confirm.${action}Message`),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t(`prayers.websiteInbox.actions.${action}`),
          style: action === 'rejected' ? 'destructive' : 'default',
          onPress: () => reviewMutation.mutate({ action, submission }),
        },
      ],
    );
  };

  const preferenceLabel = (preference: SubmissionPreference) =>
    t(`prayers.websiteInbox.preferences.${preference}`);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} testID="website-prayer-inbox-modal">
        <View style={styles.header}>
          {selected ? (
            <TouchableOpacity
              style={styles.roundButton}
              onPress={() => setSelected(null)}
              accessibilityLabel={t('prayers.websiteInbox.back')}
            >
              <ArrowLeft size={20} color="#334155" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIcon}>
              <Inbox size={20} color="#1e3a8a" />
            </View>
          )}

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>
              {t('prayers.websiteInbox.website')}
            </Text>
            <Text style={styles.headerTitle}>
              {t('prayers.websiteInbox.title')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.roundButton}
            onPress={onClose}
            accessibilityLabel={t('prayers.websiteInbox.close')}
          >
            <X size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {selected ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.safetyCard}>
              <ShieldCheck size={20} color="#1e3a8a" />
              <Text style={styles.safetyText}>
                {t('prayers.websiteInbox.safetyMessage')}
              </Text>
            </View>

            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Church size={17} color="#496b3f" />
                <Text style={styles.metaText}>{selected.churchName}</Text>
              </View>
              <View style={styles.metaRow}>
                <Clock size={17} color="#64748b" />
                <Text style={styles.metaText}>
                  {new Date(selected.createdAt).toLocaleString(i18n.language)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <User size={17} color="#64748b" />
                <Text style={styles.metaText}>
                  {selected.requesterName ??
                    t('prayers.websiteInbox.notProvided')}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Mail size={17} color="#64748b" />
                <Text style={styles.metaText}>
                  {selected.requesterEmail ??
                    t('prayers.websiteInbox.notProvided')}
                </Text>
              </View>
            </View>

            <View style={styles.preferenceCard}>
              <Text style={styles.preferenceLabel}>
                {t('prayers.websiteInbox.requestedHandling')}
              </Text>
              <Text style={styles.preferenceValue}>
                {preferenceLabel(selected.sharingPreference)}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t('prayers.websiteInbox.reviewTitle')}
              </Text>
              <TextInput
                value={reviewTitle}
                onChangeText={setReviewTitle}
                maxLength={120}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t('prayers.websiteInbox.reviewDetails')}
              </Text>
              <TextInput
                value={reviewDetails}
                onChangeText={setReviewDetails}
                maxLength={4000}
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.textArea]}
              />
            </View>

            {selected.sharingPreference === 'church_anonymous' ? (
              <TouchableOpacity
                testID="accept-website-prayer-button"
                disabled={reviewMutation.isPending}
                style={[
                  styles.acceptButton,
                  reviewMutation.isPending && styles.disabledButton,
                ]}
                onPress={() => confirmReview('accept', selected)}
              >
                <CheckCircle2 size={18} color="white" />
                <Text style={styles.acceptButtonText}>
                  {t('prayers.websiteInbox.actions.accept')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.privateNotice}>
                <Text style={styles.privateNoticeText}>
                  {t('prayers.websiteInbox.privatePreferenceNotice')}
                </Text>
              </View>
            )}

            <TouchableOpacity
              disabled={reviewMutation.isPending}
              style={[
                styles.handledButton,
                reviewMutation.isPending && styles.disabledButton,
              ]}
              onPress={() => confirmReview('handled', selected)}
            >
              <CheckCircle2 size={18} color="#166534" />
              <Text style={styles.handledButtonText}>
                {t('prayers.websiteInbox.actions.handled')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={reviewMutation.isPending}
              style={[
                styles.rejectButton,
                reviewMutation.isPending && styles.disabledButton,
              ]}
              onPress={() => confirmReview('rejected', selected)}
            >
              <XCircle size={18} color="#b91c1c" />
              <Text style={styles.rejectButtonText}>
                {t('prayers.websiteInbox.actions.rejected')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {submissionsQuery.isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text style={styles.mutedText}>
                  {t('prayers.websiteInbox.loading')}
                </Text>
              </View>
            ) : submissionsQuery.isError ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>
                  {t('prayers.websiteInbox.loadFailed')}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => submissionsQuery.refetch()}
                >
                  <Text style={styles.retryButtonText}>
                    {t('prayers.publication.retry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : submissionsQuery.data?.length ? (
              submissionsQuery.data.map((submission) => (
                <TouchableOpacity
                  key={submission.id}
                  testID={`website-prayer-submission-${submission.id}`}
                  style={styles.submissionCard}
                  onPress={() => setSelected(submission)}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.churchName}>
                      {submission.churchName}
                    </Text>
                    <Text style={styles.cardDate}>
                      {new Date(submission.createdAt).toLocaleDateString(
                        i18n.language,
                      )}
                    </Text>
                  </View>
                  <Text style={styles.submissionTitle}>
                    {submission.title}
                  </Text>
                  <Text numberOfLines={3} style={styles.submissionDetails}>
                    {submission.details}
                  </Text>
                  <Text style={styles.preferenceBadge}>
                    {preferenceLabel(submission.sharingPreference)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.centered}>
                <CheckCircle2 size={42} color="#496b3f" />
                <Text style={styles.emptyTitle}>
                  {t('prayers.websiteInbox.emptyTitle')}
                </Text>
                <Text style={styles.mutedText}>
                  {t('prayers.websiteInbox.emptyMessage')}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: '#496b3f',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 2,
  },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 64,
  },
  mutedText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: { color: '#b91c1c', fontSize: 15, textAlign: 'center' },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  retryButtonText: { color: '#334155', fontWeight: '700' },
  emptyTitle: { color: '#0f172a', fontSize: 20, fontWeight: '700' },
  submissionCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    padding: 18,
    gap: 9,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  churchName: { color: '#496b3f', fontSize: 13, fontWeight: '700' },
  cardDate: { color: '#94a3b8', fontSize: 12 },
  submissionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  submissionDetails: { color: '#475569', fontSize: 14, lineHeight: 20 },
  preferenceBadge: {
    alignSelf: 'flex-start',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  safetyCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
  },
  safetyText: { flex: 1, color: '#334155', fontSize: 13, lineHeight: 19 },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    padding: 16,
    gap: 10,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { flex: 1, color: '#475569', fontSize: 14 },
  preferenceCard: {
    borderRadius: 14,
    backgroundColor: '#fff7ed',
    padding: 14,
    gap: 4,
  },
  preferenceLabel: { color: '#9a3412', fontSize: 12, fontWeight: '700' },
  preferenceValue: { color: '#7c2d12', fontSize: 15 },
  inputGroup: { gap: 8 },
  label: { color: '#1e293b', fontSize: 15, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 15,
  },
  textArea: { minHeight: 150 },
  privateNotice: {
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    padding: 14,
  },
  privateNoticeText: { color: '#475569', fontSize: 13, lineHeight: 19 },
  acceptButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#1e3a8a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  acceptButtonText: { color: 'white', fontSize: 15, fontWeight: '700' },
  handledButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  handledButtonText: { color: '#166534', fontSize: 15, fontWeight: '700' },
  rejectButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  rejectButtonText: { color: '#b91c1c', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
});
