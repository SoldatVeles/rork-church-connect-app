import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Church,
  Clock,
  Inbox,
  Mail,
  MapPin,
  MessageCircle,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

type WebsiteContactSubmission = {
  id: string;
  submissionType: 'contact' | 'book_request';
  churchName: string | null;
  requesterName: string;
  requesterEmail: string;
  postalAddress: string | null;
  topic: string;
  message: string | null;
  createdAt: string;
};

type WebsiteContactInboxModalProps = {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
};

export function WebsiteContactInboxModal({
  visible,
  userId,
  onClose,
}: WebsiteContactInboxModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] =
    useState<WebsiteContactSubmission | null>(null);

  const queryKey = ['website-contact-submissions', 'pending', userId] as const;
  const submissionsQuery = useQuery({
    queryKey,
    enabled: visible && !!userId,
    queryFn: async (): Promise<WebsiteContactSubmission[]> => {
      const { data, error } = await supabase
        .from('website_contact_submissions')
        .select(`
          id,
          submission_type,
          requester_name,
          requester_email,
          postal_address,
          topic,
          message,
          created_at,
          church:groups!website_contact_submissions_group_id_fkey(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) throw new Error(error.message);

      return ((data ?? []) as any[]).map((submission) => ({
        id: submission.id as string,
        submissionType: submission.submission_type as
          | 'contact'
          | 'book_request',
        churchName:
          (Array.isArray(submission.church)
            ? submission.church[0]?.name
            : submission.church?.name) ?? null,
        requesterName: submission.requester_name as string,
        requesterEmail: submission.requester_email as string,
        postalAddress: submission.postal_address as string | null,
        topic: submission.topic as string,
        message: submission.message as string | null,
        createdAt: submission.created_at as string,
      }));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      action,
      submission,
    }: {
      action: 'handled' | 'rejected';
      submission: WebsiteContactSubmission;
    }) => {
      const { error } = await supabase.rpc(
        'review_website_contact_submission',
        {
          p_submission_id: submission.id,
          p_action: action,
        },
      );

      if (error) throw new Error(error.message);
      return action;
    },
    onSuccess: (action) => {
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: ['website-contact-submissions-count'],
      });
      Alert.alert(
        t('prayers.websiteRequests.successTitle'),
        t(`prayers.websiteRequests.success.${action}`),
      );
    },
    onError: (error) => {
      Alert.alert(
        t('prayers.errorTitle'),
        error instanceof Error
          ? error.message
          : t('prayers.websiteRequests.reviewFailed'),
      );
    },
  });

  const confirmReview = (
    action: 'handled' | 'rejected',
    submission: WebsiteContactSubmission,
  ) => {
    Alert.alert(
      t(`prayers.websiteRequests.confirm.${action}Title`),
      t(`prayers.websiteRequests.confirm.${action}Message`),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t(`prayers.websiteRequests.actions.${action}`),
          style: action === 'rejected' ? 'destructive' : 'default',
          onPress: () => reviewMutation.mutate({ action, submission }),
        },
      ],
    );
  };

  const closeModal = () => {
    setSelected(null);
    onClose();
  };

  const topicLabel = (topic: string) =>
    t(`prayers.websiteRequests.topics.${topic}`, { defaultValue: topic });

  const typeLabel = (submissionType: WebsiteContactSubmission['submissionType']) =>
    t(`prayers.websiteRequests.types.${submissionType}`);

  const openEmail = async (submission: WebsiteContactSubmission) => {
    const subject = encodeURIComponent(
      `${typeLabel(submission.submissionType)}: ${topicLabel(submission.topic)}`,
    );
    await Linking.openURL(
      `mailto:${submission.requesterEmail}?subject=${subject}`,
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeModal}
    >
      <SafeAreaView
        style={styles.container}
        testID="website-contact-inbox-modal"
      >
        <View style={styles.header}>
          {selected ? (
            <TouchableOpacity
              style={styles.roundButton}
              onPress={() => setSelected(null)}
              accessibilityLabel={t('prayers.websiteRequests.back')}
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
              {t('prayers.websiteRequests.website')}
            </Text>
            <Text style={styles.headerTitle}>
              {t('prayers.websiteRequests.title')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.roundButton}
            onPress={closeModal}
            accessibilityLabel={t('prayers.websiteRequests.close')}
          >
            <X size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {selected ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.typeCard}>
              {selected.submissionType === 'book_request' ? (
                <BookOpenText size={20} color="#496b3f" />
              ) : (
                <MessageCircle size={20} color="#1e3a8a" />
              )}
              <View style={styles.typeText}>
                <Text style={styles.typeLabel}>
                  {typeLabel(selected.submissionType)}
                </Text>
                <Text style={styles.topicText}>
                  {topicLabel(selected.topic)}
                </Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <View style={styles.metaRow}>
                <Clock size={17} color="#64748b" />
                <Text style={styles.metaText}>
                  {new Date(selected.createdAt).toLocaleString(i18n.language)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Church size={17} color="#496b3f" />
                <Text style={styles.metaText}>
                  {selected.churchName ??
                    t('prayers.websiteRequests.centralOffice')}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <User size={17} color="#64748b" />
                <Text style={styles.metaText}>{selected.requesterName}</Text>
              </View>
              <View style={styles.metaRow}>
                <Mail size={17} color="#64748b" />
                <Text style={styles.metaText}>{selected.requesterEmail}</Text>
              </View>
              {selected.postalAddress ? (
                <View style={styles.metaRow}>
                  <MapPin size={17} color="#64748b" />
                  <Text style={styles.metaText}>
                    {selected.postalAddress}
                  </Text>
                </View>
              ) : null}
            </View>

            {selected.message ? (
              <View style={styles.messageCard}>
                <Text style={styles.messageLabel}>
                  {t('prayers.websiteRequests.message')}
                </Text>
                <Text style={styles.messageText}>{selected.message}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.emailButton}
              onPress={() => void openEmail(selected)}
            >
              <Mail size={18} color="white" />
              <Text style={styles.emailButtonText}>
                {t('prayers.websiteRequests.replyByEmail')}
              </Text>
            </TouchableOpacity>

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
                {t('prayers.websiteRequests.actions.handled')}
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
                {t('prayers.websiteRequests.actions.rejected')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {submissionsQuery.isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text style={styles.mutedText}>
                  {t('prayers.websiteRequests.loading')}
                </Text>
              </View>
            ) : submissionsQuery.isError ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>
                  {t('prayers.websiteRequests.loadFailed')}
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
                  testID={`website-contact-submission-${submission.id}`}
                  style={styles.submissionCard}
                  onPress={() => setSelected(submission)}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.typeBadge}>
                      {typeLabel(submission.submissionType)}
                    </Text>
                    <Text style={styles.cardDate}>
                      {new Date(submission.createdAt).toLocaleDateString(
                        i18n.language,
                      )}
                    </Text>
                  </View>
                  <Text style={styles.submissionTitle}>
                    {topicLabel(submission.topic)}
                  </Text>
                  <Text style={styles.requesterText}>
                    {submission.requesterName}
                  </Text>
                  <Text numberOfLines={3} style={styles.submissionDetails}>
                    {submission.message ??
                      submission.postalAddress ??
                      t('prayers.websiteRequests.noMessage')}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.centered}>
                <CheckCircle2 size={42} color="#496b3f" />
                <Text style={styles.emptyTitle}>
                  {t('prayers.websiteRequests.emptyTitle')}
                </Text>
                <Text style={styles.mutedText}>
                  {t('prayers.websiteRequests.emptyMessage')}
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
    fontSize: 18,
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
  typeBadge: {
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  cardDate: { color: '#94a3b8', fontSize: 12 },
  submissionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  requesterText: { color: '#496b3f', fontSize: 13, fontWeight: '600' },
  submissionDetails: { color: '#475569', fontSize: 14, lineHeight: 20 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    padding: 16,
  },
  typeText: { flex: 1, gap: 3 },
  typeLabel: { color: '#1e3a8a', fontSize: 12, fontWeight: '700' },
  topicText: { color: '#0f172a', fontSize: 17, fontWeight: '700' },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    padding: 16,
    gap: 12,
  },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaText: { flex: 1, color: '#475569', fontSize: 14, lineHeight: 20 },
  messageCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5dfd0',
    backgroundColor: 'white',
    padding: 16,
    gap: 8,
  },
  messageLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  messageText: { color: '#334155', fontSize: 15, lineHeight: 22 },
  emailButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#1e3a8a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  emailButtonText: { color: 'white', fontSize: 15, fontWeight: '700' },
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
