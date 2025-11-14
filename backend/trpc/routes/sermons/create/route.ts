import { publicProcedure } from "../../../create-context";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const createSermonSchema = z.object({
  title: z.string(),
  speaker: z.string(),
  date: z.string(),
  duration: z.string(),
  description: z.string(),
  topic: z.string(),
  youtube_url: z.string().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  is_featured: z.boolean().optional().default(false),
});

export const createSermonProcedure = publicProcedure
  .input(createSermonSchema)
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
      throw new Error("Only admins and pastors can create sermons");
    }

    const { data, error } = await supabase
      .from("sermons")
      .insert({
        ...input,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating sermon:", error);
      throw new Error(error.message);
    }

    return data;
  });

export default createSermonProcedure;
