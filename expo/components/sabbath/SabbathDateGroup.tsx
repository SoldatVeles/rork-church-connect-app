import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { Calendar, Church, ChevronRight, UserPlus, CheckCircle, XCircle } from 'lucide-react-native';
import type { SabbathDateGroup as SabbathDateGroupType, SabbathWithGroup } from '@/types/sabbath';
import { isPublishedSabbath, isCancelledSabbath } from '@/utils/sabbath';
import { trpc } from '@/lib/trpc';
import { Colors, Shadow, Radius, Spacing } from '@/constants/theme';

import { SabbathStatusBadge } from './SabbathStatusBadge';
import { SabbathRoleList } from './SabbathRoleList';

interface SabbathDateGroupProps {
  group: SabbathDateGroupType;
  onAttend: (sabbathId: string, attending: boolean) => void;
  onViewDetail: (sabbathId: string) => void;
  isMutating: boolean;
}

export function SabbathDateGroup({ group, onAttend, onViewDetail, isMutating }: SabbathDateGroupProps) {
  return (
    <View style={styles.dateGroup}>
      <View style={styles.dateGroupHeader}>
        <Calendar size={16} color="#1e3a8a" />
        <Text style={styles.dateGroupLabel}>{group.label}</Text>
      </View>
      {group.sabbaths.map((item) => (
        <SwitzerlandSabbathCard
          key={item.sabbath.id}
          item={item}
          onAttend={onAttend}
          onViewDetail={onViewDetail}
          isMutating={isMutating}
        />
      ))}
    </View>
  );
}

interface SwitzerlandSabbathCardProps {
  item: SabbathWithGroup;
  onAttend: (sabbathId: string, attending: boolean) => void;
  onViewDetail: (sabbathId: string) => void;
  isMutating: boolean;
}

function SwitzerlandSabbathCard({ item, onAttend, onViewDetail, isMutating }: SwitzerlandSabbathCardProps) {
  const { sabbath, group } = item;

  const cancelled = isCancelledSabbath(sabbath.status);
  const published = isPublishedSabbath(sabbath.status);

  const detailQuery = trpc.sabbaths.getSabbathDetail.useQuery(
    { sabbathId: sabbath.id },
    { enabled: published }
  );

  const isAttending = useMemo(() => {
    if (!detailQuery.data) return false;
    return detailQuery.data.myAttendanceStatus === 'attending';
  }, [detailQuery.data]);

  const handleAttendPress = () => {
    if (isAttending) return;
    Alert.alert(
      'Attend Sabbath',
      `Would you like to attend this Sabbath at ${group.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Attend',
          onPress: () => onAttend(sabbath.id, true),
        },
      ]
    );
  };

  return (
    <View style={styles.swissCard}>
      <TouchableOpacity
        style={styles.swissCardHeader}
        onPress={() => onViewDetail(sabbath.id)}
        activeOpacity={0.7}
      >
        <View style={styles.swissCardHeaderLeft}>
          <Church size={16} color="#475569" />
          <Text style={styles.swissChurchName}>{group.name}</Text>
        </View>
        <View style={styles.swissCardHeaderRight}>
          <SabbathStatusBadge status={sabbath.status} />
          <ChevronRight size={16} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      {cancelled && (
        <View style={styles.cancelledBanner}>
          <XCircle size={18} color="#991b1b" />
          <Text style={styles.cancelledText}>This Sabbath has been cancelled.</Text>
        </View>
      )}

      {published && detailQuery.data?.shouldShowAssignments && (
        <SabbathRoleList assignments={detailQuery.data.assignments} compact />
      )}

      {published && (
        isAttending ? (
          <View
            testID={`attending-swiss-${sabbath.id}`}
            style={styles.swissAttendingBadge}
          >
            <CheckCircle size={16} color="#15803d" />
            <Text style={styles.swissAttendingText}>You're attending</Text>
          </View>
        ) : (
          <TouchableOpacity
            testID={`attend-swiss-${sabbath.id}`}
            style={styles.swissAttendButton}
            onPress={handleAttendPress}
            disabled={isMutating}
          >
            <UserPlus size={16} color="#1e3a8a" />
            <Text style={styles.swissAttendButtonText}>Attend this Sabbath</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateGroup: {
    marginBottom: Spacing.xl,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  dateGroupLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  swissCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  swissCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  swissCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  swissCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swissChurchName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.dangerDark,
    flex: 1,
  },
  swissAttendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  swissAttendButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  swissAttendingBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: Spacing.sm,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: Colors.successBorder,
  },
  swissAttendingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#15803d',
  },
});
