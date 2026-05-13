import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import type { Context } from "../../../create-context";

export default publicProcedure
  .input(z.object({
    userId: z.string(),
  }))
  .query(async ({ ctx, input }: { ctx: Context; input: { userId: string } }) => {
    const { userId } = input;
    const db = ctx.supabaseAdmin ?? ctx.supabase;

    console.log('[users.getStats] userId:', userId, 'hasServiceRole:', ctx.hasServiceRoleAccess);

    const { data: events, error: eventsError } = await db
      .from('events')
      .select('id, registered_users')
      .contains('registered_users', [userId]);

    if (eventsError) {
      console.error('[users.getStats] events error:', eventsError);
    }

    const eventsAttended = events?.length ?? 0;

    const { count: prayersCount, error: prayersError } = await db
      .from('prayers')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (prayersError) {
      console.error('[users.getStats] prayers error:', prayersError);
    }

    const { count: membersCount, error: membersError } = await db
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (membersError) {
      console.error('[users.getStats] members error:', membersError);
    }

    console.log('[users.getStats] result:', { eventsAttended, prayersShared: prayersCount, membersCount });

    return {
      eventsAttended,
      prayersShared: prayersCount ?? 0,
      membersCount: membersCount ?? 0,
    };
  });
