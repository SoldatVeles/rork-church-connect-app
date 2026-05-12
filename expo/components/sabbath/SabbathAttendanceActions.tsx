import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';

interface SabbathAttendanceActionsProps {
  sabbathId: string;
  currentStatus: string | null;
  onAttend: (sabbathId: string, attending: boolean) => void;
  isMutating: boolean;
}

export function SabbathAttendanceActions({ sabbathId, currentStatus, onAttend, isMutating }: SabbathAttendanceActionsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>Your Attendance</Text>
      <View style={styles.attendanceRow}>
        <TouchableOpacity
          testID="attend-button"
          style={[
            styles.attendanceButton,
            currentStatus === 'attending' && styles.attendanceButtonActive,
          ]}
          onPress={() => onAttend(sabbathId, true)}
          disabled={isMutating}
        >
          <CheckCircle
            size={18}
            color={currentStatus === 'attending' ? '#ffffff' : '#166534'}
          />
          <Text
            style={[
              styles.attendanceButtonText,
              currentStatus === 'attending' && styles.attendanceButtonTextActive,
            ]}
          >
            Attending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="not-attend-button"
          style={[
            styles.attendanceButton,
            currentStatus === 'not_attending' && styles.notAttendingButtonActive,
          ]}
          onPress={() => onAttend(sabbathId, false)}
          disabled={isMutating}
        >
          <XCircle
            size={18}
            color={currentStatus === 'not_attending' ? '#ffffff' : '#991b1b'}
          />
          <Text
            style={[
              styles.attendanceButtonText,
              currentStatus === 'not_attending' && styles.notAttendingButtonTextActive,
            ]}
          >
            Not Attending
          </Text>
        </TouchableOpacity>
      </View>
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
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#334155',
    marginBottom: 8,
  },
  attendanceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  attendanceButtonActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  notAttendingButtonActive: {
    backgroundColor: '#991b1b',
    borderColor: '#991b1b',
  },
  attendanceButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#475569',
  },
  attendanceButtonTextActive: {
    color: '#ffffff',
  },
  notAttendingButtonTextActive: {
    color: '#ffffff',
  },
});
