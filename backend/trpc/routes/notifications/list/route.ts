import { publicProcedure } from '../../../create-context';
import { notificationStorage } from '../../../storage/notifications';

export const listNotificationsProcedure = publicProcedure.query(async () => {
  return notificationStorage.getAll();
});