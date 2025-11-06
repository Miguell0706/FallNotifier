// core/fallEngine.ts
import { Accelerometer } from "expo-sensors";
import { createFallDetector } from "./fallDetectorCore";
import { sensitivityToImpactG } from "./sensitivity";

export type FallEngineEvent =
  | { type: "sample"; g: number; ts: number }
  | { type: "impact"; g: number; ts: number; impactG: number }
  | { type: "fall"; ts: number };

export type FallEngineListener = (event: FallEngineEvent) => void;

let detector: ReturnType<typeof createFallDetector> | null = null;
let accelSub: { remove: () => void } | null = null;
const listeners = new Set<FallEngineListener>();

let running = false;
let config: { impactG: number; stillnessG: number; rateMs: number } | null =
  null;

export async function startFallEngine(sensitivity: number) {
  if (running) return;
  running = true;

  const impactG = sensitivityToImpactG(sensitivity);
  console.log("[fallEngine] start with sensitivity =", sensitivity, "impactG =", impactG);

  detector = createFallDetector(
    async () => {
      const ts = Date.now();
      console.log("[fallEngine] FALL event at", ts);
      for (const l of listeners) {
        l({ type: "fall", ts });
      }
    },
    { thresholds: { impactG }, debug: false }
  );

  config = detector.getConfig();

  await Accelerometer.setUpdateInterval(config.rateMs);

  accelSub = Accelerometer.addListener(({ x, y, z }) => {
    const g = Math.sqrt(x * x + y * y + z * z);
    const ts = Date.now();
    const det = detector;
    if (!det) return;

    det.onSample(g);

    // broadcast raw sample
    for (const l of listeners) {
      l({ type: "sample", g, ts });
    }

    // broadcast impact when crossing threshold
    if (config && g >= config.impactG) {
      for (const l of listeners) {
        l({ type: "impact", g, ts, impactG: config.impactG });
      }
    }
  });
}

export async function stopFallEngine() {
  console.log("[fallEngine] stop");
  try {
    accelSub?.remove?.();
  } catch {}
  accelSub = null;
  detector = null;
  config = null;
  running = false;
}

export function subscribeToFallEngine(listener: FallEngineListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFallEngineConfig() {
  return config;
}

export function isFallEngineRunning() {
  return running;
}
