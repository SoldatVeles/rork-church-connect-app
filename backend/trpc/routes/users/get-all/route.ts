import { publicProcedure } from "../../../create-context";

export const getAllUsersProcedure = publicProcedure.query(async ({ ctx }) => {
  const { supabase } = ctx;

  console.log("[getAllUsersProcedure] Starting to fetch all users...");

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, full_name, display_name, role, is_blocked, created_at")
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.error("[getAllUsersProcedure] Error fetching profiles:", profilesError);
    throw new Error(profilesError.message);
  }

  if (!profilesData || profilesData.length === 0) {
    console.warn("[getAllUsersProcedure] No profiles found in database");
    return [];
  }

  const mappedUsers = profilesData
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
        role: profile.role || "member",
        isBlocked: profile.is_blocked || false,
        createdAt: profile.created_at,
        displayName: fullName,
      };
    });

  console.log(
    "[getAllUsersProcedure] Successfully mapped",
    mappedUsers.length,
    "users"
  );
  return mappedUsers;
});

export default getAllUsersProcedure;
