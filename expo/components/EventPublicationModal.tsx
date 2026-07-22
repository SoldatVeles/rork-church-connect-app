import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, Globe2, ShieldCheck, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
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
import type { Event } from '@/types/event';

const WEBSITE_LOCALE = 'de';
const PUBLICATION_LOOKUP_TIMEOUT_MS = 12000;

type WebsiteEventRow = {
  id: string;
  source_event_id: string;
  group_id: string;
  locale: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  event_type: string | null;
  image_url: string | null;
  registration_information: string | null;
  is_active: boolean;
  published_at: string | null;
};

type PublicForm = {
  title: string;
  description: string;
  location: string;
  registrationInformation: string;
};

type EventPublicationModalProps = {
  event: Event | null;
  eventTypeLabel: string;
  visible: boolean;
  onClose: () => void;
};

function withTimeout<T>(request: PromiseLike<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Publication lookup timed out'));
    }, timeoutMs);

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

function createSlug(title: string, eventId: string): string {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return `${normalizedTitle || 'veranstaltung'}-${eventId.slice(0, 8)}`;
}

export function EventPublicationModal({
  event,
  eventTypeLabel,
  visible,
  onClose,
}: EventPublicationModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PublicForm>({
    title: '',
    description: '',
    location: '',
    registrationInformation: '',
  });

  const publicationQuery = useQuery({
    queryKey: ['website-event-publication', event?.id, WEBSITE_LOCALE],
    enabled: visible && !!event?.id,
    queryFn: async (): Promise<WebsiteEventRow | null> => {
      if (!event?.id) return null;

      const { data, error } = await withTimeout(
        supabase
          .from('website_events')
          .select(
            'id, source_event_id, group_id, locale, slug, title, description, starts_at, ends_at, location, event_type, image_url, registration_information, is_active, published_at',
          )
          .eq('source_event_id', event.id)
          .eq('locale', WEBSITE_LOCALE)
          .limit(1),
        PUBLICATION_LOOKUP_TIMEOUT_MS,
      );

      if (error) throw new Error(error.message);
      return ((data as WebsiteEventRow[] | null) ?? [])[0] ?? null;
    },
    retry: false,
  });

  const publication = publicationQuery.data ?? null;

  useEffect(() => {
    if (!visible || !event) return;

    setForm({
      title: event.title,
      description: event.description,
      location: event.location,
      registrationInformation: '',
    });
  }, [event, visible]);

  useEffect(() => {
    if (!visible || !publication) return;

    setForm({
      title: publication.title,
      description: publication.description ?? '',
      location: publication.location ?? '',
      registrationInformation: publication.registration_information ?? '',
    });
  }, [publication, visible]);

  const dateLabel = useMemo(() => {
    if (!event) return '';
    const start = new Date(event.date);
    const date = start.toLocaleDateString(i18n.language, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const time = start.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${date} · ${time}`;
  }, [event, i18n.language]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!event?.groupId) throw new Error(t('events.publication.errors.missingChurch'));
      if (!form.title.trim()) throw new Error(t('events.publication.errors.titleRequired'));
      if (!form.description.trim()) throw new Error(t('events.publication.errors.descriptionRequired'));
      if (!form.location.trim()) throw new Error(t('events.publication.errors.locationRequired'));

      const publishedAt = publication?.published_at ?? new Date().toISOString();
      const payload = {
        source_event_id: event.id,
        group_id: event.groupId,
        locale: WEBSITE_LOCALE,
        slug: publication?.slug ?? createSlug(form.title, event.id),
        title: form.title.trim(),
        description: form.description.trim(),
        starts_at: new Date(event.date).toISOString(),
        ends_at: event.endDate ? new Date(event.endDate).toISOString() : null,
        location: form.location.trim(),
        event_type: event.type,
        image_url: publication?.image_url ?? null,
        registration_information: form.registrationInformation.trim() || null,
        is_active: true,
        published_at: publishedAt,
      };

      const { data, error } = await supabase
        .from('website_events')
        .upsert(payload, { onConflict: 'source_event_id,locale' })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return data as WebsiteEventRow;
    },
    onSuccess: (publishedEvent) => {
      queryClient.setQueryData(
        ['website-event-publication', event?.id, WEBSITE_LOCALE],
        publishedEvent,
      );
      Alert.alert(
        t('events.publication.successTitle'),
        publication?.is_active
          ? t('events.publication.updateSuccess')
          : t('events.publication.publishSuccess'),
      );
    },
    onError: (error) => {
      Alert.alert(t('events.errorTitle'), (error as Error).message);
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!publication?.id) throw new Error(t('events.publication.errors.notPublished'));
      const { error } = await supabase
        .from('website_events')
        .update({ is_active: false })
        .eq('id', publication.id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.setQueryData<WebsiteEventRow | null>(
        ['website-event-publication', event?.id, WEBSITE_LOCALE],
        (current) => current ? { ...current, is_active: false } : current,
      );
      Alert.alert(t('events.publication.successTitle'), t('events.publication.withdrawSuccess'));
    },
    onError: (error) => {
      Alert.alert(t('events.errorTitle'), (error as Error).message);
    },
  });

  const confirmWithdraw = () => {
    Alert.alert(
      t('events.publication.withdrawTitle'),
      t('events.publication.withdrawConfirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('events.publication.withdraw'),
          style: 'destructive',
          onPress: () => withdrawMutation.mutate(),
        },
      ],
    );
  };

  const isBusy = publishMutation.isPending || withdrawMutation.isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} testID="event-publication-modal">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{t('events.publication.website')}</Text>
            <Text style={styles.headerTitle}>{t('events.publication.title')}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={t('events.publication.close')}
            testID="close-event-publication-button"
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
                <Text style={styles.mutedText}>{t('events.publication.loading')}</Text>
              </View>
            ) : null}

            {publicationQuery.isError ? (
              <View style={styles.lookupError}>
                <Text style={styles.errorText}>{t('events.publication.loadFailed')}</Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => publicationQuery.refetch()}>
                  <Text style={styles.secondaryButtonText}>{t('events.publication.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.statusCard}>
              <View style={styles.statusIcon}>
                {publication?.is_active ? (
                  <CheckCircle2 size={22} color="#15803d" />
                ) : (
                  <Globe2 size={22} color="#b45309" />
                )}
              </View>
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {publication?.is_active
                    ? t('events.publication.published')
                    : publication
                      ? t('events.publication.withdrawn')
                      : t('events.publication.notPublished')}
                </Text>
                <Text style={styles.mutedText}>{t('events.publication.germanWebsite')}</Text>
              </View>
            </View>

            <View style={styles.safetyCard}>
              <ShieldCheck size={20} color="#1e3a8a" />
              <Text style={styles.safetyText}>{t('events.publication.safetyMessage')}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('events.publication.publicTitle')}</Text>
              <TextInput
                testID="public-event-title-input"
                style={styles.input}
                value={form.title}
                onChangeText={(title) => setForm((current) => ({ ...current, title }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('events.publication.publicDescription')}</Text>
              <TextInput
                testID="public-event-description-input"
                style={[styles.input, styles.textArea]}
                multiline
                value={form.description}
                onChangeText={(description) => setForm((current) => ({ ...current, description }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('events.location')}</Text>
              <TextInput
                testID="public-event-location-input"
                style={styles.input}
                value={form.location}
                onChangeText={(location) => setForm((current) => ({ ...current, location }))}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('events.publication.registrationInformation')}</Text>
              <TextInput
                testID="public-event-registration-input"
                style={[styles.input, styles.textAreaSmall]}
                multiline
                placeholder={t('events.publication.registrationPlaceholder')}
                value={form.registrationInformation}
                onChangeText={(registrationInformation) =>
                  setForm((current) => ({ ...current, registrationInformation }))
                }
              />
            </View>

            <View style={styles.previewHeading}>
              <Eye size={18} color="#1e3a8a" />
              <Text style={styles.previewHeadingText}>{t('events.publication.preview')}</Text>
            </View>
            <View style={styles.previewCard} testID="public-event-preview">
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>{eventTypeLabel}</Text>
              </View>
              <Text style={styles.previewTitle}>{form.title || t('events.publication.untitled')}</Text>
              <Text style={styles.previewMeta}>{dateLabel}</Text>
              <Text style={styles.previewMeta}>{form.location}</Text>
              <Text style={styles.previewDescription}>{form.description}</Text>
              {form.registrationInformation.trim() ? (
                <Text style={styles.previewRegistration}>{form.registrationInformation}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              testID="publish-event-to-website-button"
              style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
              disabled={isBusy}
              onPress={() => publishMutation.mutate()}
            >
              {publishMutation.isPending ? <ActivityIndicator color="white" /> : null}
              <Text style={styles.primaryButtonText}>
                {publication?.is_active
                  ? t('events.publication.updateWebsite')
                  : publication
                    ? t('events.publication.republish')
                    : t('events.publication.publish')}
              </Text>
            </TouchableOpacity>

            {publication?.is_active ? (
              <TouchableOpacity
                testID="withdraw-event-from-website-button"
                style={[styles.withdrawButton, isBusy && styles.buttonDisabled]}
                disabled={isBusy}
                onPress={confirmWithdraw}
              >
                <Text style={styles.withdrawButtonText}>{t('events.publication.withdraw')}</Text>
              </TouchableOpacity>
            ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  eyebrow: { color: '#496b3f', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: '700', marginTop: 2 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  content: { padding: 24, paddingBottom: 48, gap: 20 },
  lookupNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 },
  lookupError: { alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: '#fff1f2' },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    gap: 12,
  },
  statusIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
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
  textAreaSmall: { minHeight: 82, textAlignVertical: 'top' },
  previewHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  previewHeadingText: { color: '#1e293b', fontSize: 16, fontWeight: '700' },
  previewCard: { borderRadius: 20, padding: 20, backgroundColor: '#0b2341', gap: 10 },
  previewBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  previewBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  previewTitle: { color: 'white', fontSize: 22, fontWeight: '700' },
  previewMeta: { color: '#f0d28a', fontSize: 13, fontWeight: '600' },
  previewDescription: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  previewRegistration: { color: '#d1fae5', fontSize: 13, backgroundColor: 'rgba(73,107,63,0.45)', borderRadius: 10, padding: 10 },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: '#1e3a8a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  withdrawButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  withdrawButtonText: { color: '#b91c1c', fontSize: 15, fontWeight: '700' },
  secondaryButton: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: '#e2e8f0' },
  secondaryButtonText: { color: '#334155', fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
});
