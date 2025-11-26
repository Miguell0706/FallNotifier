// core/FallBridge.ts
import { NativeEventEmitter, NativeModules, Platform } from "react-native";

const { FallNativeModule } = NativeModules;

export const FALL_SAMPLE = "FallEngineSample";
export const FALL_IMPACT = "FallEngineImpact";
export const FALL_FALL = "FallEngineFall";

// Emitter: MUST be null if native module is missing
export const fallEmitter: NativeEventEmitter | null =
  Platform.OS === "android" && FallNativeModule
    ? new NativeEventEmitter(FallNativeModule)
    : null;

// Warning if missing in DEV
if (!FallNativeModule && __DEV__) {
  console.warn(
    "[FallBridge] Native module 'FallNativeModule' not found. Did you rebuild the app?"
  );
}

export function startFallService(sensitivity: number, testMode = false) {
  return FallNativeModule?.startFallService?.(sensitivity, testMode);
}

export function stopFallService() {
  return FallNativeModule?.stopFallService?.();
}

export { FallNativeModule };

