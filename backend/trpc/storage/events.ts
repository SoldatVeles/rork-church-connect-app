import type { Event } from '@/types/event';
import { readJsonFile, writeJsonFile, DB_FILES } from './database';

const defaultEvents: Event[] = [];

export const getEvents = (): Event[] => {
  return readJsonFile(DB_FILES.EVENTS, defaultEvents);
};

export const getEventById = (id: string): Event | undefined => {
  const events = getEvents();
  return events.find(e => e.id === id);
};

export const addEvent = (event: Event): void => {
  const events = getEvents();
  const updatedEvents = [event, ...events];
  writeJsonFile(DB_FILES.EVENTS, updatedEvents);
};

export const updateEvent = (id: string, updates: Partial<Event>): Event | null => {
  const events = getEvents();
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  const updatedEvents = [...events];
  updatedEvents[index] = { ...updatedEvents[index], ...updates };
  writeJsonFile(DB_FILES.EVENTS, updatedEvents);
  return updatedEvents[index];
};
