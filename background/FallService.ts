// background/FallService.ts
import * as Notifications from "expo-notifications";
import { NativeModules } from "react-native";
import BackgroundService from "react-native-background-actions";
import {
  FallEngineEvent,
  startFallEngine,
  stopFallEngine,
  subscribeToFallEngine,
} from "../core/fallEngine";
import { getLocationSnapshot } from "../services/getLocationSnapshot";

const { FallNotifier } = NativeModules; // still here if you use it later

const taskOptions = {
  taskName: "Fall Notifier",
  taskTitle: "Fall detection active",
  taskDesc: "Monitoring for falls",
  taskIcon: { name: "ic_launcher", type: "mipmap" },
  parameters: {},
};

let running = false;
let engineUnsub: (() => void) | null = null;

async function fallTask(taskData: any) {
  if (running) return;
  running = true;

  console.log("[FallService] fallTask started with taskData:", taskData);

  if (typeof taskData?.sensitivity !== "number") {
    console.warn("[FallService] No sensitivity provided, skipping start.");
    running = false;
    return;
  }
  const sensitivityFromUI = taskData.sensitivity;

  // 1) Start shared engine
  await startFallEngine(sensitivityFromUI);

  // 2) Subscribe to FALL events from engine
  if (engineUnsub) {
    engineUnsub();
    engineUnsub = null;
  }

  engineUnsub = subscribeToFallEngine(async (event: FallEngineEvent) => {
    if (event.type !== "fall") return;

    console.log("[FallService] FALL from engine at", event.ts);

    try {
      // 1) Grab location
      const fix = await getLocationSnapshot(5000);
      const link = fix
        ? `https://maps.google.com/?q=${fix.lat},${fix.lng}`
        : "Location unavailable";

      // 2) Local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Fall detected",
          body: fix
            ? `Location link ready: ${link}`
            : "Could not get location in time.",
          data: { link, ts: fix?.ts },
        },
        trigger: null,
      });

      console.log("[FallService] Expo notification scheduled ✅");
    } catch (e) {
      console.log("[FallService] ERROR scheduling notification", e);
    }
  });

  // keep foreground service alive
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((res) => setTimeout(res, 1000));
  }
}

export async function startFallService(sensitivity: number) {
  console.log("[FallService] startFallService called with sensitivity:", sensitivity);
  await BackgroundService.start(fallTask, {
    ...taskOptions,
    parameters: { sensitivity },
  });
}

export async function stopFallService() {
  console.log("[FallService] stopFallService");
  try {
    engineUnsub?.();
    engineUnsub = null;
    await stopFallEngine();
  } catch (e) {
    console.warn("[FallService] error stopping engine", e);
  }
  running = false;
  await BackgroundService.stop();
}
