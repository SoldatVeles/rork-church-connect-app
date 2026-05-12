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

/**
 * Custom fetch that surfaces real network/server error details instead
 * of the generic "Failed to fetch" message. Logs URL, status, and body
 * on failure so we can diagnose backend vs network issues.
 */
const trpcFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : (input as Request).url;
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
        bodyText?.slice(0, 500)
      );
    }
    return res;
  } catch (err: any) {
    console.error(
      "[tRPC] Network failure for",
      url,
      "—",
      err?.message ?? err
    );
    throw new Error(
      `Network request failed (${err?.message ?? "unknown"}) — check EXPO_PUBLIC_RORK_API_BASE_URL and that the API is reachable at ${TRPC_URL}`
    );
  }
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
