// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";

import "react-native-reanimated";
import {
  AppEnabledProvider,
  useAppEnabled,
} from "../components/AppEnabledProvider";
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <AppEnabledProvider>
      <AppShell />
    </AppEnabledProvider>
  );
}

function AppShell() {
  const { enabled, hydrated } = useAppEnabled();

  // (Optional) ensure Android notifications are high-importance
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      }).catch(() => {});
    }
  }, []);

  // Start/stop Android foreground service when toggle changes
  // Start/stop Android foreground service when toggle changes

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
