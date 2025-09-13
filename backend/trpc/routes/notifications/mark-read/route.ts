import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { notificationStorage } from '../../../storage/notifications';

export const markNotificationReadProcedure = publicProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input }) => {
    return notificationStorage.markAsRead(input.id);
  });