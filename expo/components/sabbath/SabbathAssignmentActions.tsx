import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { UserCheck, UserX, RefreshCw } from 'lucide-react-native';
import type { SabbathAssignment } from '@/types/sabbath';
import { getSabbathRoleLabel } from '@/utils/sabbath';
import { AssignmentStatusBadge } from './SabbathStatusBadge';
import { Colors, Shadow, Radius, Spacing } from '@/constants/theme';

interface SabbathAssignmentActionsProps {
  myAssignment: SabbathAssignment;
  canRespond: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onSuggestReplacement: (id: string) => void;
  isMutating: boolean;
}

export function SabbathAssignmentActions({
  myAssignment,
  canRespond,
  onAccept,
  onDecline,
  onSuggestReplacement,
  isMutating,
}: SabbathAssignmentActionsProps) {
  if (!canRespond) return null;

  const canAct =
    myAssignment.status === 'pending' ||
    myAssignment.status === 'accepted' ||
    myAssignment.status === 'declined';

  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>Your Assignment</Text>
      <Text style={styles.roleText}>
        {getSabbathRoleLabel(myAssignment.role)}
      </Text>
      <AssignmentStatusBadge status={myAssignment.status} />

      {myAssignment.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            testID="accept-assignment"
            style={styles.acceptButton}
            onPress={() => onAccept(myAssignment.id)}
            disabled={isMutating}
          >
            <UserCheck size={16} color="#ffffff" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="decline-assignment"
            style={styles.declineButton}
            onPress={() => onDecline(myAssignment.id)}
            disabled={isMutating}
          >
            <UserX size={16} color="#991b1b" />
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {canAct && (
        <TouchableOpacity
          testID="suggest-replacement"
          style={styles.suggestButton}
          onPress={() => onSuggestReplacement(myAssignment.id)}
          disabled={isMutating}
        >
          <RefreshCw size={16} color="#1e3a8a" />
          <Text style={styles.suggestButtonText}>Suggest Replacement</Text>
        </TouchableOpacity>
      )}
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
  roleText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.successDark,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.dangerDark,
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    marginTop: 10,
  },
  suggestButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
