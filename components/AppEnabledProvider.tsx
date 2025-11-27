import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { startFallService, stopFallService } from "../core/FallBridge";

const STORAGE_KEY = "appEnabled:v2";
const SENSITIVITY_KEY = "sensitivity:v1";

type Setter = boolean | ((prev: boolean) => boolean);

type Ctx = {
  enabled: boolean;
  setEnabled: (v: Setter) => void;
  toggle: () => void;
  hydrated: boolean;
};

const AppEnabledContext = createContext<Ctx | undefined>(undefined);

export const AppEnabledProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [enabled, setEnabledState] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  // Only manages React state + AsyncStorage (no native calls here)
  const setEnabled = useCallback((updater: Setter) => {
    setEnabledState((prev) => {
      const next =
        typeof updater === "function"
          ? (updater as (p: boolean) => boolean)(prev)
          : updater;

      // persist ON/OFF
      AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0").catch(() => {});

      return next;
    });
  }, []);

  // 🔁 Hydrate enabled state from storage
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const rawEnabled = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;

        if (rawEnabled === "1") {
          setEnabledState(true);
        } else {
          setEnabledState(false);
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 🧠 Single place that actually talks to native
  // Whenever enabled flips to true, fetch the *latest* sensitivity from AsyncStorage
  useEffect(() => {
    if (!hydrated) return;

    if (enabled) {
      (async () => {
        let sensitivity = 5; // default fallback

        try {
          const rawSens = await AsyncStorage.getItem(SENSITIVITY_KEY);
          if (rawSens) {
            const parsed = Number(rawSens);
            if (!Number.isNaN(parsed)) {
              // clamp between 1 and 10 just in case
              sensitivity = Math.max(1, Math.min(10, parsed));
            }
          }
        } catch {
          // ignore, keep default sensitivity
        }

        console.log(
          "[AppEnabled] Enabling fall service with sensitivity",
          sensitivity
        );
        startFallService(sensitivity, false);
      })();
    } else {
      console.log("[AppEnabled] Disabling fall service");
      stopFallService();
    }
  }, [enabled, hydrated]);

  const toggle = useCallback(() => setEnabled((p) => !p), [setEnabled]);

  const value = useMemo<Ctx>(
    () => ({ enabled, setEnabled, toggle, hydrated }),
    [enabled, hydrated, setEnabled, toggle]
  );

  return (
    <AppEnabledContext.Provider value={value}>
      {children}
    </AppEnabledContext.Provider>
  );
};

export const useAppEnabled = () => {
  const ctx = useContext(AppEnabledContext);
  if (!ctx)
    throw new Error("useAppEnabled must be used inside AppEnabledProvider");
  return ctx;
};
