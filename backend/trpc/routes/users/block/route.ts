import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export const blockUserProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      isBlocked: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { supabaseAdmin } = ctx;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_blocked: input.isBlocked })
      .eq("id", input.userId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, isBlocked: input.isBlocked };
  });

export default blockUserProcedure;
