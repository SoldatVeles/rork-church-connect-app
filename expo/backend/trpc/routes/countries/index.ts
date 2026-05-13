import { publicProcedure, createTRPCRouter } from "../../create-context";
import { z } from "zod";

type SupabaseAny = any;

function db(supabase: any): SupabaseAny {
  return supabase;
}

/** Prefer the service-role admin client when available; falls back to the
 * caller's authed client. Bypasses RLS for read/write so admin ops are fast
 * and don't fail due to policy edge cases. */
function adminDb(ctx: { supabase: any; supabaseAdmin?: any; hasServiceRoleAccess?: boolean }): SupabaseAny {
  return ctx.hasServiceRoleAccess && ctx.supabaseAdmin ? ctx.supabaseAdmin : ctx.supabase;
}

async function getAuthenticatedUser(ctx: { supabase: any; req: Request }) {
  const authHeader = ctx.req.headers.get("authorization");
  if (!authHeader) throw new Error("Not authenticated");
  const {
    data: { user },
    error,
  } = await ctx.supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !user) throw new Error("Not authenticated");
  return user;
}

async function requireAdmin(ctx: { supabase: any; supabaseAdmin?: any; hasServiceRoleAccess?: boolean; req: Request }) {
  const user = await getAuthenticatedUser(ctx);
  const { data: profile, error } = await adminDb(ctx)
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (error || !profile) throw new Error("Profile not found");
  if ((profile as any).role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

export type Country = {
  id: string;
  code: string;
  name: string;
  flag_emoji: string | null;
  is_active: boolean;
};

const listCountries = publicProcedure.query(async ({ ctx }) => {
  await getAuthenticatedUser(ctx);
  const { data, error } = await adminDb(ctx)
    .from("countries")
    .select("id, code, name, flag_emoji, is_active")
    .order("name", { ascending: true });
  if (error) {
    console.error("[countries.list] Error:", error.message);
    throw new Error(error.message);
  }
  return (data ?? []) as Country[];
});

const createCountry = publicProcedure
  .input(
    z.object({
      code: z.string().min(2).max(8),
      name: z.string().min(1),
      flagEmoji: z.string().nullable().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    await requireAdmin(ctx);
    const { data, error } = await adminDb(ctx)
      .from("countries")
      .insert({
        code: input.code.toUpperCase(),
        name: input.name,
        flag_emoji: input.flagEmoji ?? null,
        is_active: true,
      })
      .select()
      .single();
    if (error) {
      console.error("[countries.create] Error:", error.message);
      throw new Error(error.message);
    }
    console.log("[countries.create] Created:", (data as any).code);
    return data as Country;
  });

const deleteCountry = publicProcedure
  .input(z.object({ countryId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await requireAdmin(ctx);
    const { error } = await adminDb(ctx)
      .from("countries")
      .delete()
      .eq("id", input.countryId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

/**
 * Returns the set of country IDs the current user can access in the Sabbath
 * "By Country" tab: derived from their home church's country + any extras
 * an admin has explicitly assigned via user_countries.
 */
const getMyAccessibleCountries = publicProcedure.query(async ({ ctx }) => {
  const user = await getAuthenticatedUser(ctx);

  const { data: profile } = await adminDb(ctx)
    .from("profiles")
    .select("id, home_group_id")
    .eq("id", user.id)
    .single();

  const homeGroupId = (profile as any)?.home_group_id as string | null;

  const accessibleIds = new Set<string>();
  let primaryCountryId: string | null = null;

  if (homeGroupId) {
    const { data: group } = await adminDb(ctx)
      .from("groups")
      .select("id, country_id")
      .eq("id", homeGroupId)
      .maybeSingle();
    const cid = (group as any)?.country_id as string | null;
    if (cid) {
      accessibleIds.add(cid);
      primaryCountryId = cid;
    }
  }

  const { data: extras } = await adminDb(ctx)
    .from("user_countries")
    .select("country_id")
    .eq("user_id", user.id);

  (extras ?? []).forEach((r: any) => {
    if (r.country_id) accessibleIds.add(r.country_id as string);
  });

  if (accessibleIds.size === 0) {
    const { data: fallback } = await adminDb(ctx)
      .from("countries")
      .select("id")
      .eq("code", "CH")
      .maybeSingle();
    const cid = (fallback as any)?.id as string | undefined;
    if (cid) {
      accessibleIds.add(cid);
      primaryCountryId = primaryCountryId ?? cid;
    }
  }

  const ids = Array.from(accessibleIds);
  let countries: Country[] = [];
  if (ids.length > 0) {
    const { data } = await adminDb(ctx)
      .from("countries")
      .select("id, code, name, flag_emoji, is_active")
      .in("id", ids)
      .order("name", { ascending: true });
    countries = (data ?? []) as Country[];
  }

  return {
    primaryCountryId,
    countries,
  };
});

const getUserCountries = publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input, ctx }) => {
    await requireAdmin(ctx);
    const { data, error } = await adminDb(ctx)
      .from("user_countries")
      .select("id, country_id, created_at")
      .eq("user_id", input.userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; country_id: string; created_at: string }>;
  });

const addUserCountry = publicProcedure
  .input(z.object({ userId: z.string(), countryId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const admin = await requireAdmin(ctx);
    const { data, error } = await adminDb(ctx)
      .from("user_countries")
      .insert({
        user_id: input.userId,
        country_id: input.countryId,
        created_by: admin.id,
      })
      .select()
      .single();
    if (error) {
      console.error("[countries.addUserCountry] Error:", error.message);
      throw new Error(error.message);
    }
    return data as { id: string; user_id: string; country_id: string };
  });

const removeUserCountry = publicProcedure
  .input(z.object({ userId: z.string(), countryId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    await requireAdmin(ctx);
    const { error } = await adminDb(ctx)
      .from("user_countries")
      .delete()
      .eq("user_id", input.userId)
      .eq("country_id", input.countryId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

const setGroupCountry = publicProcedure
  .input(z.object({ groupId: z.string(), countryId: z.string().nullable() }))
  .mutation(async ({ input, ctx }) => {
    await requireAdmin(ctx);
    const { data, error } = await adminDb(ctx)
      .from("groups")
      .update({ country_id: input.countryId })
      .eq("id", input.groupId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

const listGroupsWithCountry = publicProcedure.query(async ({ ctx }) => {
  await requireAdmin(ctx);
  const { data, error } = await adminDb(ctx)
    .from("groups")
    .select("id, name, country_id")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; name: string; country_id: string | null }>;
});

export const countriesRouter = createTRPCRouter({
  list: listCountries,
  create: createCountry,
  delete: deleteCountry,
  getMyAccessible: getMyAccessibleCountries,
  getUserCountries,
  addUserCountry,
  removeUserCountry,
  setGroupCountry,
  listGroupsWithCountry,
});

export default countriesRouter;
