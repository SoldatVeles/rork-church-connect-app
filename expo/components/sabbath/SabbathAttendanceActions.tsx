import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { Colors, Shadow, Radius, Spacing } from '@/constants/theme';

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
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
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
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  attendanceButtonActive: {
    backgroundColor: Colors.successDark,
    borderColor: Colors.successDark,
  },
  notAttendingButtonActive: {
    backgroundColor: Colors.dangerDark,
    borderColor: Colors.dangerDark,
  },
  attendanceButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  attendanceButtonTextActive: {
    color: '#ffffff',
  },
  notAttendingButtonTextActive: {
    color: '#ffffff',
  },
});
