import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export const updateUserRoleProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      role: z.enum(["admin", "pastor", "member", "visitor"]),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { supabaseAdmin } = ctx;

    console.log("[updateUserRoleProcedure] Updating user role:", input);

    const { error } = await supabaseAdmin
      .from("profiles")
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
