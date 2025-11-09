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
let config: { impactG: number; stillnessG: number; rateMs: number } | null = null;

// 👇 NEW: flag for sandbox/test mode
let testMode = false;

/** 
 * Start fall engine.
 * @param sensitivity User sensitivity (1–10)
 * @param opts Optional { testMode?: boolean }
 */
export async function startFallEngine(sensitivity: number, opts?: { testMode?: boolean }) {
  if (running) return;
  running = true;
  testMode = !!opts?.testMode; // 👈 remember if test mode

  const impactG = sensitivityToImpactG(sensitivity);
  console.log(
    "[fallEngine] start with sensitivity =", sensitivity,
    "impactG =", impactG,
    "testMode =", testMode
  );

  detector = createFallDetector(
    async () => {
      const ts = Date.now();
      console.log("[fallEngine] FALL event at", ts);
      // 👇 Only notify if not in test mode
      if (!testMode) {
        for (const l of listeners) {
          l({ type: "fall", ts });
        }
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

    // Always broadcast raw sample (safe for UI test panels)
    for (const l of listeners) {
      l({ type: "sample", g, ts });
    }

    // Broadcast impact only to listeners (still fine for UI)
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
  testMode = false; // 👈 reset
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
