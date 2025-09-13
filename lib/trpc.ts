import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envUrl) {
    console.log("[trpc] Using EXPO_PUBLIC_RORK_API_BASE_URL:", envUrl);
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    console.log("[trpc] Using window.location.origin:", origin);
    return origin;
  }

  const hostUri: string | undefined =
    (Constants as any)?.expoGoConfig?.hostUri ??
    (Constants as any)?.manifest2?.expoClient?.hostUri ??
    (Constants as any)?.manifest?.hostUri ??
    (Constants as any)?.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.replace(/^https?:\/\//, "").split(":")[0];
    const url = `https://${host}`;
    console.log("[trpc] Derived base URL from hostUri:", hostUri, "->", url);
    return url;
  }

  console.error("[trpc] No base URL could be determined. Set EXPO_PUBLIC_RORK_API_BASE_URL.");
  throw new Error("No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL");
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        console.log('[trpc] Making request to backend');
        return {
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
});