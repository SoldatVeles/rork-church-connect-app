import { publicProcedure } from "../../../create-context";
import type { Context } from "../../../create-context";

export default publicProcedure.query(async ({ ctx }: { ctx: Context }) => {
  const db = ctx.supabaseAdmin ?? ctx.supabase;
  console.log('[users.getTotalCount] hasServiceRole:', ctx.hasServiceRoleAccess);

  const { count, error } = await db
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[users.getTotalCount] error:', error);
    return { totalUsers: 0 };
  }

  console.log('[users.getTotalCount] count:', count);

  return {
    totalUsers: count ?? 0,
  };
});
