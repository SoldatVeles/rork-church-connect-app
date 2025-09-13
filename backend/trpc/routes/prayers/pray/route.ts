import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { togglePray } from '../../../storage/prayers';

const praySchema = z.object({
  prayerId: z.string(),
  userId: z.string(),
});

export const prayProcedure = publicProcedure
  .input(praySchema)
  .mutation(async ({ input }) => {
    console.log('Toggling pray for prayer', input.prayerId, 'by user', input.userId);
    const updated = togglePray(input.prayerId, input.userId);
    if (!updated) {
      throw new Error('Prayer not found');
    }
    return updated;
  });

export default prayProcedure;
