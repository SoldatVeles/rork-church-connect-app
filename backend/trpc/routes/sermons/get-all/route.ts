import { publicProcedure } from "../../../create-context";
import { createClient } from "@supabase/supabase-js";

export const getAllSermonsProcedure = publicProcedure.query(async () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase credentials not configured");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("sermons")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching sermons:", error);
    throw new Error(error.message);
  }

  return data || [];
});

export default getAllSermonsProcedure;
