import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export const deleteUserProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', input.userId);

    if (deleteProfileError) {
      throw new Error(deleteProfileError.message);
    }

    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      input.userId
    );

    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError);
    }

    return { success: true };
  });

export default deleteUserProcedure;
