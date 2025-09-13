import type { PrayerRequest } from '@/types/prayer';
import { mockPrayers } from '@/mocks/prayers';

let prayers: PrayerRequest[] = [...mockPrayers];

export const getPrayers = (): PrayerRequest[] => {
  return prayers;
};

export const addPrayer = (prayer: PrayerRequest): void => {
  prayers = [prayer, ...prayers];
};

export const updatePrayer = (id: string, updates: Partial<PrayerRequest>): PrayerRequest | null => {
  const index = prayers.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  prayers[index] = { ...prayers[index], ...updates };
  return prayers[index];
};

export const togglePray = (id: string, userId: string): PrayerRequest | null => {
  const index = prayers.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const prayedBy = new Set(prayers[index].prayedBy);
  if (prayedBy.has(userId)) {
    prayedBy.delete(userId);
  } else {
    prayedBy.add(userId);
  }
  prayers[index] = { ...prayers[index], prayedBy: Array.from(prayedBy) };
  return prayers[index];
};