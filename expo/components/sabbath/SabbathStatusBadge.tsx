import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SabbathStatus, SabbathAssignmentStatus } from '@/types/sabbath';
import { getSabbathStatusLabel, getAssignmentStatusLabel } from '@/utils/sabbath';

const STATUS_COLORS = {
  draft: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  published: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
} as const;

const ASSIGNMENT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef9c3', text: '#854d0e' },
  accepted: { bg: '#dcfce7', text: '#166534' },
  declined: { bg: '#fee2e2', text: '#991b1b' },
  replacement_suggested: { bg: '#e0e7ff', text: '#3730a3' },
  reassigned: { bg: '#f3e8ff', text: '#6b21a8' },
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
    borderRadius: 12,
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
    borderRadius: 8,
  },
  assignmentText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
});
