import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getPrayers, updatePrayer } from '../../../storage/prayers';
import { TRPCError } from '@trpc/server';
import { notificationStorage } from '../../../storage/notifications';

const updatePrayerStatusSchema = z.object({
  prayerId: z.string(),
  status: z.enum(['active', 'answered', 'archived']),
  userId: z.string(),
  userRole: z.enum(['admin', 'pastor', 'member', 'visitor']),
});

export const updatePrayerStatusProcedure = publicProcedure
  .input(updatePrayerStatusSchema)
  .mutation(async ({ input }) => {
    const { prayerId, status, userId, userRole } = input;
    
    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to update prayer status',
      });
    }
    
    const prayers = getPrayers();
    const prayer = prayers.find(p => p.id === prayerId);
    
    if (!prayer) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Prayer request not found',
      });
    }
    
    // Check permissions: only the requester or an admin can update status
    const isRequester = prayer.requestedBy === userId;
    const isAdmin = userRole === 'admin' || userRole === 'pastor';
    
    if (!isRequester && !isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You do not have permission to update this prayer request',
      });
    }
    
    // Update the prayer status
    const updatedPrayer = {
      ...prayer,
      status,
    };
    
    updatePrayer(prayerId, updatedPrayer);
    
    console.log(`Prayer ${prayerId} status updated to ${status} by user ${userId}`);
    
    // Create notification for prayer status update
    if (status === 'answered') {
      notificationStorage.create({
        title: 'Prayer Request Answered!',
        message: `${prayer.title} has been marked as answered. Praise God!`,
        type: 'prayer',
        relatedId: prayer.id,
      });
    }
    
    return updatedPrayer;
  });

export default updatePrayerStatusProcedure;