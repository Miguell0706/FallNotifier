// app/_layout.tsx
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import "react-native-reanimated";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// ⬇️ Import your provider
import {
  AppEnabledProvider,
  useAppEnabled,
} from "../components/AppEnabledProvider";
// If you put it under components/, change the path to "../components/AppEnabledProvider"

export default function RootLayout() {
  return (
    <AppEnabledProvider>
      <AppShell />
    </AppEnabledProvider>
  );
}

// Separate shell so we can use the provider's hook
function AppShell() {
  const { hydrated } = useAppEnabled();

  // Hide splash only after AsyncStorage has loaded the toggle state
  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  // Keep splash screen visible until hydrated
  if (!hydrated) return null;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
