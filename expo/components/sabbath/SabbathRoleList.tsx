import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SabbathAssignment, SabbathRole } from '@/types/sabbath';
import { ALL_ROLES } from '@/types/sabbath';
import { getSabbathRoleLabel } from '@/utils/sabbath';
import { AssignmentStatusBadge } from './SabbathStatusBadge';

interface RoleRowProps {
  role: SabbathRole;
  assignment?: SabbathAssignment;
}

function RoleRow({ role, assignment }: RoleRowProps) {
  const { t } = useTranslation();
  const roleLabel = t(`sabbath.roles.${role}`, {
    defaultValue: getSabbathRoleLabel(role),
  });
  const hasAssignee = !!assignment?.user_id;
  const assigneeName = assignment?.user_name ?? t('sabbath.unassigned');

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.roleLabel}>{roleLabel}</Text>
        <Text style={[styles.assignee, !hasAssignee && styles.unassigned]}>
          {assigneeName}
        </Text>
      </View>
      {hasAssignee && assignment && (
        <AssignmentStatusBadge status={assignment.status} />
      )}
    </View>
  );
}

interface SabbathRoleListProps {
  assignments: SabbathAssignment[];
  compact?: boolean;
}

export function SabbathRoleList({ assignments, compact }: SabbathRoleListProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {ALL_ROLES.map((role) => {
          const assignment = assignments.find(a => a.role === role);
          const roleLabel = t(`sabbath.roles.${role}`, {
            defaultValue: getSabbathRoleLabel(role),
          });

          return (
            <View key={role} style={styles.compactRow}>
              <Text style={styles.compactRoleLabel}>{roleLabel}</Text>
              <Text style={[
                styles.compactAssignee,
                !assignment?.user_id && styles.unassigned,
              ]}>
                {assignment?.user_name ?? t('sabbath.unassigned')}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeading}>{t('sabbath.sections.program')}</Text>
      {ALL_ROLES.map((role) => {
        const assignment = assignments.find(a => a.role === role);
        return <RoleRow key={role} role={role} assignment={assignment} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  roleLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  assignee: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1e293b',
  },
  unassigned: {
    color: '#94a3b8',
    fontStyle: 'italic' as const,
  },
  compactContainer: {
    marginBottom: 12,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  compactRoleLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
    flex: 1,
  },
  compactAssignee: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1e293b',
    flex: 1,
    textAlign: 'right' as const,
  },
});