import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import getAllSermonsProcedure from "./routes/sermons/get-all/route";
import createSermonProcedure from "./routes/sermons/create/route";
import updateSermonProcedure from "./routes/sermons/update/route";
import deleteSermonProcedure from "./routes/sermons/delete/route";

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
});

export type AppRouter = typeof appRouter;
