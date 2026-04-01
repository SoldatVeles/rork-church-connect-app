import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { OfflineProvider } from "@/providers/offline-provider";
import { ChurchProvider } from "@/providers/church-provider";
import LoadingScreen from "@/components/LoadingScreen";
import { trpc, trpcClient } from "@/lib/trpc";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

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
      <Stack.Screen name="groups" options={{ headerShown: false }} />
      <Stack.Screen name="group-chat" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-planner" options={{ headerShown: false }} />
      <Stack.Screen name="sabbath-detail" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ChurchProvider>
            <OfflineProvider>
              <GestureHandlerRootView style={styles.container}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </OfflineProvider>
          </ChurchProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});