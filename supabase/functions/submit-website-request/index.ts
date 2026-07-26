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

const contactTopics = [
  "visit_church",
  "bible_study",
  "prayer_request",
  "free_books",
  "general",
];

const bookTopics = [
  "bible_study_material",
  "christian_book",
  "sabbath",
  "health_family",
  "not_sure",
];

type SubmissionPayload = {
  submissionType?: unknown;
  groupId?: unknown;
  locale?: unknown;
  requesterName?: unknown;
  requesterEmail?: unknown;
  postalAddress?: unknown;
  topic?: unknown;
  message?: unknown;
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

function normalizeRequiredText(
  value: unknown,
  maximumLength: number,
): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maximumLength);
}

function normalizeOptionalText(
  value: unknown,
  maximumLength: number,
): string | null {
  const normalized = normalizeRequiredText(value, maximumLength);
  return normalized || null;
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
    console.error("Website request intake is missing Supabase configuration.");
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

  const submissionType =
    typeof payload.submissionType === "string"
      ? payload.submissionType
      : "";
  const groupId = normalizeOptionalText(payload.groupId, 36);
  const locale = typeof payload.locale === "string" ? payload.locale : "de";
  const requesterName = normalizeRequiredText(payload.requesterName, 120);
  const requesterEmail = normalizeRequiredText(
    payload.requesterEmail,
    254,
  ).toLowerCase();
  const postalAddress = normalizeOptionalText(payload.postalAddress, 500);
  const topic = normalizeRequiredText(payload.topic, 80);
  const message = normalizeOptionalText(payload.message, 4000);

  if (
    !["contact", "book_request"].includes(submissionType) ||
    locale !== "de" ||
    requesterName.length < 2 ||
    !isEmail(requesterEmail) ||
    payload.privacyConsent !== true
  ) {
    return jsonResponse(400, { error: "invalid_submission" });
  }

  if (groupId && !isUuid(groupId)) {
    return jsonResponse(400, { error: "invalid_church" });
  }

  if (
    submissionType === "contact" &&
    (!contactTopics.includes(topic) || !message || message.length < 10)
  ) {
    return jsonResponse(400, { error: "invalid_submission" });
  }

  if (
    submissionType === "book_request" &&
    (!bookTopics.includes(topic) ||
      !postalAddress ||
      postalAddress.length < 5)
  ) {
    return jsonResponse(400, { error: "invalid_submission" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (groupId) {
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

  const rateLimitStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_MS,
  ).toISOString();
  const { count, error: countError } = await supabase
    .from("website_contact_submissions")
    .select("id", { count: "exact", head: true })
    .eq("request_fingerprint", requestFingerprint)
    .gte("created_at", rateLimitStart);

  if (countError) {
    console.error("Could not check website request rate limit:", countError.code);
    return jsonResponse(503, { error: "service_unavailable" });
  }

  if ((count ?? 0) >= RATE_LIMIT_MAX_SUBMISSIONS) {
    return jsonResponse(429, { error: "rate_limited" });
  }

  const { error: insertError } = await supabase
    .from("website_contact_submissions")
    .insert({
      submission_type: submissionType,
      group_id: groupId,
      locale,
      requester_name: requesterName,
      requester_email: requesterEmail,
      postal_address: postalAddress,
      topic,
      message,
      privacy_consent: true,
      request_fingerprint: requestFingerprint,
    });

  if (insertError) {
    console.error("Could not save website request:", insertError.code);
    return jsonResponse(503, { error: "service_unavailable" });
  }

  return jsonResponse(201, { success: true });
});
