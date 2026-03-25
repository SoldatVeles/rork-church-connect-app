import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { UserCheck, UserX, RefreshCw } from 'lucide-react-native';
import type { SabbathAssignment } from '@/types/sabbath';
import { getSabbathRoleLabel } from '@/utils/sabbath';
import { AssignmentStatusBadge } from './SabbathStatusBadge';

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
  roleText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 8,
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
    backgroundColor: '#166534',
    paddingVertical: 12,
    borderRadius: 10,
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
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    borderRadius: 10,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#991b1b',
  },
  suggestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
    backgroundColor: '#eff6ff',
    marginTop: 10,
  },
  suggestButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
});
