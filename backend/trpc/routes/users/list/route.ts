import { publicProcedure } from "../../../create-context";
import { getUsers } from "../../../storage/users";

export const listUsersProcedure = publicProcedure.query(async () => {
  return getUsers();
});

export default listUsersProcedure;
