import { publicProcedure } from "../../../create-context";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase-config";

const deleteSermonSchema = z.object({
  id: z.string(),
});

export const deleteSermonProcedure = publicProcedure
  .input(deleteSermonSchema)
  .mutation(async ({ input, ctx }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const authHeader = ctx.req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Not authenticated");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Not authenticated");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (profile.role !== "admin" && profile.role !== "pastor") {
      throw new Error("Only admins and pastors can delete sermons");
    }

    const { error } = await supabase
      .from("sermons")
      .delete()
      .eq("id", input.id);

    if (error) {
      console.error("Error deleting sermon:", error);
      throw new Error(error.message);
    }

    return { success: true };
  });

export default deleteSermonProcedure;
