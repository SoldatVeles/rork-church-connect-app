import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import type { PrayerRequest } from '@/types/prayer';
import { addPrayer } from '../../../storage/prayers';

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

    addPrayer(newPrayer);
    
    return {
      success: true,
      prayer: newPrayer,
      message: 'Prayer request created successfully'
    };
  });

export default createPrayerProcedure;