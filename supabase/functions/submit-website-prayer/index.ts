import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 5;
const MINIMUM_FORM_TIME_MS = 3000;
const MAXIMUM_FORM_TIME_MS = 24 * 60 * 60 * 1000;

type SubmissionPayload = {
  groupId?: unknown;
  locale?: unknown;
  requesterName?: unknown;
  requesterEmail?: unknown;
  title?: unknown;
  details?: unknown;
  sharingPreference?: unknown;
  privacyConsent?: unknown;
  formStartedAt?: unknown;
  company?: unknown;
};

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeOptionalText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maximumLength);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Website prayer intake is missing Supabase configuration.");
    return jsonResponse(503, { error: "service_unavailable" });
  }

  let payload: SubmissionPayload;

  try {
    payload = (await request.json()) as SubmissionPayload;
  } catch {
    return jsonResponse(400, { error: "invalid_request" });
  }

  if (typeof payload.company === "string" && payload.company.trim()) {
    return jsonResponse(202, { success: true });
  }

  const formStartedAt =
    typeof payload.formStartedAt === "string"
      ? Date.parse(payload.formStartedAt)
      : Number.NaN;
  const formAge = Date.now() - formStartedAt;

  if (
    !Number.isFinite(formStartedAt) ||
    formAge < MINIMUM_FORM_TIME_MS ||
    formAge > MAXIMUM_FORM_TIME_MS
  ) {
    return jsonResponse(400, { error: "invalid_form_timing" });
  }

  const groupId =
    typeof payload.groupId === "string" ? payload.groupId.trim() : "";
  const locale = typeof payload.locale === "string" ? payload.locale : "de";
  const requesterName = normalizeOptionalText(payload.requesterName, 120);
  const requesterEmail = normalizeOptionalText(
    payload.requesterEmail,
    254,
  )?.toLowerCase() ?? null;
  const title = normalizeOptionalText(payload.title, 120);
  const details = normalizeOptionalText(payload.details, 4000);
  const sharingPreference =
    typeof payload.sharingPreference === "string"
      ? payload.sharingPreference
      : "";

  if (
    !isUuid(groupId) ||
    locale !== "de" ||
    !title ||
    title.length < 5 ||
    !details ||
    details.length < 10 ||
    !["leaders_only", "church_anonymous", "contact_first"].includes(
      sharingPreference,
    ) ||
    payload.privacyConsent !== true
  ) {
    return jsonResponse(400, { error: "invalid_submission" });
  }

  if (requesterEmail && !isEmail(requesterEmail)) {
    return jsonResponse(400, { error: "invalid_email" });
  }

  if (sharingPreference === "contact_first" && !requesterEmail) {
    return jsonResponse(400, { error: "email_required" });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const remoteAddress =
    request.headers.get("cf-connecting-ip") ??
    forwardedFor?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const fingerprintDay = new Date().toISOString().slice(0, 10);
  const requestFingerprint = await sha256(
    `${remoteAddress}|${userAgent}|${fingerprintDay}|${serviceRoleKey}`,
  );

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: church, error: churchError } = await supabase
    .from("website_churches")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("country_code", "CH")
    .eq("is_active", true)
    .maybeSingle();

  if (churchError || !church) {
    return jsonResponse(400, { error: "invalid_church" });
  }

  const rateLimitStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MS,
  ).toISOString();
  const { count, error: countError } = await supabase
    .from("website_prayer_submissions")
    .select("id", { count: "exact", head: true })
    .eq("request_fingerprint", requestFingerprint)
    .gte("created_at", rateLimitStart);

  if (countError) {
    console.error("Could not check website prayer rate limit:", countError.code);
    return jsonResponse(503, { error: "service_unavailable" });
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX_SUBMISSIONS) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  const { error: insertError } = await supabase
    .from("website_prayer_submissions")
    .insert({
      group_id: groupId,
      locale,
      requester_name: requesterName,
      requester_email: requesterEmail,
      title,
      details,
      sharing_preference: sharingPreference,
      privacy_consent: true,
      request_fingerprint: requestFingerprint,
    });

  if (insertError) {
    console.error("Could not save website prayer submission:", insertError.code);
    return jsonResponse(503, { error: "service_unavailable" });
  }

  return jsonResponse(201, { success: true });
});
