import { publicProcedure } from "../../../create-context";
import { z } from "zod";

const roles = ["admin", "pastor", "member", "visitor"] as const;

export const createUserProcedure = publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().optional(),
      role: z.enum(roles),
      permissions: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { supabaseAdmin, hasServiceRoleAccess } = ctx;

    if (!hasServiceRoleAccess) {
      console.error(
        "[createUserProcedure] Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY on the server to enable admin user creation.",
      );
      throw new Error(
        "Supabase service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY on the backend to create users.",
      );
    }

    console.log("[createUserProcedure] Creating user", {
      email: input.email,
      role: input.role,
    });

    const displayName = `${input.firstName} ${input.lastName}`.trim();

    const { data: adminCreateData, error: adminCreateError } =
      await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          first_name: input.firstName,
          last_name: input.lastName,
          display_name: displayName,
          phone: input.phone,
        },
      });

    if (adminCreateError) {
      console.error(
        "[createUserProcedure] Supabase admin create user error",
        adminCreateError
      );
      throw new Error(adminCreateError.message);
    }

    const createdUser = adminCreateData?.user;

    if (!createdUser) {
      console.error("[createUserProcedure] Supabase admin returned no user");
      throw new Error("Failed to create user account");
    }

    const { data: profileData, error: upsertError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: createdUser.id,
          email: input.email,
          full_name: displayName,
          display_name: displayName,
          phone: input.phone ?? null,
          role: input.role,
          is_blocked: false,
        },
        { onConflict: "id" }
      )
      .select(
        "id, email, full_name, display_name, role, is_blocked, created_at, phone"
      )
      .single();

    if (upsertError) {
      console.error("[createUserProcedure] Upsert profile error", upsertError);
      await supabaseAdmin.auth.admin.deleteUser(createdUser.id);
      throw new Error(upsertError.message);
    }

    console.log("[createUserProcedure] User created successfully", {
      id: profileData?.id,
    });

    const nameParts = displayName.split(/\s+/);

    return {
      id: profileData.id,
      email: profileData.email,
      firstName: nameParts[0] ?? "",
      lastName: nameParts.slice(1).join(" "),
      role: profileData.role,
      isBlocked: profileData.is_blocked ?? false,
      createdAt: profileData.created_at,
      phone: profileData.phone,
    };
  });

export default createUserProcedure;
