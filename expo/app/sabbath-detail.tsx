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
import { useTranslation } from 'react-i18next';
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

type AssignableMember = {
  id: string;
  name: string;
  role: string | null;
};

type AssignableMemberSection = {
  groupId: string;
  groupName: string;
  countryName: string | null;
  isTargetChurch: boolean;
  members: AssignableMember[];
};

function formatAssignableRole(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'church_leader':
      return 'Church Leader';
    case 'pastor':
      return 'Pastor';
    case 'member':
      return 'Member';
    default:
      return '';
  }
}

function formatSabbathDate(dateStr: string, locale?: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sabbathDate = new Date(`${dateStr}T12:00:00`);
  sabbathDate.setHours(0, 0, 0, 0);
  return sabbathDate >= today;
}

export default function SabbathDetailScreen() {
  const { sabbathId } = useLocalSearchParams<{ sabbathId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  
  const detailQuery = useQuery<SabbathDetailView>({
    queryKey: ['sabbath-detail', sabbathId, user?.id, i18n.language],
    enabled: !!sabbathId && !!user?.id,
    staleTime: 5_000,
    queryFn: async (): Promise<SabbathDetailView> => {
      if (!sabbathId || !user?.id) throw new Error(t('sabbathDetail.errors.missingData'));

      const { data: sabbathRow, error: sErr } = await supabase
        .from('sabbaths')
        .select('*')
        .eq('id', sabbathId)
        .single();
      if (sErr || !sabbathRow) {
        console.error('[SabbathDetail] sabbath fetch error:', sErr);
        throw new Error(t('sabbathDetail.errors.notFound'));
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
        : { id: sabbathRec.group_id, name: t('sabbath.unknownChurch') };

      const assignmentsList = (assignmentsRes.data ?? []) as any[];
      const isAssignedUserVal = assignmentsList.some((a) => a.user_id === user.id);

const shouldShowAssignmentsVal =
  sabbathRec.status === 'published' ||
  (sabbathRec.status !== 'cancelled' && isAssignedUserVal) ||
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
            nameMap.set(p.id, p.display_name || p.full_name || t('common.unknown'));
          });
        }
        assignmentsOut = assignmentsList.map((a) => ({
          ...a,
          user_name: a.user_id ? nameMap.get(a.user_id) ?? t('common.unknown') : undefined,
          suggested_user_name: a.suggested_user_id ? nameMap.get(a.suggested_user_id) ?? t('common.unknown') : undefined,
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
            nameMap.set(p.id, p.display_name || p.full_name || t('common.unknown'));
          });
        }
        attendanceOut = attList.map((a) => ({ ...a, user_name: nameMap.get(a.user_id) ?? t('common.unknown') }));
        attendingCountVal = attendanceOut.filter((a) => a.status === 'attending').length;
      }

      const myAttendanceStatusVal = (myAttRes.data as any)?.status ?? null;
      const canRespondAttendanceVal = sabbathRec.status === 'published';
      const canRespondAssignmentVal = sabbathRec.status !== 'cancelled' && isAssignedUserVal;

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

const fetchGroupedMembers = useCallback(async (primaryGroupId: string): Promise<AssignableMemberSection[]> => {
  const { data, error } = await supabase.rpc('get_sabbath_assignable_members', {
    target_group_id: primaryGroupId,
  });

  if (error) {
    console.warn('[SabbathDetail] assignable members rpc error:', error.message);
    return [];
  }

  const sectionMap = new Map<
    string,
    AssignableMemberSection & { memberIds: Set<string> }
  >();

  ((data ?? []) as any[]).forEach((row) => {
    const memberId = (row.id ?? row.user_id) as string | undefined;
    const groupId = (row.group_id ?? row.home_group_id) as string | undefined;

    if (!memberId || !groupId) return;

    const groupName = (row.group_name ?? row.home_church_name ?? t('sabbath.unknownChurch')) as string;
    const countryName = (row.country_name ?? null) as string | null;
    const isTargetChurch = Boolean(row.is_target_church) || groupId === primaryGroupId;

    if (!sectionMap.has(groupId)) {
      sectionMap.set(groupId, {
        groupId,
        groupName,
        countryName,
        isTargetChurch,
        members: [],
        memberIds: new Set<string>(),
      });
    }

    const section = sectionMap.get(groupId)!;

    if (section.memberIds.has(memberId)) return;

    section.memberIds.add(memberId);
    section.members.push({
      id: memberId,
      name: (row.name ?? row.full_name ?? row.display_name ?? row.email ?? t('common.unknown')) as string,
      role: (row.role ?? null) as string | null,
    });
  });

  return Array.from(sectionMap.values())
    .map((section) => ({
      groupId: section.groupId,
      groupName: section.groupName,
      countryName: section.countryName,
      isTargetChurch: section.isTargetChurch,
      members: section.members.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => {
      if (a.isTargetChurch && !b.isTargetChurch) return -1;
      if (!a.isTargetChurch && b.isTargetChurch) return 1;
      return a.groupName.localeCompare(b.groupName);
    });
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
    if (!user?.id) throw new Error(t('sabbath.notAuthenticated'));

    const { data: sabbathRow, error: sabbathError } = await supabase
      .from('sabbaths')
      .select('id, group_id, sabbath_date, status')
      .eq('id', sid)
      .single();

    if (sabbathError || !sabbathRow) {
      throw new Error(sabbathError?.message ?? t('sabbathDetail.errors.notFound'));
    }

    const currentSabbath = sabbathRow as {
      id: string;
      group_id: string;
      sabbath_date: string;
      status: string;
    };

    if (currentSabbath.status !== 'draft') {
      throw new Error(t('sabbathDetail.errors.onlyDraftCanPublish'));
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('sabbath_assignments')
      .select('role, user_id')
      .eq('sabbath_id', sid);

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    for (const role of ALL_ROLES) {
      const assignment = (assignments || []).find((item: any) => item.role === role);

      if (!assignment) {
        throw new Error(t('sabbathDetail.errors.missingAssignment', { role: getRoleLabel(role) }));
      }

      if (!(assignment as any).user_id) {
        throw new Error(t('sabbathDetail.errors.unassignedRole', { role: getRoleLabel(role) }));
      }
    }

    const { error } = await supabase
      .from('sabbaths')
      .update({
        status: 'published',
        published_by: user.id,
        published_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', sid);

    if (error) throw new Error(error.message);

    try {
      const { data: group } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', currentSabbath.group_id)
        .maybeSingle();

      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', currentSabbath.group_id);

      if (membersError) {
        console.warn('[SabbathDetail] Failed to fetch group members for notification:', membersError.message);
      }

      const assignedUserIds = ((assignments ?? []) as any[])
        .map((assignment) => assignment.user_id as string | null)
        .filter(Boolean) as string[];

      const groupMemberIds = ((groupMembers ?? []) as any[])
        .map((member) => member.user_id as string | null)
        .filter(Boolean) as string[];

      const recipientIds = Array.from(
        new Set([
          ...assignedUserIds,
          ...groupMemberIds,
          user.id,
        ])
      ).filter(Boolean);

      const churchName = (group as any)?.name ?? 'your church';
      const readableDate = formatSabbathDate(currentSabbath.sabbath_date, i18n.language);

      const notificationRows = recipientIds.map((recipientId) => ({
        type: 'sabbath',
        title: 'New Sabbath Published',
        body: `A Sabbath service for ${churchName} on ${readableDate} has been published.`,
        user_id: recipientId,
        sabbath_id: sid,
      }));

      if (notificationRows.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationRows);

        if (notificationError) {
          console.warn('[SabbathDetail] Failed to create Sabbath notifications:', notificationError.message);
        }
      }
    } catch (notificationError) {
      console.warn('[SabbathDetail] Notification creation failed:', notificationError);
    }
  },
  onSuccess: () => {
    invalidateAll();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
});

const cancelMutation = useMutation({
  mutationFn: async ({
    sabbathId: sid,
    cancellationReason,
  }: {
    sabbathId: string;
    cancellationReason: string | null;
  }) => {
    if (!user?.id) throw new Error(t('sabbath.notAuthenticated'));

    const { data: sabbathRow, error: sabbathError } = await supabase
      .from('sabbaths')
      .select('id, group_id, sabbath_date, status')
      .eq('id', sid)
      .single();

    if (sabbathError || !sabbathRow) {
      throw new Error(sabbathError?.message ?? t('sabbathDetail.errors.notFound'));
    }

    const currentSabbath = sabbathRow as {
      id: string;
      group_id: string;
      sabbath_date: string;
      status: string;
    };

    const wasPublished = currentSabbath.status === 'published';

    const { error } = await supabase.rpc('cancel_sabbath_plan', {
      target_sabbath_id: sid,
      target_cancellation_reason: cancellationReason,
    });

    if (error) throw new Error(error.message);

    if (!wasPublished) {
      return;
    }

    try {
      const { data: group } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', currentSabbath.group_id)
        .maybeSingle();

      const { data: assignments, error: assignmentsError } = await supabase
        .from('sabbath_assignments')
        .select('user_id')
        .eq('sabbath_id', sid);

      if (assignmentsError) {
        console.warn(
          '[SabbathDetail] Failed to fetch assignments for cancellation notification:',
          assignmentsError.message
        );
      }

      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', currentSabbath.group_id);

      if (membersError) {
        console.warn(
          '[SabbathDetail] Failed to fetch group members for cancellation notification:',
          membersError.message
        );
      }

      const assignedUserIds = ((assignments ?? []) as any[])
        .map((assignment) => assignment.user_id as string | null)
        .filter(Boolean) as string[];

      const groupMemberIds = ((groupMembers ?? []) as any[])
        .map((member) => member.user_id as string | null)
        .filter(Boolean) as string[];

      const recipientIds = Array.from(
        new Set([
          ...assignedUserIds,
          ...groupMemberIds,
          user.id,
        ])
      ).filter(Boolean);

      const churchName = (group as any)?.name ?? 'your church';
      const readableDate = formatSabbathDate(currentSabbath.sabbath_date, i18n.language);
      const reasonText = cancellationReason?.trim()
        ? ` Reason: ${cancellationReason.trim()}`
        : '';

      const notificationRows = recipientIds.map((recipientId) => ({
        type: 'sabbath',
        title: 'Sabbath Cancelled',
        body: `The Sabbath service for ${churchName} on ${readableDate} has been cancelled.${reasonText}`,
        user_id: recipientId,
        sabbath_id: sid,
      }));

      if (notificationRows.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationRows);

        if (notificationError) {
          console.warn(
            '[SabbathDetail] Failed to create Sabbath cancellation notifications:',
            notificationError.message
          );
        }
      }
    } catch (notificationError) {
      console.warn('[SabbathDetail] Cancellation notification creation failed:', notificationError);
    }
  },
  onSuccess: () => {
    invalidateAll();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
});

  const revertMutation = useMutation({
    mutationFn: async ({ sabbathId: sid }: { sabbathId: string }) => {
      if (!user?.id) throw new Error(t('sabbath.notAuthenticated'));
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
  mutationFn: async ({
    sabbathId: sid,
    role,
    userId,
  }: {
    sabbathId: string;
    role: SabbathRole;
    userId: string;
  }) => {
    const { data: sabbathRow, error: sabbathError } = await supabase
      .from('sabbaths')
      .select('id, group_id, sabbath_date')
      .eq('id', sid)
      .single();

    if (sabbathError || !sabbathRow) {
      throw new Error(sabbathError?.message ?? t('sabbathDetail.errors.notFound'));
    }

    const currentSabbath = sabbathRow as {
      id: string;
      group_id: string;
      sabbath_date: string;
    };

    const { data: existingAssignment } = await supabase
      .from('sabbath_assignments')
      .select('user_id')
      .eq('sabbath_id', sid)
      .eq('role', role)
      .maybeSingle();

    const previousUserId = (existingAssignment as any)?.user_id as string | null | undefined;

    const { data: groupRow } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', currentSabbath.group_id)
      .maybeSingle();

    const { error } = await supabase.rpc('assign_sabbath_role', {
      target_sabbath_id: sid,
      target_role: role,
      target_user_id: userId,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (previousUserId === userId) {
      return;
    }

    const churchName = (groupRow as any)?.name ?? 'a church';
    const readableDate = formatSabbathDate(currentSabbath.sabbath_date, i18n.language);
    const roleName = ROLE_LABELS[role] ?? role;

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'sabbath',
        title: 'New Sabbath Assignment',
        body: `You have been assigned as ${roleName} for ${churchName} on ${readableDate}.`,
        user_id: userId,
        sabbath_id: sid,
      });

    if (notificationError) {
      console.warn(
        '[SabbathDetail] Failed to create assignment notification:',
        notificationError.message
      );
    }
  },
  onSuccess: () => {
    invalidateAll();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
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
  mutationFn: async ({
    assignmentId,
    reason,
  }: {
    assignmentId: string;
    reason: string | null;
  }) => {
    if (!user?.id) throw new Error(t('sabbath.notAuthenticated'));

    const { data, error } = await supabase.rpc(
      'decline_sabbath_assignment_with_notifications',
      {
        target_assignment_id: assignmentId,
        target_reason: reason,
      }
    );

    if (error) {
      console.error('[SabbathDetail] Decline assignment RPC failed:', error);
      throw new Error(error.message);
    }

    console.log('[SabbathDetail] Decline assignment RPC success:', data);

    return data;
  },
  onSuccess: () => {
    invalidateAll();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
  onError: (error: Error) => {
    console.error('[SabbathDetail] Decline assignment failed:', error);
    Alert.alert(t('sabbath.errorTitle'), error.message || t('sabbathDetail.failedToDeclineAssignment'));
  },
});

  const attendanceMutation = useMutation({
    mutationFn: async ({ sabbathId: sid, status }: { sabbathId: string; status: SabbathAttendanceStatus }) => {
      if (!user?.id) throw new Error(t('sabbath.notAuthenticated'));
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
  mutationFn: async ({
    assignmentId,
    suggestedUserId,
  }: {
    assignmentId: string;
    suggestedUserId: string;
  }) => {
    if (!user?.id) throw new Error(t('sabbath.notAuthenticated'));

    const { data: assignmentRow, error: assignmentFetchError } = await supabase
      .from('sabbath_assignments')
      .select('id, sabbath_id, role, user_id')
      .eq('id', assignmentId)
      .single();

    if (assignmentFetchError || !assignmentRow) {
      throw new Error(assignmentFetchError?.message ?? t('sabbathDetail.errors.assignmentNotFound'));
    }

    const assignment = assignmentRow as {
      id: string;
      sabbath_id: string;
      role: SabbathRole;
      user_id: string | null;
    };

    const { error } = await supabase
      .from('sabbath_assignments')
      .update({
        status: 'replacement_suggested',
        suggested_user_id: suggestedUserId,
      })
      .eq('id', assignmentId);

    if (error) throw new Error(error.message);

    try {
      const { data: sabbathRow } = await supabase
        .from('sabbaths')
        .select('id, group_id, sabbath_date, created_by, published_by')
        .eq('id', assignment.sabbath_id)
        .maybeSingle();

      if (!sabbathRow) return;

      const currentSabbath = sabbathRow as {
        id: string;
        group_id: string;
        sabbath_date: string;
        created_by: string | null;
        published_by: string | null;
      };

      const { data: group } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', currentSabbath.group_id)
        .maybeSingle();

      const { data: pastors, error: pastorsError } = await supabase
        .from('group_pastors')
        .select('user_id')
        .eq('group_id', currentSabbath.group_id);

      if (pastorsError) {
        console.warn(
          '[SabbathDetail] Failed to fetch pastors for replacement notification:',
          pastorsError.message
        );
      }

      const { data: leaders, error: leadersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('home_group_id', currentSabbath.group_id)
        .in('role', ['church_leader', 'admin']);

      if (leadersError) {
        console.warn(
          '[SabbathDetail] Failed to fetch leaders for replacement notification:',
          leadersError.message
        );
      }

      const recipientIds = Array.from(
        new Set([
          currentSabbath.created_by,
          currentSabbath.published_by,
          ...((pastors ?? []).map((pastor: any) => pastor.user_id as string | null)),
          ...((leaders ?? []).map((leader: any) => leader.id as string | null)),
        ])
      )
        .filter(Boolean)
        .filter((id) => id !== user.id) as string[];

      if (recipientIds.length === 0) return;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('id', [user.id, suggestedUserId]);

      const profileMap = new Map<string, string>();

      (profiles ?? []).forEach((profile: any) => {
        profileMap.set(
          profile.id,
          profile.display_name || profile.full_name || t('common.unknown')
        );
      });

      const requesterName =
        profileMap.get(user.id) ||
        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
        'A member';

      const suggestedName = profileMap.get(suggestedUserId) || 'another member';
      const churchName = (group as any)?.name ?? 'your church';
      const readableDate = formatSabbathDate(currentSabbath.sabbath_date, i18n.language);

      const notificationRows = recipientIds.map((recipientId) => ({
        type: 'sabbath',
        title: 'Replacement Suggested',
        body: `${requesterName} suggested ${suggestedName} as replacement for the ${ROLE_LABELS[assignment.role]} assignment at ${churchName} on ${readableDate}.`,
        user_id: recipientId,
        sabbath_id: assignment.sabbath_id,
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationRows);

      if (notificationError) {
        console.warn(
          '[SabbathDetail] Failed to create replacement suggested notifications:',
          notificationError.message
        );
      }
    } catch (notificationError) {
      console.warn('[SabbathDetail] Replacement notification creation failed:', notificationError);
    }
  },
  onSuccess: () => {
    invalidateAll();
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
});

  const isStatusUpdating = publishMutation.isPending || cancelMutation.isPending || revertMutation.isPending;

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRole, setAssigningRole] = useState<SabbathRole | null>(null);
  const [expandedAssignableChurchIds, setExpandedAssignableChurchIds] = useState<Set<string>>(new Set());
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [decliningAssignment, setDecliningAssignment] = useState<SabbathAssignment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestingAssignment, setSuggestingAssignment] = useState<SabbathAssignment | null>(null);

  const groupedMembers = useMemo(() => groupedMembersQuery.data ?? [], [groupedMembersQuery.data]);
  const targetChurchSections = useMemo(
  () => groupedMembers.filter((section) => section.isTargetChurch),
  [groupedMembers]
);

const otherCountrySections = useMemo(
  () => groupedMembers.filter((section) => !section.isTargetChurch),
  [groupedMembers]
);

const assignableCountryName =
  otherCountrySections[0]?.countryName ??
  targetChurchSections[0]?.countryName ??
  t('sabbathDetail.sameCountry');

const getRoleLabel = useCallback((role: SabbathRole) => {
  return t(`sabbath.roles.${role}`, { defaultValue: ROLE_LABELS[role] ?? role });
}, [t]);

const getAssignmentStatusLabel = useCallback((status: SabbathAssignmentStatus) => {
  return t(`sabbath.assignmentStatus.${status}`, { defaultValue: ASSIGNMENT_STATUS_LABELS[status] ?? status });
}, [t]);

const getAssignableRoleLabel = useCallback((role: string | null | undefined) => {
  if (!role) return '';
  return t(`sabbathDetail.assignableRoles.${role}`, { defaultValue: formatAssignableRole(role) });
}, [t]);

const toggleAssignableChurch = useCallback((groupId: string) => {
  setExpandedAssignableChurchIds((prev) => {
    const next = new Set(prev);

    if (next.has(groupId)) {
      next.delete(groupId);
    } else {
      next.add(groupId);
    }

    return next;
  });
}, []);

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

const myAssignments = useMemo(
  () => assignments.filter((a) => a.user_id === user?.id),
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
      t('sabbathDetail.publishTitle'),
      t('sabbathDetail.publishMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sabbathDetail.publish'),
          onPress: () => {
            publishMutation.mutate(
              { sabbathId: sabbath.id },
              {
                onSuccess: () => {
                  console.log('[SabbathDetail] Published:', sabbath.id);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
                onError: (err) => Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbathDetail.failedToPublish')),
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
      t('sabbathDetail.deleteTitle'),
      t('sabbathDetail.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sabbathDetail.delete'),
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
                  Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbathDetail.failedToDelete'));
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
      t('sabbathDetail.revertTitle'),
      t('sabbathDetail.revertMessage'),
      [
        { text: t('sabbathDetail.no'), style: 'cancel' },
        {
          text: t('sabbathDetail.revert'),
          style: 'destructive',
          onPress: () => {
            revertMutation.mutate(
              { sabbathId: sabbath.id },
              {
                onSuccess: () => {
                  console.log('[SabbathDetail] Reverted to draft:', sabbath.id);
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
                onError: (err) => Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbathDetail.failedToRevert')),
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
          onError: (err) => {
  console.error('[SabbathDetail] Assign role error:', err);
  Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbathDetail.failedToAssign'));
},
        }
      );
    },
    [sabbath, assigningRole, assignRoleMutation]
  );

const handleAcceptAssignment = useCallback(
  (assignment: SabbathAssignment) => {
    acceptMutation.mutate(
      { assignmentId: assignment.id },
      {
        onSuccess: () => {
          console.log('[SabbathDetail] Accepted assignment:', assignment.id);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: (err) => Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbathDetail.failedToAcceptAssignment')),
      }
    );
  },
  [acceptMutation]
);

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
        onError: (err) => Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbathDetail.failedToDecline')),
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
            Alert.alert(t('sabbath.suggestReplacement'), t('sabbathDetail.replacementSuggestedAlertMessage'));
          },
          onError: (err) => Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbath.failedToSuggestReplacement')),
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
          onError: (err) => Alert.alert(t('sabbath.errorTitle'), err.message || t('sabbathDetail.failedToUpdateAttendance')),
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
              <Text style={styles.loadingText}>{t('sabbathDetail.loading')}</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[sabbath.status];
  const myAssignmentsCanRespond = myAssignments.filter(
      (assignment) =>
        canRespondAssignment &&
        assignment.status !== 'declined' &&
        assignment.status !== 'replacement_suggested'
    );
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
              {formatSabbathDate(sabbath.sabbath_date, i18n.language)}
            </Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.headerMeta}>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.accent }]} />
            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>
              {t(`sabbath.status.${sabbath.status}`, { defaultValue: STATUS_LABELS[sabbath.status] })}
            </Text>
          </View>
          <Text style={styles.churchName}>{detail?.group?.name || t('sabbathDetail.loading')}</Text>
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
            <Text style={styles.cancelledBannerText}>{t('sabbath.cancelled')}</Text>
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
                  <Text style={styles.sectionTitle}>{t('sabbath.sections.yourAttendance')}</Text>
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
                      {t('sabbath.attendance.attending')}
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
                      {t('sabbath.attendance.notAttending')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {shouldShowAttendees && (
                  <Text style={styles.attendanceSummary}>
                    {t('sabbathDetail.attendanceSummary', { count: attendingCount })}
                  </Text>
                )}
              </View>
            )}

{myAssignmentsCanRespond.length > 0 && upcoming && (
  <>
    {myAssignmentsCanRespond.map((assignment) => (
      <View key={assignment.id} style={styles.myAssignmentBanner}>
        <View style={styles.bannerHeader}>
          <ClipboardList size={18} color="#1e3a8a" />
          <Text style={styles.bannerTitle}>{t('sabbathDetail.assignedAs')}</Text>
        </View>

        <Text style={styles.bannerRole}>{getRoleLabel(assignment.role)}</Text>

        {assignment.status === 'accepted' && (
          <View style={styles.acceptedBadgeRow}>
            <Check size={14} color="#065f46" />
            <Text style={styles.acceptedBadgeText}>{t('sabbathDetail.acceptedAssignment')}</Text>
          </View>
        )}

        <View style={styles.bannerActions}>
          {(assignment.status === 'pending' || assignment.status === 'accepted') && (
            <TouchableOpacity
              style={[
                styles.acceptBtn,
                assignment.status === 'accepted' && styles.acceptBtnAlreadyAccepted,
              ]}
              onPress={() => handleAcceptAssignment(assignment)}
              disabled={acceptMutation.isPending || assignment.status === 'accepted'}
              testID={`accept-assignment-button-${assignment.id}`}
            >
              {acceptMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Check
                    size={16}
                    color={assignment.status === 'accepted' ? '#065f46' : '#fff'}
                  />
                  <Text
                    style={[
                      styles.acceptBtnText,
                      assignment.status === 'accepted' && styles.acceptBtnTextAccepted,
                    ]}
                  >
                    {assignment.status === 'accepted' ? t('sabbath.assignmentStatus.accepted') : t('sabbath.assignmentActions.accept')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => {
              setDecliningAssignment(assignment);
              setShowDeclineModal(true);
            }}
            disabled={declineMutation.isPending}
            testID={`decline-assignment-button-${assignment.id}`}
          >
            <X size={16} color="#ef4444" />
            <Text style={styles.declineBtnText}>{t('sabbath.assignmentActions.decline')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.suggestBtn}
            onPress={() => {
              setSuggestingAssignment(assignment);
              setShowSuggestModal(true);
            }}
            disabled={suggestReplacementMutation.isPending}
            testID={`suggest-replacement-button-${assignment.id}`}
          >
            <RefreshCw size={16} color="#3730a3" />
            <Text style={styles.suggestBtnText}>{t('sabbath.assignmentActions.suggestReplacement')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    ))}
  </>
)}

            {shouldShowAssignments && !(isCancelledForNormalMember) && (
              <View style={styles.assignmentsSection}>
                <View style={styles.sectionHeader}>
                  <ClipboardList size={18} color="#0f172a" />
                  <Text style={styles.sectionTitle}>{t('sabbathDetail.assignments')}</Text>
                </View>
                {ALL_ROLES.map((role) => {
                  const assignment = assignmentMap.get(role);
                  const aStatusStyle = assignment ? ASSIGNMENT_COLORS[assignment.status] : null;
                  return (
                    <View key={role} style={styles.roleCard}>
                      <View style={styles.roleHeader}>
                        <Text style={styles.roleLabel}>{getRoleLabel(role)}</Text>
                        {assignment && aStatusStyle && (
                          <View style={[styles.assignmentStatusBadge, { backgroundColor: aStatusStyle.bg }]}>
                            <Text style={[styles.assignmentStatusText, { color: aStatusStyle.text }]}>
                              {getAssignmentStatusLabel(assignment.status)}
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
                        <Text style={styles.unassignedText}>{t('sabbath.unassigned')}</Text>
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
                            {t('sabbathDetail.suggestedUser', { name: assignment.suggested_user_name })}
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
                            {assignment?.user_id ? t('sabbathDetail.reassign') : t('sabbathDetail.assign')}
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
                  <Text style={styles.sectionTitle}>{t('sabbathDetail.notes')}</Text>
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
                  <Text style={[styles.sectionTitle, { color: '#991b1b' }]}>{t('sabbathDetail.cancellationReason')}</Text>
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
                    {t('sabbathDetail.attendanceListTitle', { attending: attendingCount, total: attendance.length })}
                  </Text>
                </View>
                {attendance.map((a) => (
                  <View key={a.id} style={styles.attendeeRow}>
                    <View style={styles.attendeeAvatar}>
                      <Text style={styles.attendeeAvatarText}>
                        {(a.user_name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.attendeeName}>{a.user_name || t('common.unknown')}</Text>
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
                <Text style={styles.manageSectionTitle}>{t('sabbathDetail.manage')}</Text>
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
                          <Text style={styles.publishBtnText}>{t('sabbathDetail.publishToMembers')}</Text>
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
                      <Text style={styles.revertBtnText}>{t('sabbathDetail.revertToDraft')}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.cancelSabbathBtn}
                    onPress={handleCancel}
                    disabled={isStatusUpdating}
                  >
                    <Ban size={16} color="#ef4444" />
                    <Text style={styles.cancelSabbathBtnText}>{t('sabbathDetail.cancelSabbath')}</Text>
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
                      <Text style={styles.deleteBtnText}>{t('sabbathDetail.deletePermanently')}</Text>
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
              {t('sabbathDetail.assignRoleTitle', { role: assigningRole ? getRoleLabel(assigningRole) : '' })}
            </Text>
<ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
  {groupedMembersQuery.isLoading ? (
    <View style={styles.emptyMembers}>
      <ActivityIndicator size="large" color="#1e3a8a" />
      <Text style={styles.emptyMembersText}>{t('sabbathDetail.loadingMembers')}</Text>
    </View>
  ) : groupedMembers.length === 0 ? (
    <View style={styles.emptyMembers}>
      <Users size={32} color="#cbd5e1" />
      <Text style={styles.emptyMembersText}>{t('sabbathDetail.noAssignableMembers')}</Text>
    </View>
  ) : (
    <>
      {targetChurchSections.map((section) => (
        <View key={section.groupId}>
          <View style={styles.groupSectionHeader}>
            <View style={[styles.groupSectionDot, styles.groupSectionDotPrimary]} />
            <Text style={[styles.groupSectionTitle, styles.groupSectionTitlePrimary]}>
              {section.groupName}
            </Text>
            <View style={styles.yourChurchBadge}>
              <Text style={styles.yourChurchBadgeText}>{t('sabbathDetail.selectedChurch')}</Text>
            </View>
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

              <View style={styles.memberTextBlock}>
                <Text style={styles.memberName}>{m.name}</Text>
                {!!getAssignableRoleLabel(m.role) && (
                  <Text style={styles.memberRole}>{getAssignableRoleLabel(m.role)}</Text>
                )}
              </View>

              <ChevronDown size={16} color="#94a3b8" style={{ transform: [{ rotate: '-90deg' }] }} />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {otherCountrySections.length > 0 && (
        <View style={styles.countrySection}>
          <Text style={styles.countrySectionTitle}>{assignableCountryName}</Text>

          {otherCountrySections.map((section) => {
            const isExpanded = expandedAssignableChurchIds.has(section.groupId);

            return (
              <View key={section.groupId}>
                <TouchableOpacity
                  style={styles.collapsibleGroupHeader}
                  onPress={() => toggleAssignableChurch(section.groupId)}
                >
                  <View style={styles.groupHeaderMain}>
                    <Text style={styles.collapsibleGroupTitle}>{section.groupName}</Text>
                    <Text style={styles.groupMemberCount}>
                      {t('sabbathDetail.memberCount', { count: section.members.length })}
                    </Text>
                  </View>

                  <ChevronDown
                    size={18}
                    color="#64748b"
                    style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {isExpanded &&
                  section.members.map((m) => (
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

                      <View style={styles.memberTextBlock}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        {!!getAssignableRoleLabel(m.role) && (
                          <Text style={styles.memberRole}>{getAssignableRoleLabel(m.role)}</Text>
                        )}
                      </View>

                      <ChevronDown size={16} color="#94a3b8" style={{ transform: [{ rotate: '-90deg' }] }} />
                    </TouchableOpacity>
                  ))}
              </View>
            );
          })}
        </View>
      )}
    </>
  )}
</ScrollView>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setShowAssignModal(false);
                setAssigningRole(null);
              }}
            >
              <Text style={styles.modalCloseBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeclineModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.declineModalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.declineModalTitle}>{t('sabbathDetail.declineAssignmentTitle')}</Text>
            <Text style={styles.declineModalSubtitle}>
              {t('sabbathDetail.declineAssignmentSubtitle')}
            </Text>
            <TextInput
              style={styles.declineInput}
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder={t('sabbathDetail.reasonOptionalPlaceholder')}
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
                <Text style={styles.declineModalCancelText}>{t('sabbathDetail.back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineModalConfirm}
                onPress={handleDeclineAssignment}
                disabled={declineMutation.isPending}
              >
                {declineMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.declineModalConfirmText}>{t('sabbath.assignmentActions.decline')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCancelModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.declineModalContainer, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={styles.declineModalTitle}>{t('sabbathDetail.cancelSabbath')}</Text>
            <Text style={styles.declineModalSubtitle}>
              {t('sabbathDetail.cancelSabbathSubtitle')}
            </Text>
            <TextInput
              style={styles.declineInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder={t('sabbathDetail.cancellationReasonPlaceholder')}
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
                <Text style={styles.declineModalCancelText}>{t('sabbathDetail.back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineModalConfirm, { backgroundColor: '#ef4444' }]}
                onPress={confirmCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.declineModalConfirmText}>{t('sabbathDetail.cancelSabbath')}</Text>
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
            <Text style={styles.modalTitle}>{t('sabbath.assignmentActions.suggestReplacement')}</Text>
            <Text style={styles.suggestModalSubtitle}>
              {t('sabbathDetail.suggestReplacementSubtitle', { role: suggestingAssignment ? getRoleLabel(suggestingAssignment.role) : '' })}
            </Text>
            <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
              {suggestGroupedMembers.length === 0 ? (
                <View style={styles.emptyMembers}>
                  {suggestGroupedMembersQuery.isLoading ? (
                    <ActivityIndicator size="large" color="#1e3a8a" />
                  ) : (
                    <>
                      <Users size={32} color="#cbd5e1" />
                      <Text style={styles.emptyMembersText}>{t('sabbath.noMembersFound')}</Text>
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
              <Text style={styles.modalCloseBtnText}>{t('common.cancel')}</Text>
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
  countrySection: {
  marginTop: 18,
},
countrySectionTitle: {
  fontSize: 14,
  fontWeight: '800' as const,
  color: '#0f172a',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.6,
  marginBottom: 8,
  paddingHorizontal: 4,
},
collapsibleGroupHeader: {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  backgroundColor: '#f8fafc',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 14,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: '#e2e8f0',
},
groupHeaderMain: {
  flex: 1,
},
collapsibleGroupTitle: {
  fontSize: 15,
  fontWeight: '700' as const,
  color: '#1e293b',
},
groupMemberCount: {
  fontSize: 12,
  color: '#64748b',
  marginTop: 2,
},
memberTextBlock: {
  flex: 1,
},
memberRole: {
  fontSize: 12,
  color: '#64748b',
  marginTop: 2,
},
});
