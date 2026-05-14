import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { OfflineProvider } from "@/providers/offline-provider";
import { ChurchProvider } from "@/providers/church-provider";
import LoadingScreen from "@/components/LoadingScreen";
import BibleVerseSplash from "@/components/BibleVerseSplash";
import { trpc, trpcClient } from "@/lib/trpc";

void SplashScreen.preventAutoHideAsync();

/**
 * React Query defaults tuned for our serverless backend:
 * - staleTime keeps data fresh across tab switches (no refetch storm)
 * - gcTime keeps the cache around long enough to be persisted
 * - retry handles cold-start "Failed to fetch" transient errors
 * - refetchOnWindowFocus disabled to avoid surprise refetches on mobile
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "church-app-query-cache-v1",
  throttleTime: 1000,
});

/**
 * Warm up the serverless tRPC backend on app launch so the first user
 * interaction (Countries / Sabbath tabs) doesn't pay the cold-start cost.
 */
function warmupBackend(): void {
  const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!baseUrl) return;
  fetch(`${baseUrl}/api`, { method: "GET" }).catch(() => {});
}

function RootLayoutNav() {
  const { isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    console.log('Navigation check:', { isAuthenticated, inAuthGroup, segments });

    if (!isAuthenticated && !inAuthGroup) {
      console.log('Redirecting to login - user not authenticated');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('Redirecting to tabs - user is authenticated');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isLoading, router]);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      <Stack.Screen name="groups" options={{ headerShown: false }} />
      <Stack.Screen name="group-chat" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-planner" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-detail" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [showVerseSplash, setShowVerseSplash] = useState<boolean>(true);

  useEffect(() => {
    void SplashScreen.hideAsync();
    warmupBackend();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: "v1",
      }}
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <AuthProvider>
          <ChurchProvider>
            <OfflineProvider>
              <GestureHandlerRootView style={styles.container}>
                <RootLayoutNav />
                {showVerseSplash && (
                  <BibleVerseSplash onDismiss={() => setShowVerseSplash(false)} />
                )}
              </GestureHandlerRootView>
            </OfflineProvider>
          </ChurchProvider>
        </AuthProvider>
      </trpc.Provider>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});