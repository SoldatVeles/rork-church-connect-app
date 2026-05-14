import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { supabase } from "@/lib/supabase";

export const trpc = createTRPCReact<AppRouter>();

const trimTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

const getBaseUrl = (): string => {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
    return trimTrailingSlash(configuredBaseUrl.trim());
  }

  const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
  if (projectId && projectId.trim().length > 0) {
    return `https://dev-${projectId.trim()}.rorktest.dev`;
  }

  console.warn("[trpc] Missing API base URL; using project fallback backend URL");
  return "https://dev-dp19rhx6u8l63wpiaeqki.rorktest.dev";
};

/**
 * Resilient fetch wrapper for tRPC calls.
 *
 * The deployed Hono backend runs on serverless infrastructure that can
 * cold-start (especially after periods of inactivity). The first request
 * after a cold start frequently fails with "TypeError: Failed to fetch"
 * before the runtime is ready. This wrapper:
 *   - applies a generous per-attempt timeout (no infinite hangs)
 *   - retries idempotent failures with exponential backoff
 *   - never retries non-network errors (4xx/5xx responses pass through)
 */
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 3;

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(input, {
        ...init,
        signal: init?.signal ?? controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;

      const isLastAttempt = attempt === MAX_RETRIES;
      const externallyAborted = init?.signal?.aborted ?? false;

      if (isLastAttempt || externallyAborted) {
        break;
      }

      const delay = 400 * Math.pow(2, attempt);
      console.warn(
        `[trpc] fetch failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms`,
        err,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Failed to fetch");
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      fetch: fetchWithRetry,
      headers: async () => {
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;

          if (token) {
            return {
              Authorization: `Bearer ${token}`,
            };
          }
        } catch (err) {
          console.warn("[trpc] Failed to load auth session", err);
        }

        return {};
      },
    }),
  ],
});
