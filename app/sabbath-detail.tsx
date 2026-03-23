import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  X,
  UserPlus,
  Eye,
  Ban,
  ChevronDown,
  Sun,
  Users,
  ClipboardList,
  UserCheck,
  MessageSquare,
  RotateCcw,
  Trash2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useSabbath } from '@/providers/sabbath-provider';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import type {
  SabbathAssignment,
  SabbathRole,
  SabbathStatus,
  AssignmentStatus,
  AttendanceStatus,
} from '@/types/sabbath';
import { ROLE_LABELS, ALL_ROLES, STATUS_LABELS, ASSIGNMENT_STATUS_LABELS } from '@/types/sabbath';

const STATUS_COLORS: Record<SabbathStatus, { bg: string; text: string; accent: string }> = {
  draft: { bg: '#fef3c7', text: '#92400e', accent: '#f59e0b' },
  published: { bg: '#d1fae5', text: '#065f46', accent: '#10b981' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', accent: '#ef4444' },
};

const ASSIGNMENT_COLORS: Record<AssignmentStatus, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  accepted: { bg: '#d1fae5', text: '#065f46' },
  declined: { bg: '#fee2e2', text: '#991b1b' },
  replacement_suggested: { bg: '#e0e7ff', text: '#3730a3' },
  reassigned: { bg: '#f3e8ff', text: '#6b21a8' },
};

function formatSabbathDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') >= today;
}

