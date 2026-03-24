import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import type { Context } from "../../../create-context";

export default publicProcedure
  .input(z.object({
    userId: z.string(),
  }))
  .query(async ({ ctx, input }: { ctx: Context; input: { userId: string } }) => {
    const { userId } = input;

    const { data: events, error: eventsError } = await ctx.supabase
      .from('events')
      .select('registered_users')
      .contains('registered_users', [userId]);

    if (eventsError) {
      console.error('Error fetching events attended:', eventsError);
    }

    const eventsAttended = events?.length ?? 0;

    const { count: prayersCount, error: prayersError } = await ctx.supabase
      .from('prayers')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (prayersError) {
      console.error('Error fetching prayers shared:', prayersError);
    }

    const { count: membersCount, error: membersError } = await ctx.supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (membersError) {
      console.error('Error fetching members count:', membersError);
    }

    return {
      eventsAttended,
      prayersShared: prayersCount ?? 0,
      membersCount: membersCount ?? 0,
    };
  });
