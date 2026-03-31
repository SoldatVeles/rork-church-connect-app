import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SabbathStatus, SabbathAssignmentStatus } from '@/types/sabbath';
import { getSabbathStatusLabel, getAssignmentStatusLabel } from '@/utils/sabbath';
import { Colors, Radius } from '@/constants/theme';

const STATUS_COLORS = {
  draft: { bg: Colors.warningLight, text: Colors.warningDark, border: Colors.warningBorder },
  published: { bg: Colors.successLight, text: Colors.successDark, border: Colors.successBorder },
  cancelled: { bg: Colors.dangerLight, text: Colors.dangerDark, border: Colors.dangerBorder },
} as const;

const ASSIGNMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: Colors.warningLight, text: Colors.warningDark },
  accepted: { bg: Colors.successLight, text: Colors.successDark },
  declined: { bg: Colors.dangerLight, text: Colors.dangerDark },
  replacement_suggested: { bg: Colors.indigoLight, text: Colors.indigo },
  reassigned: { bg: Colors.purpleLight, text: Colors.purpleDark },
};

interface SabbathStatusBadgeProps {
  status: SabbathStatus;
}

export function SabbathStatusBadge({ status }: SabbathStatusBadgeProps) {
  const label = getSabbathStatusLabel(status);
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.draft;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

interface AssignmentStatusBadgeProps {
  status: SabbathAssignmentStatus;
}

export function AssignmentStatusBadge({ status }: AssignmentStatusBadgeProps) {
  const label = getAssignmentStatusLabel(status);
  const colors = ASSIGNMENT_STATUS_COLORS[status] ?? { bg: '#f1f5f9', text: '#475569' };

  return (
    <View style={[styles.assignmentContainer, { backgroundColor: colors.bg }]}>
      <Text style={[styles.assignmentText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignSelf: 'flex-start' as const,
  },
  text: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  assignmentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  assignmentText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
});
