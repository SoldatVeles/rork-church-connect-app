import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export const getAllUsersProcedure = publicProcedure.query(async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data.map(profile => ({
    id: profile.id,
    firstName: profile.display_name?.split(' ')[0] || '',
    lastName: profile.display_name?.split(' ').slice(1).join(' ') || '',
    email: profile.email,
    role: profile.role,
    isBlocked: profile.is_blocked || false,
    createdAt: profile.created_at,
    displayName: profile.display_name,
  }));
});

export default getAllUsersProcedure;
