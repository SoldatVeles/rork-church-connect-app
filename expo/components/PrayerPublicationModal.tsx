import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, Globe2, ShieldCheck, X } from 'lucide-react-native';
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
import type { PrayerRequest } from '@/types/prayer';

const WEBSITE_LOCALE = 'de';
const LOOKUP_TIMEOUT_MS = 12000;

type WebsitePrayerRow = {
  id: string;
  source_prayer_id: string;
  group_id: string;
  locale: string;
  title: string;
  details: string | null;
  category: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  is_active: boolean;
  published_at: string | null;
};

type PublicPrayerForm = {
  title: string;
  details: string;
  category: string;
};

type PrayerPublicationModalProps = {
  prayer: PrayerRequest | null;
  visible: boolean;
  onClose: () => void;
};

function withTimeout<T>(request: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Prayer publication lookup timed out')), timeoutMs);
    Promise.resolve(request).then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function PrayerPublicationModal({
  prayer,
  visible,
  onClose,
}: PrayerPublicationModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PublicPrayerForm>({
    title: '',
    details: '',
    category: '',
  });

  const queryKey = ['website-prayer-publication', prayer?.id, WEBSITE_LOCALE] as const;
  const publicationQuery = useQuery({
    queryKey,
    enabled: visible && !!prayer?.id,
    retry: false,
    queryFn: async (): Promise<WebsitePrayerRow | null> => {
      if (!prayer?.id) return null;

      const { data, error } = await withTimeout(
        supabase
          .from('website_prayers')
          .select(
            'id, source_prayer_id, group_id, locale, title, details, category, is_anonymous, is_answered, is_active, published_at',
          )
          .eq('source_prayer_id', prayer.id)
          .eq('locale', WEBSITE_LOCALE)
          .limit(1),
        LOOKUP_TIMEOUT_MS,
      );

      if (error) throw new Error(error.message);
      return ((data as WebsitePrayerRow[] | null) ?? [])[0] ?? null;
    },
  });

  const publication = publicationQuery.data ?? null;

  useEffect(() => {
    if (!visible || !prayer) return;
    setForm({
      title: prayer.title,
      details: prayer.description,
      category: prayer.category ?? '',
    });
  }, [prayer, visible]);

  useEffect(() => {
    if (!visible || !publication) return;
    setForm({
      title: publication.title,
      details: publication.details ?? '',
      category: publication.category ?? '',
    });
  }, [publication, visible]);

  const publishMutation = useMutation({
    mutationFn: async (): Promise<WebsitePrayerRow> => {
      if (!prayer?.groupId) throw new Error(t('prayers.publication.errors.missingChurch'));
      if (!form.title.trim()) throw new Error(t('prayers.publication.errors.titleRequired'));
      if (!form.details.trim()) throw new Error(t('prayers.publication.errors.detailsRequired'));

      const payload = {
        source_prayer_id: prayer.id,
        group_id: prayer.groupId,
        locale: WEBSITE_LOCALE,
        title: form.title.trim(),
        details: form.details.trim(),
        category: form.category.trim() || null,
        is_anonymous: true,
        is_answered: prayer.status === 'answered',
        is_active: true,
        published_at: publication?.published_at ?? new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('website_prayers')
        .upsert(payload, { onConflict: 'source_prayer_id,locale' })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data as WebsitePrayerRow;
    },
    onSuccess: (publishedPrayer) => {
      queryClient.setQueryData(queryKey, publishedPrayer);
      Alert.alert(
        t('prayers.publication.successTitle'),
        publication?.is_active
          ? t('prayers.publication.updateSuccess')
          : t('prayers.publication.publishSuccess'),
      );
    },
    onError: (error) => Alert.alert(t('prayers.errorTitle'), (error as Error).message),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!publication?.id) throw new Error(t('prayers.publication.errors.notPublished'));
      const { error } = await supabase
        .from('website_prayers')
        .update({ is_active: false })
        .eq('id', publication.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.setQueryData<WebsitePrayerRow | null>(
        queryKey,
        (current) => current ? { ...current, is_active: false } : current,
      );
      Alert.alert(t('prayers.publication.successTitle'), t('prayers.publication.withdrawSuccess'));
    },
    onError: (error) => Alert.alert(t('prayers.errorTitle'), (error as Error).message),
  });

  const confirmWithdraw = () => {
    Alert.alert(
      t('prayers.publication.withdrawTitle'),
      t('prayers.publication.withdrawConfirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('prayers.publication.withdraw'),
          style: 'destructive',
          onPress: () => withdrawMutation.mutate(),
        },
      ],
    );
  };

  const isBusy = publishMutation.isPending || withdrawMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} testID="prayer-publication-modal">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{t('prayers.publication.website')}</Text>
            <Text style={styles.headerTitle}>{t('prayers.publication.title')}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={t('prayers.publication.close')}
            testID="close-prayer-publication-button"
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {publicationQuery.isFetching && !publication ? (
            <View style={styles.lookupNotice}>
              <ActivityIndicator size="small" color="#1e3a8a" />
              <Text style={styles.mutedText}>{t('prayers.publication.loading')}</Text>
            </View>
          ) : null}

          {publicationQuery.isError ? (
            <View style={styles.lookupError}>
              <Text style={styles.errorText}>{t('prayers.publication.loadFailed')}</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => publicationQuery.refetch()}>
                <Text style={styles.secondaryButtonText}>{t('prayers.publication.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.statusCard}>
            {publication?.is_active ? (
              <CheckCircle2 size={22} color="#15803d" />
            ) : (
              <Globe2 size={22} color="#b45309" />
            )}
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>
                {publication?.is_active
                  ? t('prayers.publication.published')
                  : publication
                    ? t('prayers.publication.withdrawn')
                    : t('prayers.publication.notPublished')}
              </Text>
              <Text style={styles.mutedText}>{t('prayers.publication.germanWebsite')}</Text>
            </View>
          </View>

          <View style={styles.safetyCard}>
            <ShieldCheck size={20} color="#1e3a8a" />
            <Text style={styles.safetyText}>{t('prayers.publication.safetyMessage')}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('prayers.publication.publicTitle')}</Text>
            <TextInput
              testID="public-prayer-title-input"
              style={styles.input}
              value={form.title}
              onChangeText={(title) => setForm((current) => ({ ...current, title }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('prayers.publication.publicDetails')}</Text>
            <TextInput
              testID="public-prayer-details-input"
              style={[styles.input, styles.textArea]}
              multiline
              value={form.details}
              onChangeText={(details) => setForm((current) => ({ ...current, details }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('prayers.publication.category')}</Text>
            <TextInput
              testID="public-prayer-category-input"
              style={styles.input}
              placeholder={t('prayers.publication.categoryPlaceholder')}
              value={form.category}
              onChangeText={(category) => setForm((current) => ({ ...current, category }))}
            />
          </View>

          <View style={styles.previewHeading}>
            <Eye size={18} color="#1e3a8a" />
            <Text style={styles.previewHeadingText}>{t('prayers.publication.preview')}</Text>
          </View>
          <View style={styles.previewCard} testID="public-prayer-preview">
            <View style={styles.previewBadges}>
              <Text style={styles.previewBadge}>{form.category || t('prayers.publication.defaultCategory')}</Text>
              {prayer?.status === 'answered' ? (
                <Text style={styles.previewAnswered}>{t('prayers.status.answered')}</Text>
              ) : null}
            </View>
            <Text style={styles.previewTitle}>{form.title || t('prayers.publication.untitled')}</Text>
            <Text style={styles.previewDetails}>{form.details}</Text>
            <Text style={styles.previewPrivacy}>{t('prayers.publication.anonymousPreview')}</Text>
          </View>

          <TouchableOpacity
            testID="publish-prayer-to-website-button"
            style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
            disabled={isBusy}
            onPress={() => publishMutation.mutate()}
          >
            {publishMutation.isPending ? <ActivityIndicator color="white" /> : null}
            <Text style={styles.primaryButtonText}>
              {publication?.is_active
                ? t('prayers.publication.updateWebsite')
                : publication
                  ? t('prayers.publication.republish')
                  : t('prayers.publication.publish')}
            </Text>
          </TouchableOpacity>

          {publication?.is_active ? (
            <TouchableOpacity
              testID="withdraw-prayer-from-website-button"
              style={[styles.withdrawButton, isBusy && styles.buttonDisabled]}
              disabled={isBusy}
              onPress={confirmWithdraw}
            >
              <Text style={styles.withdrawButtonText}>{t('prayers.publication.withdraw')}</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: 'white' },
  eyebrow: { color: '#496b3f', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: '700', marginTop: 2 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  content: { padding: 24, paddingBottom: 48, gap: 20 },
  lookupNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  lookupError: { alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: '#fff1f2' },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 },
  statusText: { flex: 1 },
  statusTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  mutedText: { color: '#64748b', fontSize: 13, marginTop: 2 },
  errorText: { color: '#b91c1c', fontSize: 15, textAlign: 'center' },
  safetyCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: '#eff6ff' },
  safetyText: { flex: 1, color: '#334155', fontSize: 13, lineHeight: 19 },
  inputGroup: { gap: 8 },
  label: { color: '#1e293b', fontSize: 15, fontWeight: '600' },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a', fontSize: 15 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  previewHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewHeadingText: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
  previewCard: { borderRadius: 20, padding: 20, backgroundColor: '#0b2341', gap: 12 },
  previewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewBadge: { color: '#0b2341', backgroundColor: '#f0d28a', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '700' },
  previewAnswered: { color: '#166534', backgroundColor: '#dcfce7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '700' },
  previewTitle: { color: 'white', fontSize: 22, fontWeight: '700' },
  previewDetails: { color: '#e2e8f0', fontSize: 14, lineHeight: 21 },
  previewPrivacy: { color: '#d1fae5', fontSize: 12 },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: '#1e3a8a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  withdrawButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  withdrawButtonText: { color: '#b91c1c', fontSize: 15, fontWeight: '700' },
  secondaryButton: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: '#e2e8f0' },
  secondaryButtonText: { color: '#334155', fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
});
