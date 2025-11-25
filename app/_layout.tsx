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
import { startFallService, stopFallService } from "../core/FallBridge";
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
    if (!hydrated || Platform.OS !== "android") return;

    (async () => {
      if (!enabled) {
        stopFallService(); // Just tell Kotlin to stop
        return;
      }

      // 1) Request notification permission (so Kotlin has a channel)
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Fall Notifier",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      } catch {}

      const { status } = await Notifications.requestPermissionsAsync().catch(
        () => ({ status: "denied" as const })
      );
      if (status !== "granted") {
        console.warn("[fall] Permission not granted, not starting service.");
        return;
      }

      // 2) Just start the native detector (Kotlin handles everything)
      try {
        // IMPORTANT: you now must pass sensitivity!
        startFallService(5); // temporary default until we pass UI value
      } catch (e) {
        console.error("[fall] startFallService failed:", e);
      }
    })();
  }, [enabled, hydrated]);

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
