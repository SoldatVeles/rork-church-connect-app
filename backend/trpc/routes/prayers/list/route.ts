import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getPrayers } from '../../../storage/prayers';

const listPrayersSchema = z.object({
  status: z.enum(['active', 'answered', 'archived', 'all']).optional().default('all'),
});

export const listPrayersProcedure = publicProcedure
  .input(listPrayersSchema)
  .query(async ({ input }) => {
    console.log('Fetching prayers with filter:', input.status);
    const allPrayers = getPrayers();
    console.log('Total prayers in storage:', allPrayers.length);
    
    if (input.status === 'all') {
      console.log('Returning all prayers:', allPrayers.length);
      return allPrayers;
    }
    
    const filtered = allPrayers.filter(prayer => prayer.status === input.status);
    console.log(`Returning ${filtered.length} prayers with status '${input.status}'`);
    return filtered;
  });

export default listPrayersProcedure;