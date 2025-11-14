import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "@/lib/supabase-config";

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY;

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

  const hasServiceRoleAccess = Boolean(
    supabaseServiceRoleKey && supabaseServiceRoleKey.length > 0,
  );

  const supabaseAdmin: SupabaseClient<Database> = hasServiceRoleAccess
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
export const publicProcedure = t.procedure;
