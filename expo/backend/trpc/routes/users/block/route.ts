import { adminProcedure } from "../../../create-context";
import { z } from "zod";

export const blockUserProcedure = adminProcedure
  .input(
    z.object({
      userId: z.string(),
      isBlocked: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { supabaseAdmin, hasServiceRoleAccess } = ctx;

    if (input.userId === ctx.user.id) {
      throw new Error("Administrators cannot block their own account.");
    }

    if (!hasServiceRoleAccess) {
      console.error(
        "[blockUserProcedure] Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY on the server to enable blocking/unblocking users.",
      );
      throw new Error(
        "Supabase service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY on the backend to block or unblock users.",
      );
    }

    const { error } = await (supabaseAdmin
      .from("profiles") as any)
      .update({ is_blocked: input.isBlocked })
      .eq("id", input.userId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, isBlocked: input.isBlocked };
  });

export default blockUserProcedure;
