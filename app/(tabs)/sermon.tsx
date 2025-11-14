import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Play, Pause, Download, Share2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';

export default function SermonScreen() {
  const [isPlaying, setIsPlaying] = useState(false);

  const latestSermon = {
    title: 'The Power of Faith',
    pastor: 'Pastor John',
    date: 'December 7, 2024',
    duration: '45:32',
    description: 'In this powerful message, we explore how faith can transform our lives and help us overcome challenges. Learn practical ways to strengthen your faith and trust in God\'s promises.',
    scripture: 'Hebrews 11:1 - "Now faith is confidence in what we hope for and assurance about what we do not see."',
    keyPoints: [
      'Faith requires action and trust',
      'God is faithful even when we are not',
      'Prayer strengthens our faith',
      'Community support helps us grow',
    ],
  };

  const recentSermons = [
    {
      id: '1',
      title: 'Living with Purpose',
      pastor: 'Pastor Sarah',
      date: 'November 30, 2024',
      duration: '38:15',
    },
    {
      id: '2',
      title: 'God\'s Grace in Difficult Times',
      pastor: 'Pastor John',
      date: 'November 23, 2024',
      duration: '42:50',
    },
    {
      id: '3',
      title: 'The Joy of Salvation',
      pastor: 'Pastor David',
      date: 'November 16, 2024',
      duration: '40:20',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <BookOpen size={32} color="white" />
          <Text style={styles.headerTitle}>Sermon Library</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>Latest Sermon</Text>
          
          <View style={styles.sermonCard}>
            <View style={styles.sermonHeader}>
              <BookOpen size={24} color="#10b981" />
              <View style={styles.sermonMeta}>
                <Text style={styles.sermonTitle}>{latestSermon.title}</Text>
                <Text style={styles.sermonInfo}>{latestSermon.pastor} • {latestSermon.date}</Text>
              </View>
            </View>

            <View style={styles.playerSection}>
              <TouchableOpacity 
                style={styles.playButton}
                onPress={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause size={32} color="white" />
                ) : (
                  <Play size={32} color="white" />
                )}
              </TouchableOpacity>
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>{latestSermon.duration}</Text>
              </View>
            </View>

            <Text style={styles.description}>{latestSermon.description}</Text>

            <View style={styles.scriptureBox}>
              <Text style={styles.scriptureLabel}>Key Scripture:</Text>
              <Text style={styles.scriptureText}>{latestSermon.scripture}</Text>
            </View>

            <View style={styles.keyPointsSection}>
              <Text style={styles.keyPointsTitle}>Key Points:</Text>
              {latestSermon.keyPoints.map((point, index) => (
                <View key={index} style={styles.keyPoint}>
                  <View style={styles.bullet} />
                  <Text style={styles.keyPointText}>{point}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Download size={20} color="#10b981" />
                <Text style={styles.actionButtonText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Share2 size={20} color="#10b981" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Sermons</Text>
          {recentSermons.map((sermon) => (
            <TouchableOpacity key={sermon.id} style={styles.recentSermonCard}>
              <View style={styles.recentSermonIcon}>
                <BookOpen size={20} color="#10b981" />
              </View>
              <View style={styles.recentSermonInfo}>
                <Text style={styles.recentSermonTitle}>{sermon.title}</Text>
                <Text style={styles.recentSermonMeta}>
                  {sermon.pastor} • {sermon.date}
                </Text>
              </View>
              <Text style={styles.recentSermonDuration}>{sermon.duration}</Text>
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
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  featuredSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  sermonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sermonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  sermonMeta: {
    flex: 1,
  },
  sermonTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  sermonInfo: {
    fontSize: 14,
    color: '#64748b',
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  durationContainer: {
    flex: 1,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  description: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
  },
  scriptureBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  scriptureLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 4,
  },
  scriptureText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  keyPointsSection: {
    marginBottom: 20,
  },
  keyPointsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginTop: 6,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  recentSection: {
    marginBottom: 32,
  },
  recentSermonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  recentSermonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentSermonInfo: {
    flex: 1,
  },
  recentSermonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  recentSermonMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  recentSermonDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  spacer: {
    height: 40,
  },
});
