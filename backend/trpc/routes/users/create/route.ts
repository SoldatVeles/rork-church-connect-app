import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { addUser, getUsers } from '../../../storage/users';
import { savePasswordForEmail } from '../../../storage/passwords';
import type { User } from '@/types/user';

export const createUserProcedure = publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    role: z.enum(['admin', 'pastor', 'member', 'visitor']).default('member'),
    permissions: z.array(z.string()).default([]),
  }))
  .mutation(async ({ input }) => {
    const users = getUsers();
    if (users.some(u => u.email === input.email)) {
      throw new Error('User already exists');
    }
    const newUser: User = {
      id: Date.now().toString(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      permissions: input.permissions as any,
      phone: input.phone,
      joinedAt: new Date(),
    };
    addUser(newUser);
    savePasswordForEmail(input.email, input.password);
    return newUser;
  });

export default createUserProcedure;
