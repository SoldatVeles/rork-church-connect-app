import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import type { PrayerRequest } from '@/types/prayer';
import { addPrayer, getPrayers } from '../../../storage/prayers';
import { TRPCError } from '@trpc/server';

const createPrayerSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  isAnonymous: z.boolean(),
  isUrgent: z.boolean(),
  requestedBy: z.string(),
  requestedByName: z.string(),
});

export const createPrayerProcedure = publicProcedure
  .input(createPrayerSchema)
  .mutation(async ({ input }) => {
    console.log('[Prayers API] Received prayer creation request:', input);
    
    try {
      const newPrayer: PrayerRequest = {
        id: `prayer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: input.title.trim(),
        description: input.description.trim(),
        requestedBy: input.requestedBy,
        requestedByName: input.isAnonymous ? 'Anonymous' : input.requestedByName,
        isAnonymous: input.isAnonymous,
        isUrgent: input.isUrgent,
        status: 'active',
        createdAt: new Date(),
        prayedBy: [],
      };

      console.log('[Prayers API] Adding prayer to storage:', newPrayer);
      addPrayer(newPrayer);
      console.log('[Prayers API] Prayer added successfully. Total prayers now:', getPrayers().length);
      
      return {
        success: true,
        prayer: newPrayer,
        message: 'Prayer request created successfully'
      };
    } catch (error) {
      console.error('[Prayers API] Error creating prayer:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create prayer request. Please try again.',
      });
    }
  });

export default createPrayerProcedure;