import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  console.log('[tRPC Context] Creating context for request:', opts.req.url);
  
  // For now, we'll use a simple mock user to avoid Supabase issues
  // In production, you would implement proper authentication here
  const user = {
    id: 'mock-user-id',
    email: 'user@example.com',
    displayName: 'Mock User',
    role: 'admin' as 'admin' | 'pastor' | 'member',
    createdAt: new Date(),
  };
  
  return {
    req: opts.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  console.log('[tRPC] Protected procedure - user:', ctx.user);
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Admin procedure that requires admin role
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  console.log('[tRPC] Admin procedure - user role:', ctx.user.role);
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

// Pastor procedure that requires pastor or admin role
export const pastorProcedure = protectedProcedure.use(({ ctx, next }) => {
  console.log('[tRPC] Pastor procedure - user role:', ctx.user.role);
  if (ctx.user.role !== 'pastor' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});