import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export const blockUserProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      isBlocked: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: input.isBlocked })
      .eq('id', input.userId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, isBlocked: input.isBlocked };
  });

export default blockUserProcedure;
