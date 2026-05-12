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
  RefreshCw,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type {
  Sabbath,
  SabbathAssignment,
  SabbathAttendance,
  SabbathGroupInfo,
  SabbathDetailView,
  SabbathRole,
  SabbathStatus,
  SabbathAssignmentStatus,
  SabbathAttendanceStatus,
} from '@/types/sabbath';
import { ROLE_LABELS, ALL_ROLES, STATUS_LABELS, ASSIGNMENT_STATUS_LABELS } from '@/types/sabbath';

const STATUS_COLORS: Record<SabbathStatus, { bg: string; text: string; accent: string }> = {
  draft: { bg: '#fef3c7', text: '#92400e', accent: '#f59e0b' },
  published: { bg: '#d1fae5', text: '#065f46', accent: '#10b981' },
  cancelled: { bg: '#fee2e2', text: '#991b1b', accent: '#ef4444' },
};

const ASSIGNMENT_COLORS: Record<SabbathAssignmentStatus, { bg: string; text: string }> = {
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const detailQuery = useQuery<SabbathDetailView>({
    queryKey: ['sabbath-detail', sabbathId, user?.id],
    enabled: !!sabbathId && !!user?.id,
    staleTime: 5_000,
    queryFn: async (): Promise<SabbathDetailView> => {
      if (!sabbathId || !user?.id) throw new Error('Missing sabbathId or user');

      const { data: sabbathRow, error: sErr } = await supabase
        .from('sabbaths')
        .select('*')
        .eq('id', sabbathId)
        .single();
      if (sErr || !sabbathRow) {
        console.error('[SabbathDetail] sabbath fetch error:', sErr);
        throw new Error('Sabbath not found');
      }
      const sabbathRec = sabbathRow as Sabbath;

      const [groupRes, profileRes, pastorRes, assignmentsRes, myAttRes] = await Promise.all([
        supabase.from('groups').select('id, name').eq('id', sabbathRec.group_id).maybeSingle(),
        supabase.from('profiles').select('id, role, home_group_id').eq('id', user.id).maybeSingle(),
        supabase.from('group_pastors').select('id').eq('group_id', sabbathRec.group_id).eq('user_id', user.id).maybeSingle(),
        supabase.from('sabbath_assignments').select('*').eq('sabbath_id', sabbathId),
        supabase.from('sabbath_attendance').select('*').eq('sabbath_id', sabbathId).eq('user_id', user.id).maybeSingle(),
      ]);

      const profile = profileRes.data as { id: string; role: string; home_group_id: string | null } | null;
      const isAdminRole = profile?.role === 'admin';
      const isPastorOfGroup = !!pastorRes.data;
      const isLeaderOfGroup = profile?.role === 'church_leader' && profile?.home_group_id === sabbathRec.group_id;
      const canManageVal = isAdminRole || isPastorOfGroup || isLeaderOfGroup;
      const isHomeChurchVal = profile?.home_group_id === sabbathRec.group_id;

      const groupInfo: SabbathGroupInfo = groupRes.data
        ? { id: (groupRes.data as any).id, name: (groupRes.data as any).name }
        : { id: sabbathRec.group_id, name: 'Unknown Church' };

      const assignmentsList = (assignmentsRes.data ?? []) as any[];
      const isAssignedUserVal = assignmentsList.some((a) => a.user_id === user.id);

      const shouldShowAssignmentsVal =
        sabbathRec.status === 'published' ||
        (canManageVal && (sabbathRec.status === 'draft' || sabbathRec.status === 'cancelled'));

      let assignmentsOut: SabbathAssignment[] = [];
      if (shouldShowAssignmentsVal && assignmentsList.length > 0) {
        const userIds = Array.from(new Set(
          assignmentsList.flatMap((a) => [a.user_id, a.suggested_user_id]).filter(Boolean)
        )) as string[];
        const nameMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, display_name')
            .in('id', userIds);
          (profs || []).forEach((p: any) => {
            nameMap.set(p.id, p.display_name || p.full_name || 'Unknown');
          });
        }
        assignmentsOut = assignmentsList.map((a) => ({
          ...a,
          user_name: a.user_id ? nameMap.get(a.user_id) ?? 'Unknown' : undefined,
          suggested_user_name: a.suggested_user_id ? nameMap.get(a.suggested_user_id) ?? 'Unknown' : undefined,
        }));
      }

      const shouldShowAttendeesVal = (isHomeChurchVal || canManageVal) && sabbathRec.status === 'published';
      let attendanceOut: SabbathAttendance[] = [];
      let attendingCountVal: number | null = null;
      if (shouldShowAttendeesVal) {
        const { data: attRaw } = await supabase
          .from('sabbath_attendance')
          .select('*')
          .eq('sabbath_id', sabbathId);
        const attList = (attRaw ?? []) as any[];
        const ids = attList.map((a) => a.user_id) as string[];
        const nameMap = new Map<string, string>();
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, display_name')
            .in('id', ids);
          (profs || []).forEach((p: any) => {
            nameMap.set(p.id, p.display_name || p.full_name || 'Unknown');
          });
        }
        attendanceOut = attList.map((a) => ({ ...a, user_name: nameMap.get(a.user_id) ?? 'Unknown' }));
        attendingCountVal = attendanceOut.filter((a) => a.status === 'attending').length;
      }

      const myAttendanceStatusVal = (myAttRes.data as any)?.status ?? null;
      const canRespondAttendanceVal = sabbathRec.status === 'published';
      const canRespondAssignmentVal = sabbathRec.status === 'published' && isAssignedUserVal;

      return {
        sabbath: sabbathRec,
        group: groupInfo,
        assignments: assignmentsOut,
        attendance: attendanceOut,
        myAttendanceStatus: myAttendanceStatusVal,
        attendingCount: attendingCountVal,
        isHomeChurch: isHomeChurchVal,
        isAssignedUser: isAssignedUserVal,
        canManage: canManageVal,
        canRespondAttendance: canRespondAttendanceVal,
        canRespondAssignment: canRespondAssignmentVal,
        shouldShowAttendees: shouldShowAttendeesVal,
        shouldShowAssignments: shouldShowAssignmentsVal,
      };
    },
  });

  const detail = detailQuery.data;
  const sabbath = detail?.sabbath ?? null;
  const assignments = useMemo(() => detail?.assignments ?? [], [detail?.assignments]);
  const attendance = useMemo(() => detail?.attendance ?? [], [detail?.attendance]);
  const canManage = detail?.canManage ?? false;
  const shouldShowAttendees = detail?.shouldShowAttendees ?? false;
  const shouldShowAssignments = detail?.shouldShowAssignments ?? false;
  const canRespondAttendance = detail?.canRespondAttendance ?? false;
  const canRespondAssignment = detail?.canRespondAssignment ?? false;

  const upcoming = sabbath ? isUpcoming(sabbath.sabbath_date) : false;

  const fetchGroupedMembers = useCallback(async (primaryGroupId: string) => {
    const [groupsRes, profilesRes, pastorsRes] = await Promise.all([
      supabase.from('groups').select('id, name').order('name', { ascending: true }),
      supabase.from('profiles').select('id, full_name, display_name, home_group_id').order('full_name', { ascending: true }),
      supabase.from('group_pastors').select('user_id, group_id'),
    ]);
    const allGroups = (groupsRes.data || []) as Array<{ id: string; name: string }>;
    const allProfiles = (profilesRes.data || []) as Array<{ id: string; full_name: string | null; display_name: string | null; home_group_id: string | null }>;
    const allPastors = (pastorsRes.data || []) as Array<{ user_id: string; group_id: string }>;

    const groupNameMap = new Map<string, string>();
    allGroups.forEach((g) => groupNameMap.set(g.id, g.name));

    const pastorGroupMap = new Map<string, Set<string>>();
    allPastors.forEach((p) => {
      if (!pastorGroupMap.has(p.user_id)) pastorGroupMap.set(p.user_id, new Set());
      pastorGroupMap.get(p.user_id)!.add(p.group_id);
    });

    type Section = { groupId: string; groupName: string; members: { id: string; name: string }[] };
    const sectionMap = new Map<string, Section>();
    const addedToGroup = new Map<string, Set<string>>();
    const addMember = (gId: string, mId: string, mName: string) => {
      if (!addedToGroup.has(gId)) addedToGroup.set(gId, new Set());
      if (addedToGroup.get(gId)!.has(mId)) return;
      addedToGroup.get(gId)!.add(mId);
      if (!sectionMap.has(gId)) {
        sectionMap.set(gId, { groupId: gId, groupName: groupNameMap.get(gId) || 'Unknown Church', members: [] });
      }
      sectionMap.get(gId)!.members.push({ id: mId, name: mName });
    };

    allProfiles.forEach((p) => {
      const name = (p.full_name?.trim()) || (p.display_name?.trim()) || 'Unknown';
      const homeGroup = p.home_group_id;
      if (homeGroup && groupNameMap.has(homeGroup)) addMember(homeGroup, p.id, name);
      const pgs = pastorGroupMap.get(p.id);
      if (pgs) pgs.forEach((gId) => { if (groupNameMap.has(gId)) addMember(gId, p.id, name); });
      if (!homeGroup && !pgs) addMember('__unassigned__', p.id, name);
    });
    if (sectionMap.has('__unassigned__')) sectionMap.get('__unassigned__')!.groupName = 'Unassigned Members';

    const sections = Array.from(sectionMap.values());
    sections.sort((a, b) => {
      if (a.groupId === primaryGroupId) return -1;
      if (b.groupId === primaryGroupId) return 1;
      if (a.groupId === '__unassigned__') return 1;
      if (b.groupId === '__unassigned__') return -1;
      return a.groupName.localeCompare(b.groupName);
    });
    sections.forEach((s) => s.members.sort((a, b) => a.name.localeCompare(b.name)));
    return sections;
  }, []);

  const groupedMembersQuery = useQuery({
    queryKey: ['sabbath-grouped-members', sabbath?.group_id],
    queryFn: () => fetchGroupedMembers(sabbath!.group_id),
    enabled: !!sabbath?.group_id && canManage,
    staleTime: 30_000,
  });

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sabbath-detail', sabbathId] });
    void queryClient.invalidateQueries({ queryKey: ['sabbaths-all'] });
    void queryClient.invalidateQueries({ queryKey: ['sabbath-grouped-members'] });
  }, [queryClient, sabbathId]);

  const publishMutation = useMutation({
    mutationFn: async ({ sabbathId: sid }: { sabbathId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data: assignments } = await supabase
        .from('sabbath_assignments')
        .select('role, user_id')
        .eq('sabbath_id', sid);
      for (const role of ALL_ROLES) {
        const a = (assignments || []).find((x: any) => x.role === role);
        if (!a) throw new Error(`Cannot publish: missing assignment for "${role}". Please recreate the Sabbath.`);
        if (!(a as any).user_id) throw new Error(`Cannot publish: role "${role}" has no assigned user. Please assign all roles before publishing.`);
      }
      const { error } = await supabase
        .from('sabbaths')
        .update({ status: 'published', published_by: user.id, published_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', sid);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ sabbathId: sid, cancellationReason }: { sabbathId: string; cancellationReason: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('sabbaths')
        .update({ status: 'cancelled', cancelled_by: user.id, cancelled_at: new Date().toISOString(), cancellation_reason: cancellationReason, updated_by: user.id })
        .eq('id', sid);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const revertMutation = useMutation({
    mutationFn: async ({ sabbathId: sid }: { sabbathId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('sabbaths')
        .update({ status: 'draft', updated_by: user.id })
        .eq('id', sid);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ sabbathId: sid }: { sabbathId: string }) => {
      await supabase.from('sabbath_attendance').delete().eq('sabbath_id', sid);
      await supabase.from('sabbath_assignments').delete().eq('sabbath_id', sid);
      const { error } = await supabase.from('sabbaths').delete().eq('id', sid);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ sabbathId: sid, role, userId }: { sabbathId: string; role: SabbathRole; userId: string }) => {
      const { error } = await supabase
        .from('sabbath_assignments')
        .update({ user_id: userId, status: 'pending', decline_reason: null, suggested_user_id: null })
        .eq('sabbath_id', sid)
        .eq('role', role);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string }) => {
      const { error } = await supabase
        .from('sabbath_assignments')
        .update({ status: 'accepted' })
        .eq('id', assignmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const declineMutation = useMutation({
    mutationFn: async ({ assignmentId, reason }: { assignmentId: string; reason: string | null }) => {
      const { error } = await supabase
        .from('sabbath_assignments')
        .update({ status: 'declined', decline_reason: reason })
        .eq('id', assignmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const attendanceMutation = useMutation({
    mutationFn: async ({ sabbathId: sid, status }: { sabbathId: string; status: SabbathAttendanceStatus }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data: existing } = await supabase
        .from('sabbath_attendance')
        .select('id')
        .eq('sabbath_id', sid)
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('sabbath_attendance')
          .update({ status })
          .eq('id', (existing as any).id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('sabbath_attendance')
          .insert({ sabbath_id: sid, user_id: user.id, status });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: invalidateAll,
  });

  const suggestReplacementMutation = useMutation({
    mutationFn: async ({ assignmentId, suggestedUserId }: { assignmentId: string; suggestedUserId: string }) => {
      const { error } = await supabase
        .from('sabbath_assignments')
        .update({ status: 'replacement_suggested', suggested_user_id: suggestedUserId })
        .eq('id', assignmentId);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidateAll,
  });

  const isStatusUpdating = publishMutation.isPending || cancelMutation.isPending || revertMutation.isPending;

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState<SabbathRole | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [decliningAssignment, setDecliningAssignment] = useState<SabbathAssignment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestingAssignment, setSuggestingAssignment] = useState<SabbathAssignment | null>(null);

  const groupedMembers = useMemo(() => groupedMembersQuery.data ?? [], [groupedMembersQuery.data]);

  const suggestGroupedMembersQuery = useQuery({
    queryKey: ['sabbath-grouped-members', sabbath?.group_id, 'suggest'],
    queryFn: () => fetchGroupedMembers(sabbath!.group_id),
    enabled: !!sabbath?.group_id && showSuggestModal,
    staleTime: 30_000,
  });
  const suggestGroupedMembers = useMemo(() => suggestGroupedMembersQuery.data ?? [], [suggestGroupedMembersQuery.data]);

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
    await detailQuery.refetch();
    setRefreshing(false);
  }, [detailQuery]);

  const handlePublish = useCallback(() => {
    if (!sabbath) return;
    Alert.alert(
      'Publish Sabbath',
      'This will make the plan visible to all church members. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: () => {
            publishMutation.mutate(
              { sabbathId: sabbath.id },
              {
                onSuccess: () => {
                  console.log('[SabbathDetail] Published:', sabbath.id);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
                onError: (err) => Alert.alert('Error', err.message || 'Failed to publish.'),
              }
            );
          },
        },
      ]
    );
  }, [sabbath, publishMutation]);

  const handleCancel = useCallback(() => {
    if (!sabbath) return;
    setShowCancelModal(true);
  }, [sabbath]);

  const confirmCancel = useCallback(() => {
    if (!sabbath) return;
    cancelMutation.mutate(
      { sabbathId: sabbath.id, cancellationReason: cancelReason.trim() || null },
      {
        onSuccess: () => {
          console.log('[SabbathDetail] Cancelled:', sabbath.id);
          setCancelReason('');
          setShowCancelModal(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
        onError: (err) => Alert.alert('Error', err.message || 'Failed to cancel.'),
      }
    );
  }, [sabbath, cancelMutation, cancelReason]);

  const handleDelete = useCallback(() => {
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
            deleteMutation.mutate(
              { sabbathId: sabbath.id },
              {
                onSuccess: () => {
                  console.log('[SabbathDetail] Deleted:', sabbath.id);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  router.back();
                },
                onError: (err) => {
                  console.error('[SabbathDetail] Delete error:', err);
                  Alert.alert('Error', err.message || 'Failed to delete Sabbath.');
                },
              }
            );
          },
        },
      ]
    );
  }, [sabbath, deleteMutation]);

  const handleRevertToDraft = useCallback(() => {
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
            revertMutation.mutate(
              { sabbathId: sabbath.id },
              {
                onSuccess: () => {
                  console.log('[SabbathDetail] Reverted to draft:', sabbath.id);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
                onError: (err) => Alert.alert('Error', err.message || 'Failed to revert.'),
              }
            );
          },
        },
      ]
    );
  }, [sabbath, revertMutation]);

  const handleAssign = useCallback(
    (memberId: string) => {
      if (!sabbath || !assigningRole) return;
      assignRoleMutation.mutate(
        { sabbathId: sabbath.id, role: assigningRole, userId: memberId },
        {
          onSuccess: () => {
            console.log('[SabbathDetail] Assigned:', assigningRole, 'to:', memberId);
            setShowAssignModal(false);
            setAssigningRole(null);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
          onError: (err) => Alert.alert('Error', err.message || 'Failed to assign role.'),
        }
      );
    },
    [sabbath, assigningRole, assignRoleMutation]
  );

  const handleAcceptAssignment = useCallback(() => {
    if (!myAssignment) return;
    acceptMutation.mutate(
      { assignmentId: myAssignment.id },
      {
        onSuccess: () => {
          console.log('[SabbathDetail] Accepted assignment:', myAssignment.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err) => Alert.alert('Error', err.message || 'Failed to accept assignment.'),
      }
    );
  }, [myAssignment, acceptMutation]);

  const handleDeclineAssignment = useCallback(() => {
    if (!decliningAssignment) return;
    declineMutation.mutate(
      { assignmentId: decliningAssignment.id, reason: declineReason.trim() || null },
      {
        onSuccess: () => {
          console.log('[SabbathDetail] Declined:', decliningAssignment.id);
          setShowDeclineModal(false);
          setDecliningAssignment(null);
          setDeclineReason('');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
        onError: (err) => Alert.alert('Error', err.message || 'Failed to decline.'),
      }
    );
  }, [decliningAssignment, declineReason, declineMutation]);

  const handleSuggestReplacement = useCallback(
    (suggestedUserId: string) => {
      if (!suggestingAssignment) return;
      suggestReplacementMutation.mutate(
        { assignmentId: suggestingAssignment.id, suggestedUserId },
        {
          onSuccess: () => {
            console.log('[SabbathDetail] Suggested replacement for:', suggestingAssignment.id, 'with user:', suggestedUserId);
            setShowSuggestModal(false);
            setSuggestingAssignment(null);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Replacement Suggested', 'The pastor has been notified of your suggestion.');
          },
          onError: (err) => Alert.alert('Error', err.message || 'Failed to suggest replacement.'),
        }
      );
    },
    [suggestingAssignment, suggestReplacementMutation]
  );

  const handleAttendance = useCallback(
    (status: SabbathAttendanceStatus) => {
      if (!sabbath) return;
      attendanceMutation.mutate(
        { sabbathId: sabbath.id, status },
        {
          onSuccess: () => {
            console.log('[SabbathDetail] Attendance:', status);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
          onError: (err) => Alert.alert('Error', err.message || 'Failed to update attendance.'),
        }
      );
    },
    [sabbath, attendanceMutation]
  );

  const isCancelledForNormalMember = sabbath?.status === 'cancelled' && !canManage;

  if (!sabbath) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.centered, { paddingTop: insets.top + 60 }]}>
          {detailQuery.error ? (
            <Text style={styles.loadingText}>{detailQuery.error.message}</Text>
          ) : (
            <>
              <ActivityIndicator size="large" color="#1e3a8a" />
              <Text style={styles.loadingText}>Loading...</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[sabbath.status];
  const myAssignmentCanRespond = canRespondAssignment && myAssignment && myAssignment.status !== 'declined' && myAssignment.status !== 'replacement_suggested';
  const isPublishedAndNotCancelled = sabbath.status === 'published';
  const isHomeChurch = detail?.isHomeChurch ?? false;

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
          <Text style={styles.churchName}>{detail?.group?.name || 'Loading...'}</Text>
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
        {isCancelledForNormalMember && (
          <View style={styles.cancelledBanner}>
            <Ban size={20} color="#991b1b" />
            <Text style={styles.cancelledBannerText}>This Sabbath has been cancelled.</Text>
            {sabbath.cancellation_reason ? (
              <View style={styles.cancelReasonCard}>
                <Text style={styles.cancelReasonText}>{sabbath.cancellation_reason}</Text>
              </View>
            ) : null}
          </View>
        )}

        {!isCancelledForNormalMember && (
          <>
            {upcoming && canRespondAttendance && (
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
                    disabled={attendanceMutation.isPending}
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
                    disabled={attendanceMutation.isPending}
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
                {shouldShowAttendees && (
                  <Text style={styles.attendanceSummary}>
                    {attendingCount} {attendingCount === 1 ? 'person' : 'people'} attending
                  </Text>
                )}
              </View>
            )}

            {myAssignmentCanRespond && upcoming && (
              <View style={styles.myAssignmentBanner}>
                <View style={styles.bannerHeader}>
                  <ClipboardList size={18} color="#1e3a8a" />
                  <Text style={styles.bannerTitle}>You're assigned as</Text>
                </View>
                <Text style={styles.bannerRole}>{ROLE_LABELS[myAssignment!.role]}</Text>
                {myAssignment!.status === 'accepted' && (
                  <View style={styles.acceptedBadgeRow}>
                    <Check size={14} color="#065f46" />
                    <Text style={styles.acceptedBadgeText}>You accepted this assignment</Text>
                  </View>
                )}
                <View style={styles.bannerActions}>
                  {(myAssignment!.status === 'pending' || myAssignment!.status === 'accepted') && (
                    <TouchableOpacity
                      style={[
                        styles.acceptBtn,
                        myAssignment!.status === 'accepted' && styles.acceptBtnAlreadyAccepted,
                      ]}
                      onPress={handleAcceptAssignment}
                      disabled={acceptMutation.isPending || myAssignment!.status === 'accepted'}
                      testID="accept-assignment-button"
                    >
                      {acceptMutation.isPending ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Check size={16} color={myAssignment!.status === 'accepted' ? '#065f46' : '#fff'} />
                          <Text style={[
                            styles.acceptBtnText,
                            myAssignment!.status === 'accepted' && styles.acceptBtnTextAccepted,
                          ]}>
                            {myAssignment!.status === 'accepted' ? 'Accepted' : 'Accept'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => {
                      setDecliningAssignment(myAssignment!);
                      setShowDeclineModal(true);
                    }}
                    disabled={declineMutation.isPending}
                    testID="decline-assignment-button"
                  >
                    <X size={16} color="#ef4444" />
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.suggestBtn}
                    onPress={() => {
                      setSuggestingAssignment(myAssignment!);
                      setShowSuggestModal(true);
                    }}
                    disabled={suggestReplacementMutation.isPending}
                    testID="suggest-replacement-button"
                  >
                    <RefreshCw size={16} color="#3730a3" />
                    <Text style={styles.suggestBtnText}>Suggest Replacement</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {shouldShowAssignments && !(isCancelledForNormalMember) && (
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
                      {canManage && assignment?.status === 'declined' && assignment.decline_reason && (
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
            )}

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

            {sabbath.status === 'cancelled' && sabbath.cancellation_reason && canManage ? (
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

            {(shouldShowAttendees || canManage) && attendance.length > 0 && isPublishedAndNotCancelled && (isHomeChurch || canManage) && (
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
                      disabled={isStatusUpdating}
                    >
                      {isStatusUpdating ? (
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
                      disabled={isStatusUpdating}
                    >
                      <RotateCcw size={16} color="#475569" />
                      <Text style={styles.revertBtnText}>Revert to Draft</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.cancelSabbathBtn}
                    onPress={handleCancel}
                    disabled={isStatusUpdating}
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
                  disabled={deleteMutation.isPending}
                  testID="delete-sabbath-button"
                >
                  {deleteMutation.isPending ? (
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
          </>
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
              {groupedMembers.length === 0 ? (
                <View style={styles.emptyMembers}>
                  <Users size={32} color="#cbd5e1" />
                  <Text style={styles.emptyMembersText}>No group members found</Text>
                </View>
              ) : (
                groupedMembers.map((section) => (
                  <View key={section.groupId}>
                    <View style={styles.groupSectionHeader}>
                      <View style={[
                        styles.groupSectionDot,
                        section.groupId === sabbath?.group_id && styles.groupSectionDotPrimary,
                      ]} />
                      <Text style={[
                        styles.groupSectionTitle,
                        section.groupId === sabbath?.group_id && styles.groupSectionTitlePrimary,
                      ]}>
                        {section.groupName}
                      </Text>
                      {section.groupId === sabbath?.group_id && (
                        <View style={styles.yourChurchBadge}>
                          <Text style={styles.yourChurchBadgeText}>Your Church</Text>
                        </View>
                      )}
                    </View>
                    {section.members.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.memberItem}
                        onPress={() => handleAssign(m.id)}
                        disabled={assignRoleMutation.isPending}
                      >
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {m.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <ChevronDown size={16} color="#94a3b8" style={{ transform: [{ rotate: '-90deg' }] }} />
                      </TouchableOpacity>
                    ))}
                  </View>
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
              Let the pastor know why you can't attend. They will be notified and can reassign someone else.
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
                disabled={declineMutation.isPending}
              >
                {declineMutation.isPending ? (
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
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.declineModalConfirmText}>Cancel Sabbath</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuggestModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Suggest Replacement</Text>
            <Text style={styles.suggestModalSubtitle}>
              Select a member to suggest as your replacement for {suggestingAssignment ? ROLE_LABELS[suggestingAssignment.role] : ''}.
            </Text>
            <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
              {suggestGroupedMembers.length === 0 ? (
                <View style={styles.emptyMembers}>
                  {suggestGroupedMembersQuery.isLoading ? (
                    <ActivityIndicator size="large" color="#1e3a8a" />
                  ) : (
                    <>
                      <Users size={32} color="#cbd5e1" />
                      <Text style={styles.emptyMembersText}>No members found</Text>
                    </>
                  )}
                </View>
              ) : (
                suggestGroupedMembers.map((section) => (
                  <View key={section.groupId}>
                    <View style={styles.groupSectionHeader}>
                      <View style={[
                        styles.groupSectionDot,
                        section.groupId === sabbath?.group_id && styles.groupSectionDotPrimary,
                      ]} />
                      <Text style={[
                        styles.groupSectionTitle,
                        section.groupId === sabbath?.group_id && styles.groupSectionTitlePrimary,
                      ]}>
                        {section.groupName}
                      </Text>
                    </View>
                    {section.members
                      .filter((m) => m.id !== user?.id)
                      .map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.memberItem}
                          onPress={() => handleSuggestReplacement(m.id)}
                          disabled={suggestReplacementMutation.isPending}
                        >
                          <View style={styles.memberAvatar}>
                            <Text style={styles.memberAvatarText}>
                              {m.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.memberName}>{m.name}</Text>
                          <ChevronDown size={16} color="#94a3b8" style={{ transform: [{ rotate: '-90deg' }] }} />
                        </TouchableOpacity>
                      ))}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setShowSuggestModal(false);
                setSuggestingAssignment(null);
              }}
            >
              <Text style={styles.modalCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
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
  cancelledBanner: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    alignItems: 'center' as const,
    gap: 10,
  },
  cancelledBannerText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#991b1b',
    textAlign: 'center' as const,
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
    marginBottom: 10,
  },
  acceptedBadgeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  acceptedBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#065f46',
  },
  bannerActions: {
    flexDirection: 'row' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
    marginTop: 4,
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
    minWidth: 100,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  acceptBtnAlreadyAccepted: {
    backgroundColor: '#d1fae5',
    borderWidth: 1.5,
    borderColor: '#6ee7b7',
  },
  acceptBtnTextAccepted: {
    color: '#065f46',
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
    minWidth: 100,
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ef4444',
  },
  suggestBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    width: '100%' as const,
  },
  suggestBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#3730a3',
  },
  suggestModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
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
  groupSectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  groupSectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
  },
  groupSectionDotPrimary: {
    backgroundColor: '#1e3a8a',
  },
  groupSectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    flex: 1,
  },
  groupSectionTitlePrimary: {
    color: '#1e3a8a',
  },
  yourChurchBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  yourChurchBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#1e3a8a',
  },
});
