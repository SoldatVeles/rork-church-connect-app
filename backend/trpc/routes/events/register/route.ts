import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { getEventById, updateEvent } from '../../../storage/events';

const inputSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1),
});

export const registerForEventProcedure = publicProcedure
  .input(inputSchema)
  .mutation(async ({ input }) => {
    const event = getEventById(input.eventId);
    if (!event) {
      throw new Error('Event not found');
    }
    if (!event.isRegistrationOpen) {
      throw new Error('Registration is closed');
    }

    const already = event.registeredUsers.includes(input.userId);
    if (already) {
      return event;
    }

    if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
      throw new Error('Event is full');
    }

    const updatedRegisteredUsers = [...event.registeredUsers, input.userId];
    const updatedCurrentAttendees = event.currentAttendees + 1;

    const updatedEvent = updateEvent(input.eventId, {
      registeredUsers: updatedRegisteredUsers,
      currentAttendees: updatedCurrentAttendees,
    });

    return updatedEvent;
  });

export default registerForEventProcedure;
