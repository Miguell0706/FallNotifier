// services/getLocationSnapshot.ts
import * as Location from "expo-location";

export type Fix = { lat: number; lng: number; ts: number; accuracy?: number };

export async function getLocationSnapshot(timeoutMs = 5000): Promise<Fix | null> {
  // Make sure we have permission (ideally request once at app start)
  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== "granted") {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
  }

  // Try a quick last-known fix first (fast, may be slightly stale)
  const last = await Location.getLastKnownPositionAsync();

  // Race a fresh read with a timeout for snappiness
  try {
    const fresh = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("loc-timeout")), timeoutMs)),
    ]);

    const p = fresh ?? last;
    if (!p) return null;
    return {
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      ts: p.timestamp ?? Date.now(),
      accuracy: p.coords.accuracy ?? undefined,
    };
  } catch {
    // Fall back to last-known if fresh timed out
    if (!last) return null;
    return {
      lat: last.coords.latitude,
      lng: last.coords.longitude,
      ts: last.timestamp ?? Date.now(),
      accuracy: last.coords.accuracy ?? undefined,
    };
  }
}
