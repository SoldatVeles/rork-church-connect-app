import type { PrayerRequest } from '@/types/prayer';
import { readJsonFile, writeJsonFile, DB_FILES } from './database';

const defaultPrayers: PrayerRequest[] = [
  {
    id: '1',
    title: 'Healing for my mother',
    description: 'Please pray for my mother who is recovering from surgery. She needs strength and healing during this difficult time.',
    requestedBy: '3',
    requestedByName: 'Jane Member',
    isAnonymous: false,
    isUrgent: true,
    status: 'active',
    createdAt: new Date(2025, 0, 12),
    prayedBy: ['1', '2'],
  },
  {
    id: '2',
    title: 'Job opportunity',
    description: 'I have been unemployed for several months now. Please pray that God will open doors for employment.',
    requestedBy: '4',
    requestedByName: 'Anonymous',
    isAnonymous: true,
    isUrgent: false,
    status: 'active',
    createdAt: new Date(2025, 0, 10),
    prayedBy: ['1', '2', '3'],
  },
  {
    id: '3',
    title: 'Family reconciliation',
    description: 'Please pray for healing in my family relationships. We have been estranged for years.',
    requestedBy: '5',
    requestedByName: 'Mark Johnson',
    isAnonymous: false,
    isUrgent: false,
    status: 'active',
    createdAt: new Date(2025, 0, 8),
    prayedBy: ['2'],
  },
  {
    id: '4',
    title: 'Guidance in decision making',
    description: 'I am facing an important life decision about my career and future.',
    requestedBy: '6',
    requestedByName: 'Anonymous',
    isAnonymous: true,
    isUrgent: false,
    status: 'answered',
    createdAt: new Date(2025, 0, 5),
    prayedBy: ['1', '2', '3', '4'],
  },
];

export const getPrayers = (): PrayerRequest[] => {
  return readJsonFile(DB_FILES.PRAYERS, defaultPrayers);
};

export const addPrayer = (prayer: PrayerRequest): void => {
  const prayers = getPrayers();
  const updatedPrayers = [prayer, ...prayers];
  writeJsonFile(DB_FILES.PRAYERS, updatedPrayers);
};

export const updatePrayer = (id: string, updates: Partial<PrayerRequest>): PrayerRequest | null => {
  const prayers = getPrayers();
  const index = prayers.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const updatedPrayers = [...prayers];
  updatedPrayers[index] = { ...updatedPrayers[index], ...updates };
  writeJsonFile(DB_FILES.PRAYERS, updatedPrayers);
  return updatedPrayers[index];
};

export const togglePray = (id: string, userId: string): PrayerRequest | null => {
  const prayers = getPrayers();
  const index = prayers.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const updatedPrayers = [...prayers];
  const prayedBy = new Set(updatedPrayers[index].prayedBy);
  if (prayedBy.has(userId)) {
    prayedBy.delete(userId);
  } else {
    prayedBy.add(userId);
  }
  updatedPrayers[index] = { ...updatedPrayers[index], prayedBy: Array.from(prayedBy) };
  writeJsonFile(DB_FILES.PRAYERS, updatedPrayers);
  return updatedPrayers[index];
};