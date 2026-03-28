import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import type { GroupPastor } from '@/types/sabbath';

export const [SabbathProvider, useSabbath] = createContextHook(() => {
  const { user } = useAuth();
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

  return useMemo(() => ({
    pastorGroups: pastorGroupsQuery.data || [],
    isPastorOfGroup,
    isPastorOfAnyGroup,
  }), [
    pastorGroupsQuery.data,
    isPastorOfGroup,
    isPastorOfAnyGroup,
  ]);
});
