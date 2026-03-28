import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, Plus, Edit, Trash2, Youtube } from 'lucide-react-native';
import { useAuth } from '@/providers/auth-provider';
import { router } from 'expo-router';
import { trpc } from '@/lib/trpc';
import type { Sermon } from '@/types/sermon';

export default function ManageSermonsScreen() {
  const { user } = useAuth();
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    speaker: '',
    date: '',
    duration: '',
    description: '',
    topic: '',
    youtube_url: '',
    thumbnail_url: '',
    is_featured: false,
  });

  const sermonsQuery = trpc.sermons.getAll.useQuery();

  const createMutation = trpc.sermons.create.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon created successfully');
      resetForm();
      sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const updateMutation = trpc.sermons.update.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon updated successfully');
      resetForm();
      sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const deleteMutation = trpc.sermons.delete.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Sermon deleted successfully');
      sermonsQuery.refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      speaker: '',
      date: '',
      duration: '',
      description: '',
      topic: '',
      youtube_url: '',
      thumbnail_url: '',
      is_featured: false,
    });
    setEditingSermon(null);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.speaker || !formData.date || !formData.duration) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (editingSermon) {
      updateMutation.mutate({
        id: editingSermon.id,
        ...formData,
        youtube_url: formData.youtube_url || null,
        thumbnail_url: formData.thumbnail_url || null,
      });
    } else {
      createMutation.mutate({
        ...formData,
        youtube_url: formData.youtube_url || null,
        thumbnail_url: formData.thumbnail_url || null,
      });
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
      youtube_url: sermon.youtube_url || '',
      thumbnail_url: sermon.thumbnail_url || '',
      is_featured: sermon.is_featured,
    });
  };

  const handleDelete = (sermonId: string) => {
    Alert.alert(
      'Delete Sermon',
      'Are you sure you want to delete this sermon?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate({ id: sermonId }),
        },
      ]
    );
  };

  const canAccess = user?.role === 'admin' || user?.role === 'church_leader' || user?.role === 'pastor';

  if (!canAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <BookOpen size={32} color="#ef4444" />
          <Text style={styles.deniedText}>Admin or Pastor access only</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manage Sermons</Text>
          <Text style={styles.subtitle}>Create and edit sermon content</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookOpen size={18} color="#1e3a8a" />
            <Text style={styles.cardTitle}>
              {editingSermon ? 'Edit Sermon' : 'Add New Sermon'}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Title *"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />

          <TextInput
            style={styles.input}
            placeholder="Speaker *"
            value={formData.speaker}
            onChangeText={(text) => setFormData({ ...formData, speaker: text })}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Date * (e.g. January 14, 2025)"
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Duration * (e.g. 45 min)"
              value={formData.duration}
              onChangeText={(text) => setFormData({ ...formData, duration: text })}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Topic *"
            value={formData.topic}
            onChangeText={(text) => setFormData({ ...formData, topic: text })}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description *"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={4}
          />

          <View style={styles.youtubeSection}>
            <View style={styles.youtubeBadge}>
              <Youtube size={14} color="#ef4444" />
              <Text style={styles.youtubeBadgeText}>YouTube Integration</Text>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="YouTube URL (optional)"
              value={formData.youtube_url}
              onChangeText={(text) => setFormData({ ...formData, youtube_url: text })}
              autoCapitalize="none"
              keyboardType="url"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Thumbnail URL (optional)"
              value={formData.thumbnail_url}
              onChangeText={(text) => setFormData({ ...formData, thumbnail_url: text })}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Featured Sermon</Text>
            <Switch
              value={formData.is_featured}
              onValueChange={(value) => setFormData({ ...formData, is_featured: value })}
              trackColor={{ false: '#cbd5e1', true: '#3b82f6' }}
              thumbColor={formData.is_featured ? '#1e3a8a' : '#f1f5f9'}
            />
          </View>

          <View style={styles.buttonRow}>
            {editingSermon && (
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1 }]}
                onPress={resetForm}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { flex: 1 },
                (createMutation.isPending || updateMutation.isPending) && { opacity: 0.7 },
              ]}
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Plus size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {editingSermon ? 'Update' : 'Create'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookOpen size={18} color="#1e3a8a" />
            <Text style={styles.cardTitle}>Existing Sermons</Text>
          </View>

          {sermonsQuery.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#1e3a8a" />
            </View>
          ) : sermonsQuery.data && sermonsQuery.data.length > 0 ? (
            sermonsQuery.data.map((sermon) => (
              <View key={sermon.id} style={styles.sermonRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.sermonTitleRow}>
                    <Text style={styles.sermonTitle}>{sermon.title}</Text>
                    {sermon.is_featured && (
                      <View style={styles.featuredBadgeSmall}>
                        <Text style={styles.featuredBadgeSmallText}>FEATURED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sermonMeta}>
                    {sermon.speaker} • {sermon.date} • {sermon.duration}
                  </Text>
                  {sermon.youtube_url && (
                    <View style={styles.youtubeIndicator}>
                      <Youtube size={12} color="#ef4444" />
                      <Text style={styles.youtubeIndicatorText}>YouTube Video</Text>
                    </View>
                  )}
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleEdit(sermon)}
                  >
                    <Edit size={18} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDelete(sermon.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No sermons yet. Create your first one!</Text>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, padding: 24 },
  header: { marginBottom: 16 },
  backButton: { fontSize: 16, color: '#3b82f6', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    color: '#1e293b',
    marginBottom: 12,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  youtubeSection: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  youtubeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  youtubeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  buttonRow: { flexDirection: 'row', gap: 12 },
  primaryButton: {
    backgroundColor: '#1e3a8a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: { color: 'white', fontWeight: '700' },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#1e3a8a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#1e3a8a', fontWeight: '700' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sermonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sermonTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sermonTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b', flex: 1 },
  sermonMeta: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  featuredBadgeSmall: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  youtubeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  youtubeIndicatorText: { fontSize: 11, color: '#ef4444', fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  loadingRow: { paddingVertical: 16, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  deniedText: { marginTop: 8, color: '#ef4444', fontWeight: '600' },
  spacer: { height: 40 },
});
