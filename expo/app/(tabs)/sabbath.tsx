import { StatusBar } from 'expo-status-bar';
import {
  Sun,
  Church,
  Calendar,
  MapPin,
  AlertTriangle,
  XCircle,
  Plus,
} from 'lucide-react-native';
import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Users, ChevronDown, RefreshCw } from 'lucide-react-native';
import { Colors, Shadow, Radius, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/providers/auth-provider';
import { canManageAnySabbath, buildChurchScope } from '@/utils/church-scope';

import type {
  SabbathAssignment,
  SabbathDateGroup as SabbathDateGroupType,
  Sabbath,
  SabbathGroupInfo,
  SabbathDetailView,
} from '@/types/sabbath';
import {
  formatSabbathDate,
  isPublishedSabbath,
  isCancelledSabbath,
} from '@/utils/sabbath';
import { SabbathCardHeader } from '@/components/sabbath/SabbathCardHeader';
import { SabbathRoleList } from '@/components/sabbath/SabbathRoleList';
import { SabbathAttendanceActions } from '@/components/sabbath/SabbathAttendanceActions';
import { SabbathAttendeesList } from '@/components/sabbath/SabbathAttendeesList';
import { SabbathAssignmentActions } from '@/components/sabbath/SabbathAssignmentActions';
import { SabbathDateGroup } from '@/components/sabbath/SabbathDateGroup';

type TabKey = 'myChurch' | 'switzerland';

function EmptyState({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <View style={styles.centerState}>
      {icon}
      <Text style={styles.centerStateTitle}>{title}</Text>
      <Text style={styles.centerStateText}>{message}</Text>
    </View>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <View style={styles.centerState}>
      <ActivityIndicator size="large" color="#1e3a8a" />
      <Text style={styles.centerStateText}>{message}</Text>
    </View>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.centerState}>
      <AlertTriangle size={32} color="#ef4444" />
      <Text style={styles.centerStateTitle}>Something went wrong</Text>
      <Text style={styles.centerStateText}>{message}</Text>
    </View>
  );
}

function CancelledBanner({ reason }: { reason?: string | null }) {
  return (
    <View style={styles.cancelledBanner}>
      <XCircle size={18} color="#991b1b" />
      <Text style={styles.cancelledText}>
        This Sabbath has been cancelled{reason ? `: ${reason}` : '.'}
      </Text>
    </View>
  );
}

