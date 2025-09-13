import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { addMemberToGroup } from '../../../storage/groups';

export const addMemberToGroupProcedure = publicProcedure
  .input(z.object({
    groupId: z.string(),
    userId: z.string(),
  }))
  .mutation(async ({ input }) => {
    const updated = addMemberToGroup(input.groupId, input.userId);
    if (!updated) throw new Error('Group not found');
    return updated;
  });

export default addMemberToGroupProcedure;
