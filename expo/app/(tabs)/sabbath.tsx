import { StatusBar } from 'expo-status-bar';
import {
  Sun,
  Church,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  UserX,
  UserPlus,
  Calendar,
  MapPin,
  ChevronRight,
  RefreshCw,
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/providers/auth-provider';
import type {
  SabbathAssignment,
  SabbathAttendance,
  SabbathRole,
  SabbathDateGroup,
  SabbathWithGroup,
  Sabbath,
  SabbathGroupInfo,
  SabbathDetailView,
} from '@/types/sabbath';
import { ALL_ROLES } from '@/types/sabbath';
import {
  formatSabbathDate,
  getSabbathRoleLabel,
  getSabbathStatusLabel,
  getAssignmentStatusLabel,
  isPublishedSabbath,
  isCancelledSabbath,
} from '@/utils/sabbath';

type TabKey = 'myChurch' | 'switzerland';

function StatusBadge({ status }: { status: Sabbath['status'] }) {
  const label = getSabbathStatusLabel(status);
  const colorMap = {
    draft: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    published: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  } as const;
  const colors = colorMap[status] ?? colorMap.draft;

  return (
    <View style={[badgeStyles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[badgeStyles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
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
});

function AssignmentStatusBadge({ status }: { status: SabbathAssignment['status'] }) {
  const label = getAssignmentStatusLabel(status);
  const colorMap: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef9c3', text: '#854d0e' },
    accepted: { bg: '#dcfce7', text: '#166534' },
    declined: { bg: '#fee2e2', text: '#991b1b' },
    replacement_suggested: { bg: '#e0e7ff', text: '#3730a3' },
    reassigned: { bg: '#f3e8ff', text: '#6b21a8' },
  };
  const colors = colorMap[status] ?? { bg: '#f1f5f9', text: '#475569' };

  return (
    <View style={[{ backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }]}>
      <Text style={{ fontSize: 10, fontWeight: '500' as const, color: colors.text }}>{label}</Text>
    </View>
  );
}

function RoleRow({ role, assignment }: { role: SabbathRole; assignment?: SabbathAssignment }) {
  const roleLabel = getSabbathRoleLabel(role);
  const assigneeName = assignment?.user_name ?? 'Unassigned';
  const hasAssignee = !!assignment?.user_id;

  return (
    <View style={roleStyles.row}>
      <View style={roleStyles.left}>
        <Text style={roleStyles.roleLabel}>{roleLabel}</Text>
        <Text style={[roleStyles.assignee, !hasAssignee && roleStyles.unassigned]}>
          {assigneeName}
        </Text>
      </View>
      {hasAssignee && assignment && (
        <AssignmentStatusBadge status={assignment.status} />
      )}
    </View>
  );
}

const roleStyles = StyleSheet.create({
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
});

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

function SabbathCardHeader({ groupName, status, onViewDetail }: { groupName: string; status: Sabbath['status']; onViewDetail?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.cardHeader}
      onPress={onViewDetail}
      disabled={!onViewDetail}
      activeOpacity={onViewDetail ? 0.7 : 1}
    >
      <View style={styles.cardHeaderLeft}>
        <Church size={18} color="#1e3a8a" />
        <Text style={styles.churchName}>{groupName}</Text>
      </View>
      <View style={styles.cardHeaderRight}>
        <StatusBadge status={status} />
        {onViewDetail && <ChevronRight size={18} color="#94a3b8" />}
      </View>
    </TouchableOpacity>
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

function ProgramCard({ assignments }: { assignments: SabbathAssignment[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>Program</Text>
      {ALL_ROLES.map((role) => {
        const assignment = assignments.find(a => a.role === role);
        return <RoleRow key={role} role={role} assignment={assignment} />;
      })}
    </View>
  );
}

interface AssignmentActionAreaProps {
  myAssignment: SabbathAssignment;
  canRespond: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onSuggestReplacement: (id: string) => void;
  isMutating: boolean;
}

function AssignmentActionArea({ myAssignment, canRespond, onAccept, onDecline, onSuggestReplacement, isMutating }: AssignmentActionAreaProps) {
  if (!canRespond) return null;

  const canAct = myAssignment.status === 'pending' || myAssignment.status === 'accepted' || myAssignment.status === 'declined';

  return (
    <View style={styles.card}>
      <Text style={styles.sectionHeading}>Your Assignment</Text>
      <Text style={styles.myAssignmentRole}>
        {getSabbathRoleLabel(myAssignment.role)}
      </Text>
      <AssignmentStatusBadge status={myAssignment.status} />

      {myAssignment.status === 'pending' && (
        <View style={styles.assignmentActions}>
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

interface AttendanceControlsProps {
  sabbathId: string;
  currentStatus: string | null;
  onAttend: (sabbathId: string, attending: boolean) => void;
  isMutating: boolean;
}

function AttendanceControls({ sabbathId, currentStatus, onAttend, isMutating }: AttendanceControlsProps) {
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

function AttendeesList({ attendance, attendingCount }: { attendance: SabbathAttendance[]; attendingCount: number }) {
  const attending = attendance.filter(a => a.status === 'attending');

  return (
    <View style={styles.card}>
      <View style={styles.attendeesHeader}>
        <Users size={16} color="#1e3a8a" />
        <Text style={styles.sectionHeading}>Attendees ({attendingCount})</Text>
      </View>
      {attending.length === 0 ? (
        <Text style={styles.emptyAttendees}>No responses yet.</Text>
      ) : (
        attending.map((att) => (
          <View key={att.id} style={styles.attendeeRow}>
            <View style={styles.attendeeAvatar}>
              <Text style={styles.attendeeInitial}>
                {(att.user_name ?? '?')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.attendeeName}>{att.user_name ?? 'Unknown'}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function TabSwitcher({ activeTab, onSwitch }: { activeTab: TabKey; onSwitch: (tab: TabKey) => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Sun size={22} color="#1e3a8a" />
        <Text style={styles.headerTitle}>Sabbath Planner</Text>
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
        <ProgramCard assignments={detailData.assignments} />
      )}

      {published && myAssignment && detailData?.canRespondAssignment && (
        <AssignmentActionArea
          myAssignment={myAssignment}
          canRespond={detailData.canRespondAssignment}
          onAccept={onAccept}
          onDecline={onDecline}
          onSuggestReplacement={onSuggestReplacement}
          isMutating={isMutating}
        />
      )}

      {published && detailData?.canRespondAttendance && (
        <AttendanceControls
          sabbathId={sabbath.id}
          currentStatus={currentAttendanceStatus}
          onAttend={onAttend}
          isMutating={isMutating}
        />
      )}

      {published && detailData?.shouldShowAttendees && (
        <AttendeesList attendance={detailData.attendance} attendingCount={attendingCount} />
      )}
    </View>
  );
}

interface SwitzerlandSectionProps {
  dateGroups: SabbathDateGroup[];
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
        <DateGroupSection
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

function DateGroupSection({
  group,
  onAttend,
  onViewDetail,
  isMutating,
}: {
  group: SabbathDateGroup;
  onAttend: (sabbathId: string, attending: boolean) => void;
  onViewDetail: (sabbathId: string) => void;
  isMutating: boolean;
}) {
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

function SwitzerlandSabbathCard({
  item,
  onAttend,
  onViewDetail,
  isMutating,
}: {
  item: SabbathWithGroup;
  onAttend: (sabbathId: string, attending: boolean) => void;
  onViewDetail: (sabbathId: string) => void;
  isMutating: boolean;
}) {
  const { sabbath, group } = item;
  const cancelled = isCancelledSabbath(sabbath.status);
  const published = isPublishedSabbath(sabbath.status);

  const detailQuery = trpc.sabbaths.getSabbathDetail.useQuery(
    { sabbathId: sabbath.id },
    { enabled: published }
  );

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
          <StatusBadge status={sabbath.status} />
          <ChevronRight size={16} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      {cancelled && <CancelledBanner />}

      {published && detailQuery.data?.shouldShowAssignments && (
        <View style={styles.swissRoles}>
          {ALL_ROLES.map((role) => {
            const assignment = detailQuery.data?.assignments.find(a => a.role === role);
            return (
              <View key={role} style={styles.swissRoleRow}>
                <Text style={styles.swissRoleLabel}>{getSabbathRoleLabel(role)}</Text>
                <Text style={styles.swissRoleAssignee}>
                  {assignment?.user_name ?? 'Unassigned'}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {published && (
        <TouchableOpacity
          testID={`attend-swiss-${sabbath.id}`}
          style={styles.swissAttendButton}
          onPress={() => onAttend(sabbath.id, true)}
          disabled={isMutating}
        >
          <UserPlus size={16} color="#1e3a8a" />
          <Text style={styles.swissAttendButtonText}>Attend this Sabbath</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SabbathScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('myChurch');

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

  const respondAttendanceMutation = trpc.sabbaths.respondAttendance.useMutation({
    onSuccess: () => {
      console.log('[Sabbath] Attendance response saved');
      void myChurchQuery.refetch();
      void sabbathDetailQuery.refetch();
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

  const suggestReplacementMutation = trpc.sabbaths.suggestReplacement.useMutation({
    onSuccess: () => {
      console.log('[Sabbath] Replacement suggested');
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

  const handleSuggestReplacement = useCallback((_assignmentId: string) => {
    // TODO: Replace with a proper user picker UI to select a replacement user
    Alert.alert(
      'Suggest Replacement',
      'This will notify your church leaders that you would like to suggest a replacement for your assignment. A leader will follow up with you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Notify Leaders',
          onPress: () => {
            // TODO: Open a user picker and pass the selected user ID
            // For now, show a placeholder message
            Alert.alert(
              'Coming Soon',
              'The replacement suggestion flow with user selection is being built. Please contact your church leader directly for now.'
            );
          },
        },
      ]
    );
  }, []);

  const handleViewDetail = useCallback((sabbathId: string) => {
    router.push({ pathname: '/sabbath-detail' as any, params: { sabbathId } });
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

      <TabSwitcher activeTab={activeTab} onSwitch={setActiveTab} />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
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
    backgroundColor: '#1e3a8a',
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#64748b',
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
    color: '#334155',
    marginTop: 16,
    textAlign: 'center' as const,
  },
  centerStateText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  churchName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    flex: 1,
  },
  sabbathDate: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    lineHeight: 20,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  cancelledText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#991b1b',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#334155',
    marginBottom: 8,
  },
  myAssignmentRole: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  assignmentActions: {
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
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  emptyAttendees: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  attendeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitial: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#3730a3',
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1e293b',
  },
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
  swissRoles: {
    marginBottom: 12,
  },
  swissRoleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  swissRoleLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  swissRoleAssignee: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#1e293b',
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
});
