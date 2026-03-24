import { publicProcedure } from "../../../create-context";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
  is_blocked: boolean | null;
  created_at: string;
  phone: string | null;
};

export const getAllUsersProcedure = publicProcedure.query(async ({ ctx }) => {
  const { supabase, supabaseAdmin, hasServiceRoleAccess } = ctx;

  console.log("[getAllUsersProcedure] Starting to fetch all users...", {
    hasServiceRoleAccess,
    timestamp: new Date().toISOString(),
  });

  const client = hasServiceRoleAccess ? supabaseAdmin : supabase;

  if (!hasServiceRoleAccess) {
    console.warn(
      "[getAllUsersProcedure] Supabase service role key unavailable. Falling back to anon client. Ensure RLS policies allow select access for admin listing.",
    );
  }

  console.log("[getAllUsersProcedure] Querying profiles table...");

  const { data: profilesData, error: profilesError } = await client
    .from("profiles")
    .select(
      "id, email, full_name, display_name, role, is_blocked, created_at, phone",
    )
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.error("[getAllUsersProcedure] Error fetching profiles:", {
      message: profilesError.message,
      details: profilesError.details,
      hint: profilesError.hint,
      code: profilesError.code,
    });
    throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
  }

  console.log("[getAllUsersProcedure] Raw profiles data received:", {
    count: profilesData?.length || 0,
    hasData: Boolean(profilesData),
    firstProfile: profilesData?.[0] || null,
  });

  if (!profilesData || profilesData.length === 0) {
    console.warn("[getAllUsersProcedure] No profiles found in database");
    return [];
  }

  const mappedUsers = (profilesData as ProfileRow[])
    .filter((profile) => Boolean(profile.email))
    .map((profile) => {
      const fullName =
        profile.display_name ||
        profile.full_name ||
        profile.email?.split("@")[0] ||
        "User";
      const nameParts = fullName.trim().split(/\s+/);

      return {
        id: profile.id,
        firstName: nameParts[0] || "User",
        lastName: nameParts.slice(1).join(" ") || "",
        email: profile.email,
        role: (profile.role as "admin" | "pastor" | "member" | "visitor") || "member",
        isBlocked: profile.is_blocked || false,
        createdAt: profile.created_at,
        displayName: fullName,
        phone: profile.phone ?? undefined,
      };
    });

  console.log(
    "[getAllUsersProcedure] Successfully mapped",
    mappedUsers.length,
    "users",
  );
  return mappedUsers;
});

export default getAllUsersProcedure;
