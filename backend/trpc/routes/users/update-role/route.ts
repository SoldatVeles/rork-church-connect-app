import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export const updateUserRoleProcedure = publicProcedure
  .input(z.object({
    userId: z.string(),
    role: z.enum(['admin', 'pastor', 'member', 'visitor']),
  }))
  .mutation(async ({ input }) => {
    console.log('[updateUserRoleProcedure] Updating user role:', input);

    const { error } = await supabase
      .from('profiles')
      .update({ role: input.role })
      .eq('id', input.userId);

    if (error) {
      console.error('[updateUserRoleProcedure] Error updating role:', error);
      throw new Error(error.message);
    }

    console.log('[updateUserRoleProcedure] Role updated successfully');
    return { success: true, userId: input.userId, role: input.role };
  });

export default updateUserRoleProcedure;
