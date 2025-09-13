import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import type { Event } from '@/types/event';
import { addEvent } from '../../../storage/events';
import { TRPCError } from '@trpc/server';

const inputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
  date: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  type: z.enum(['sabbath', 'prayer_meeting', 'bible_study', 'youth', 'special', 'conference']),
  maxAttendees: z.number().int().positive().optional(),
  createdBy: z.string().min(1, 'Creator ID is required'),
});

export const createEventProcedure = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    console.log('[Events API] Creating event with input:', input);
    
    try {
      const start = new Date(input.date);
      const end = input.endDate ? new Date(input.endDate) : undefined;

      if (isNaN(start.getTime())) {
        console.error('[Events API] Invalid start date:', input.date);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid start date provided',
        });
      }

      if (end && isNaN(end.getTime())) {
        console.error('[Events API] Invalid end date:', input.endDate);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid end date provided',
        });
      }

      console.log('[Events API] Parsed dates - start:', start, 'end:', end);

      const newEvent: Event = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: input.title.trim(),
        description: input.description.trim(),
        date: start,
        endDate: end,
        location: input.location.trim(),
        type: input.type,
        maxAttendees: input.maxAttendees,
        currentAttendees: 0,
        createdBy: input.createdBy,
        isRegistrationOpen: true,
        registeredUsers: [],
      };

      console.log('[Events API] New event object:', newEvent);

      addEvent(newEvent);
      console.log('[Events API] Event added to storage successfully');
      
      return {
        success: true,
        event: newEvent,
        message: 'Event created successfully'
      };
    } catch (error) {
      console.error('[Events API] Error creating event:', error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create event. Please try again.',
      });
    }
  });

export default createEventProcedure;