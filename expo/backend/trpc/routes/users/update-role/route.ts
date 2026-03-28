import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export const updateUserRoleProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      role: z.enum(["admin", "church_leader", "pastor", "member", "visitor"]),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { supabaseAdmin, hasServiceRoleAccess } = ctx;

    if (!hasServiceRoleAccess) {
      console.error(
        "[updateUserRoleProcedure] Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY on the server to enable role updates.",
      );
      throw new Error(
        "Supabase service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY on the backend to update user roles.",
      );
    }

    console.log("[updateUserRoleProcedure] Updating user role:", input);

    const { error } = await (supabaseAdmin
      .from("profiles") as any)
      .update({ role: input.role })
      .eq("id", input.userId);

    if (error) {
      console.error("[updateUserRoleProcedure] Error updating role:", error);
      throw new Error(error.message);
    }

    console.log("[updateUserRoleProcedure] Role updated successfully");
    return { success: true, userId: input.userId, role: input.role };
  });

export default updateUserRoleProcedure;
