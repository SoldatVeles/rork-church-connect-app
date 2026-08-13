import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const roles = new Set(["admin", "church_leader", "pastor", "member", "visitor"]);

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

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Church user management function is missing Supabase configuration.");
    return response(503, { error: "service_unavailable" });
  }
  if (!authorization?.startsWith("Bearer ")) return response(401, { error: "unauthorized" });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return response(400, { error: "invalid_request" });
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return response(401, { error: "unauthorized" });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerProfile, error: callerProfileError } = await admin
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (callerProfileError || !callerProfile || callerProfile.is_blocked || callerProfile.role !== "admin") {
    return response(403, { error: "forbidden" });
  }

  const action = text(body.action, 40);
  const targetUserId = text(body.userId, 64);

  if (["delete", "set_blocked", "set_role"].includes(action) && !targetUserId) {
    return response(400, { error: "invalid_request" });
  }
  if (targetUserId && targetUserId === userData.user.id) {
    return response(400, { error: "self_management_not_allowed" });
  }

  if (action === "create") {
    const firstName = text(body.firstName, 80);
    const lastName = text(body.lastName, 80);
    const email = text(body.email, 254).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const phone = text(body.phone, 50) || null;
    const role = text(body.role, 30);

    if (!firstName || !lastName || !validEmail(email) || password.length < 8 || !roles.has(role)) {
      return response(400, { error: "invalid_request" });
    }

    const displayName = `${firstName} ${lastName}`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, display_name: displayName, phone },
    });
    if (createError || !created.user) {
      console.error("Could not create member:", createError?.message);
      return response(400, { error: "create_failed" });
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: created.user.id,
      email,
      full_name: displayName,
      display_name: displayName,
      phone,
      role,
      is_blocked: false,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      console.error("Could not create member profile:", profileError.message);
      return response(503, { error: "create_failed" });
    }
    return response(201, { success: true, userId: created.user.id });
  }

  if (action === "delete") {
    const { error } = await admin.auth.admin.deleteUser(targetUserId);
    if (error) return response(400, { error: "delete_failed" });
    return response(200, { success: true });
  }

  if (action === "set_blocked") {
    if (typeof body.isBlocked !== "boolean") return response(400, { error: "invalid_request" });
    const { error } = await admin.from("profiles").update({ is_blocked: body.isBlocked }).eq("id", targetUserId);
    if (error) return response(400, { error: "update_failed" });
    return response(200, { success: true });
  }

  if (action === "set_role") {
    const role = text(body.role, 30);
    if (!roles.has(role)) return response(400, { error: "invalid_request" });
    const { error } = await admin.from("profiles").update({ role }).eq("id", targetUserId);
    if (error) return response(400, { error: "update_failed" });
    return response(200, { success: true });
  }

  return response(400, { error: "unsupported_action" });
});
