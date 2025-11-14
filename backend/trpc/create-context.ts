import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_KEY;

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials not configured");
  }

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

  const supabaseAdmin: SupabaseClient<Database> =
    supabaseServiceRoleKey && supabaseServiceRoleKey.length > 0
      ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey)
      : supabase;

  return {
    req: opts.req,
    supabase,
    supabaseAdmin,
    authHeader,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
