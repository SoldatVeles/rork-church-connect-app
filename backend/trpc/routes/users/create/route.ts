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
    const { supabaseAdmin, supabase, hasServiceRoleAccess } = ctx;

    console.log("[createUserProcedure] Received request to create user", {
      email: input.email,
      role: input.role,
      hasServiceRoleAccess,
    });

    const displayName = `${input.firstName} ${input.lastName}`.trim();

    if (!hasServiceRoleAccess) {
      console.warn(
        "[createUserProcedure] Supabase service role key missing. Falling back to signUp flow which requires email confirmation.",
      );

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            first_name: input.firstName,
            last_name: input.lastName,
            display_name: displayName,
            phone: input.phone,
          },
        },
      });

      if (signUpError) {
        console.error("[createUserProcedure] signUp fallback failed", signUpError);
        throw new Error(signUpError.message);
      }

      if (!signUpData.user) {
        console.error("[createUserProcedure] signUp fallback returned no user");
        throw new Error("Failed to create user account. Please verify Supabase configuration.");
      }

      const { data: profileData, error: fallbackUpsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: signUpData.user.id,
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

      if (fallbackUpsertError) {
        console.error(
          "[createUserProcedure] signUp fallback upsert profile error",
          fallbackUpsertError,
        );
        throw new Error(fallbackUpsertError.message ?? "Unable to persist user profile");
      }

      console.log("[createUserProcedure] User created via signUp fallback", {
        id: profileData.id,
      });

      const fallbackNameParts = displayName.split(/\s+/);

      return {
        id: profileData.id,
        email: profileData.email,
        firstName: fallbackNameParts[0] ?? "",
        lastName: fallbackNameParts.slice(1).join(" "),
        role: profileData.role,
        isBlocked: profileData.is_blocked ?? false,
        createdAt: profileData.created_at,
        phone: profileData.phone,
        requiresEmailConfirmation: !signUpData.session,
      };
    }

    console.log("[createUserProcedure] Creating user with service role access");

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
      requiresEmailConfirmation: false,
    };
  });

export default createUserProcedure;
