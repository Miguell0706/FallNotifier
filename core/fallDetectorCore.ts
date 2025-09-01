// core/fallDetectorCore.ts
export type FallThresholds = {
  rateMs: number;
  impactG: number;
  stillnessG: number;
  impactGraceMs: number;
  stillnessWindowMs: number;
  stillnessMinMs: number;
  cooldownMs: number;
  maxObserveMs: number;
};

type Sample = { t: number; g: number };

const DEFAULTS: FallThresholds = {
  rateMs: 50,                 // ~20 Hz
  impactG: 8.0,               // hard impact
  stillnessG: 1.05,           // “still” on devices that idle ~1g
  impactGraceMs: 1200,        // let post-impact jiggle die down
  stillnessWindowMs: 1200,    // sliding window size
  stillnessMinMs: 700,        // consecutive ms under threshold
  cooldownMs: 10_000,         // one alert max per 10s
  maxObserveMs: 4000,         // how long after grace to look for stillness
};

export type FallDetector = {
  onSample: (g: number, now?: number) => void;
  reset: () => void;
  setThresholds: (patch: Partial<FallThresholds>) => void;
  getConfig: () => FallThresholds;
  getState: () => { state: "IDLE" | "AFTER_IMPACT"; lastTrigger: number; impactAt: number };
};

export function createFallDetector(
  onFall: () => void,
  opts?: { thresholds?: Partial<FallThresholds>; debug?: boolean }
): FallDetector {
  let cfg: FallThresholds = { ...DEFAULTS, ...(opts?.thresholds ?? {}) };
  let state: "IDLE" | "AFTER_IMPACT" = "IDLE";
  let impactAt = 0;
  let lastTrigger = 0;
  let buf: Sample[] = [];

  const log = (...a: any[]) => opts?.debug && console.log("[fall]", ...a);

  const prune = (now: number) => {
    const keepSince = now - Math.max(cfg.impactGraceMs + cfg.maxObserveMs + cfg.stillnessWindowMs + 1000, cfg.cooldownMs);
    while (buf.length && buf[0].t < keepSince) buf.shift();
  };

  const onSample = (g: number, now = Date.now()) => {
    // push & prune
    buf.push({ t: now, g });
    prune(now);

    // cooldown gate
    if (now - lastTrigger < cfg.cooldownMs) return;

    if (state === "IDLE") {
      if (g >= cfg.impactG) {
        state = "AFTER_IMPACT";
        impactAt = now;
        log("IMPACT", { g: g.toFixed(2) });
      }
      return;
    }

    // AFTER_IMPACT
    const dt = now - impactAt;
    if (dt < cfg.impactGraceMs) return;

    // sliding stillness window up to 'now'
    const slideStart = now - cfg.stillnessWindowMs;
    let sum = 0, n = 0, stillMs = 0;

    for (let i = 1; i < buf.length; i++) {
      const prev = buf[i - 1], cur = buf[i];
      if (cur.t < slideStart) continue;
      sum += cur.g; n++;
      if (prev.t >= slideStart && prev.g <= cfg.stillnessG && cur.g <= cfg.stillnessG) {
        stillMs += cur.t - prev.t;
      }
    }

    const avg = n ? sum / n : Number.POSITIVE_INFINITY;
    log("ANALYZE", `avg=${Number.isFinite(avg) ? avg.toFixed(2) : "inf"}`, `stillMs=${stillMs}ms`, `dt=${dt}ms`);

    if (avg <= cfg.stillnessG || stillMs >= cfg.stillnessMinMs) {
      lastTrigger = now;        // starts cooldown
      state = "IDLE";
      log("FALL DETECTED ✅");
      onFall();
      buf = buf.filter(s => now - s.t < 300); // trim to avoid immediate retrigger
      return;
    }

    // give up if no stillness appears
    if (dt > cfg.impactGraceMs + cfg.maxObserveMs) {
      state = "IDLE";
      log("RESET (no stillness)");
    }
  };

  const reset = () => { state = "IDLE"; impactAt = 0; lastTrigger = 0; buf = []; };
  const setThresholds = (patch: Partial<FallThresholds>) => { cfg = { ...cfg, ...patch }; };
  const getConfig = () => cfg;
  const getState = () => ({ state, lastTrigger, impactAt });

  return { onSample, reset, setThresholds, getConfig, getState };
}
