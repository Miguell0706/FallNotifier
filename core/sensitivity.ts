// core/sensitivity.ts

// Convert sensitivity (1–10) into an impact threshold in Gs
export function sensitivityToImpactG(s: number): number {
  // 1 = least sensitive (needs big impact)
  // 10 = most sensitive (triggers on smaller impacts)
  const max = 9;   // g at sensitivity 1
  const min = 2.5; // g at sensitivity 10
  // clamp s just in case
  const clamped = Math.max(1, Math.min(10, s));
  const t = (clamped - 1) / 9; // 0..1
  return max - t * (max - min);
}
