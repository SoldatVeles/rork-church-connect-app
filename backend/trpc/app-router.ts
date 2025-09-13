import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import createPrayerRoute from "./routes/prayers/create/route";
import listPrayersRoute from "./routes/prayers/list/route";
import prayPrayerRoute from "./routes/prayers/pray/route";
import updatePrayerStatusRoute from "./routes/prayers/update-status/route";
import { createEventProcedure } from "./routes/events/create/route";
import { listEventsProcedure } from "./routes/events/list/route";
import registerEventRoute from "./routes/events/register/route";
import unregisterEventRoute from "./routes/events/unregister/route";
import listUsersRoute from "./routes/users/list/route";
import { listNotificationsProcedure } from "./routes/notifications/list/route";
import { markNotificationReadProcedure } from "./routes/notifications/mark-read/route";
import { markAllNotificationsReadProcedure } from "./routes/notifications/mark-all-read/route";
import { updateUserRoleProcedure } from "./routes/users/update-role/route";
import { createUserProcedure } from "./routes/users/create/route";
import { createGroupProcedure } from "./routes/groups/create/route";
import { addMemberToGroupProcedure } from "./routes/groups/add-member/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  prayers: createTRPCRouter({
    create: createPrayerRoute,
    list: listPrayersRoute,
    pray: prayPrayerRoute,
    updateStatus: updatePrayerStatusRoute,
  }),
  events: createTRPCRouter({
    create: createEventProcedure,
    list: listEventsProcedure,
    register: registerEventRoute,
    unregister: unregisterEventRoute,
  }),
  users: createTRPCRouter({
    list: listUsersRoute,
    updateRole: updateUserRoleProcedure,
    create: createUserProcedure,
  }),
  groups: createTRPCRouter({
    create: createGroupProcedure,
    addMember: addMemberToGroupProcedure,
  }),
  notifications: createTRPCRouter({
    list: listNotificationsProcedure,
    markRead: markNotificationReadProcedure,
    markAllRead: markAllNotificationsReadProcedure,
  }),
});

export type AppRouter = typeof appRouter;