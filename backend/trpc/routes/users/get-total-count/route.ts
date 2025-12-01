import { publicProcedure } from "../../create-context";
import type { Context } from "../../create-context";

export default publicProcedure.query(async ({ ctx }: { ctx: Context }) => {
  const { count, error } = await ctx.supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching total users count:', error);
    throw new Error('Failed to fetch total users count');
  }

  return {
    totalUsers: count ?? 0,
  };
});
