// core/fallEngine.ts
import {
  FALL_FALL,
  FALL_IMPACT,
  FALL_SAMPLE,
  fallEmitter,
  startFallService as startNativeFallService,
  stopFallService as stopNativeFallService,
} from "./FallBridge";

export type FallEngineEvent =
  | { type: "sample"; g: number; ts: number }
  | { type: "impact"; g: number; ts: number; impactG: number }
  | { type: "fall"; ts: number };

export type FallEngineListener = (event: FallEngineEvent) => void;

const listeners = new Set<FallEngineListener>();
let running = false;

// hold native emitter subscriptions so we can clean them up
let subs: { remove: () => void }[] = [];

/**
 * Start the Kotlin-backed fall engine.
 * - Tells native to start the engine with the given sensitivity
 * - Subscribes to native SAMPLE / IMPACT / FALL events
 * - Forwards them to JS listeners as FallEngineEvent objects
 */
export async function startFallEngine(sensitivity: number) {
  // if already running, restart with new sensitivity
  if (running) {
    await stopNativeFallService();
    cleanupSubs();
  }

  console.log(
    "[fallEngine] start (Kotlin-backed) with sensitivity =",
    sensitivity
  );

  running = true;

  // Start native service / engine
  await startNativeFallService(sensitivity);

  // Wire native events → FallEngineEvent for JS listeners
  cleanupSubs();

  subs.push(
    fallEmitter.addListener(FALL_SAMPLE, (e: any) => {
      const g = Number(e.g);
      const ts = typeof e.ts === "number" ? e.ts : Date.now();

      // broadcast to JS listeners
      for (const l of listeners) {
        l({ type: "sample", g, ts });
      }
    })
  );

  subs.push(
    fallEmitter.addListener(FALL_IMPACT, (e: any) => {
      const g = Number(e.g);
      const ts = typeof e.ts === "number" ? e.ts : Date.now();
      const impactG =
        typeof e.impactG === "number" ? Number(e.impactG) : g;

      for (const l of listeners) {
        l({ type: "impact", g, ts, impactG });
      }
    })
  );

  subs.push(
    fallEmitter.addListener(FALL_FALL, (e: any) => {
      const ts = typeof e.ts === "number" ? e.ts : Date.now();

      console.log("[fallEngine] FALL event (from Kotlin) at", ts);

      for (const l of listeners) {
        l({ type: "fall", ts });
      }
    })
  );
}

function cleanupSubs() {
  subs.forEach((s) => {
    try {
      s.remove();
    } catch {}
  });
  subs = [];
}

/**
 * Stop the Kotlin-backed fall engine.
 */
export async function stopFallEngine() {
  if (!running) {
    return;
  }

  console.log("[fallEngine] stop (Kotlin-backed)");

  cleanupSubs();
  running = false;

  try {
    await stopNativeFallService();
  } catch (e) {
    console.warn("[fallEngine] error stopping native fall service", e);
  }
}

/**
 * JS subscription API stays the same so background/FallService.ts
 * continues to work unchanged.
 */
export function subscribeToFallEngine(listener: FallEngineListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Optional helpers (stubs) – keep them if anything imports them.
 */
export function getFallEngineConfig() {
  // Config now lives on the Kotlin side. You can extend the bridge later
  // to return thresholds if you want. For now just return null.
  return null;
}

export function isFallEngineRunning() {
  return running;
}
