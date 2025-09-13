import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import type { PrayerRequest } from '@/types/prayer';
import { addPrayer, getPrayers } from '../../../storage/prayers';

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
    console.log('Received prayer creation request:', input);
    
    const newPrayer: PrayerRequest = {
      id: Date.now().toString(),
      title: input.title,
      description: input.description,
      requestedBy: input.requestedBy,
      requestedByName: input.isAnonymous ? 'Anonymous' : input.requestedByName,
      isAnonymous: input.isAnonymous,
      isUrgent: input.isUrgent,
      status: 'active',
      createdAt: new Date(),
      prayedBy: [],
    };

    console.log('Adding prayer to storage:', newPrayer);
    addPrayer(newPrayer);
    console.log('Prayer added successfully. Total prayers now:', getPrayers().length);
    
    return newPrayer;
  });

export default createPrayerProcedure;