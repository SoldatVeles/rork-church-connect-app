import { publicProcedure } from "../../../create-context";

interface TableCountResult {
  table: string;
  rowCount: number;
}

export const getUserDiagnosticsProcedure = publicProcedure.query(async ({ ctx }) => {
  const { supabase, supabaseAdmin, hasServiceRoleAccess } = ctx;

  const client = hasServiceRoleAccess ? supabaseAdmin : supabase;

  const tableNames = ["profiles", "groups", "events", "prayers"];

  const tableSummaries = await Promise.all(
    tableNames.map(async (table): Promise<TableCountResult> => {
      const { count, error } = await client
        .from(table)
        .select("id", { count: "exact", head: true });

      if (error) {
        console.error(`[getUserDiagnostics] Failed to inspect table ${table}`, error);
        return { table, rowCount: -1 };
      }

      return { table, rowCount: count ?? 0 };
    })
  );

  let authUserCount: number | null = null;

  if (hasServiceRoleAccess) {
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200, page: 1 });
      authUserCount = data?.users?.length ?? 0;
    } catch (error) {
      console.error("[getUserDiagnostics] Failed to list auth users", error);
      authUserCount = -1;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    hasServiceRoleAccess,
    tableSummaries,
    authUserCount,
  };
});

export default getUserDiagnosticsProcedure;
