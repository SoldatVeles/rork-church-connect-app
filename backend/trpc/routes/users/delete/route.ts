import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export const deleteUserProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { supabaseAdmin, hasServiceRoleAccess } = ctx;

    if (!hasServiceRoleAccess) {
      console.error(
        "[deleteUserProcedure] Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY on the server to enable admin user deletion.",
      );
      throw new Error(
        "Supabase service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY on the backend to delete users.",
      );
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", input.userId);

    if (deleteProfileError) {
      throw new Error(deleteProfileError.message);
    }

    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      input.userId
    );

    if (deleteAuthError) {
      console.error("Failed to delete auth user:", deleteAuthError);
    }

    return { success: true };
  });

export default deleteUserProcedure;
