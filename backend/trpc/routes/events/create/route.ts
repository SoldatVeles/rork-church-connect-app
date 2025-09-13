import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import type { Event } from '@/types/event';
import { addEvent } from '../../../storage/events';

const inputSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  date: z.string(),
  endDate: z.string().optional(),
  location: z.string().min(1).max(200),
  type: z.enum(['sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference']),
  maxAttendees: z.number().int().positive().optional(),
  createdBy: z.string().min(1),
});

export const createEventProcedure = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const newEvent: Event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: input.title.trim(),
      description: input.description.trim(),
      date: new Date(input.date),
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      location: input.location.trim(),
      type: input.type,
      maxAttendees: input.maxAttendees,
      currentAttendees: 0,
      createdBy: input.createdBy,
      isRegistrationOpen: true,
      registeredUsers: [],
    };

    addEvent(newEvent);
    
    return {
      success: true,
      event: newEvent,
      message: 'Event created successfully'
    };
  });

export default createEventProcedure;