import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return response(405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Account deletion function is missing Supabase configuration.");
    return response(503, { error: "service_unavailable" });
  }

  if (!authorization?.startsWith("Bearer ")) {
    return response(401, { error: "unauthorized" });
  }

  let body: { confirmation?: unknown };
  try {
    body = (await request.json()) as { confirmation?: unknown };
  } catch {
    return response(400, { error: "invalid_request" });
  }

  if (body.confirmation !== "DELETE_ACCOUNT") {
    return response(400, { error: "confirmation_required" });
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();

  if (userError || !userData.user) {
    return response(401, { error: "unauthorized" });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Deleting auth.users cascades the profile and directly-owned account data.
  // The release migration nulls prayer attribution that must remain for the
  // congregation, so this request cannot fail because of a retained prayer.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userData.user.id);

  if (deleteError) {
    console.error("Could not delete account:", deleteError.message);
    return response(503, { error: "deletion_failed" });
  }

  return response(200, { success: true });
});
