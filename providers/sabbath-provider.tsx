import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type {
  Sabbath,
  SabbathAssignment,
  SabbathAttendance,
  SabbathRole,
  SabbathStatus,
  AssignmentStatus,
  AttendanceStatus,
  GroupPastor,
} from '@/types/sabbath';

export const [SabbathProvider, useSabbath] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const pastorGroupsQuery = useQuery({
    queryKey: ['group-pastors', userId],
    queryFn: async (): Promise<GroupPastor[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('group_pastors')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.error('[Sabbath] Error fetching pastor groups:', error.message);
        return [];
      }
      return (data || []) as GroupPastor[];
    },
    enabled: !!userId,
  });

  const isPastorOfGroup = useCallback(
    (groupId: string): boolean => {
      return (pastorGroupsQuery.data || []).some((gp) => gp.group_id === groupId);
    },
    [pastorGroupsQuery.data]
  );

  const isPastorOfAnyGroup = useMemo(() => {
    return (pastorGroupsQuery.data || []).length > 0;
  }, [pastorGroupsQuery.data]);

  const sabbathsQuery = useQuery({
    queryKey: ['sabbaths'],
    queryFn: async (): Promise<Sabbath[]> => {
      const { data, error } = await supabase
        .from('sabbaths')
        .select('*')
        .order('sabbath_date', { ascending: false });
      if (error) {
        console.error('[Sabbath] Error fetching sabbaths:', error.message);
        return [];
      }
      return (data || []) as Sabbath[];
    },
    enabled: !!userId,
  });

  const fetchAssignments = useCallback(async (sabbathId: string): Promise<SabbathAssignment[]> => {
    const { data, error } = await supabase
      .from('sabbath_assignments')
      .select('*')
      .eq('sabbath_id', sabbathId);

    if (error) {
      console.error('[Sabbath] Error fetching assignments:', error.message);
      return [];
    }

    const assignments = (data || []) as SabbathAssignment[];

    const userIds = [
      ...assignments.map((a) => a.user_id).filter(Boolean),
      ...assignments.map((a) => a.suggested_user_id).filter(Boolean),
    ] as string[];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        nameMap.set(p.id, p.full_name || 'Unknown');
      });

      return assignments.map((a) => ({
        ...a,
        user_name: a.user_id ? nameMap.get(a.user_id) || 'Unknown' : undefined,
        suggested_user_name: a.suggested_user_id
          ? nameMap.get(a.suggested_user_id) || 'Unknown'
          : undefined,
      }));
    }

    return assignments;
  }, []);

  const fetchAttendance = useCallback(async (sabbathId: string): Promise<SabbathAttendance[]> => {
    const { data, error } = await supabase
      .from('sabbath_attendance')
      .select('*')
      .eq('sabbath_id', sabbathId);

    if (error) {
      console.error('[Sabbath] Error fetching attendance:', error.message);
      return [];
    }

    const attendance = (data || []) as SabbathAttendance[];
    const userIds = attendance.map((a) => a.user_id);

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        nameMap.set(p.id, p.full_name || 'Unknown');
      });

      return attendance.map((a) => ({
        ...a,
        user_name: nameMap.get(a.user_id) || 'Unknown',
      }));
    }

    return attendance;
  }, []);

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    console.log('[Sabbath] Fetching group members for group:', groupId);

    const memberMap = new Map<string, string>();

    const { data: groupMembers, error: gmError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (gmError) {
      console.error('[Sabbath] Error fetching group_members:', gmError.message);
    }

    const gmUserIds = (groupMembers || []).map((gm: any) => gm.user_id as string);

    if (gmUserIds.length > 0) {
      const { data: gmProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', gmUserIds);

      (gmProfiles || []).forEach((p: any) => {
        memberMap.set(p.id as string, (p.full_name as string) || 'Unknown');
      });
    }

    const { data: pastors, error: pastorError } = await supabase
      .from('group_pastors')
      .select('user_id')
      .eq('group_id', groupId);

    if (pastorError) {
      console.error('[Sabbath] Error fetching group pastors:', pastorError.message);
    }

    const pastorIds = (pastors || [])
      .map((p: any) => p.user_id as string)
      .filter((id) => !memberMap.has(id));

    if (pastorIds.length > 0) {
      const { data: pastorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', pastorIds);

      (pastorProfiles || []).forEach((p: any) => {
        memberMap.set(p.id as string, (p.full_name as string) || 'Unknown');
      });
    }

    if (memberMap.size === 0) {
      console.log('[Sabbath] No group_members or pastors found, falling back to all profiles');
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true })
        .limit(100);

      if (allError) {
        console.error('[Sabbath] Error fetching all profiles:', allError.message);
      }

      (allProfiles || []).forEach((p: any) => {
        memberMap.set(p.id as string, (p.full_name as string) || 'Unknown');
      });
    }

    const results = Array.from(memberMap.entries()).map(([id, name]) => ({ id, name }));
    console.log('[Sabbath] Found', results.length, 'members for group', groupId);
    return results;
  }, []);

  const createSabbathMutation = useMutation({
    mutationFn: async (params: {
      group_id: string;
      sabbath_date: string;
      notes?: string;
    }) => {
      console.log('[Sabbath] Creating sabbath:', params);
      const { data, error } = await supabase
        .from('sabbaths')
        .insert({
          group_id: params.group_id,
          sabbath_date: params.sabbath_date,
          notes: params.notes || null,
          status: 'draft' as SabbathStatus,
          created_by: userId!,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      console.log('[Sabbath] Created sabbath:', data);
      return data as Sabbath;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sabbaths'] });
    },
  });

  const updateSabbathMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      status?: SabbathStatus;
      notes?: string;
      cancellation_reason?: string;
    }) => {
      console.log('[Sabbath] Updating sabbath:', params);
      const updateData: Record<string, unknown> = { updated_by: userId };

      if (params.status !== undefined) {
        updateData.status = params.status;
        if (params.status === 'published') {
          updateData.published_by = userId;
          updateData.published_at = new Date().toISOString();
        }
        if (params.status === 'cancelled') {
          updateData.cancelled_by = userId;
          updateData.cancelled_at = new Date().toISOString();
          updateData.cancellation_reason = params.cancellation_reason || null;
        }
      }
      if (params.notes !== undefined) updateData.notes = params.notes;

      const { data, error } = await supabase
        .from('sabbaths')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Sabbath;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sabbaths'] });
    },
  });

  const upsertAssignmentMutation = useMutation({
    mutationFn: async (params: {
      sabbath_id: string;
      role: SabbathRole;
      user_id: string | null;
    }) => {
      console.log('[Sabbath] Upserting assignment:', params);
      const { data, error } = await supabase
        .from('sabbath_assignments')
        .upsert(
          {
            sabbath_id: params.sabbath_id,
            role: params.role,
            user_id: params.user_id,
            status: 'pending' as AssignmentStatus,
          },
          { onConflict: 'sabbath_id,role' }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SabbathAssignment;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sabbath-assignments', variables.sabbath_id] });
    },
  });

  const respondAssignmentMutation = useMutation({
    mutationFn: async (params: {
      assignment_id: string;
      sabbath_id: string;
      status: AssignmentStatus;
      decline_reason?: string;
      suggested_user_id?: string;
    }) => {
      console.log('[Sabbath] Responding to assignment:', params);
      const updateData: Record<string, unknown> = { status: params.status };
      if (params.decline_reason) updateData.decline_reason = params.decline_reason;
      if (params.suggested_user_id) updateData.suggested_user_id = params.suggested_user_id;

      const { data, error } = await supabase
        .from('sabbath_assignments')
        .update(updateData)
        .eq('id', params.assignment_id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SabbathAssignment;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sabbath-assignments', variables.sabbath_id] });
    },
  });

  const deleteSabbathMutation = useMutation({
    mutationFn: async (sabbathId: string) => {
      console.log('[Sabbath] Deleting sabbath:', sabbathId);
      const { error: attError } = await supabase
        .from('sabbath_attendance')
        .delete()
        .eq('sabbath_id', sabbathId);
      if (attError) console.warn('[Sabbath] Error deleting attendance:', attError.message);

      const { error: assError } = await supabase
        .from('sabbath_assignments')
        .delete()
        .eq('sabbath_id', sabbathId);
      if (assError) console.warn('[Sabbath] Error deleting assignments:', assError.message);

      const { error } = await supabase
        .from('sabbaths')
        .delete()
        .eq('id', sabbathId);
      if (error) throw new Error(error.message);
      console.log('[Sabbath] Deleted sabbath:', sabbathId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sabbaths'] });
    },
  });

  const upsertAttendanceMutation = useMutation({
    mutationFn: async (params: {
      sabbath_id: string;
      status: AttendanceStatus;
    }) => {
      console.log('[Sabbath] Upserting attendance:', params);
      const { data, error } = await supabase
        .from('sabbath_attendance')
        .upsert(
          {
            sabbath_id: params.sabbath_id,
            user_id: userId!,
            status: params.status,
          },
          { onConflict: 'sabbath_id,user_id' }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as SabbathAttendance;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sabbath-attendance', variables.sabbath_id] });
    },
  });

  return useMemo(() => ({
    sabbaths: sabbathsQuery.data || [],
    isLoading: sabbathsQuery.isLoading,
    refetchSabbaths: sabbathsQuery.refetch,

    pastorGroups: pastorGroupsQuery.data || [],
    isPastorOfGroup,
    isPastorOfAnyGroup,

    fetchAssignments,
    fetchAttendance,
    fetchGroupMembers,

    createSabbath: createSabbathMutation.mutateAsync,
    isCreatingSabbath: createSabbathMutation.isPending,
    createSabbathError: createSabbathMutation.error?.message,

    updateSabbath: updateSabbathMutation.mutateAsync,
    isUpdatingSabbath: updateSabbathMutation.isPending,

    upsertAssignment: upsertAssignmentMutation.mutateAsync,
    isUpsertingAssignment: upsertAssignmentMutation.isPending,

    respondAssignment: respondAssignmentMutation.mutateAsync,
    isRespondingAssignment: respondAssignmentMutation.isPending,

    deleteSabbath: deleteSabbathMutation.mutateAsync,
    isDeletingSabbath: deleteSabbathMutation.isPending,

    upsertAttendance: upsertAttendanceMutation.mutateAsync,
    isUpsertingAttendance: upsertAttendanceMutation.isPending,
  }), [
    sabbathsQuery.data, sabbathsQuery.isLoading, sabbathsQuery.refetch,
    pastorGroupsQuery.data, isPastorOfGroup, isPastorOfAnyGroup,
    fetchAssignments, fetchAttendance, fetchGroupMembers,
    createSabbathMutation.mutateAsync, createSabbathMutation.isPending, createSabbathMutation.error,
    updateSabbathMutation.mutateAsync, updateSabbathMutation.isPending,
    upsertAssignmentMutation.mutateAsync, upsertAssignmentMutation.isPending,
    respondAssignmentMutation.mutateAsync, respondAssignmentMutation.isPending,
    deleteSabbathMutation.mutateAsync, deleteSabbathMutation.isPending,
    upsertAttendanceMutation.mutateAsync, upsertAttendanceMutation.isPending,
  ]);
});
