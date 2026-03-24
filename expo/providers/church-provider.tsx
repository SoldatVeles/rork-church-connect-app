import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const CHURCH_KEY = 'selected_church_id';

export interface Church {
  id: string;
  name: string;
  address: string;
  logoUrl?: string;
  createdAt: Date;
  memberCount?: number;
}

interface ChurchState {
  currentChurch: Church | null;
  availableChurches: Church[];
  isLoading: boolean;
}

export const [ChurchProvider, useChurch] = createContextHook(() => {
  const [state, setState] = useState<ChurchState>({
    currentChurch: null,
    availableChurches: [],
    isLoading: true,
  });
  const queryClient = useQueryClient();

  const churchesQuery = useQuery({
    queryKey: ['churches'],
    queryFn: async (): Promise<Church[]> => {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('[Church] Error fetching churches:', error.message);
        return [];
      }

      return (data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        address: c.address || '',
        logoUrl: c.logo_url,
        createdAt: new Date(c.created_at),
      }));
    },
  });

  const loadSelectedChurch = useCallback(async (churches: Church[]) => {
    try {
      const savedId = await AsyncStorage.getItem(CHURCH_KEY);
      if (savedId && churches.length > 0) {
        const found = churches.find((c) => c.id === savedId);
        if (found) {
          setState((prev) => ({ ...prev, currentChurch: found }));
          return found;
        }
      }
    } catch (error) {
      console.error('[Church] Error loading selected church:', error);
    }
    return null;
  }, []);

  useEffect(() => {
    if (churchesQuery.data && churchesQuery.data.length > 0) {
      setState((prev) => ({
        ...prev,
        availableChurches: churchesQuery.data,
        isLoading: churchesQuery.isLoading,
      }));

      loadSelectedChurch(churchesQuery.data).then((saved) => {
        if (!saved && churchesQuery.data.length > 0) {
          const defaultChurch = churchesQuery.data[0];
          AsyncStorage.setItem(CHURCH_KEY, defaultChurch.id);
          setState((prev) => ({ ...prev, currentChurch: defaultChurch }));
        }
      });
    }
  }, [churchesQuery.data, churchesQuery.isLoading, loadSelectedChurch]);

  const selectChurch = useCallback(async (church: Church) => {
    try {
      await AsyncStorage.setItem(CHURCH_KEY, church.id);
      setState((prev) => ({ ...prev, currentChurch: church }));
      
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      console.log('[Church] Selected church:', church.name);
    } catch (error) {
      console.error('[Church] Error saving selected church:', error);
    }
  }, [queryClient]);

  const createChurchMutation = useMutation({
    mutationFn: async (data: { name: string; address: string; logoUrl?: string }) => {
      const { data: newChurch, error } = await supabase
        .from('churches')
        .insert({
          name: data.name,
          address: data.address,
          logo_url: data.logoUrl,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return newChurch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      const church: Church = {
        id: data.id,
        name: data.name,
        address: data.address || '',
        logoUrl: data.logo_url,
        createdAt: new Date(data.created_at),
      };
      selectChurch(church);
    },
  });

  const getChurchFilter = useCallback(() => {
    if (!state.currentChurch) return {};
    return { church_id: state.currentChurch.id };
  }, [state.currentChurch]);

  return {
    currentChurch: state.currentChurch,
    availableChurches: state.availableChurches,
    isLoading: state.isLoading || churchesQuery.isLoading,
    selectChurch,
    createChurch: createChurchMutation.mutate,
    isCreatingChurch: createChurchMutation.isPending,
    getChurchFilter,
    refetchChurches: churchesQuery.refetch,
  };
});
