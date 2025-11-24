import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
// ⬇️ point to the new bridge
import { startFallService, stopFallService } from "../core/FallBridge";
// ⬇️ if you already have a settings context, pull sensitivity from it
// import { useSettings } from "../settings/SettingsContext";

const STORAGE_KEY = "appEnabled:v1";

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
  const [enabled, setEnabledState] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  // TODO: wire real sensitivity from your settings context
  const currentSensitivity = 8;
  // const { sensitivity } = useSettings();
  // const currentSensitivity = sensitivity ?? 8;

  const setEnabled = useCallback(
    (updater: Setter) => {
      setEnabledState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: boolean) => boolean)(prev)
            : updater;

        // persist
        AsyncStorage.setItem(STORAGE_KEY, next ? "1" : "0").catch(() => {});

        // side-effect: start/stop native service
        if (next && !prev) {
          startFallService(currentSensitivity);
        } else if (!next && prev) {
          stopFallService();
        }

        return next;
      });
    },
    [currentSensitivity]
  );

  // hydrate from storage AND go through setEnabled so bridge is called
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;

        if (raw === "1") {
          setEnabled(true); // will call startFallService(...)
        } else if (raw === "0") {
          setEnabled(false); // will call stopFallService()
        } else {
          // first run: leave default state (true) but don't auto-start service
          setEnabledState(true);
        }
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setEnabled]);

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
