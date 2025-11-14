import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, Play, Download, Share2, Calendar, Clock, User as UserIcon } from 'lucide-react-native';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';

interface Sermon {
  id: string;
  title: string;
  speaker: string;
  date: string;
  duration: string;
  description: string;
  topic: string;
}

export default function SermonScreen() {
  const { user } = useAuth();

  const latestSermon: Sermon = {
    id: '1',
    title: 'The Power of Faith',
    speaker: 'Pastor John',
    date: 'January 14, 2025',
    duration: '45 min',
    description: 'Discover how faith can transform your life and overcome any obstacle. This powerful sermon explores biblical examples of faith in action and how we can apply these principles today.',
    topic: 'Faith & Trust',
  };

  const previousSermons: Sermon[] = [
    {
      id: '2',
      title: 'Walking in Love',
      speaker: 'Pastor John',
      date: 'January 7, 2025',
      duration: '38 min',
      description: 'Understanding God\'s love and sharing it with others.',
      topic: 'Love',
    },
    {
      id: '3',
      title: 'Finding Peace',
      speaker: 'Pastor Sarah',
      date: 'December 31, 2024',
      duration: '42 min',
      description: 'How to find peace in a chaotic world through prayer and faith.',
      topic: 'Peace',
    },
    {
      id: '4',
      title: 'The Gift of Grace',
      speaker: 'Pastor John',
      date: 'December 24, 2024',
      duration: '50 min',
      description: 'Exploring God\'s grace and mercy in our lives.',
      topic: 'Grace',
    },
  ];

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
        }} 
      />
      <StatusBar style="light" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.featuredSection}>
          <View style={styles.featuredBadge}>
            <BookOpen size={16} color="#1e3a8a" />
            <Text style={styles.featuredBadgeText}>LATEST SERMON</Text>
          </View>
          
          <View style={styles.featuredCard}>
            <LinearGradient
              colors={['#1e3a8a', '#3b82f6']}
              style={styles.featuredGradient}
            >
              <View style={styles.playButtonLarge}>
                <Play size={32} color="white" fill="white" />
              </View>
            </LinearGradient>
            
            <View style={styles.featuredContent}>
              <Text style={styles.featuredTitle}>{latestSermon.title}</Text>
              
              <View style={styles.featuredMetaRow}>
                <View style={styles.metaItem}>
                  <UserIcon size={14} color="#64748b" />
                  <Text style={styles.metaText}>{latestSermon.speaker}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Calendar size={14} color="#64748b" />
                  <Text style={styles.metaText}>{latestSermon.date}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={14} color="#64748b" />
                  <Text style={styles.metaText}>{latestSermon.duration}</Text>
                </View>
              </View>

              <View style={styles.topicBadge}>
                <Text style={styles.topicBadgeText}>{latestSermon.topic}</Text>
              </View>

              <Text style={styles.featuredDescription}>{latestSermon.description}</Text>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.primaryButton}>
                  <Play size={20} color="white" />
                  <Text style={styles.primaryButtonText}>Play Now</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.secondaryButton}>
                  <Download size={20} color="#1e3a8a" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.secondaryButton}>
                  <Share2 size={20} color="#1e3a8a" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.previousSection}>
          <Text style={styles.sectionTitle}>Previous Sermons</Text>
          
          {previousSermons.map((sermon) => (
            <TouchableOpacity key={sermon.id} style={styles.sermonCard}>
              <View style={styles.sermonCardLeft}>
                <View style={styles.playButton}>
                  <Play size={16} color="white" fill="white" />
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
                </View>
              </View>
              
              <TouchableOpacity style={styles.iconButton}>
                <Download size={18} color="#64748b" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
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
});
