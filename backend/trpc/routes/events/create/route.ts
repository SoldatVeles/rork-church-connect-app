import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import type { Event, EventType } from '@/types/event';
import { addEvent } from '../../../storage/events';
import { TRPCError } from '@trpc/server';

const inputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
  date: z.string(),
  endDate: z.string().optional(),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  type: z.custom<EventType>((val) => {
    const validTypes: EventType[] = ['sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference'];
    return validTypes.includes(val as EventType);
  }, { message: 'Invalid event type' }),
  maxAttendees: z.number().int().positive().optional(),
  createdBy: z.string().min(1, 'Creator ID is required'),
});

const parseToDate = (val: string | undefined): Date | undefined => {
  if (!val) return undefined;
  
  try {
    const parsed = new Date(val);
    if (isNaN(parsed.getTime())) {
      console.error('Invalid date string:', val);
      return undefined;
    }
    return parsed;
  } catch (error) {
    console.error('Error parsing date:', val, error);
    return undefined;
  }
};

export const createEventProcedure = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    console.log('[Events API] Creating event with input:', input);
    
    const start = parseToDate(input.date);
    const end = parseToDate(input.endDate);

    if (!start) {
      console.error('[Events API] Invalid start date:', input.date);
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid start date provided',
      });
    }

    console.log('[Events API] Parsed dates - start:', start, 'end:', end);

    const newEvent: Event = {
      id: Date.now().toString(),
      title: input.title,
      description: input.description,
      date: start,
      endDate: end,
      location: input.location,
      type: input.type as EventType,
      maxAttendees: input.maxAttendees,
      currentAttendees: 0,
      createdBy: input.createdBy,
      isRegistrationOpen: true,
      registeredUsers: [],
    };

    console.log('[Events API] New event object:', newEvent);

    try {
      addEvent(newEvent);
      console.log('[Events API] Event added to storage successfully');
      
      return newEvent;
    } catch (error) {
      console.error('[Events API] Error adding event to storage:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save event to database',
      });
    }
  });

export default createEventProcedure;