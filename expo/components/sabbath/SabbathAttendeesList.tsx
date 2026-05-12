import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Users } from 'lucide-react-native';
import type { SabbathAttendance } from '@/types/sabbath';

interface SabbathAttendeesListProps {
  attendance: SabbathAttendance[];
  attendingCount: number;
}

export function SabbathAttendeesList({ attendance, attendingCount }: SabbathAttendeesListProps) {
  const attending = attendance.filter(a => a.status === 'attending');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Users size={16} color="#1e3a8a" />
        <Text style={styles.sectionHeading}>Attendees ({attendingCount})</Text>
      </View>
      {attending.length === 0 ? (
        <Text style={styles.emptyText}>No responses yet.</Text>
      ) : (
        attending.map((att) => (
          <View key={att.id} style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.initial}>
                {(att.user_name ?? '?')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{att.user_name ?? 'Unknown'}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#334155',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#3730a3',
  },
  name: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1e293b',
  },
});
