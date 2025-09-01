// app/_layout.tsx
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import BackgroundService from "react-native-background-actions";
import "react-native-reanimated";
import { startFallService, stopFallService } from "../background/FallService";
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
  useEffect(() => {
    if (!hydrated || Platform.OS !== "android") return;

    (async () => {
      // stop the service if the user disabled your toggle
      if (!enabled) {
        const running = await BackgroundService.isRunning();
        if (running) await stopFallService();
        return;
      }

      // Create a channel and request permission BEFORE starting the service
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      } catch {}

      const { status } = await Notifications.requestPermissionsAsync().catch(
        () => ({ status: "denied" as const })
      );
      if (status !== "granted") {
        console.warn(
          "[fall] Notifications permission not granted; not starting service."
        );
        return; // Avoid starting a foreground service without a notif (can crash on Android 13+)
      }

      // Now it's safe to start
      const running = await BackgroundService.isRunning();
      if (!running) {
        try {
          await startFallService();
        } catch (e) {
          console.error("[fall] startFallService failed:", e);
        }
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
