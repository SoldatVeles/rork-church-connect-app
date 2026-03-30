import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, Play, Share2, Calendar, Clock, User as UserIcon, Settings, Youtube } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { isPastorLevel } from '@/utils/permissions';
import { trpc } from '@/lib/trpc';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import type { Sermon } from '@/types/sermon';



export default function SermonScreen() {
  const { user } = useAuth();
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  const sermonsQuery = trpc.sermons.getAll.useQuery();
  
  const sermons = sermonsQuery.data || [];
  const featuredSermon = sermons.find(s => s.is_featured) || sermons[0];
  const otherSermons = sermons.filter(s => s.id !== featuredSermon?.id);
  
  const canManageSermons = isPastorLevel(user);
  
  const handlePlaySermon = (sermon: Sermon) => {
    if (sermon.youtube_url) {
      setSelectedSermon(sermon);
      setShowVideoModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Sermons',
          headerStyle: {
            backgroundColor: '#1e3a8a',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: canManageSermons ? () => (
            <TouchableOpacity 
              onPress={() => router.push('/manage-sermons')}
              style={{ marginRight: 16 }}
            >
              <Settings size={22} color="white" />
            </TouchableOpacity>
          ) : undefined,
        }} 
      />
      <StatusBar style="light" />

      {sermonsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading sermons...</Text>
        </View>
      ) : !featuredSermon ? (
        <View style={styles.emptyContainer}>
          <BookOpen size={48} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No Sermons Yet</Text>
          <Text style={styles.emptySubtitle}>Check back later for inspiring messages</Text>
          {canManageSermons && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push('/manage-sermons')}
            >
              <Text style={styles.addButtonText}>Add First Sermon</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.featuredSection}>
            <View style={styles.featuredBadge}>
              <BookOpen size={16} color="#1e3a8a" />
              <Text style={styles.featuredBadgeText}>
                {featuredSermon.is_featured ? 'FEATURED SERMON' : 'LATEST SERMON'}
              </Text>
            </View>
            
            <View style={styles.featuredCard}>
              {featuredSermon.youtube_url ? (
                <TouchableOpacity 
                  onPress={() => handlePlaySermon(featuredSermon)}
                  activeOpacity={0.9}
                >
                  <View style={styles.videoPreview}>
                    <LinearGradient
                      colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
                      style={styles.videoOverlay}
                    >
                      <View style={styles.playButtonLarge}>
                        <Play size={32} color="white" fill="white" />
                      </View>
                      <View style={styles.youtubeBadge}>
                        <Youtube size={16} color="#fff" />
                        <Text style={styles.youtubeBadgeText}>Watch on YouTube</Text>
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ) : (
                <LinearGradient
                  colors={['#1e3a8a', '#3b82f6']}
                  style={styles.featuredGradient}
                >
                  <View style={styles.playButtonLarge}>
                    <BookOpen size={32} color="white" />
                  </View>
                </LinearGradient>
              )}
              
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle}>{featuredSermon.title}</Text>
                
                <View style={styles.featuredMetaRow}>
                  <View style={styles.metaItem}>
                    <UserIcon size={14} color="#64748b" />
                    <Text style={styles.metaText}>{featuredSermon.speaker}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.metaText}>{featuredSermon.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={14} color="#64748b" />
                    <Text style={styles.metaText}>{featuredSermon.duration}</Text>
                  </View>
                </View>

                <View style={styles.topicBadge}>
                  <Text style={styles.topicBadgeText}>{featuredSermon.topic}</Text>
                </View>

                <Text style={styles.featuredDescription}>{featuredSermon.description}</Text>

                <View style={styles.actionButtons}>
                  {featuredSermon.youtube_url ? (
                    <TouchableOpacity 
                      style={styles.primaryButton}
                      onPress={() => handlePlaySermon(featuredSermon)}
                    >
                      <Play size={20} color="white" />
                      <Text style={styles.primaryButtonText}>Watch Now</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.primaryButton, { opacity: 0.6 }]} disabled>
                      <BookOpen size={20} color="white" />
                      <Text style={styles.primaryButtonText}>No Video</Text>
                    </TouchableOpacity>
                  )}
                  
                  {featuredSermon.youtube_url && (
                    <TouchableOpacity 
                      style={styles.secondaryButton}
                      onPress={() => Linking.openURL(featuredSermon.youtube_url!)}
                    >
                      <Youtube size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.secondaryButton}
                    onPress={() => {
                      const message = `Check out this sermon: ${featuredSermon.title} by ${featuredSermon.speaker}`;
                      Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
                    }}
                  >
                    <Share2 size={20} color="#1e3a8a" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {otherSermons.length > 0 && (
            <View style={styles.previousSection}>
              <Text style={styles.sectionTitle}>More Sermons</Text>
              
              {otherSermons.map((sermon) => (
                <TouchableOpacity 
                  key={sermon.id} 
                  style={styles.sermonCard}
                  onPress={() => sermon.youtube_url && handlePlaySermon(sermon)}
                  disabled={!sermon.youtube_url}
                >
                  <View style={styles.sermonCardLeft}>
                    <View style={[styles.playButton, !sermon.youtube_url && { opacity: 0.5 }]}>
                      {sermon.youtube_url ? (
                        <Play size={16} color="white" fill="white" />
                      ) : (
                        <BookOpen size={16} color="white" />
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.sermonCardContent}>
                    <Text style={styles.sermonTitle}>{sermon.title}</Text>
                    <Text style={styles.sermonSpeaker}>{sermon.speaker}</Text>
                    
                    <View style={styles.sermonMetaRow}>
                      <View style={styles.metaItem}>
                        <Calendar size={12} color="#94a3b8" />
                        <Text style={styles.sermonMetaText}>{sermon.date}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Clock size={12} color="#94a3b8" />
                        <Text style={styles.sermonMetaText}>{sermon.duration}</Text>
                      </View>
                      {sermon.youtube_url && (
                        <View style={styles.metaItem}>
                          <Youtube size={12} color="#ef4444" />
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {sermon.youtube_url && (
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(sermon.youtube_url!);
                      }}
                    >
                      <Youtube size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      )}
      
      <Modal
        visible={showVideoModal}
        animationType="slide"
        onRequestClose={() => setShowVideoModal(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVideoModal(false)}>
              <Text style={styles.closeButton}>✕ Close</Text>
            </TouchableOpacity>
            {selectedSermon && (
              <TouchableOpacity onPress={() => Linking.openURL(selectedSermon.youtube_url!)}>
                <Youtube size={24} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          
          {selectedSermon && selectedSermon.youtube_url && (
            <View style={styles.videoContainer}>
              <YouTubePlayer videoUrl={selectedSermon.youtube_url} />
              
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{selectedSermon.title}</Text>
                <Text style={styles.videoMeta}>
                  {selectedSermon.speaker} • {selectedSermon.date}
                </Text>
                <Text style={styles.videoDescription}>{selectedSermon.description}</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
  featuredSection: {
    padding: 24,
    paddingBottom: 16,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e3a8a',
    letterSpacing: 1,
  },
  featuredCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  featuredGradient: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  featuredContent: {
    padding: 20,
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  featuredMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
  topicBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  topicBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  featuredDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1e3a8a',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
  },
  previousSection: {
    padding: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  sermonCard: {
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
  sermonCardLeft: {
    marginRight: 16,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sermonCardContent: {
    flex: 1,
  },
  sermonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sermonSpeaker: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  sermonMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sermonMetaText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  spacer: {
    height: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 24,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoPreview: {
    height: 200,
  },
  videoOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 12,
  },
  youtubeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
  },
  videoContainer: {
    padding: 16,
  },
  videoInfo: {
    marginTop: 20,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  videoMeta: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  videoDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
});