export default function SabbathDetailScreen() {
  const { sabbathId } = useLocalSearchParams<{ sabbathId: string }>();
  const insets = useSafeAreaInsets();
  const { user, isAdmin, isPastor } = useAuth();
  const {
    sabbaths,
    isPastorOfGroup,
    updateSabbath,
    isUpdatingSabbath,
    deleteSabbath,
    isDeletingSabbath,
    upsertAssignment,
    isUpsertingAssignment,
    respondAssignment,
    isRespondingAssignment,
    upsertAttendance,
    isUpsertingAttendance,
    fetchAssignments,
    fetchAttendance,
    fetchGroupMembers,
  } = useSabbath();

  const sabbath = useMemo(
    () => sabbaths.find((s) => s.id === sabbathId) || null,
    [sabbaths, sabbathId]
  );

  const canManage = useMemo(() => {
    if (!sabbath) return false;
    return isAdmin() || isPastor() || isPastorOfGroup(sabbath.group_id);
  }, [sabbath, isAdmin, isPastor, isPastorOfGroup]);

  const upcoming = sabbath ? isUpcoming(sabbath.sabbath_date) : false;

  const assignmentsQuery = useQuery({
    queryKey: ['sabbath-assignments', sabbathId],
    queryFn: () => fetchAssignments(sabbathId!),
    enabled: !!sabbathId,
  });

  const attendanceQuery = useQuery({
    queryKey: ['sabbath-attendance', sabbathId],
    queryFn: () => fetchAttendance(sabbathId!),
    enabled: !!sabbathId,
  });

  const groupMembersQuery = useQuery({
    queryKey: ['group-members', sabbath?.group_id],
    queryFn: () => fetchGroupMembers(sabbath!.group_id),
    enabled: !!sabbath?.group_id && canManage,
  });

  const groupQuery = useQuery({
    queryKey: ['group-name', sabbath?.group_id],
    queryFn: async () => {
      if (!sabbath?.group_id) return null;
      const { data } = await supabase
        .from('groups')
        .select('name')
        .eq('id', sabbath.group_id)
        .single();
      return data as { name: string } | null;
    },
    enabled: !!sabbath?.group_id,
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState<SabbathRole | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [decliningAssignment, setDecliningAssignment] = useState<SabbathAssignment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const assignments = useMemo(() => assignmentsQuery.data || [], [assignmentsQuery.data]);
  const attendance = useMemo(() => attendanceQuery.data || [], [attendanceQuery.data]);
  const members = groupMembersQuery.data || [];

  const myAttendance = useMemo(
    () => attendance.find((a) => a.user_id === user?.id),
    [attendance, user?.id]
  );

  const myAssignment = useMemo(
    () => assignments.find((a) => a.user_id === user?.id),
    [assignments, user?.id]
  );

  const assignmentMap = useMemo(() => {
    const map = new Map<SabbathRole, SabbathAssignment>();
    assignments.forEach((a) => map.set(a.role, a));
    return map;
  }, [assignments]);

  const attendingCount = useMemo(
    () => attendance.filter((a) => a.status === 'attending').length,
    [attendance]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      assignmentsQuery.refetch(),
      attendanceQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [assignmentsQuery, attendanceQuery]);

  const handlePublish = useCallback(async () => {
    if (!sabbath) return;
    Alert.alert(
      'Publish Sabbath',
      'This will make the plan visible to all church members. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => {
            void (async () => {
              try {
                await updateSabbath({ id: sabbath.id, status: 'published' });
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to publish.');
              }
            })();
          },
        },
      ]
    );
  }, [sabbath, updateSabbath]);

  const handleCancel = useCallback(() => {
    if (!sabbath) return;
    setShowCancelModal(true);
  }, [sabbath]);

  const confirmCancel = useCallback(async () => {
    if (!sabbath) return;
    try {
      await updateSabbath({
        id: sabbath.id,
        status: 'cancelled',
        cancellation_reason: cancelReason.trim() || undefined,
      });
      setCancelReason('');
      setShowCancelModal(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to cancel.');
    }
  }, [sabbath, updateSabbath, cancelReason]);

  const handleDelete = useCallback(async () => {
    if (!sabbath) return;
    Alert.alert(
      'Delete Sabbath',
      'This will permanently delete this Sabbath plan and all its assignments and attendance records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteSabbath(sabbath.id);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              } catch (err: any) {
                console.error('[SabbathDetail] Delete error:', err);
                Alert.alert('Error', err.message || 'Failed to delete Sabbath.');
              }
            })();
          },
        },
      ]
    );
  }, [sabbath, deleteSabbath]);

  const handleRevertToDraft = useCallback(async () => {
    if (!sabbath) return;
    Alert.alert(
      'Revert to Draft',
      'This will hide the plan from members. Continue?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await updateSabbath({ id: sabbath.id, status: 'draft' });
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to revert.');
              }
            })();
          },
        },
      ]
    );
  }, [sabbath, updateSabbath]);

  const handleAssign = useCallback(
    async (memberId: string) => {
      if (!sabbath || !assigningRole) return;
      try {
        await upsertAssignment({
          sabbath_id: sabbath.id,
          role: assigningRole,
          user_id: memberId,
        });
        setShowAssignModal(false);
        setAssigningRole(null);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to assign role.');
      }
    },
    [sabbath, assigningRole, upsertAssignment]
  );

  const handleAcceptAssignment = useCallback(
    async (assignment: SabbathAssignment) => {
      try {
        await respondAssignment({
          assignment_id: assignment.id,
          sabbath_id: assignment.sabbath_id,
          status: 'accepted',
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to accept.');
      }
    },
    [respondAssignment]
  );

  const handleDeclineAssignment = useCallback(async () => {
    if (!decliningAssignment) return;
    try {
      await respondAssignment({
        assignment_id: decliningAssignment.id,
        sabbath_id: decliningAssignment.sabbath_id,
        status: 'declined',
        decline_reason: declineReason.trim() || undefined,
      });
      setShowDeclineModal(false);
      setDecliningAssignment(null);
      setDeclineReason('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to decline.');
    }
  }, [decliningAssignment, declineReason, respondAssignment]);

  const handleAttendance = useCallback(
    async (status: AttendanceStatus) => {
      if (!sabbath) return;
      try {
        await upsertAttendance({ sabbath_id: sabbath.id, status });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to update attendance.');
      }
    },
    [sabbath, upsertAttendance]
  );

  if (!sabbath) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[sabbath.status];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={['#0f172a', '#1e3a5f']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-button">
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Sun size={18} color="#fbbf24" />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {formatSabbathDate(sabbath.sabbath_date)}
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.headerMeta}>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.accent }]} />
            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
              {STATUS_LABELS[sabbath.status]}
            </Text>
          </View>
          <Text style={styles.churchName}>{groupQuery.data?.name || 'Loading...'}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a8a" />
        }
      >
        {upcoming && sabbath.status === 'published' && (
          <View style={styles.attendanceSection}>
            <View style={styles.sectionHeader}>
              <UserCheck size={18} color="#0f172a" />
              <Text style={styles.sectionTitle}>Your Attendance</Text>
            </View>
            <View style={styles.attendanceRow}>
              <TouchableOpacity
                style={[
                  styles.attendanceBtn,
                  myAttendance?.status === 'attending' && styles.attendanceBtnActive,
                ]}
                onPress={() => handleAttendance('attending')}
                disabled={isUpsertingAttendance}
              >
                <Check size={18} color={myAttendance?.status === 'attending' ? '#fff' : '#10b981'} />
                <Text
                  style={[
                    styles.attendanceBtnText,
                    myAttendance?.status === 'attending' && styles.attendanceBtnTextActive,
                  ]}
                >
                  Attending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.attendanceBtn,
                  styles.attendanceBtnDecline,
                  myAttendance?.status === 'not_attending' && styles.attendanceBtnDeclineActive,
                ]}
                onPress={() => handleAttendance('not_attending')}
                disabled={isUpsertingAttendance}
              >
                <X size={18} color={myAttendance?.status === 'not_attending' ? '#fff' : '#ef4444'} />
                <Text
                  style={[
                    styles.attendanceBtnText,
                    styles.attendanceBtnDeclineText,
                    myAttendance?.status === 'not_attending' && styles.attendanceBtnTextActive,
                  ]}
                >
                  Not Attending
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.attendanceSummary}>
              {attendingCount} {attendingCount === 1 ? 'person' : 'people'} attending
            </Text>
          </View>
        )}

        {myAssignment && upcoming && myAssignment.status === 'pending' && (
          <View style={styles.myAssignmentBanner}>
            <View style={styles.bannerHeader}>
              <ClipboardList size={18} color="#1e3a8a" />
              <Text style={styles.bannerTitle}>You've been assigned</Text>
            </View>
            <Text style={styles.bannerRole}>{ROLE_LABELS[myAssignment.role]}</Text>
            <View style={styles.bannerActions}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAcceptAssignment(myAssignment)}
                disabled={isRespondingAssignment}
              >
                <Check size={16} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => {
                  setDecliningAssignment(myAssignment);
                  setShowDeclineModal(true);
                }}
                disabled={isRespondingAssignment}
              >
                <X size={16} color="#ef4444" />
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.assignmentsSection}>
          <View style={styles.sectionHeader}>
            <ClipboardList size={18} color="#0f172a" />
            <Text style={styles.sectionTitle}>Assignments</Text>
          </View>
          {ALL_ROLES.map((role) => {
            const assignment = assignmentMap.get(role);
            const aStatusStyle = assignment ? ASSIGNMENT_COLORS[assignment.status] : null;
            return (
              <View key={role} style={styles.roleCard}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleLabel}>{ROLE_LABELS[role]}</Text>
                  {assignment && aStatusStyle && (
                    <View style={[styles.assignmentStatusBadge, { backgroundColor: aStatusStyle.bg }]}>
                      <Text style={[styles.assignmentStatusText, { color: aStatusStyle.text }]}>
                        {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                      </Text>
                    </View>
                  )}
                </View>
                {assignment?.user_name ? (
                  <View style={styles.assignedUser}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {assignment.user_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.assignedName}>{assignment.user_name}</Text>
                  </View>
                ) : (
                  <Text style={styles.unassignedText}>Unassigned</Text>
                )}
                {assignment?.status === 'declined' && assignment.decline_reason && (
                  <View style={styles.declineReasonBox}>
                    <MessageSquare size={12} color="#991b1b" />
                    <Text style={styles.declineReasonText}>{assignment.decline_reason}</Text>
                  </View>
                )}
                {assignment?.status === 'replacement_suggested' && assignment.suggested_user_name && (
                  <View style={styles.suggestedBox}>
                    <UserPlus size={12} color="#3730a3" />
                    <Text style={styles.suggestedText}>
                      Suggested: {assignment.suggested_user_name}
                    </Text>
                  </View>
                )}
                {canManage && upcoming && sabbath.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.assignBtn}
                    onPress={() => {
                      setAssigningRole(role);
                      setShowAssignModal(true);
                    }}
                  >
                    <UserPlus size={14} color="#1e3a8a" />
                    <Text style={styles.assignBtnText}>
                      {assignment?.user_id ? 'Reassign' : 'Assign'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {sabbath.notes ? (
          <View style={styles.notesSection}>
            <View style={styles.sectionHeader}>
              <MessageSquare size={18} color="#0f172a" />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{sabbath.notes}</Text>
            </View>
          </View>
        ) : null}

        {sabbath.status === 'cancelled' && sabbath.cancellation_reason ? (
          <View style={styles.cancelReasonSection}>
            <View style={styles.sectionHeader}>
              <Ban size={18} color="#991b1b" />
              <Text style={[styles.sectionTitle, { color: '#991b1b' }]}>Cancellation Reason</Text>
            </View>
            <View style={styles.cancelReasonCard}>
              <Text style={styles.cancelReasonText}>{sabbath.cancellation_reason}</Text>
            </View>
          </View>
        ) : null}

        {attendance.length > 0 && (
          <View style={styles.attendanceListSection}>
            <View style={styles.sectionHeader}>
              <Users size={18} color="#0f172a" />
              <Text style={styles.sectionTitle}>
                Attendance ({attendingCount}/{attendance.length})
              </Text>
            </View>
            {attendance.map((a) => (
              <View key={a.id} style={styles.attendeeRow}>
                <View style={styles.attendeeAvatar}>
                  <Text style={styles.attendeeAvatarText}>
                    {(a.user_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.attendeeName}>{a.user_name || 'Unknown'}</Text>
                <View
                  style={[
                    styles.attendeeStatus,
                    a.status === 'attending' ? styles.attendeeAttending : styles.attendeeNotAttending,
                  ]}
                >
                  {a.status === 'attending' ? (
                    <Check size={12} color="#065f46" />
                  ) : (
                    <X size={12} color="#991b1b" />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {canManage && upcoming && sabbath.status !== 'cancelled' && (
          <View style={styles.manageSection}>
            <Text style={styles.manageSectionTitle}>Manage</Text>
            <View style={styles.manageActions}>
              {sabbath.status === 'draft' && (
                <TouchableOpacity
                  style={styles.publishBtn}
                  onPress={handlePublish}
                  disabled={isUpdatingSabbath}
                >
                  {isUpdatingSabbath ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Eye size={18} color="#fff" />
                      <Text style={styles.publishBtnText}>Publish to Members</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {sabbath.status === 'published' && (
                <TouchableOpacity
                  style={styles.revertBtn}
                  onPress={handleRevertToDraft}
                  disabled={isUpdatingSabbath}
                >
                  <RotateCcw size={16} color="#475569" />
                  <Text style={styles.revertBtnText}>Revert to Draft</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelSabbathBtn}
                onPress={handleCancel}
                disabled={isUpdatingSabbath}
              >
                <Ban size={16} color="#ef4444" />
                <Text style={styles.cancelSabbathBtnText}>Cancel Sabbath</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {canManage && (
          <View style={styles.dangerSection}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              disabled={isDeletingSabbath}
              testID="delete-sabbath-button"
            >
              {isDeletingSabbath ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Trash2 size={16} color="#fff" />
                  <Text style={styles.deleteBtnText}>Delete Sabbath Permanently</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>

      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Assign {assigningRole ? ROLE_LABELS[assigningRole] : ''}
            </Text>
            <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
              {members.length === 0 ? (
                <View style={styles.emptyMembers}>
                  <Users size={32} color="#cbd5e1" />
                  <Text style={styles.emptyMembersText}>No group members found</Text>
                </View>
              ) : (
                members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.memberItem}
                    onPress={() => handleAssign(m.id)}
                    disabled={isUpsertingAssignment}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {m.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <ChevronDown size={16} color="#94a3b8" style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setShowAssignModal(false);
                setAssigningRole(null);
              }}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeclineModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.declineModalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.declineModalTitle}>Decline Assignment</Text>
            <Text style={styles.declineModalSubtitle}>
              Optionally provide a reason for declining.
            </Text>
            <TextInput
              style={styles.declineInput}
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder="Reason (optional)..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.declineModalActions}>
              <TouchableOpacity
                style={styles.declineModalCancel}
                onPress={() => {
                  setShowDeclineModal(false);
                  setDecliningAssignment(null);
                  setDeclineReason('');
                }}
              >
                <Text style={styles.declineModalCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineModalConfirm}
                onPress={handleDeclineAssignment}
                disabled={isRespondingAssignment}
              >
                {isRespondingAssignment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.declineModalConfirmText}>Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCancelModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.declineModalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.declineModalTitle}>Cancel Sabbath</Text>
            <Text style={styles.declineModalSubtitle}>
              Provide a reason for cancellation.
            </Text>
            <TextInput
              style={styles.declineInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Cancellation reason..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.declineModalActions}>
              <TouchableOpacity
                style={styles.declineModalCancel}
                onPress={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
              >
                <Text style={styles.declineModalCancelText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineModalConfirm, { backgroundColor: '#ef4444' }]}
                onPress={confirmCancel}
                disabled={isUpdatingSabbath}
              >
                {isUpdatingSabbath ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.declineModalConfirmText}>Cancel Sabbath</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  headerCenter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    flex: 1,
    justifyContent: 'center' as const,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  headerMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 12,
  },
  statusPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  churchName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
  attendanceSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  attendanceRow: {
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 10,
  },
  attendanceBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
  },
  attendanceBtnActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  attendanceBtnDecline: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  attendanceBtnDeclineActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  attendanceBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10b981',
  },
  attendanceBtnDeclineText: {
    color: '#ef4444',
  },
  attendanceBtnTextActive: {
    color: '#fff',
  },
  attendanceSummary: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center' as const,
  },
  myAssignmentBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
  },
  bannerHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  bannerRole: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#0f172a',
    marginBottom: 14,
  },
  bannerActions: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10b981',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  assignmentsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  roleCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  roleHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#334155',
  },
  assignmentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  assignmentStatusText: {
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
  },
  assignedUser: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#475569',
  },
  assignedName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1e293b',
  },
  unassignedText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic' as const,
  },
  declineReasonBox: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  declineReasonText: {
    fontSize: 12,
    color: '#991b1b',
    flex: 1,
    lineHeight: 16,
  },
  suggestedBox: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  suggestedText: {
    fontSize: 12,
    color: '#3730a3',
    fontWeight: '500' as const,
  },
  assignBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  assignBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1e3a8a',
  },
  notesSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  notesCard: {
    padding: 12,
    backgroundColor: '#fefce8',
    borderRadius: 10,
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  cancelReasonSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelReasonCard: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
  },
  cancelReasonText: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  attendanceListSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  attendeeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
  },
  attendeeAvatarText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#475569',
  },
  attendeeName: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  attendeeStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  attendeeAttending: {
    backgroundColor: '#d1fae5',
  },
  attendeeNotAttending: {
    backgroundColor: '#fee2e2',
  },
  manageSection: {
    marginTop: 6,
    marginBottom: 14,
  },
  manageSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  manageActions: {
    gap: 10,
  },
  publishBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#10b981',
  },
  publishBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  revertBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  revertBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#475569',
  },
  cancelSabbathBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#fecaca',
  },
  cancelSabbathBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  dangerSection: {
    marginTop: 10,
    marginBottom: 14,
  },
  deleteBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#dc2626',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center' as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#0f172a',
    marginBottom: 16,
  },
  membersList: {
    maxHeight: 300,
  },
  emptyMembers: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  emptyMembersText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  memberItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#475569',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#1e293b',
    flex: 1,
  },
  modalCloseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center' as const,
    marginTop: 12,
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#475569',
  },
  declineModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  declineModalTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#0f172a',
    marginBottom: 6,
  },
  declineModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  declineInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 80,
    marginBottom: 16,
  },
  declineModalActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  declineModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center' as const,
  },
  declineModalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#475569',
  },
  declineModalConfirm: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#ef4444',
    alignItems: 'center' as const,
  },
  declineModalConfirmText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
