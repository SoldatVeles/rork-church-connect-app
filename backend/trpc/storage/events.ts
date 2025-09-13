import type { Event } from '@/types/event';
import { mockEvents } from '@/mocks/events';

let events: Event[] = [...mockEvents];

export const getEvents = (): Event[] => {
  return events;
};

export const getEventById = (id: string): Event | undefined => {
  return events.find(e => e.id === id);
};

export const addEvent = (event: Event): void => {
  events = [event, ...events];
};

export const updateEvent = (id: string, updates: Partial<Event>): Event | null => {
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  events[index] = { ...events[index], ...updates };
  return events[index];
};
