// background/FallService.ts
import * as Notifications from "expo-notifications";
import { Accelerometer } from "expo-sensors";
import BackgroundService from "react-native-background-actions";
import { createFallDetector } from "../core/fallDetectorCore";

const taskOptions = {
  taskName: "Fall Notifier",
  taskTitle: "Fall detection active",
  taskDesc: "Monitoring for falls",
  taskIcon: { name: "ic_launcher", type: "mipmap" }, // optional
  parameters: {},
};

let accelSub: { remove: () => void } | null = null;

async function fallTask() {
  const detector = createFallDetector(async () => {
    // On fall: local notif (and/or hit your server for Twilio SMS)
    await Notifications.scheduleNotificationAsync({
      content: { title: "Fall detected", body: "Sending alerts..." },
      trigger: null,
    });
    // await fetch("https://your.api/fall-alert", { method: "POST" });
  }, { debug: false }); // thresholds can be passed here too

  await Accelerometer.setUpdateInterval(detector.getConfig().rateMs);
  accelSub = Accelerometer.addListener(({ x, y, z }) => {
    const g = Math.sqrt(x * x + y * y + z * z);
    detector.onSample(g);
  });

  // keep the task alive
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise(res => setTimeout(res, 1000));
  }
}

export async function startFallService() {
  await BackgroundService.start(fallTask, taskOptions);
}

export async function stopFallService() {
  try { accelSub?.remove?.(); } catch {}
  await BackgroundService.stop();
}
