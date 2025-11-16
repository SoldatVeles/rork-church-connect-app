import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import getAllSermonsProcedure from "./routes/sermons/get-all/route";
import createSermonProcedure from "./routes/sermons/create/route";
import updateSermonProcedure from "./routes/sermons/update/route";
import deleteSermonProcedure from "./routes/sermons/delete/route";
import getAllUsersProcedure from "./routes/users/get-all/route";
import deleteUserProcedure from "./routes/users/delete/route";
import blockUserProcedure from "./routes/users/block/route";
import updateUserRoleProcedure from "./routes/users/update-role/route";
import createUserProcedure from "./routes/users/create/route";
import getUserDiagnosticsProcedure from "./routes/users/diagnostics/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  sermons: createTRPCRouter({
    getAll: getAllSermonsProcedure,
    create: createSermonProcedure,
    update: updateSermonProcedure,
    delete: deleteSermonProcedure,
  }),
  users: createTRPCRouter({
    getAll: getAllUsersProcedure,
    create: createUserProcedure,
    delete: deleteUserProcedure,
    block: blockUserProcedure,
    updateRole: updateUserRoleProcedure,
    diagnostics: getUserDiagnosticsProcedure,
  }),
});

export type AppRouter = typeof appRouter;
