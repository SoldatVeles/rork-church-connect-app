import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export const getAllUsersProcedure = publicProcedure.query(async () => {
  console.log('[getAllUsersProcedure] Starting to fetch all users...');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getAllUsersProcedure] Error fetching users:', error);
    throw new Error(error.message);
  }

  console.log('[getAllUsersProcedure] Fetched profiles:', data?.length || 0, 'profiles');

  if (!data || data.length === 0) {
    console.warn('[getAllUsersProcedure] No profiles found in database');
    return [];
  }

  const mappedUsers = data.map(profile => {
    const fullName = profile.display_name || profile.full_name || profile.email;
    const nameParts = fullName.split(' ');
    
    return {
      id: profile.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: profile.email,
      role: profile.role,
      isBlocked: profile.is_blocked || false,
      createdAt: profile.created_at,
      displayName: fullName,
    };
  });

  console.log('[getAllUsersProcedure] Mapped users:', mappedUsers.length);
  return mappedUsers;
});

export default getAllUsersProcedure;
