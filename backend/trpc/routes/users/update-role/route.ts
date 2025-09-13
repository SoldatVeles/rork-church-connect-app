import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { updateUserRole } from '../../../storage/users';

export const updateUserRoleProcedure = publicProcedure
  .input(z.object({
    userId: z.string(),
    role: z.enum(['admin', 'pastor', 'member', 'visitor']),
    permissions: z.array(z.string()).default([]),
  }))
  .mutation(async ({ input }) => {
    const updated = updateUserRole(input.userId, input.role, input.permissions as any);
    if (!updated) throw new Error('User not found');
    return updated;
  });

export default updateUserRoleProcedure;
