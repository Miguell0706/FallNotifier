import { NativeEventEmitter, NativeModules, Platform } from "react-native";

const { FallNativeModule } = NativeModules;

export const FALL_SAMPLE = "FallEngineSample";
export const FALL_IMPACT = "FallEngineImpact";
export const FALL_FALL = "FallEngineFall";

// Always export a non-null emitter.
// On Android with the native module, it is wired to FallNativeModule.
// Otherwise it's just a no-op emitter (events won't fire, but addListener is safe).
export const fallEmitter: NativeEventEmitter =
  Platform.OS === "android" && FallNativeModule
    ? new NativeEventEmitter(FallNativeModule)
    : new NativeEventEmitter();

// Warning if missing in DEV
if (!FallNativeModule && __DEV__) {
  console.warn(
    "[FallBridge] Native module 'FallNativeModule' not found. Did you rebuild the app?"
  );
}

export function startFallService(sensitivity: number) {
  return FallNativeModule?.startFallService?.(sensitivity);
}

export function stopFallService() {
  return FallNativeModule?.stopFallService?.();
}

export { FallNativeModule };

