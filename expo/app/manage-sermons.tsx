import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  Info,
  Plus,
  Star,
  Trash2,
  UserRound,
  Youtube,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  createSermon,
  deleteSermon,
  fetchSermons,
  updateSermon,
} from '@/lib/sermons';
import { useAuth } from '@/providers/auth-provider';
import type { CreateSermonInput, Sermon } from '@/types/sermon';
import { isPastorLevel } from '@/utils/permissions';
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
} from '@/utils/youtube';

type SermonForm = {
  title: string;
  speaker: string;
  date: string;
  duration: string;
  description: string;
  topic: string;
  youtube_url: string;
  is_featured: boolean;
};

const EMPTY_FORM: SermonForm = {
  title: '',
  speaker: '',
  date: '',
  duration: '',
  description: '',
  topic: '',
  youtube_url: '',
  is_featured: false,
};

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

function formatDate(value: string, language: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ManageSermonsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [formData, setFormData] = useState<SermonForm>(EMPTY_FORM);

  const sermonsQuery = useQuery({
    queryKey: ['sermons'],
    queryFn: fetchSermons,
    staleTime: 30_000,
  });

  const finishMutation = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: ['sermons'] });
    setFormData(EMPTY_FORM);
    setEditingSermon(null);
    Alert.alert(
      t('admin.common.success'),
      message,
    );
  };

  const createMutation = useMutation({
    mutationFn: createSermon,
    onSuccess: () => {
      void finishMutation(t('sermonLibrary.created'));
    },
    onError: (error: Error) => {
      Alert.alert(t('admin.common.error'), error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateSermon,
    onSuccess: () => {
      void finishMutation(t('sermonLibrary.updated'));
    },
    onError: (error: Error) => {
      Alert.alert(t('admin.common.error'), error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSermon,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sermons'] });
      Alert.alert(
        t('admin.common.success'),
        t('sermonLibrary.deleted'),
      );
    },
    onError: (error: Error) => {
      Alert.alert(t('admin.common.error'), error.message);
    },
  });

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingSermon(null);
  };

  const updateField = <K extends keyof SermonForm>(
    key: K,
    value: SermonForm[K],
  ) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = () => {
    const requiredValues = [
      formData.title,
      formData.speaker,
      formData.date,
      formData.duration,
      formData.topic,
      formData.description,
    ];

    if (requiredValues.some((value) => !value.trim())) {
      Alert.alert(
        t('admin.common.error'),
        t('sermonLibrary.requiredError'),
      );
      return;
    }

    if (!isValidIsoDate(formData.date.trim())) {
      Alert.alert(
        t('admin.common.error'),
        t('sermonLibrary.dateError'),
      );
      return;
    }

    const youtubeUrl = formData.youtube_url.trim();
    if (youtubeUrl && !getYouTubeVideoId(youtubeUrl)) {
      Alert.alert(
        t('admin.common.error'),
        t('sermonLibrary.youtubeError'),
      );
      return;
    }

    const input: CreateSermonInput = {
      title: formData.title,
      speaker: formData.speaker,
      date: formData.date,
      duration: formData.duration,
      description: formData.description,
      topic: formData.topic,
      youtube_url: youtubeUrl || null,
      thumbnail_url: youtubeUrl
        ? getYouTubeThumbnailUrl(youtubeUrl)
        : null,
      is_featured: formData.is_featured,
    };

    if (editingSermon) {
      updateMutation.mutate({ id: editingSermon.id, ...input });
    } else {
      createMutation.mutate(input);
    }
  };

  const handleEdit = (sermon: Sermon) => {
    setEditingSermon(sermon);
    setFormData({
      title: sermon.title,
      speaker: sermon.speaker,
      date: sermon.date,
      duration: sermon.duration,
      description: sermon.description,
      topic: sermon.topic,
      youtube_url: sermon.youtube_url ?? '',
      is_featured: sermon.is_featured,
    });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleDelete = (sermon: Sermon) => {
    Alert.alert(
      t('sermonLibrary.deleteTitle'),
      t('sermonLibrary.deleteMessage', { title: sermon.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.common.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(sermon.id),
        },
      ],
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isPastorLevel(user)) {
    return (
      <View style={styles.deniedScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
        <SafeAreaView style={styles.deniedSafeArea}>
          <TouchableOpacity
            style={styles.deniedBack}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color="#1e3a8a" />
          </TouchableOpacity>
          <View style={styles.deniedContent}>
            <View style={styles.deniedIcon}>
              <BookOpen size={30} color="#dc2626" />
            </View>
            <Text style={styles.deniedTitle}>
              {t('sermonLibrary.accessDeniedTitle')}
            </Text>
            <Text style={styles.deniedText}>
              {t('sermonLibrary.accessDeniedText')}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <LinearGradient
        colors={['#1e3a8a', '#3b82f6']}
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
            >
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>
                {t('sermonLibrary.managerTitle')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('sermonLibrary.managerSubtitle')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.push('/sermon')}
              accessibilityRole="button"
              accessibilityLabel={t('sermonLibrary.openLibrary')}
            >
              <ExternalLink size={21} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Info size={20} color="#1e3a8a" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.infoTitle}>
                {t('sermonLibrary.howItWorksTitle')}
              </Text>
              <Text style={styles.infoText}>
                {t('sermonLibrary.howItWorks')}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                {editingSermon ? (
                  <Edit3 size={19} color="#1e3a8a" />
                ) : (
                  <Plus size={19} color="#1e3a8a" />
                )}
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>
                  {editingSermon
                    ? t('sermonLibrary.editRecording')
                    : t('sermonLibrary.newRecording')}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {t('sermonLibrary.requiredHint')}
                </Text>
              </View>
            </View>

            <Field
              label={t('sermonLibrary.titleLabel')}
              value={formData.title}
              placeholder={t('sermonLibrary.titlePlaceholder')}
              onChangeText={(value) => updateField('title', value)}
            />
            <Field
              label={t('sermonLibrary.speakerLabel')}
              value={formData.speaker}
              placeholder={t('sermonLibrary.speakerPlaceholder')}
              onChangeText={(value) => updateField('speaker', value)}
              autoCapitalize="words"
            />
            <Field
              label={t('sermonLibrary.dateLabel')}
              value={formData.date}
              placeholder="2026-07-26"
              helper={t('sermonLibrary.dateHelp')}
              onChangeText={(value) => updateField('date', value)}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
            />
            <Field
              label={t('sermonLibrary.durationLabel')}
              value={formData.duration}
              placeholder={t('sermonLibrary.durationPlaceholder')}
              onChangeText={(value) => updateField('duration', value)}
            />
            <Field
              label={t('sermonLibrary.topicLabel')}
              value={formData.topic}
              placeholder={t('sermonLibrary.topicPlaceholder')}
              helper={t('sermonLibrary.topicHelp')}
              onChangeText={(value) => updateField('topic', value)}
              autoCapitalize="sentences"
            />
            <Field
              label={t('sermonLibrary.descriptionLabel')}
              value={formData.description}
              placeholder={t('sermonLibrary.descriptionPlaceholder')}
              onChangeText={(value) => updateField('description', value)}
              multiline
            />

            <View style={styles.youtubeBox}>
              <View style={styles.youtubeHeading}>
                <View style={styles.youtubeIcon}>
                  <Youtube size={18} color="#dc2626" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.youtubeTitle}>
                    {t('sermonLibrary.youtubeTitle')}
                  </Text>
                  <Text style={styles.youtubeHelp}>
                    {t('sermonLibrary.youtubeHelp')}
                  </Text>
                </View>
              </View>
              <TextInput
                style={styles.youtubeInput}
                value={formData.youtube_url}
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor="#94a3b8"
                onChangeText={(value) => updateField('youtube_url', value)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View style={styles.featuredRow}>
              <View style={styles.featuredCopy}>
                <View style={styles.featuredTitleRow}>
                  <Star size={18} color="#d97706" />
                  <Text style={styles.featuredTitle}>
                    {t('sermonLibrary.featuredLabel')}
                  </Text>
                </View>
                <Text style={styles.featuredHelp}>
                  {t('sermonLibrary.featuredHelp')}
                </Text>
              </View>
              <Switch
                value={formData.is_featured}
                onValueChange={(value) => updateField('is_featured', value)}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={formData.is_featured ? '#1e3a8a' : '#f8fafc'}
              />
            </View>

            <View style={styles.formActions}>
              {editingSermon && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={resetForm}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  isSaving && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>
                      {editingSermon
                        ? t('sermonLibrary.update')
                        : t('sermonLibrary.publish')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.cardTitle}>
                  {t('sermonLibrary.existingRecordings')}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {t('sermonLibrary.recordingCount', {
                    count: sermonsQuery.data?.length ?? 0,
                  })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.libraryButton}
                onPress={() => router.push('/sermon')}
              >
                <BookOpen size={16} color="#1e3a8a" />
                <Text style={styles.libraryButtonText}>
                  {t('sermonLibrary.openLibrary')}
                </Text>
              </TouchableOpacity>
            </View>

            {sermonsQuery.isLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color="#1e3a8a" />
                <Text style={styles.stateText}>
                  {t('sermonLibrary.loading')}
                </Text>
              </View>
            ) : sermonsQuery.isError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  {t('sermonLibrary.loadError')}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => void sermonsQuery.refetch()}
                >
                  <Text style={styles.retryButtonText}>
                    {t('admin.common.retry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : sermonsQuery.data?.length ? (
              <View style={styles.recordingList}>
                {sermonsQuery.data.map((sermon) => (
                  <View key={sermon.id} style={styles.recordingCard}>
                    <View style={styles.recordingTopRow}>
                      <View style={styles.recordingIcon}>
                        {sermon.youtube_url ? (
                          <Youtube size={19} color="#dc2626" />
                        ) : (
                          <BookOpen size={19} color="#1e3a8a" />
                        )}
                      </View>
                      <View style={styles.recordingCopy}>
                        <View style={styles.recordingTitleRow}>
                          <Text
                            style={styles.recordingTitle}
                            numberOfLines={2}
                          >
                            {sermon.title}
                          </Text>
                          {sermon.is_featured && (
                            <View style={styles.starBadge}>
                              <Star
                                size={11}
                                color="#92400e"
                                fill="#fbbf24"
                              />
                              <Text style={styles.starBadgeText}>
                                {t('sermonLibrary.featured')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.topicText}>{sermon.topic}</Text>
                      </View>
                    </View>

                    <View style={styles.metadata}>
                      <View style={styles.metaItem}>
                        <UserRound size={14} color="#64748b" />
                        <Text style={styles.metaText}>{sermon.speaker}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <CalendarDays size={14} color="#64748b" />
                        <Text style={styles.metaText}>
                          {formatDate(sermon.date, i18n.language)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock3 size={14} color="#64748b" />
                        <Text style={styles.metaText}>{sermon.duration}</Text>
                      </View>
                    </View>

                    <View style={styles.recordingActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEdit(sermon)}
                      >
                        <Edit3 size={16} color="#1e3a8a" />
                        <Text style={styles.editButtonText}>
                          {t('sermonLibrary.edit')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(sermon)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 size={17} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <BookOpen size={26} color="#1e3a8a" />
                </View>
                <Text style={styles.emptyTitle}>
                  {t('sermonLibrary.emptyManagerTitle')}
                </Text>
                <Text style={styles.emptyText}>
                  {t('sermonLibrary.emptyManagerText')}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  placeholder: string;
  helper?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'numbers-and-punctuation';
  onChangeText: (value: string) => void;
};

function Field({
  label,
  value,
  placeholder,
  helper,
  multiline = false,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  onChangeText,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label} *</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
      {helper ? <Text style={styles.fieldHelp}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: Platform.OS === 'android' ? 34 : 0,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    marginTop: 3,
  },
  content: { padding: 16, paddingBottom: 48 },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 15,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    color: '#1e3a8a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  infoText: { color: '#475569', fontSize: 13, lineHeight: 19 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 20,
  },
  cardHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: '#1e293b', fontSize: 18, fontWeight: '800' },
  cardSubtitle: { color: '#64748b', fontSize: 12, marginTop: 3 },
  field: { marginBottom: 16 },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#dbe3ed',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    fontSize: 15,
  },
  textArea: { minHeight: 116, paddingTop: 13 },
  fieldHelp: { color: '#64748b', fontSize: 12, marginTop: 6, lineHeight: 17 },
  youtubeBox: {
    backgroundColor: '#fff7f7',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  youtubeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  youtubeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeTitle: { color: '#991b1b', fontSize: 14, fontWeight: '700' },
  youtubeHelp: { color: '#7f1d1d', fontSize: 12, lineHeight: 17, marginTop: 2 },
  youtubeInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
    fontSize: 14,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    marginBottom: 20,
  },
  featuredCopy: { flex: 1 },
  featuredTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  featuredTitle: { color: '#78350f', fontSize: 14, fontWeight: '700' },
  featuredHelp: { color: '#92400e', fontSize: 12, lineHeight: 17, marginTop: 4 },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    flexGrow: 1,
    minWidth: 170,
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    minHeight: 50,
    minWidth: 110,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a8a',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: { color: '#1e3a8a', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.65 },
  listHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  libraryButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  libraryButtonText: { color: '#1e3a8a', fontSize: 12, fontWeight: '700' },
  stateBox: { alignItems: 'center', paddingVertical: 30, gap: 10 },
  stateText: { color: '#64748b', fontSize: 13 },
  errorBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
  },
  errorTitle: { color: '#991b1b', fontSize: 14, fontWeight: '700' },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#991b1b',
    borderRadius: 10,
  },
  retryButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  recordingList: { gap: 12 },
  recordingCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
  },
  recordingTopRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  recordingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recordingCopy: { flex: 1 },
  recordingTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 7,
  },
  recordingTitle: {
    flexGrow: 1,
    flexShrink: 1,
    color: '#1e293b',
    fontSize: 15,
    fontWeight: '700',
  },
  topicText: { color: '#1e3a8a', fontSize: 12, fontWeight: '600', marginTop: 4 },
  starBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#fef3c7',
  },
  starBadgeText: { color: '#92400e', fontSize: 9, fontWeight: '800' },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 13,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#64748b', fontSize: 12 },
  recordingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  editButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  editButtonText: { color: '#1e3a8a', fontSize: 13, fontWeight: '700' },
  deleteButton: {
    width: 42,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  emptyBox: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 12 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 5,
  },
  deniedScreen: { flex: 1, backgroundColor: '#f8fafc' },
  deniedSafeArea: { flex: 1 },
  deniedBack: {
    width: 44,
    height: 44,
    margin: 16,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  deniedIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deniedTitle: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  deniedText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});
