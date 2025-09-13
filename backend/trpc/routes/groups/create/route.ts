import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { addGroup } from '../../../storage/groups';

export const createGroupProcedure = publicProcedure
  .input(z.object({
    name: z.string().min(2),
  }))
  .mutation(async ({ input }) => {
    const group = {
      id: Date.now().toString(),
      name: input.name,
      memberIds: [],
      createdAt: new Date().toISOString(),
    };
    addGroup(group);
    return group;
  });

export default createGroupProcedure;
