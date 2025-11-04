// background/FallService.ts
import * as Notifications from "expo-notifications";
import { Accelerometer } from "expo-sensors";
import { NativeModules } from "react-native";
import BackgroundService from "react-native-background-actions";
import { createFallDetector } from "../core/fallDetectorCore";
import { sensitivityToImpactG } from "../core/sensitivity";
import { getLocationSnapshot } from "../services/getLocationSnapshot"; // ⬅️ your helper
const { FallNotifier } = NativeModules; // we'll define this in Kotlin next


const taskOptions = {
  taskName: "Fall Notifier",
  taskTitle: "Fall detection active",
  taskDesc: "Monitoring for falls",
  taskIcon: { name: "ic_launcher", type: "mipmap" },
  parameters: {},
};

let accelSub: { remove: () => void } | null = null;
let running = false;

async function fallTask(taskData: any) {
  // guard against duplicate starts (hot reload etc.)
  if (running) return;
  running = true;

  const sensitivityFromUI: number =
    typeof taskData?.sensitivity === "number" ? taskData.sensitivity : 5;

  const impactG = sensitivityToImpactG(sensitivityFromUI);

  const detector = createFallDetector(async () => {
    // 1) Grab a single-shot fix (fast fallback to last-known inside helper)
    const fix = await getLocationSnapshot(5000); // 5s timeout
    const link = fix ? `https://maps.google.com/?q=${fix.lat},${fix.lng}` : "Location unavailable";

    // 2) Notify locally (so the user sees *something* even if app is backgrounded)
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

  }, { debug: false,
    thresholds: { impactG },
   });

  await Accelerometer.setUpdateInterval(detector.getConfig().rateMs);

  accelSub = Accelerometer.addListener(({ x, y, z }) => {
    const g = Math.sqrt(x * x + y * y + z * z);
    detector.onSample(g);
  });

  // keep foreground service alive
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise((res) => setTimeout(res, 1000));
  }
}

export async function startFallService(sensitivity: number) {
  await BackgroundService.start(fallTask, {
    ...taskOptions,
    parameters: { sensitivity },
  });
}

export async function stopFallService() {
  try { accelSub?.remove?.(); } catch {}
  accelSub = null;
  running = false;
  await BackgroundService.stop();
}
