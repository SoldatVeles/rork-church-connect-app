import { publicProcedure } from "@/backend/trpc/create-context";
import { supabase } from "@/lib/supabase";

export const getAllUsersProcedure = publicProcedure.query(async () => {
  console.log('[getAllUsersProcedure] Starting to fetch all users...');
  console.log('[getAllUsersProcedure] Supabase URL:', supabase.supabaseUrl);
  
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, display_name, role, is_blocked, created_at')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('[getAllUsersProcedure] Error fetching profiles:', profilesError);
    throw new Error(profilesError.message);
  }

  console.log('[getAllUsersProcedure] Raw profiles data:', JSON.stringify(profilesData, null, 2));
  console.log('[getAllUsersProcedure] Fetched profiles:', profilesData?.length || 0, 'profiles');
  
  if (!profilesData || profilesData.length === 0) {
    console.warn('[getAllUsersProcedure] No profiles found in database');
    return [];
  }

  const mappedUsers = profilesData
    .filter(profile => {
      const hasEmail = !!profile.email;
      console.log('[getAllUsersProcedure] Profile', profile.id, 'has email:', hasEmail);
      return hasEmail;
    })
    .map(profile => {
      const fullName = profile.display_name || profile.full_name || profile.email?.split('@')[0] || 'User';
      const nameParts = fullName.split(' ');
      
      const user = {
        id: profile.id,
        firstName: nameParts[0] || 'User',
        lastName: nameParts.slice(1).join(' ') || '',
        email: profile.email,
        role: profile.role || 'member',
        isBlocked: profile.is_blocked || false,
        createdAt: profile.created_at,
        displayName: fullName,
      };
      
      console.log('[getAllUsersProcedure] Mapped user:', JSON.stringify(user, null, 2));
      return user;
    });

  console.log('[getAllUsersProcedure] Successfully mapped', mappedUsers.length, 'users');
  console.log('[getAllUsersProcedure] Final users array:', JSON.stringify(mappedUsers, null, 2));
  return mappedUsers;
});

export default getAllUsersProcedure;
