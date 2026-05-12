import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const raw = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (raw && raw.length > 0) {
    // strip trailing slashes to avoid `//api/trpc`
    return raw.replace(/\/+$/, "");
  }

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL"
  );
};

const TRPC_URL = `${getBaseUrl()}/api/trpc`;
console.log("[tRPC] Base URL:", TRPC_URL);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const TRANSIENT_STATUSES = new Set<number>([408, 425, 429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

/**
 * Custom fetch that:
 *  - retries transient backend failures (cold starts, 429/503, network drops)
 *    with exponential backoff so a temporarily unavailable Rork backend does
 *    not surface as a hard "Failed to fetch" to the user.
 *  - surfaces real network/server error details with URL, status, and body.
 */
const trpcFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : (input as Request).url;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(input, init);

      if (!res.ok) {
        const cloned = res.clone();
        let bodyText = "";
        try {
          bodyText = await cloned.text();
        } catch {}
        console.error(
          "[tRPC] HTTP error",
          res.status,
          url,
          bodyText?.slice(0, 300)
        );

        if (TRANSIENT_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
          const delay = 400 * Math.pow(2, attempt);
          console.warn(
            `[tRPC] Transient ${res.status} — retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
          );
          await sleep(delay);
          continue;
        }
      }
      return res;
    } catch (err: any) {
      lastError = err;
      console.error(
        "[tRPC] Network failure for",
        url,
        "—",
        err?.message ?? err,
        `(attempt ${attempt + 1}/${MAX_RETRIES + 1})`
      );
      if (attempt < MAX_RETRIES) {
        const delay = 400 * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
    }
  }

  const errMsg = (lastError as any)?.message ?? "unknown";
  throw new Error(
    `Network request failed (${errMsg}) — backend at ${TRPC_URL} appears unreachable. Please check your connection and try again.`
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: TRPC_URL,
      transformer: superjson,
      fetch: trpcFetch,
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (token) {
          return {
            Authorization: `Bearer ${token}`,
          };
        }

        return {};
      },
    }),
  ],
});
