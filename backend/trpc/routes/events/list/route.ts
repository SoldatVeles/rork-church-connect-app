import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getEvents } from '../../../storage/events';
import type { EventType } from '@/types/event';

const listSchema = z.object({
  type: z.custom<EventType>().optional(),
});

export const listEventsProcedure = publicProcedure
  .input(listSchema)
  .query(async ({ input }) => {
    console.log('[Events API] Listing events with input:', input);
    const events = getEvents();
    console.log('[Events API] Found events:', events.length);
    if (!input?.type) return events;
    const filtered = events.filter(e => e.type === input.type);
    console.log('[Events API] Filtered events:', filtered.length);
    return filtered;
  });

export default listEventsProcedure;