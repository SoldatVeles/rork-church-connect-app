import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock3,
  ExternalLink,
  Play,
  RefreshCw,
  Settings,
  Share2,
  Star,
  UserRound,
  X,
  Youtube,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { YouTubePlayer } from '@/components/YouTubePlayer';
import { fetchSermons } from '@/lib/sermons';
import { useAuth } from '@/providers/auth-provider';
import type { Sermon } from '@/types/sermon';
import { isPastorLevel } from '@/utils/permissions';
import { getYouTubeThumbnailUrl } from '@/utils/youtube';

function formatDate(value: string, language: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(language, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function SermonScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);

  const sermonsQuery = useQuery({
    queryKey: ['sermons'],
    queryFn: fetchSermons,
    staleTime: 30_000,
  });

  const sermons = sermonsQuery.data ?? [];
  const featuredSermon =
    sermons.find((sermon) => sermon.is_featured) ?? sermons[0];
  const previousSermons = sermons.filter(
    (sermon) => sermon.id !== featuredSermon?.id,
  );
  const canManage = isPastorLevel(user);

  const play = (sermon: Sermon) => {
    if (sermon.youtube_url) setSelectedSermon(sermon);
  };

  const share = async (sermon: Sermon) => {
    const details = t('sermonLibrary.shareMessage', {
      title: sermon.title,
      speaker: sermon.speaker,
    });
    await Share.share({
      title: sermon.title,
      message: sermon.youtube_url
        ? `${details}\n${sermon.youtube_url}`
        : details,
    });
  };

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
                {t('sermonLibrary.title')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('sermonLibrary.subtitle')}
              </Text>
            </View>
            {canManage ? (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => router.push('/manage-sermons')}
                accessibilityRole="button"
                accessibilityLabel={t('sermonLibrary.manage')}
              >
                <Settings size={21} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {sermonsQuery.isLoading ? (
        <StateView
          icon={<ActivityIndicator size="large" color="#1e3a8a" />}
          title={t('sermonLibrary.loading')}
        />
      ) : sermonsQuery.isError ? (
        <StateView
          icon={<RefreshCw size={30} color="#b91c1c" />}
          title={t('sermonLibrary.loadError')}
          subtitle={t('sermonLibrary.loadErrorHelp')}
          actionLabel={t('admin.common.retry')}
          onAction={() => void sermonsQuery.refetch()}
          danger
        />
      ) : !featuredSermon ? (
        <StateView
          icon={<BookOpen size={32} color="#1e3a8a" />}
          title={t('sermonLibrary.emptyTitle')}
          subtitle={t('sermonLibrary.emptyText')}
          actionLabel={
            canManage ? t('sermonLibrary.addFirstRecording') : undefined
          }
          onAction={
            canManage ? () => router.push('/manage-sermons') : undefined
          }
        />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionHeading}>
            <View style={styles.sectionHeadingIcon}>
              {featuredSermon.is_featured ? (
                <Star size={17} color="#92400e" fill="#fbbf24" />
              ) : (
                <BookOpen size={17} color="#1e3a8a" />
              )}
            </View>
            <Text style={styles.sectionEyebrow}>
              {featuredSermon.is_featured
                ? t('sermonLibrary.featured')
                : t('sermonLibrary.latest')}
            </Text>
          </View>

          <View style={styles.featuredCard}>
            <SermonArtwork
              sermon={featuredSermon}
              large
              onPress={
                featuredSermon.youtube_url
                  ? () => play(featuredSermon)
                  : undefined
              }
            />

            <View style={styles.featuredContent}>
              <View style={styles.topicBadge}>
                <Text style={styles.topicBadgeText}>
                  {featuredSermon.topic}
                </Text>
              </View>
              <Text style={styles.featuredTitle}>
                {featuredSermon.title}
              </Text>

              <View style={styles.featuredMeta}>
                <Meta
                  icon={<UserRound size={14} color="#64748b" />}
                  text={featuredSermon.speaker}
                />
                <Meta
                  icon={<CalendarDays size={14} color="#64748b" />}
                  text={formatDate(featuredSermon.date, i18n.language)}
                />
                <Meta
                  icon={<Clock3 size={14} color="#64748b" />}
                  text={featuredSermon.duration}
                />
              </View>

              <Text style={styles.description}>
                {featuredSermon.description}
              </Text>

              <View style={styles.actions}>
                {featuredSermon.youtube_url ? (
                  <TouchableOpacity
                    style={styles.watchButton}
                    onPress={() => play(featuredSermon)}
                  >
                    <Play size={18} color="#fff" fill="#fff" />
                    <Text style={styles.watchButtonText}>
                      {t('sermonLibrary.watchInApp')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noVideoPill}>
                    <BookOpen size={17} color="#64748b" />
                    <Text style={styles.noVideoText}>
                      {t('sermonLibrary.noVideo')}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.squareButton}
                  onPress={() => void share(featuredSermon)}
                  accessibilityRole="button"
                  accessibilityLabel={t('sermonLibrary.share')}
                >
                  <Share2 size={19} color="#1e3a8a" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {previousSermons.length > 0 && (
            <View style={styles.previousSection}>
              <Text style={styles.previousTitle}>
                {t('sermonLibrary.previous')}
              </Text>
              <Text style={styles.previousSubtitle}>
                {t('sermonLibrary.previousHelp')}
              </Text>

              <View style={styles.sermonList}>
                {previousSermons.map((sermon) => (
                  <View key={sermon.id} style={styles.sermonCard}>
                    <SermonArtwork
                      sermon={sermon}
                      onPress={
                        sermon.youtube_url
                          ? () => play(sermon)
                          : undefined
                      }
                    />
                    <View style={styles.sermonCardBody}>
                      <View style={styles.topicBadgeSmall}>
                        <Text style={styles.topicBadgeSmallText}>
                          {sermon.topic}
                        </Text>
                      </View>
                      <Text style={styles.sermonTitle} numberOfLines={2}>
                        {sermon.title}
                      </Text>
                      <Text style={styles.sermonSpeaker} numberOfLines={1}>
                        {sermon.speaker}
                      </Text>
                      <View style={styles.sermonDateRow}>
                        <CalendarDays size={13} color="#94a3b8" />
                        <Text style={styles.sermonDate}>
                          {formatDate(sermon.date, i18n.language)}
                        </Text>
                        <Text style={styles.dot}>•</Text>
                        <Text style={styles.sermonDate}>
                          {sermon.duration}
                        </Text>
                      </View>
                      <View style={styles.cardActions}>
                        {sermon.youtube_url ? (
                          <TouchableOpacity
                            style={styles.smallWatchButton}
                            onPress={() => play(sermon)}
                          >
                            <Play size={14} color="#fff" fill="#fff" />
                            <Text style={styles.smallWatchText}>
                              {t('sermonLibrary.watch')}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.smallNoVideo}>
                            <BookOpen size={14} color="#64748b" />
                            <Text style={styles.smallNoVideoText}>
                              {t('sermonLibrary.noVideo')}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.smallShareButton}
                          onPress={() => void share(sermon)}
                        >
                          <Share2 size={16} color="#1e3a8a" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={Boolean(selectedSermon)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedSermon(null)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSelectedSermon(null)}
            >
              <X size={20} color="#1e3a8a" />
              <Text style={styles.modalCloseText}>
                {t('sermonLibrary.close')}
              </Text>
            </TouchableOpacity>
            {selectedSermon?.youtube_url ? (
              <TouchableOpacity
                style={styles.youtubeExternal}
                onPress={() =>
                  void Linking.openURL(selectedSermon.youtube_url!)
                }
              >
                <Youtube size={18} color="#dc2626" />
                <Text style={styles.youtubeExternalText}>
                  {t('sermonLibrary.openYouTube')}
                </Text>
                <ExternalLink size={14} color="#dc2626" />
              </TouchableOpacity>
            ) : null}
          </View>

          {selectedSermon?.youtube_url ? (
            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <YouTubePlayer
                videoUrl={selectedSermon.youtube_url}
                invalidUrlText={t('sermonLibrary.invalidVideo')}
                externalFallbackText={t('sermonLibrary.openYouTube')}
              />
              <View style={styles.modalInfo}>
                <View style={styles.topicBadge}>
                  <Text style={styles.topicBadgeText}>
                    {selectedSermon.topic}
                  </Text>
                </View>
                <Text style={styles.modalTitle}>
                  {selectedSermon.title}
                </Text>
                <Text style={styles.modalMeta}>
                  {selectedSermon.speaker} •{' '}
                  {formatDate(selectedSermon.date, i18n.language)}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedSermon.description}
                </Text>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.metaItem}>
      {icon}
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function SermonArtwork({
  sermon,
  large = false,
  onPress,
}: {
  sermon: Sermon;
  large?: boolean;
  onPress?: () => void;
}) {
  const thumbnail =
    sermon.thumbnail_url
    || (sermon.youtube_url
      ? getYouTubeThumbnailUrl(sermon.youtube_url)
      : null);

  const artwork = (
    <View style={[styles.artwork, large && styles.artworkLarge]}>
      {thumbnail ? (
        <Image
          source={{ uri: thumbnail }}
          style={styles.artworkImage}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={['#1e3a8a', '#3b82f6']}
          style={styles.artworkFallback}
        >
          <BookOpen size={large ? 42 : 28} color="rgba(255,255,255,0.92)" />
        </LinearGradient>
      )}
      {sermon.youtube_url ? (
        <LinearGradient
          colors={['rgba(15,23,42,0.10)', 'rgba(15,23,42,0.68)']}
          style={styles.artworkOverlay}
        >
          <View style={[styles.playCircle, large && styles.playCircleLarge]}>
            <Play
              size={large ? 28 : 18}
              color="#fff"
              fill="#fff"
            />
          </View>
        </LinearGradient>
      ) : null}
    </View>
  );

  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      {artwork}
    </TouchableOpacity>
  ) : artwork;
}

function StateView({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  danger?: boolean;
}) {
  return (
    <View style={styles.stateContainer}>
      <View style={[styles.stateIcon, danger && styles.stateIconDanger]}>
        {icon}
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stateSubtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.stateButton, danger && styles.stateButtonDanger]}
          onPress={onAction}
        >
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
  headerSpacer: { width: 44 },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 23, fontWeight: '800' },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    marginTop: 3,
  },
  content: { padding: 16, paddingBottom: 48 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeadingIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionEyebrow: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  featuredCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  artwork: {
    width: 122,
    minHeight: 148,
    backgroundColor: '#1e3a8a',
    overflow: 'hidden',
  },
  artworkLarge: { width: '100%', height: 210, minHeight: 210 },
  artworkImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  artworkFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(30,58,138,0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  playCircleLarge: { width: 68, height: 68, borderRadius: 34 },
  featuredContent: { padding: 18 },
  topicBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  topicBadgeText: { color: '#1e3a8a', fontSize: 11, fontWeight: '800' },
  featuredTitle: {
    color: '#1e293b',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    marginTop: 11,
  },
  featuredMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 13,
    marginTop: 12,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#64748b', fontSize: 12 },
  description: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 15,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  watchButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  watchButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  noVideoPill: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  noVideoText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  squareButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  previousSection: { marginTop: 28 },
  previousTitle: { color: '#1e293b', fontSize: 20, fontWeight: '800' },
  previousSubtitle: { color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 14 },
  sermonList: { gap: 12 },
  sermonCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sermonCardBody: {
    flex: 1,
    padding: 12,
    minWidth: 0,
  },
  topicBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
  },
  topicBadgeSmallText: { color: '#1e3a8a', fontSize: 9, fontWeight: '800' },
  sermonTitle: {
    color: '#1e293b',
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 7,
  },
  sermonSpeaker: { color: '#64748b', fontSize: 12, marginTop: 4 },
  sermonDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  sermonDate: { color: '#94a3b8', fontSize: 10 },
  dot: { color: '#cbd5e1', fontSize: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  smallWatchButton: {
    minHeight: 34,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 9,
  },
  smallWatchText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  smallNoVideo: {
    minHeight: 34,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
  },
  smallNoVideoText: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  smallShareButton: {
    width: 36,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  stateIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateIconDanger: { backgroundColor: '#fef2f2' },
  stateTitle: {
    color: '#1e293b',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  stateSubtitle: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 7,
  },
  stateButton: {
    marginTop: 20,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stateButtonDanger: { backgroundColor: '#b91c1c' },
  stateButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalClose: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalCloseText: { color: '#1e3a8a', fontSize: 14, fontWeight: '700' },
  youtubeExternal: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
  },
  youtubeExternalText: { color: '#b91c1c', fontSize: 12, fontWeight: '700' },
  modalContent: { padding: 16, paddingBottom: 36 },
  modalInfo: {
    marginTop: 16,
    padding: 17,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  modalTitle: {
    color: '#1e293b',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    marginTop: 10,
  },
  modalMeta: { color: '#64748b', fontSize: 13, marginTop: 8 },
  modalDescription: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },
});