function TabSwitcher({ activeTab, onSwitch, canManage, onPlanSabbath }: { activeTab: TabKey; onSwitch: (tab: TabKey) => void; canManage: boolean; onPlanSabbath: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Sun size={22} color="#1e3a8a" />
          <Text style={styles.headerTitle}>Sabbath</Text>
        </View>
        {canManage && (
          <TouchableOpacity
            style={styles.planButton}
            onPress={onPlanSabbath}
            activeOpacity={0.7}
            testID="plan-sabbath-button"
          >
            <Plus size={16} color="#ffffff" />
            <Text style={styles.planButtonText}>Plan Sabbath</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.segmentContainer}>
        <TouchableOpacity
          testID="tab-myChurch"
          style={[styles.segmentButton, activeTab === 'myChurch' && styles.segmentButtonActive]}
          onPress={() => onSwitch('myChurch')}
        >
          <Church size={16} color={activeTab === 'myChurch' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.segmentLabel, activeTab === 'myChurch' && styles.segmentLabelActive]}>
            My Church
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="tab-switzerland"
          style={[styles.segmentButton, activeTab === 'switzerland' && styles.segmentButtonActive]}
          onPress={() => onSwitch('switzerland')}
        >
          <MapPin size={16} color={activeTab === 'switzerland' ? '#ffffff' : '#64748b'} />
          <Text style={[styles.segmentLabel, activeTab === 'switzerland' && styles.segmentLabelActive]}>
            Switzerland
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface MyChurchSectionProps {
  sabbathData: { sabbath: Sabbath; group: SabbathGroupInfo } | null;
  detailData: SabbathDetailView | null;
  isLoading: boolean;
  error: { message: string } | null;
  currentAttendanceStatus: string | null;
  myAssignment: SabbathAssignment | null;
  attendingCount: number;
  onAttend: (sabbathId: string, attending: boolean) => void;
  onAccept: (assignmentId: string) => void;
  onDecline: (assignmentId: string) => void;
  onSuggestReplacement: (assignmentId: string) => void;
  onViewDetail: (sabbathId: string) => void;
  isMutating: boolean;
}

function MyChurchSection({
  sabbathData,
  detailData,
  isLoading,
  error,
  currentAttendanceStatus,
  myAssignment,
  attendingCount,
  onAttend,
  onAccept,
  onDecline,
  onSuggestReplacement,
  onViewDetail,
  isMutating,
}: MyChurchSectionProps) {
  if (isLoading) {
    return <LoadingState message="Loading your Sabbath..." />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (!sabbathData) {
    return (
      <EmptyState
        icon={<Calendar size={40} color="#cbd5e1" />}
        title="No upcoming Sabbath"
        message="There are no upcoming Sabbaths planned for your home church yet."
      />
    );
  }

  const { sabbath, group } = sabbathData;
  const cancelled = isCancelledSabbath(sabbath.status);
  const published = isPublishedSabbath(sabbath.status);

  return (
    <View>
      <View style={styles.card}>
        <SabbathCardHeader
          groupName={group.name}
          status={sabbath.status}
          onViewDetail={() => onViewDetail(sabbath.id)}
        />
        <Text style={styles.sabbathDate}>{formatSabbathDate(sabbath.sabbath_date)}</Text>
        {sabbath.notes ? <Text style={styles.notesText}>{sabbath.notes}</Text> : null}
        {cancelled && <CancelledBanner reason={sabbath.cancellation_reason} />}
      </View>

      {published && detailData?.shouldShowAssignments && (
        <SabbathRoleList assignments={detailData.assignments} />
      )}

      {published && myAssignment && detailData?.canRespondAssignment && (
        <SabbathAssignmentActions
          myAssignment={myAssignment}
          canRespond={detailData.canRespondAssignment}
          onAccept={onAccept}
          onDecline={onDecline}
          onSuggestReplacement={onSuggestReplacement}
          isMutating={isMutating}
        />
      )}

      {published && detailData?.canRespondAttendance && (
        <SabbathAttendanceActions
          sabbathId={sabbath.id}
          currentStatus={currentAttendanceStatus}
          onAttend={onAttend}
          isMutating={isMutating}
        />
      )}

      {published && detailData?.shouldShowAttendees && (
        <SabbathAttendeesList attendance={detailData.attendance} attendingCount={attendingCount} />
      )}
    </View>
  );
}

interface SwitzerlandSectionProps {
  dateGroups: SabbathDateGroupType[];
  isLoading: boolean;
  error: { message: string } | null;
  onAttend: (sabbathId: string, attending: boolean) => void;
  onViewDetail: (sabbathId: string) => void;
  isMutating: boolean;
}

function SwitzerlandSection({ dateGroups, isLoading, error, onAttend, onViewDetail, isMutating }: SwitzerlandSectionProps) {
  if (isLoading) {
    return <LoadingState message="Loading Sabbaths across Switzerland..." />;
  }

  if (error) {
    return <ErrorState message={error.message} />;
  }

  if (dateGroups.length === 0) {
    return (
      <EmptyState
        icon={<MapPin size={40} color="#cbd5e1" />}
        title="No upcoming Sabbaths"
        message="There are no published Sabbaths scheduled in Switzerland yet."
      />
    );
  }

  return (
    <View>
      {dateGroups.map((group) => (
        <SabbathDateGroup
          key={group.date}
          group={group}
          onAttend={onAttend}
          onViewDetail={onViewDetail}
          isMutating={isMutating}
        />
      ))}
    </View>
  );
}

export default function SabbathScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pastorGroupsQuery = trpc.sabbaths.getMyPastorGroups.useQuery();
  const pastorGroupIds = useMemo(() => (pastorGroupsQuery.data ?? []).map((g: any) => g.group_id as string), [pastorGroupsQuery.data]);
  const [activeTab, setActiveTab] = useState<TabKey>('myChurch');

  const churchScope = buildChurchScope(user, null, pastorGroupIds);
  const canManage = canManageAnySabbath(churchScope);

  const myChurchQuery = trpc.sabbaths.getMyChurchUpcoming.useQuery(undefined, {
    enabled: activeTab === 'myChurch',
  });

  const switzerlandQuery = trpc.sabbaths.getSwitzerlandUpcomingByDate.useQuery(undefined, {
    enabled: activeTab === 'switzerland',
  });

  const sabbathDetailQuery = trpc.sabbaths.getSabbathDetail.useQuery(
    { sabbathId: myChurchQuery.data?.sabbath?.id ?? '' },
    {
      enabled: activeTab === 'myChurch' && !!myChurchQuery.data?.sabbath?.id,
    }
  );

  const trpcUtils = trpc.useUtils();

  const respondAttendanceMutation = trpc.sabbaths.respondAttendance.useMutation({
    onSuccess: (_data, variables) => {
      console.log('[Sabbath] Attendance response saved');
      void myChurchQuery.refetch();
      void sabbathDetailQuery.refetch();
      void trpcUtils.sabbaths.getSabbathDetail.invalidate({ sabbathId: variables.sabbathId });
      if (variables.status === 'attending') {
        Alert.alert('Confirmed', "You're now marked as attending this Sabbath.");
      }
    },
    onError: (err) => {
      console.error('[Sabbath] Attendance error:', err);
      Alert.alert('Error', err.message ?? 'Failed to respond');
    },
  });

  const acceptMutation = trpc.sabbaths.acceptAssignment.useMutation({
    onSuccess: () => {
      console.log('[Sabbath] Assignment accepted');
      void sabbathDetailQuery.refetch();
    },
    onError: (err) => {
      Alert.alert('Error', err.message ?? 'Failed to accept');
    },
  });

  const declineMutation = trpc.sabbaths.declineAssignment.useMutation({
    onSuccess: () => {
      console.log('[Sabbath] Assignment declined');
      void sabbathDetailQuery.refetch();
    },
    onError: (err) => {
      Alert.alert('Error', err.message ?? 'Failed to decline');
    },
  });

  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestingAssignmentId, setSuggestingAssignmentId] = useState<string | null>(null);

  const suggestGroupedMembersQuery = trpc.sabbaths.getAllMembersGrouped.useQuery(
    { primaryGroupId: myChurchQuery.data?.sabbath?.group_id ?? '' },
    { enabled: !!myChurchQuery.data?.sabbath?.group_id && showSuggestModal }
  );
  const suggestGroupedMembers = useMemo(() => suggestGroupedMembersQuery.data ?? [], [suggestGroupedMembersQuery.data]);

  const suggestReplacementMutation = trpc.sabbaths.suggestReplacement.useMutation({
    onSuccess: () => {
      console.log('[Sabbath] Replacement suggested');
      setShowSuggestModal(false);
      setSuggestingAssignmentId(null);
      void sabbathDetailQuery.refetch();
      Alert.alert('Sent', 'Your replacement suggestion has been submitted to the church leaders.');
    },
    onError: (err) => {
      Alert.alert('Error', err.message ?? 'Failed to suggest replacement');
    },
  });

  const isRefreshing = activeTab === 'myChurch'
    ? myChurchQuery.isRefetching || sabbathDetailQuery.isRefetching
    : switzerlandQuery.isRefetching;

  const handleRefresh = useCallback(() => {
    if (activeTab === 'myChurch') {
      void myChurchQuery.refetch();
      void sabbathDetailQuery.refetch();
    } else {
      void switzerlandQuery.refetch();
    }
  }, [activeTab, myChurchQuery, sabbathDetailQuery, switzerlandQuery]);

  const handleAttendance = useCallback((sabbathId: string, attending: boolean) => {
    respondAttendanceMutation.mutate({
      sabbathId,
      status: attending ? 'attending' : 'not_attending',
    });
  }, [respondAttendanceMutation]);

  const handleAccept = useCallback((assignmentId: string) => {
    acceptMutation.mutate({ assignmentId });
  }, [acceptMutation]);

  const handleDecline = useCallback((assignmentId: string) => {
    Alert.alert('Decline Assignment', 'Are you sure you want to decline this assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: () => declineMutation.mutate({ assignmentId, reason: null }),
      },
    ]);
  }, [declineMutation]);

  const handleSuggestReplacement = useCallback((assignmentId: string) => {
    setSuggestingAssignmentId(assignmentId);
    setShowSuggestModal(true);
  }, []);

  const handleConfirmSuggestReplacement = useCallback((suggestedUserId: string) => {
    if (!suggestingAssignmentId) return;
    suggestReplacementMutation.mutate({
      assignmentId: suggestingAssignmentId,
      suggestedUserId,
    });
  }, [suggestingAssignmentId, suggestReplacementMutation]);

  const handleViewDetail = useCallback((sabbathId: string) => {
    router.push({ pathname: '/sabbath-detail' as any, params: { sabbathId } });
  }, [router]);

  const handleOpenPlanner = useCallback(() => {
    router.push('/sabbath-planner' as any);
  }, [router]);

  const myAssignment = useMemo(() => {
    if (!sabbathDetailQuery.data || !user?.id) return null;
    return sabbathDetailQuery.data.assignments.find(a => a.user_id === user.id) ?? null;
  }, [sabbathDetailQuery.data, user?.id]);

  const currentAttendanceStatus = useMemo(() => {
    if (!sabbathDetailQuery.data || !user?.id) return null;
    const record = sabbathDetailQuery.data.attendance.find(a => a.user_id === user.id);
    return record?.status ?? null;
  }, [sabbathDetailQuery.data, user?.id]);

  const attendingCount = useMemo(() => {
    if (!sabbathDetailQuery.data) return 0;
    return sabbathDetailQuery.data.attendance.filter(a => a.status === 'attending').length;
  }, [sabbathDetailQuery.data]);

  const isMutating = respondAttendanceMutation.isPending || acceptMutation.isPending || declineMutation.isPending || suggestReplacementMutation.isPending;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <TabSwitcher activeTab={activeTab} onSwitch={setActiveTab} canManage={canManage} onPlanSabbath={handleOpenPlanner} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#1e3a8a" />
        }
      >
        {activeTab === 'myChurch' ? (
          <MyChurchSection
            sabbathData={myChurchQuery.data ?? null}
            detailData={sabbathDetailQuery.data ?? null}
            isLoading={myChurchQuery.isLoading || (!!myChurchQuery.data?.sabbath?.id && sabbathDetailQuery.isLoading)}
            error={myChurchQuery.error ?? sabbathDetailQuery.error}
            currentAttendanceStatus={currentAttendanceStatus}
            myAssignment={myAssignment}
            attendingCount={attendingCount}
            onAttend={handleAttendance}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onSuggestReplacement={handleSuggestReplacement}
            onViewDetail={handleViewDetail}
            isMutating={isMutating}
          />
        ) : (
          <SwitzerlandSection
            dateGroups={switzerlandQuery.data ?? []}
            isLoading={switzerlandQuery.isLoading}
            error={switzerlandQuery.error}
            onAttend={handleAttendance}
            onViewDetail={handleViewDetail}
            isMutating={isMutating}
          />
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={showSuggestModal} animationType="slide" transparent>
        <View style={styles.suggestModalOverlay}>
          <View style={styles.suggestModalContainer}>
            <View style={styles.suggestModalHandle} />
            <View style={styles.suggestModalHeader}>
              <RefreshCw size={20} color="#1e3a8a" />
              <Text style={styles.suggestModalTitle}>Suggest Replacement</Text>
            </View>
            <Text style={styles.suggestModalSubtitle}>
              Select a member to suggest as your replacement. A church leader will review and approve.
            </Text>
            <ScrollView style={styles.suggestMembersList} showsVerticalScrollIndicator={false}>
              {suggestGroupedMembers.length === 0 ? (
                <View style={styles.suggestEmptyMembers}>
                  {suggestGroupedMembersQuery.isLoading ? (
                    <ActivityIndicator size="large" color="#1e3a8a" />
                  ) : (
                    <>
                      <Users size={32} color="#cbd5e1" />
                      <Text style={styles.suggestEmptyText}>No members found</Text>
                    </>
                  )}
                </View>
              ) : (
                suggestGroupedMembers.map((section) => (
                  <View key={section.groupId}>
                    <View style={styles.suggestGroupHeader}>
                      <View style={[
                        styles.suggestGroupDot,
                        section.groupId === myChurchQuery.data?.sabbath?.group_id && styles.suggestGroupDotPrimary,
                      ]} />
                      <Text style={[
                        styles.suggestGroupName,
                        section.groupId === myChurchQuery.data?.sabbath?.group_id && styles.suggestGroupNamePrimary,
                      ]}>
                        {section.groupName}
                      </Text>
                    </View>
                    {section.members
                      .filter((m) => m.id !== user?.id)
                      .map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.suggestMemberItem}
                          onPress={() => handleConfirmSuggestReplacement(m.id)}
                          disabled={suggestReplacementMutation.isPending}
                        >
                          <View style={styles.suggestMemberAvatar}>
                            <Text style={styles.suggestMemberAvatarText}>
                              {m.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.suggestMemberName}>{m.name}</Text>
                          <ChevronDown size={16} color="#94a3b8" style={{ transform: [{ rotate: '-90deg' }] }} />
                        </TouchableOpacity>
                      ))}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.suggestCancelBtn}
              onPress={() => {
                setShowSuggestModal(false);
                setSuggestingAssignmentId(null);
              }}
            >
              <Text style={styles.suggestCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  planButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: Colors.primary,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
  segmentLabelActive: {
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  bottomSpacer: {
    height: 32,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  centerStateTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginTop: 16,
    textAlign: 'center' as const,
  },
  centerStateText: {
    fontSize: 14,
    color: Colors.textPlaceholder,
    marginTop: 8,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  sabbathDate: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: Spacing.md,
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.dangerDark,
    flex: 1,
  },
  suggestModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  suggestModalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 34,
    maxHeight: '80%' as any,
  },
  suggestModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center' as const,
    marginBottom: Spacing.lg,
  },
  suggestModalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  suggestModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
  },
  suggestModalSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  suggestMembersList: {
    maxHeight: 400,
  },
  suggestEmptyMembers: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 40,
    gap: 12,
  },
  suggestEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  suggestGroupHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  suggestGroupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  suggestGroupDotPrimary: {
    backgroundColor: '#1e3a8a',
  },
  suggestGroupName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  suggestGroupNamePrimary: {
    color: '#1e3a8a',
  },
  suggestMemberItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestMemberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.indigoLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
  },
  suggestMemberAvatarText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.indigo,
  },
  suggestMemberName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  suggestCancelBtn: {
    alignItems: 'center' as const,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceSecondary,
    marginTop: Spacing.md,
  },
  suggestCancelBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textMuted,
  },
});
