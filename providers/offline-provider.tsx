import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { Event } from '@/types/event';
import type { Sermon } from '@/types/sermon';

const CACHE_KEYS = {
  EVENTS: 'offline_events',
  SERMONS: 'offline_sermons',
  LAST_SYNC: 'offline_last_sync',
} as const;

interface OfflineState {
  isOnline: boolean;
  cachedEvents: Event[];
  cachedSermons: Sermon[];
  lastSyncTime: Date | null;
  isSyncing: boolean;
}

export const [OfflineProvider, useOffline] = createContextHook(() => {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    cachedEvents: [],
    cachedSermons: [],
    lastSyncTime: null,
    isSyncing: false,
  });

  useEffect(() => {
    loadCachedData();

    if (Platform.OS !== 'web') {
      const unsubscribe = NetInfo.addEventListener((netState) => {
        const online = netState.isConnected ?? true;
        console.log('[Offline] Network state changed:', online ? 'online' : 'offline');
        setState((prev) => ({ ...prev, isOnline: online }));
      });
      return () => unsubscribe();
    }
  }, []);

  const loadCachedData = async () => {
    try {
      const [eventsJson, sermonsJson, lastSyncJson] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEYS.EVENTS),
        AsyncStorage.getItem(CACHE_KEYS.SERMONS),
        AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC),
      ]);

      const cachedEvents = eventsJson ? JSON.parse(eventsJson) : [];
      const cachedSermons = sermonsJson ? JSON.parse(sermonsJson) : [];
      const lastSyncTime = lastSyncJson ? new Date(lastSyncJson) : null;

      console.log('[Offline] Loaded cached data:', {
        events: cachedEvents.length,
        sermons: cachedSermons.length,
        lastSync: lastSyncTime,
      });

      setState((prev) => ({
        ...prev,
        cachedEvents,
        cachedSermons,
        lastSyncTime,
      }));
    } catch (error) {
      console.error('[Offline] Error loading cached data:', error);
    }
  };

  const cacheEvents = useCallback(async (events: Event[]) => {
    try {
      const serializable = events.map((e) => ({
        ...e,
        date: e.date instanceof Date ? e.date.toISOString() : e.date,
        endDate: e.endDate instanceof Date ? e.endDate.toISOString() : e.endDate,
      }));
      await AsyncStorage.setItem(CACHE_KEYS.EVENTS, JSON.stringify(serializable));
      await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
      
      setState((prev) => ({
        ...prev,
        cachedEvents: events,
        lastSyncTime: new Date(),
      }));
      console.log('[Offline] Cached', events.length, 'events');
    } catch (error) {
      console.error('[Offline] Error caching events:', error);
    }
  }, []);

  const cacheSermons = useCallback(async (sermons: Sermon[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.SERMONS, JSON.stringify(sermons));
      await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
      
      setState((prev) => ({
        ...prev,
        cachedSermons: sermons,
        lastSyncTime: new Date(),
      }));
      console.log('[Offline] Cached', sermons.length, 'sermons');
    } catch (error) {
      console.error('[Offline] Error caching sermons:', error);
    }
  }, []);

  const getCachedEvents = useCallback((): Event[] => {
    return state.cachedEvents.map((e) => ({
      ...e,
      date: new Date(e.date),
      endDate: e.endDate ? new Date(e.endDate) : undefined,
    }));
  }, [state.cachedEvents]);

  const getCachedSermons = useCallback((): Sermon[] => {
    return state.cachedSermons;
  }, [state.cachedSermons]);

  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.EVENTS,
        CACHE_KEYS.SERMONS,
        CACHE_KEYS.LAST_SYNC,
      ]);
      setState((prev) => ({
        ...prev,
        cachedEvents: [],
        cachedSermons: [],
        lastSyncTime: null,
      }));
      console.log('[Offline] Cache cleared');
    } catch (error) {
      console.error('[Offline] Error clearing cache:', error);
    }
  }, []);

  const formatLastSync = useCallback((): string => {
    if (!state.lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now.getTime() - state.lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }, [state.lastSyncTime]);

  return {
    isOnline: state.isOnline,
    lastSyncTime: state.lastSyncTime,
    isSyncing: state.isSyncing,
    cacheEvents,
    cacheSermons,
    getCachedEvents,
    getCachedSermons,
    clearCache,
    formatLastSync,
  };
});
