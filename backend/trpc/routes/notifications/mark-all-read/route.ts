import { publicProcedure } from '../../../create-context';
import { notificationStorage } from '../../../storage/notifications';

export const markAllNotificationsReadProcedure = publicProcedure
  .mutation(async () => {
    notificationStorage.markAllAsRead();
    return { success: true };
  });