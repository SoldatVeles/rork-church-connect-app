import { publicProcedure } from "../../../create-context";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase-config";

export const getAllSermonsProcedure = publicProcedure.query(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
