import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(z.object({ name: z.string().optional() }).optional())
  .query(({ input }) => {
    console.log('[tRPC] Hi route called successfully with input:', input);
    return {
      hello: input?.name || 'World',
      date: new Date(),
      status: 'tRPC is working!'
    };
  });