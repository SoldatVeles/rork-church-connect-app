import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar, Church, ChevronRight, UserPlus, CheckCircle, XCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import type { SabbathDateGroup as SabbathDateGroupType, SabbathWithGroup } from '@/types/sabbath';
import { isPublishedSabbath, isCancelledSabbath } from '@/utils/sabbath';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

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
        <CountrySabbathCard
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

interface CountrySabbathCardProps {
  item: SabbathWithGroup;
  onAttend: (sabbathId: string, attending: boolean) => void;
  onViewDetail: (sabbathId: string) => void;
  isMutating: boolean;
}

function CountrySabbathCard({ item, onAttend, onViewDetail, isMutating }: CountrySabbathCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { sabbath, group } = item;
  const [optimisticAttending, setOptimisticAttending] = useState(false);

  const cancelled = isCancelledSabbath(sabbath.status);
  const published = isPublishedSabbath(sabbath.status);

  const detailQuery = useQuery({
    queryKey: ['country-sabbath-card-detail', sabbath.id, user?.id, i18n.language],
    enabled: published && !!user?.id,
    queryFn: async () => {
      const { data: attendance } = await supabase
        .from('sabbath_attendance')
        .select('status')
        .eq('sabbath_id', sabbath.id)
        .eq('user_id', user?.id)
        .maybeSingle();

      const { data: assignmentsRaw } = await supabase
        .from('sabbath_assignments')
        .select('*')
        .eq('sabbath_id', sabbath.id);

      const assignmentsList = assignmentsRaw ?? [];
      const userIds = [
        ...new Set(
          assignmentsList
            .flatMap((a: any) => [a.user_id, a.suggested_user_id])
            .filter(Boolean)
        ),
      ];

      const profileMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, display_name')
          .in('id', userIds);

        (profiles ?? []).forEach((p: any) => {
          profileMap.set(p.id, p.display_name || p.full_name || t('common.unknown'));
        });
      }

      const assignments = assignmentsList.map((a: any) => ({
        ...a,
        user_name: a.user_id ? profileMap.get(a.user_id) ?? t('common.unknown') : undefined,
        suggested_user_name: a.suggested_user_id
          ? profileMap.get(a.suggested_user_id) ?? t('common.unknown')
          : undefined,
      }));

      return {
        myAttendanceStatus: attendance?.status ?? null,
        shouldShowAssignments: sabbath.status === 'published',
        assignments,
      };
    },
  });

  const isAttending = useMemo(() => {
    return optimisticAttending || detailQuery.data?.myAttendanceStatus === 'attending';
  }, [optimisticAttending, detailQuery.data?.myAttendanceStatus]);

  useEffect(() => {
    if (!detailQuery.data || isMutating) return;

    if (detailQuery.data.myAttendanceStatus === 'attending') {
      setOptimisticAttending(true);
      return;
    }

    setOptimisticAttending(false);
  }, [detailQuery.data, isMutating]);

  const handleAttendPress = () => {
    if (isAttending) return;

    Alert.alert(
      t('sabbath.attendance.attendSabbathTitle'),
      t('sabbath.attendance.attendSabbathMessage', { church: group.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sabbath.attendance.attend'),
          onPress: () => {
            setOptimisticAttending(true);
            onAttend(sabbath.id, true);
            void detailQuery.refetch();
          },
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
          <Text style={styles.cancelledText}>{t('sabbath.cancelled')}</Text>
        </View>
      )}

      {published && detailQuery.data?.shouldShowAssignments && (
        <SabbathRoleList assignments={detailQuery.data.assignments} compact />
      )}

      {published && (
        isAttending ? (
          <View
            testID={`attending-country-${sabbath.id}`}
            style={styles.swissAttendingBadge}
          >
            <CheckCircle size={16} color="#15803d" />
            <Text style={styles.swissAttendingText}>{t('sabbath.attendance.youAreAttending')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            testID={`attend-country-${sabbath.id}`}
            style={styles.swissAttendButton}
            onPress={handleAttendPress}
            disabled={isMutating}
          >
            <UserPlus size={16} color="#1e3a8a" />
            <Text style={styles.swissAttendButtonText}>{t('sabbath.attendance.attendThisSabbath')}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateGroup: {
    marginBottom: 20,
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  dateGroupLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#1e3a8a',
  },
  swissCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    color: '#1e293b',
    flex: 1,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#991b1b',
    flex: 1,
  },
  swissAttendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1e3a8a',
    backgroundColor: '#eff6ff',
  },
  swissAttendButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  swissAttendingBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
  },
  swissAttendingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#15803d',
  },
});