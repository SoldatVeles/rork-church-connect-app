import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase-config";

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

const resolveServiceRoleKey = () => {
  const env = typeof process !== "undefined" ? process.env : undefined;
  const candidates = [
    env?.SUPABASE_SERVICE_ROLE_KEY,
    env?.SUPABASE_SERVICE_KEY,
    env?.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    env?.EXPO_PUBLIC_SUPABASE_SERVICE_KEY,
  ];
  return candidates.find((key): key is string => Boolean(key && key.length > 0));
};

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials not configured");
  }

  const supabaseServiceRoleKey = resolveServiceRoleKey();
  console.log('[createContext] Service role key available:', Boolean(supabaseServiceRoleKey));

  const authHeader = opts.req.headers.get("authorization") ?? undefined;

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader
        ? {
            Authorization: authHeader,
          }
        : undefined,
    },
  });

  const hasServiceRoleAccess = Boolean(
    supabaseServiceRoleKey && supabaseServiceRoleKey.length > 0,
  );

  const supabaseAdmin = hasServiceRoleAccess && supabaseServiceRoleKey
    ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey)
    : supabase;

  return {
    req: opts.req,
    supabase,
    supabaseAdmin,
    authHeader,
    hasServiceRoleAccess,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;

/**
 * Every app procedure requires a verified Supabase user. This backend is not a
 * public website API; accepting anonymous calls here could expose member data
 * or privileged operations when a service-role key is configured.
 */
const requireAuthenticatedUser = t.middleware(async ({ ctx, next }) => {
  const accessToken = ctx.authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!accessToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication is required." });
  }

  const { data, error } = await ctx.supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Your session is no longer valid." });
  }

  return next({
    ctx: {
      user: data.user,
    },
  });
});

/**
 * Kept under the existing name so all legacy routes become authenticated by
 * default. Routes that need additional privileges use adminProcedure below.
 */
export const publicProcedure = t.procedure.use(requireAuthenticatedUser);

export const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const { data: profile, error } = await ctx.supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", ctx.user.id)
    .maybeSingle();

  const adminProfile = profile as { role: string; is_blocked: boolean | null } | null;

  if (error || !adminProfile || adminProfile.is_blocked || adminProfile.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  }

  return next({
    ctx: {
      adminProfile,
    },
  });
});
