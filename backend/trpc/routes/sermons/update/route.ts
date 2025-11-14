import { publicProcedure } from "../../../create-context";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const updateSermonSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  speaker: z.string().optional(),
  date: z.string().optional(),
  duration: z.string().optional(),
  description: z.string().optional(),
  topic: z.string().optional(),
  youtube_url: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
});

export const updateSermonProcedure = publicProcedure
  .input(updateSermonSchema)
  .mutation(async ({ input, ctx }) => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      throw new Error("Only admins and pastors can update sermons");
    }

    const { id, ...updateData } = input;

    const { data, error } = await supabase
      .from("sermons")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating sermon:", error);
      throw new Error(error.message);
    }

    return data;
  });

export default updateSermonProcedure;
